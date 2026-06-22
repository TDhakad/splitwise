import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import create_database_tables
from . import preplanning
from .routers import auth, expenses, groups, receipts, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.ENVIRONMENT in {"development", "test"}:
        await create_database_tables()
    yield


app = FastAPI(title="HisabKitab API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(groups.router)
app.include_router(expenses.router)
app.include_router(receipts.router)
app.include_router(preplanning.router, prefix="/api/v1")

os.makedirs("frontend/dist", exist_ok=True)
os.makedirs("frontend/dist/assets", exist_ok=True)
app.mount("/assets", StaticFiles(directory="frontend/dist/assets"), name="assets")


@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    path = os.path.join("frontend/dist", full_path)
    if os.path.isfile(path):
        return FileResponse(path)
    return FileResponse("frontend/dist/index.html")
