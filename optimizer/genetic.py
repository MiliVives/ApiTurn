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
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Tuple

from chromosome import Chromosome, ChromosomeGenerator
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
    Layer 2: pack all clients greedily into Mon→Tue→… respecting the lunch break.
    Returns (client_key, slots, day_idx, slot_start) so matrix_to_chromosome can
    insert intra-day L gaps (including the noon skip) into the chromosome.
    """
    result: List[Tuple[str, int, int, int]] = []
    current_day   = 0
    current_slots = 0

    for client_key, slots, _ in matrix:
        if current_slots < LUNCH_START_SLOT and current_slots + slots > LUNCH_START_SLOT:
            current_slots = LUNCH_START_SLOT
        if current_slots + slots > SLOTS_PER_DAY:
            current_day  += 1
            current_slots = 0
        if current_day >= NUM_DAYS:
            break
        result.append((client_key, slots, current_day, current_slots))
        current_slots += slots

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
    """Parent 2: randomly arranged chromosome of the same appointments."""
    sorted_appts = sorted(
        appts,
        key=lambda a: a.get("scheduled_at", ""),
    )
    clients = [(i + 1, appt_to_slots(a["duration_min"])) for i, a in enumerate(sorted_appts)]
    return ChromosomeGenerator(clients).generate_random_chromosome()


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

def calculate_fitness(chromosome: Chromosome) -> float:
    """
    fitness = 0.6 × used_day_utilization  +  0.4 × day_reduction

    used_day_utilization: total slots / (used_days × 16)
      — rewards filling each busy day as completely as possible
    day_reduction: (NUM_DAYS − used_days) / (NUM_DAYS − 1)
      — rewards having fewer busy days (more fully free days)

    This ensures compact schedules (e.g. [13,16,0,0,0]) score higher than
    scattered ones (e.g. [10,4,5,5,5]), which the old stdev-based balance
    metric penalised because empty days inflate variance.
    """
    days, _ = TwoLayerCrossover.parse_chromosome(chromosome.genes)
    per_day: List[int] = []
    total = 0
    for day_genes in days:
        s = sum(int(g[2:4]) for g in day_genes if g[0] != "L")
        per_day.append(s)
        total += s

    if total == 0:
        return 0.0

    used_days      = sum(1 for s in per_day if s > 0)
    used_day_util  = total / (used_days * SLOTS_PER_DAY)
    day_reduction  = (NUM_DAYS - used_days) / (NUM_DAYS - 1) if NUM_DAYS > 1 else 1.0

    return round(0.6 * used_day_util + 0.4 * day_reduction, 4)


# ─── Entry point ──────────────────────────────────────────────────────────────

def optimize(appts: List[dict], week_start_iso: str) -> dict:
    """
    V1: one horizontal crossover pass (P1=current schedule, P2=random).
    Returns the better of the two children as the proposed schedule.
    """
    if not appts:
        return {"proposed": [], "fitness": 0.0, "generations": 0}

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
    f1, f2     = calculate_fitness(child1), calculate_fitness(child2)
    best       = child1 if f1 >= f2 else child2
    best_fitness = max(f1, f2)

    proposed = chromosome_to_schedule(best, index_map, week_start_iso)
    return {"proposed": proposed, "fitness": best_fitness, "generations": 1}
