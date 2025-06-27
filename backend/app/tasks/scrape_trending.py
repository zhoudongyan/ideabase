from typing import List, Dict, Any, Optional

from sqlalchemy.orm import Session
from celery import Celery
from celery.schedules import crontab, timedelta

import asyncio
from datetime import datetime

from app.core.config import settings
from app.core.logging import get_logger

from app.db.base import SessionLocal
from app.services.github.scraper import GitHubTrendingScraper
from app.services.ai.analyzer import ProjectAnalyzer
from app.services.analysis_service import ProjectAnalysisService

from app.models.project import Project, ProjectInsight, Tag

# Configure logging
logger = get_logger(__name__)

# Create Celery application
celery_app = Celery(
    "ideabase",
    broker=f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/0",
    backend=f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/0",
)

# Configure scheduled tasks
if settings.SCRAPE_INTERVAL_HOURS == 24:
    # If it's 24 hours, use crontab to execute at 2 AM daily
    logger.info("Configure scraper task to run at 2 AM daily")
    schedule = crontab(hour=2, minute=0)
else:
    # Otherwise execute according to configured hour interval
    logger.info(f"Configure scraper task to run every {settings.SCRAPE_INTERVAL_HOURS} hours")
    schedule = timedelta(hours=settings.SCRAPE_INTERVAL_HOURS)

celery_app.conf.beat_schedule = {
    "scrape-github-trending-interval": {
        "task": "app.tasks.scrape_trending.scrape_github_trending",
        "schedule": schedule,
        "args": (),
    },
}


@celery_app.task
def scrape_github_trending(
    languages: Optional[List[str]] = None, time_range: str = "daily"
) -> Dict[str, Any]:
    """
    Scrape GitHub Trending and analyze projects

    Args:
        languages: List of languages to scrape, if None, scrape all languages
        time_range: Time range, daily/weekly/monthly

    Returns:
        Statistics of scraped and analyzed results
    """
    # Since Celery tasks are not async functions, but we need to call async operations,
    # we use asyncio.run to run the internal async function
    return asyncio.run(_scrape_github_trending_async(languages, time_range))


async def _scrape_github_trending_async(
    languages: Optional[List[str]] = None, time_range: str = "daily"
) -> Dict[str, Any]:
    """Async implementation of scraping GitHub Trending functionality"""
    logger.info(f"Start scraping GitHub Trending, languages: {languages}, time range: {time_range}")

    # Initialize result statistics
    result_stats = {
        "total_scraped": 0,
        "total_analyzed": 0,
        "new_projects": 0,
        "updated_projects": 0,
        "failed_analysis": 0,
        "languages": {},
    }

    # If language list is provided, scrape by language list
    # Otherwise, scrape without language distinction
    languages_to_scrape = languages or [""]

    try:
        # Initialize scraper and analyzer
        scraper = GitHubTrendingScraper()

        # Scrape projects for each language
        for language in languages_to_scrape:
            lang_key = language or "all"
            result_stats["languages"][lang_key] = {"scraped": 0, "analyzed": 0}

            # Scrape project list
            projects = await scraper.get_trending_projects(language=language, time_range=time_range)
            result_stats["languages"][lang_key]["scraped"] = len(projects)
            result_stats["total_scraped"] += len(projects)

            # Process each project
            for project_data in projects:
                # Analyze and store project
                success = await process_project(project_data)

                if success:
                    result_stats["languages"][lang_key]["analyzed"] += 1
                    result_stats["total_analyzed"] += 1
                else:
                    result_stats["failed_analysis"] += 1

        logger.info(f"GitHub Trending scraping completed, statistics: {result_stats}")
        return result_stats

    except Exception as e:
        logger.error(f"Error scraping GitHub Trending: {e}")
        return {"error": str(e), "stats": result_stats}


async def process_project(project_data: Dict[str, Any]) -> bool:
    """
    Process single project: store to database and perform AI analysis

    Args:
        project_data: Project data

    Returns:
        Whether processing was successful
    """
    db = SessionLocal()
    try:
        # Start transaction to ensure atomicity
        db.begin()

        # Check if project already exists
        existing_project = (
            db.query(Project)
            .filter(Project.full_name == project_data["full_name"])
            .with_for_update()  # Add row-level lock to avoid concurrent update conflicts
            .first()
        )

        is_new_project = existing_project is None

        if is_new_project:
            # Create new project
            project = Project(
                name=project_data["name"],
                owner=project_data["owner"],
                full_name=project_data["full_name"],
                description=project_data.get("description"),
                repository_url=project_data["repository_url"],
                homepage_url=project_data.get("homepage_url"),
                language=project_data.get("language"),
                stars_count=project_data.get("stars_count", 0),
                forks_count=project_data.get("forks_count", 0),
                trending_date=project_data.get("trending_date"),
            )
            db.add(project)
            db.commit()
            db.refresh(project)

            # New projects need analysis
            need_analysis_en = True
            need_analysis_zh = True

            # Record statistics
            result_stats = {"new_projects": 1, "updated_projects": 0}
        else:
            # Update existing project data
            existing_project.stars_count = project_data.get(
                "stars_count", existing_project.stars_count
            )
            existing_project.forks_count = project_data.get(
                "forks_count", existing_project.forks_count
            )
            existing_project.trending_date = project_data.get(
                "trending_date", existing_project.trending_date
            )
            db.commit()
            project = existing_project

            # Record statistics
            result_stats = {"new_projects": 0, "updated_projects": 1}

            # Check if project needs analysis
            analysis_needs = ProjectAnalysisService.check_if_insights_needed(project, ["en", "zh"])
            need_analysis_en = analysis_needs.get("en", False)
            need_analysis_zh = analysis_needs.get("zh", False)

            # Log record
            if not need_analysis_en and not need_analysis_zh:
                logger.info(
                    f"Project {project.full_name} already has successful analysis results in English and Chinese, skipping analysis"
                )

        # If analysis is needed, close current transaction connection first
        db.close()

        # Generate English analysis
        if need_analysis_en:
            try:
                success_en, _ = await ProjectAnalysisService.create_or_update_insight(
                    project, project_data, "en"
                )
                if not success_en:
                    logger.warning(f"English analysis for project {project.full_name} failed")
            except Exception as e:
                logger.error(f"Error analyzing project {project.full_name} in English: {str(e)}")

        # Generate Chinese analysis
        if need_analysis_zh:
            try:
                success_zh, _ = await ProjectAnalysisService.create_or_update_insight(
                    project, project_data, "zh"
                )
                if not success_zh:
                    logger.warning(f"Chinese analysis for project {project.full_name} failed")
            except Exception as e:
                logger.error(f"Error analyzing project {project.full_name} in Chinese: {str(e)}")

        return True
    except Exception as e:
        logger.error(f"Error processing project {project_data.get('full_name')}: {e}")
        db.rollback()
        return False
    finally:
        # Ensure database connection is closed
        try:
            db.close()
        except:
            pass


if __name__ == "__main__":
    # For local testing
    asyncio.run(_scrape_github_trending_async())
