from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from models import GeneticRequest, GeneticResponse
import genetic

app = FastAPI(title="Turnero Optimizer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/optimize", response_model=GeneticResponse)
def optimize(request: GeneticRequest):
    result = genetic.optimize(
        [a.model_dump() for a in request.appointments],
        request.week_start,
        avg_kg_1half=request.avg_kg_1half,
        avg_kg_3quarter=request.avg_kg_3quarter,
        avg_kg_std=request.avg_kg_std,
    )
    return GeneticResponse(**result)
