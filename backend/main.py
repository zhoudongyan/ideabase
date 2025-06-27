from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import asyncio

from dotenv import load_dotenv
from sqlalchemy.orm import Session

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.logging import get_logger

from app.db.base import SessionLocal
from app.models.project import Project
from app.tasks.scrape_trending import _scrape_github_trending_async

# Initialize logging
logger = get_logger(__name__)

# Load environment variables
load_dotenv()

# Create FastAPI application
app = FastAPI(
    title="IdeaBase API",
    description="GitHub Trending project analysis and startup ideas API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,  # Use allowed origins defined in configuration
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes
app.include_router(api_router, prefix="/api/v1")


@app.on_event("startup")
async def check_database_on_startup():
    """Check if database is empty on application startup, trigger data scraping if empty"""
    try:
        logger.info("Check if database needs to be initialized...")
        db = SessionLocal()
        try:
            # Check if project data exists in database
            project_count = db.query(Project).count()

            if project_count == 0:
                logger.info("Database is empty, trigger initial data scraping...")
                # Execute scraping in background task to avoid blocking application startup
                asyncio.create_task(initial_data_scraping())
            else:
                logger.info(
                    f"Database already has {project_count} projects, no need to initialize data"
                )
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Error checking database on startup: {e}")


async def initial_data_scraping():
    """Initial data scraping to get GitHub Trending projects"""
    try:
        logger.info("Start initial data scraping...")
        result = await _scrape_github_trending_async(time_range="daily")
        logger.info(f"Initial data scraping completed, statistics: {result}")
    except Exception as e:
        logger.error(f"Error during initial data scraping: {e}")


@app.get("/")
async def root():
    return {
        "message": "Welcome to IdeaBase.ai API",
        "docs": "/docs",
        "status": "Running",
        "version": "0.1.0",
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
