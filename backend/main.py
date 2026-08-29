import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.database import engine, Base
from backend.routers import cases, sync, professionals, analytics
from backend.seed_data import seed

# Create database tables and seed sample data
Base.metadata.create_all(bind=engine)
try:
    seed()
except Exception as e:
    print(f"Seed note: {e}")

app = FastAPI(
    title="ONEHEALTH AI - Rural Offline-First Healthcare & Veterinary Platform",
    description="Offline-first AI Screening & Care Platform for Human & Livestock Health in rural communities like Kopargaon.",
    version="1.0.0"
)

# CORS configuration for development and field devices
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(cases.router)
app.include_router(sync.router)
app.include_router(professionals.router)
app.include_router(analytics.router)

# Mount Static Frontend
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public")
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
