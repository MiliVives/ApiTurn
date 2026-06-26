import random
from typing import List, Tuple, Dict


class Chromosome:
    """Represents a schedule chromosome as a vector of genes"""

    def __init__(self, genes: List[str]):
        """
        genes: List of genes including client assignments (XXYY),
               free slots (LX), and day separators (P)
        """
        self.genes = genes

    def __repr__(self):
        return "[ " + ", ".join(self.genes) + " ]"

    def __str__(self):
        return self.__repr__()


class ChromosomeGenerator:
    """Generates random chromosomes for initial population"""

    DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]
    SLOTS_PER_DAY = 16
    NUM_DAYS = 5
    TOTAL_SLOTS = SLOTS_PER_DAY * NUM_DAYS
    MIN_POPULATION = 5
    MAX_POPULATION = 80

    def __init__(self, clients: List[Tuple[int, int]]):
        """
        clients: List of (client_id, slots_required) tuples
                Example: [(1, 5), (2, 19), (3, 8), (4, 25), (5, 12), (6, 7)]
        """
        self.clients = clients
        self.total_slots_required = sum(slots for _, slots in clients)
        self.num_clients = len(clients)

        if self.total_slots_required > self.TOTAL_SLOTS:
            raise ValueError(
                f"Total slots required ({self.total_slots_required}) "
                f"exceeds available slots ({self.TOTAL_SLOTS})"
            )

        # Calculate population size dynamically: between 5 and 80
        self.population_size = max(
            self.MIN_POPULATION,
            min(self.num_clients, self.MAX_POPULATION)
        )

    def generate_random_chromosome(self) -> Chromosome:
        """Generate a random chromosome (random assignment of clients to days)"""

        # Step 1: For each client, randomly assign starting day
        client_start_days = {}
        for client_id, slots_required in self.clients:
            start_day = random.randint(0, self.NUM_DAYS - 1)
            client_start_days[client_id] = start_day

        # Step 2: Build the schedule matrix (5 days × 16 slots)
        schedule = [[] for _ in range(self.NUM_DAYS)]

        # Step 3: Assign clients to days starting from their random start day
        for client_id, slots_required in self.clients:
            start_day = client_start_days[client_id]
            remaining_slots = slots_required
            current_day = start_day

            # Distribute slots across consecutive days
            while remaining_slots > 0 and current_day < self.NUM_DAYS:
                available_in_day = self.SLOTS_PER_DAY - len(schedule[current_day])
                slots_to_assign = min(remaining_slots, available_in_day)

                # Add client gene: XXYY (XX=client_id, YY=slots)
                schedule[current_day].append(f"{client_id:02d}{slots_to_assign:02d}")
                remaining_slots -= slots_to_assign
                current_day += 1

        # Step 4: Fill remaining slots with free space markers (LX)
        for day_idx in range(self.NUM_DAYS):
            occupied = sum(int(gene[2:4]) for gene in schedule[day_idx])
            free_slots = self.SLOTS_PER_DAY - occupied
            if free_slots > 0:
                schedule[day_idx].append(f"L{free_slots}")

        # Step 5: Build chromosome with day separators (P)
        genes = []
        for day_idx in range(self.NUM_DAYS):
            genes.extend(schedule[day_idx])
            if day_idx < self.NUM_DAYS - 1:
                genes.append("P")

        return Chromosome(genes)

    def generate_population(self, population_size: int = None) -> List[Chromosome]:
        """
        Generate initial population of random chromosomes

        Args:
            population_size: Override auto-calculated size. If None, uses dynamic calculation.
        """
        if population_size is None:
            population_size = self.population_size
        return [self.generate_random_chromosome() for _ in range(population_size)]

    def validate_chromosome(self, chromosome: Chromosome) -> bool:
        """Validate chromosome structure (basic check)"""
        genes = chromosome.genes

        # Check format: should have P separators every ~6-7 genes (rough estimate)
        day_count = genes.count("P") + 1
        if day_count != self.NUM_DAYS:
            return False

        # Check slots per day
        current_day_slots = 0
        for gene in genes:
            if gene == "P":
                if current_day_slots != self.SLOTS_PER_DAY:
                    return False
                current_day_slots = 0
            else:
                # Extract slot count from gene (last 2 digits)
                slot_count = int(gene[1:3]) if gene[0] == "L" else int(gene[2:4])
                current_day_slots += slot_count

        # Check last day
        if current_day_slots != self.SLOTS_PER_DAY:
            return False

        return True
