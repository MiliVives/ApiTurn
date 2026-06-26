"""Two-Layer Crossover for schedule chromosomes.

Layer 1: One-point genetic crossover at a day separator (P).
Layer 2: Compaction — moves all client genes to the front of each day,
         consolidating free slots at the end.
"""

from typing import List, Tuple


class TwoLayerCrossover:

    SLOTS_PER_DAY = 16
    NUM_DAYS = 5

    @staticmethod
    def parse_chromosome(chromosome: List[str]) -> Tuple[List[List[str]], List[int]]:
        """Split chromosome into per-day gene lists and return separator positions."""
        days: List[List[str]] = []
        current_day: List[str] = []
        separators: List[int] = []

        for idx, gene in enumerate(chromosome):
            if gene == "P":
                days.append(current_day)
                current_day = []
                separators.append(idx)
            else:
                current_day.append(gene)

        if current_day:
            days.append(current_day)

        return days, separators

    @staticmethod
    def compact_day(genes: List[str]) -> List[str]:
        """Push all client genes to the front and consolidate free slots at the end."""
        client_genes = [g for g in genes if g[0] != "L"]
        total_free = sum(int(g[1:]) for g in genes if g[0] == "L")

        compacted = client_genes.copy()
        if total_free > 0:
            compacted.append(f"L{total_free}")
        return compacted

    @staticmethod
    def layer1_crossover(
        parent1: List[str],
        parent2: List[str],
        crossover_point: int = None,
    ) -> Tuple[List[str], List[str]]:
        """One-point crossover at a day separator.

        crossover_point: index of the separator (0-based, i.e. which P to cut after).
                         Defaults to the middle day (2).
        """
        seps1 = [i for i, g in enumerate(parent1) if g == "P"]
        seps2 = [i for i, g in enumerate(parent2) if g == "P"]

        if crossover_point is None:
            crossover_point = 2

        if crossover_point < len(seps1) and crossover_point < len(seps2):
            cut1 = seps1[crossover_point] + 1
            cut2 = seps2[crossover_point] + 1
        else:
            cut1 = len(parent1) // 2
            cut2 = len(parent2) // 2

        child1 = parent1[:cut1] + parent2[cut2:]
        child2 = parent2[:cut2] + parent1[cut1:]
        return child1, child2

    @staticmethod
    def layer2_compact(chromosome: List[str]) -> List[str]:
        """Compact every day in the chromosome (Layer 2)."""
        days, _ = TwoLayerCrossover.parse_chromosome(chromosome)

        result: List[str] = []
        for day_idx, day_genes in enumerate(days):
            result.extend(TwoLayerCrossover.compact_day(day_genes))
            if day_idx < len(days) - 1:
                result.append("P")
        return result

    @staticmethod
    def validate_chromosome(chromosome: List[str]) -> bool:
        """Return True if every day sums to exactly SLOTS_PER_DAY."""
        days, _ = TwoLayerCrossover.parse_chromosome(chromosome)
        for day_genes in days:
            total = sum(
                int(g[1:]) if g[0] == "L" else int(g[2:4])
                for g in day_genes
            )
            if total != TwoLayerCrossover.SLOTS_PER_DAY:
                return False
        return True

    @staticmethod
    def crossover(
        parent1: List[str],
        parent2: List[str],
        crossover_point: int = None,
    ) -> Tuple[List[str], List[str]]:
        """Full two-layer crossover: L1 genetic swap → L2 compaction."""
        child1_raw, child2_raw = TwoLayerCrossover.layer1_crossover(
            parent1, parent2, crossover_point
        )
        child1 = TwoLayerCrossover.layer2_compact(child1_raw)
        child2 = TwoLayerCrossover.layer2_compact(child2_raw)
        return child1, child2
