import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.limiter import limiter
from app.database import init_db, get_all_naira_data
from app.rag import rag_manager
from app.routers.api import router as api_router
from app.routers.pages import router as pages_router
from app.routers.auth import router as auth_router

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define the base directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up application...")
    try:
        await init_db()
        # Build RAG index
        logger.info("Building RAG index...")
        data = await get_all_naira_data()
        await rag_manager.build_index(data)
    except Exception as e:
        logger.error(f"Error during application startup: {e}")
    yield
    logger.info("Shutting down application...")

app = FastAPI(title="NAIRA - African AI & XR Excellence Hub", lifespan=lifespan)

# Disable rate limiting for tests
import os
if os.getenv("TESTING"):
    limiter.enabled = False

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Configure CORS with restricted origins
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files with absolute path
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

# Include routers
app.include_router(auth_router)
app.include_router(api_router)
app.include_router(pages_router)

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}
