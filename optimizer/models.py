from pydantic import BaseModel
from typing import Any


# ─── Legacy models (kept for backwards compatibility) ────────────────────────

class Appointment(BaseModel):
    id: str
    scheduled_at: str
    duration_min: int
    priority: int = 0


class OptimizerConfig(BaseModel):
    strategy: str = "earliest"


class OptimizeRequest(BaseModel):
    appointments: list[Appointment]
    config: OptimizerConfig = OptimizerConfig()


class OrderedAppointment(BaseModel):
    id: str
    queue_position: int


class OptimizeResponse(BaseModel):
    ordered: list[OrderedAppointment]


# ─── Genetic optimizer models ─────────────────────────────────────────────────

class ApptInput(BaseModel):
    id: str
    duration_min: int
    urgency: str = "STANDARD"
    scheduled_at: str | None = None  # ISO datetime — used to build Parent 1 from current schedule
    created_at: str | None = None    # ISO datetime — appointment request date (for wait-time scoring)
    frame_count_1half: int = 0
    frame_count_3quarter: int = 0
    frame_count_std: int = 0


class GeneticRequest(BaseModel):
    appointments: list[ApptInput]
    week_start: str  # ISO datetime string (full, with timezone if available)
    avg_kg_1half: float | None = None    # avg kg honey per filled 1/2 alza
    avg_kg_3quarter: float | None = None
    avg_kg_std: float | None = None


class ProposedAppt(BaseModel):
    id: str
    suggested_date: str  # ISO datetime string


class GeneticResponse(BaseModel):
    proposed: list[ProposedAppt]
    fitness: float
    fitness_util: float = 0.0
    fitness_reduction: float = 0.0
    fitness_compactness: float = 0.0
    generations: int
