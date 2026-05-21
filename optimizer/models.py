from pydantic import BaseModel
from typing import Any


class Appointment(BaseModel):
    id: str
    scheduled_at: str       # ISO datetime
    duration_min: int
    priority: int = 0       # higher = more urgent


class OptimizerConfig(BaseModel):
    strategy: str = "earliest"  # "earliest" | "priority" | "shortest_job_first"


class OptimizeRequest(BaseModel):
    appointments: list[Appointment]
    config: OptimizerConfig = OptimizerConfig()


class OrderedAppointment(BaseModel):
    id: str
    queue_position: int


class OptimizeResponse(BaseModel):
    ordered: list[OrderedAppointment]
