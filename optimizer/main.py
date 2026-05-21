from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from optimizer import optimize_queue
from models import OptimizeRequest, OptimizeResponse

app = FastAPI(title="Turnero Optimizer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["POST"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/optimize", response_model=OptimizeResponse)
def optimize(request: OptimizeRequest):
    ordered = optimize_queue(request.appointments, request.config)
    return OptimizeResponse(ordered=ordered)
