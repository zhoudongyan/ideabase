from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Body, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from app.db.base import get_db
from app.models.project import Project as ProjectModel
from app.schemas.project import Project
from app.services.github.scraper import GitHubTrendingScraper
from app.tasks.scrape_trending import scrape_github_trending

router = APIRouter()


@router.post("/admin/scrape-trending", response_model=dict)
async def scrape_trending(
    background_tasks: BackgroundTasks,
    languages: Optional[List[str]] = Body(None),
    force: bool = Body(False),
    db: Session = Depends(get_db),
):
    """
    Admin API: Manually trigger GitHub trending projects scraping
    - languages: Specify the list of languages to scrape
    - force: Whether to force re-scraping
    """
    # Start scraping as background task
    background_tasks.add_task(scrape_github_trending, languages=languages, time_range="daily")

    return {"status": "success", "message": "Trending projects scraping task started in background"}


@router.post("/admin/analyze-projects", response_model=dict)
async def analyze_all_projects(
    background_tasks: BackgroundTasks,
    limit: int = Body(10),
    languages: List[str] = Body(["en", "zh"]),
    db: Session = Depends(get_db),
):
    """
    Admin API: Generate AI analysis for all projects without insights analysis
    - limit: Limit maximum number of projects to process, preventing API quota overrun
    - languages: List of analysis languages to generate, defaults to both English and Chinese analysis
    """
    from app.tasks.analyze_projects import analyze_projects_task

    # Start project analysis task
    background_tasks.add_task(analyze_projects_task, limit=limit, languages=languages)

    return {
        "status": "success",
        "message": (
            f"AI analysis task for {limit} projects in {','.join(languages)} languages started"
        ),
    }


@router.get("/admin/stats", response_model=dict)
async def get_stats(db: Session = Depends(get_db)):
    """
    Admin API: Get system statistics
    """
    # Total number of projects
    total_projects = db.query(ProjectModel).count()

    # New projects in the last 7 days
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    new_projects = db.query(ProjectModel).filter(ProjectModel.created_at >= seven_days_ago).count()

    # Language statistics (TOP 5)
    languages = (
        db.query(ProjectModel.language, func.count(ProjectModel.id).label("count"))
        .filter(ProjectModel.language.isnot(None))
        .group_by(ProjectModel.language)
        .order_by(func.count(ProjectModel.id).desc())
        .limit(5)
        .all()
    )

    language_stats = [{"language": lang, "count": count} for lang, count in languages if lang]

    return {
        "total_projects": total_projects,
        "new_projects_7d": new_projects,
        "top_languages": language_stats,
    }
