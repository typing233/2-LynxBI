from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import get_settings
from app.database import init_db
from app.api import datasources, metadata, query, auth, charts, dashboards, share


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


settings = get_settings()

app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(datasources.router, prefix="/api/datasources", tags=["datasources"])
app.include_router(metadata.router, prefix="/api/metadata", tags=["metadata"])
app.include_router(query.router, prefix="/api/query", tags=["query"])
app.include_router(charts.router, prefix="/api/charts", tags=["charts"])
app.include_router(dashboards.router, prefix="/api/dashboards", tags=["dashboards"])
app.include_router(share.router, prefix="/api/share", tags=["share"])


@app.get("/api/health")
async def health():
    return {"status": "ok"}
