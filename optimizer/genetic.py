"""
V1 Genetic Optimizer — Horizontal Two-Layer Crossover.

The chromosome is conceptually a MATRIX:
  - Rows    = clients/appointments (sorted by index)
  - Columns = days (Mon–Fri, indices 0–4)
  - Each row encodes which day that client is assigned to and how many slots they need

Layer 1 — Horizontal cut:
  Cut after row N → Child 1 gets rows 1..N from P1 and rows N+1..M from P2.
  No duplicates because every client appears exactly once per parent.

Layer 2 — Compaction:
  Take all clients from the child matrix and pack them greedily into days
  (Mon first, then Tue, etc.) until each day is full. This eliminates inter-day
  gaps and can repair overflow caused by the crossover.

Slot mapping:
  1 slot = 30 min  |  16 usable slots/day (09:00–12:00 + 13:00–18:00)  |  5 days Mon–Fri
  12:00–13:00 is a locked lunch break; slots 0–5 = morning, 6–15 = afternoon.
  Gene XXYY: XX = 2-digit client index (01–99), YY = slot count
"""

import math
import random
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Tuple

from chromosome import Chromosome
from crossover import TwoLayerCrossover

SLOT_MIN         = 30
WORK_START       = 9    # 09:00
SLOTS_PER_DAY    = 16   # 16 usable slots: 09:00–12:00 (6) + 13:00–18:00 (10)
NUM_DAYS         = 5    # Mon–Fri
LUNCH_START_SLOT = 6    # slot 6 = 12:00 (6 × 30 min from 09:00)
LUNCH_SLOTS      = 2    # 12:00–13:00 = 2 × 30 min locked

# Type alias for a row in the client matrix
Row = Tuple[str, int, int]   # (client_key, slots, day_idx)


# ─── Helpers ─────────────────────────────────────────────────────────────────

def appt_to_slots(duration_min: int) -> int:
    return max(1, min(SLOTS_PER_DAY, math.ceil(duration_min / SLOT_MIN)))


def _parse_dt(iso: str) -> datetime:
    dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def slot_to_minutes(slot_idx: int) -> int:
    """Abstract slot 0–15 → minutes from midnight, skipping the 12:00–13:00 lunch.

    slot 0 → 09:00  |  slot 5 → 11:30  |  slot 6 → 13:00  |  slot 15 → 17:30
    """
    if slot_idx < LUNCH_START_SLOT:
        return WORK_START * 60 + slot_idx * SLOT_MIN
    else:
        return WORK_START * 60 + (slot_idx + LUNCH_SLOTS) * SLOT_MIN


def _build_index_map(appts: List[dict]) -> Tuple[Dict[str, str], Dict[str, str]]:
    """
    Sort appointments by scheduled time, assign stable 2-digit keys.
    Returns (index_map: key→id,  appt_to_key: id→key).
    """
    sorted_appts = sorted(
        appts,
        key=lambda a: a.get("scheduled_at", ""),
    )
    index_map: Dict[str, str] = {}
    appt_to_key: Dict[str, str] = {}
    for i, appt in enumerate(sorted_appts):
        key = f"{i + 1:02d}"
        index_map[key] = appt["id"]
        appt_to_key[appt["id"]] = key
    return index_map, appt_to_key


# ─── Matrix ↔ Chromosome ──────────────────────────────────────────────────────

def chromosome_to_matrix(chromosome: Chromosome) -> List[Row]:
    """
    Parse chromosome genes into a list of (client_key, slots, day_idx) rows,
    sorted by client_key so both parents align for horizontal crossover.
    """
    days, _ = TwoLayerCrossover.parse_chromosome(chromosome.genes)
    rows: List[Row] = []
    for day_idx, day_genes in enumerate(days):
        for gene in day_genes:
            if gene[0] != "L":
                rows.append((gene[:2], int(gene[2:4]), day_idx))
    rows.sort(key=lambda r: r[0])
    return rows


def matrix_to_chromosome(matrix: List[Tuple[str, int, int, int]]) -> Chromosome:
    """
    Convert compacted matrix rows back into a chromosome.
    Inserts L genes for intra-day gaps (including the lunch-break skip) so that
    chromosome_to_schedule maps every appointment to the correct wall-clock slot.
    """
    by_day: List[List[Tuple[str, int, int]]] = [[] for _ in range(NUM_DAYS)]
    for client_key, slots, day_idx, slot_start in matrix:
        if 0 <= day_idx < NUM_DAYS:
            by_day[day_idx].append((client_key, slots, slot_start))

    genes: List[str] = []
    for day_idx, day_items in enumerate(by_day):
        day_items.sort(key=lambda x: x[2])   # order by slot_start
        cursor = 0
        for client_key, slots, slot_start in day_items:
            if slot_start > cursor:
                genes.append(f"L{slot_start - cursor}")
            genes.append(f"{client_key}{slots:02d}")
            cursor = slot_start + slots
        free = SLOTS_PER_DAY - cursor
        if free > 0:
            genes.append(f"L{free}")
        if day_idx < NUM_DAYS - 1:
            genes.append("P")

    return Chromosome(genes)


# ─── Layer 1: Horizontal crossover ───────────────────────────────────────────

def horizontal_crossover(
    matrix1: List[Row],
    matrix2: List[Row],
    cut_after: int,
) -> Tuple[List[Row], List[Row]]:
    """
    Horizontal cut after row `cut_after` (0-based index).

    Child 1 = P1 rows[0..cut_after]  +  P2 rows[cut_after+1..]
    Child 2 = P2 rows[0..cut_after]  +  P1 rows[cut_after+1..]

    No duplicates: every client key appears exactly once per parent,
    so the children also have no duplicates.
    """
    child1 = matrix1[: cut_after + 1] + matrix2[cut_after + 1 :]
    child2 = matrix2[: cut_after + 1] + matrix1[cut_after + 1 :]
    return child1, child2


# ─── Layer 2: Compaction ──────────────────────────────────────────────────────

def compact_matrix(matrix: List[Row]) -> List[Tuple[str, int, int, int]]:
    """
    Layer 2: pack appointments greedily into Mon→Tue→…, respecting the lunch break.
    When the next appointment would straddle the lunch break, looks ahead in the
    pending list for a shorter one that fits the remaining morning slots — filling
    the gap before going to afternoon rather than leaving it empty.
    Returns (client_key, slots, day_idx, slot_start).
    """
    result: List[Tuple[str, int, int, int]] = []
    current_day   = 0
    current_slots = 0
    pending = list(matrix)

    while pending:
        client_key, slots, _ = pending[0]
        remaining_morning = max(0, LUNCH_START_SLOT - current_slots)

        # Appointment straddles lunch — try to fill the morning gap first.
        if remaining_morning > 0 and slots > remaining_morning:
            fill_idx = next(
                (j for j, (_, s, _) in enumerate(pending) if s <= remaining_morning),
                None,
            )
            if fill_idx is not None:
                pending.insert(0, pending.pop(fill_idx))
                continue
            # Nothing fits in remaining morning — skip to afternoon.
            current_slots = LUNCH_START_SLOT
            continue

        if current_slots + slots > SLOTS_PER_DAY:
            current_day  += 1
            current_slots = 0
            if current_day >= NUM_DAYS:
                break
            continue

        result.append((client_key, slots, current_day, current_slots))
        current_slots += slots
        pending.pop(0)

    return result


# ─── Parent builders ──────────────────────────────────────────────────────────

def build_chromosome_from_current(
    appts: List[dict],
    week_start_iso: str,
) -> Tuple[Chromosome, Dict[str, str]]:
    """
    Parent 1: encode each appointment's ACTUAL current scheduled day.
    Appointments outside Mon–Fri of the week fall back to Monday.
    """
    index_map, appt_to_key = _build_index_map(appts)
    week_start = _parse_dt(week_start_iso)

    days_appts: List[List[dict]] = [[] for _ in range(NUM_DAYS)]
    unplaced: List[dict] = []

    for appt in appts:
        iso = appt.get("scheduled_at")
        if not iso:
            unplaced.append(appt)
            continue
        dt = _parse_dt(iso)
        delta = (dt.date() - week_start.date()).days
        if 0 <= delta < NUM_DAYS:
            days_appts[delta].append(appt)
        else:
            unplaced.append(appt)

    for day in days_appts:
        day.sort(key=lambda a: a.get("scheduled_at", ""))
    days_appts[0].extend(unplaced)

    genes: List[str] = []
    for day_idx, day_appts in enumerate(days_appts):
        occupied = 0
        carry: List[dict] = []
        for appt in day_appts:
            key = appt_to_key.get(appt["id"])
            if not key:
                continue
            slots = appt_to_slots(appt["duration_min"])
            # Skip over the lunch break if this appointment would straddle it
            if occupied < LUNCH_START_SLOT and occupied + slots > LUNCH_START_SLOT:
                occupied = LUNCH_START_SLOT
            # If it doesn't fit today, carry to tomorrow — never truncate
            if occupied + slots > SLOTS_PER_DAY:
                carry.append(appt)
                continue
            genes.append(f"{key}{slots:02d}")
            occupied += slots
        # Overflow appointments go to the next day
        if day_idx + 1 < NUM_DAYS:
            days_appts[day_idx + 1].extend(carry)
        free = SLOTS_PER_DAY - occupied
        if free > 0:
            genes.append(f"L{free}")
        if day_idx < NUM_DAYS - 1:
            genes.append("P")

    return Chromosome(genes), index_map


def build_random_chromosome(appts: List[dict]) -> Chromosome:
    """Parent 2: random day assignment, always with correct slot counts."""
    sorted_appts = sorted(appts, key=lambda a: a.get("scheduled_at", ""))
    matrix: List[Row] = [
        (f"{i + 1:02d}", appt_to_slots(a["duration_min"]), random.randint(0, NUM_DAYS - 1))
        for i, a in enumerate(sorted_appts)
    ]
    matrix.sort(key=lambda r: (r[2], r[0]))
    return matrix_to_chromosome(compact_matrix(matrix))


# ─── Schedule conversion ──────────────────────────────────────────────────────

def chromosome_to_schedule(
    chromosome: Chromosome,
    index_map: Dict[str, str],
    week_start_iso: str,
) -> List[dict]:
    """
    Convert chromosome to [{ id, suggested_date }].
    Each client key used at most once (first occurrence wins — handles any
    residual duplicates from crossover before compaction).
    """
    week_start = _parse_dt(week_start_iso)
    days, _    = TwoLayerCrossover.parse_chromosome(chromosome.genes)
    result: List[dict] = []
    used: set = set()

    for day_idx, day_genes in enumerate(days):
        if day_idx >= NUM_DAYS:
            break
        day_base    = week_start + timedelta(days=day_idx)
        slot_offset = 0

        for gene in day_genes:
            if gene[0] == "L":
                slot_offset += int(gene[1:])
            else:
                key   = gene[:2]
                slots = int(gene[2:4])
                if key in index_map and key not in used:
                    used.add(key)
                    start_min  = slot_to_minutes(slot_offset)
                    appt_time  = day_base + timedelta(minutes=start_min)
                    result.append({
                        "id":             index_map[key],
                        "suggested_date": appt_time.isoformat(),
                    })
                slot_offset += slots

    return result


# ─── Fitness ──────────────────────────────────────────────────────────────────

def calculate_fitness(chromosome: Chromosome) -> Tuple[float, float, float, float]:
    """
    Returns (total_fitness, util_component, reduction_component, compactness_component).

    fitness = 0.5 × util  +  0.3 × day_reduction  +  0.2 × compactness
    util        = total_slots / (used_days × 16)  — rewards full days
    day_reduction = (NUM_DAYS − used_days) / (NUM_DAYS − 1)  — rewards fewer busy days
    compactness = 1 − dead_slots / (used_days × 16)  — penalizes gaps trapped between appointments
    """
    days, _ = TwoLayerCrossover.parse_chromosome(chromosome.genes)
    per_day: List[int] = []
    total      = 0
    dead_total = 0

    for day_genes in days:
        s = sum(int(g[2:4]) for g in day_genes if g[0] != "L")
        per_day.append(s)
        total += s

        # Dead slots: L genes that appear BEFORE the last appointment gene on this day.
        # L genes AFTER the last appointment (trailing) are end-of-day free capacity — not penalized.
        last_appt_idx = max(
            (i for i, g in enumerate(day_genes) if g[0] != "L"),
            default=-1,
        )
        if last_appt_idx >= 0:
            dead_total += sum(
                int(g[1:])
                for i, g in enumerate(day_genes)
                if g[0] == "L" and i < last_appt_idx
            )

    if total == 0:
        return 0.0, 0.0, 0.0, 0.0

    used_days     = sum(1 for s in per_day if s > 0)
    used_day_util = total / (used_days * SLOTS_PER_DAY)
    day_reduction = (NUM_DAYS - used_days) / (NUM_DAYS - 1) if NUM_DAYS > 1 else 1.0
    compactness   = 1.0 - dead_total / (used_days * SLOTS_PER_DAY)

    util_comp    = round(0.5 * used_day_util, 4)
    red_comp     = round(0.3 * day_reduction, 4)
    compact_comp = round(0.2 * compactness, 4)

    return round(util_comp + red_comp + compact_comp, 4), util_comp, red_comp, compact_comp


# ─── Entry point ──────────────────────────────────────────────────────────────

def optimize(appts: List[dict], week_start_iso: str) -> dict:
    """
    V1: one horizontal crossover pass (P1=current schedule, P2=random).
    Returns the better of the two children as the proposed schedule.
    """
    if not appts:
        return {"proposed": [], "fitness": 0.0, "fitness_util": 0.0, "fitness_reduction": 0.0, "fitness_compactness": 0.0, "generations": 0}

    # Cap to 80 slots (5 days × 16) — more appointments than this can't be compacted
    total_slots = sum(appt_to_slots(a["duration_min"]) for a in appts)
    if total_slots > NUM_DAYS * SLOTS_PER_DAY:
        by_time = sorted(appts, key=lambda a: a.get("scheduled_at", ""))
        budget, used, capped = NUM_DAYS * SLOTS_PER_DAY, 0, []
        for a in by_time:
            s = appt_to_slots(a["duration_min"])
            if used + s <= budget:
                capped.append(a)
                used += s
        appts = capped

    # Build parents
    parent1, index_map = build_chromosome_from_current(appts, week_start_iso)
    parent2            = build_random_chromosome(appts)

    # Layer 1 — horizontal crossover at the midpoint row
    matrix1 = chromosome_to_matrix(parent1)
    matrix2 = chromosome_to_matrix(parent2)
    n       = len(matrix1)
    cut     = max(0, (n // 2) - 1)

    child1_matrix, child2_matrix = horizontal_crossover(matrix1, matrix2, cut)

    # Layer 2 — compact.
    # Sort by the appointment's ORIGINAL day (from P1) before packing so that
    # appointments always move to the same day or an earlier one — never later.
    orig_day = {row[0]: row[2] for row in matrix1}

    def _by_orig_day(row: Row) -> tuple:
        return (orig_day.get(row[0], NUM_DAYS - 1), row[0])

    child1 = matrix_to_chromosome(compact_matrix(sorted(child1_matrix, key=_by_orig_day)))
    child2 = matrix_to_chromosome(compact_matrix(sorted(child2_matrix, key=_by_orig_day)))

    # Pick the better child
    f1, f1_util, f1_red, f1_comp = calculate_fitness(child1)
    f2, f2_util, f2_red, f2_comp = calculate_fitness(child2)
    if f1 >= f2:
        best, best_fitness, best_util, best_red, best_comp = child1, f1, f1_util, f1_red, f1_comp
    else:
        best, best_fitness, best_util, best_red, best_comp = child2, f2, f2_util, f2_red, f2_comp

    proposed = chromosome_to_schedule(best, index_map, week_start_iso)
    return {
        "proposed":            proposed,
        "fitness":             best_fitness,
        "fitness_util":        best_util,
        "fitness_reduction":   best_red,
        "fitness_compactness": best_comp,
        "generations":         1,
    }
