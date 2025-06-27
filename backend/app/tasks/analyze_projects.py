import asyncio

from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.db.base import SessionLocal
from app.models.project import Project, ProjectInsight
from app.services.ai.analyzer import ProjectAnalyzer
from app.services.analysis_service import ProjectAnalysisService
from app.core.logging import get_logger

# Configure logging
logger = get_logger(__name__)


async def analyze_projects_task(limit: int = 10, languages: List[str] = ["en", "zh"]):
    """
    Generate AI analysis for unanalyzed projects

    Args:
        limit: Maximum number of projects to process, to prevent API quota exceeded
        languages: List of analysis languages to generate
    """
    logger.info(f"Start batch analysis of projects, limit: {limit}, languages: {languages}")

    # Since this function may be called by Celery, need to manually create async event loop
    loop = asyncio.get_event_loop()
    if loop.is_closed():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    try:
        # Get projects without analysis results
        db = SessionLocal()
        projects_to_analyze = get_projects_without_insights(db, limit, languages)

        logger.info(f"Found {len(projects_to_analyze)} projects that need analysis")

        # Analyze each project
        for project in projects_to_analyze:
            for language in languages:
                await analyze_single_project(project, language)

        return {"status": "success", "analyzed_count": len(projects_to_analyze)}

    except Exception as e:
        logger.error(f"Error occurred during batch analysis of projects: {e}")
        return {"status": "error", "message": str(e)}

    finally:
        db.close()


def get_projects_without_insights(db: Session, limit: int, languages: List[str]) -> List[Project]:
    """
    Get list of projects without analysis results for specific languages
    """
    projects = []
    projects_count = 0

    # Find projects that need analysis for each language
    for language in languages:
        if projects_count >= limit:
            break

        # Query projects without successful analysis in specified language
        query = (
            db.query(Project)
            .outerjoin(
                ProjectInsight,
                (ProjectInsight.project_id == Project.id)
                & (ProjectInsight.language == language)
                & (ProjectInsight.analysis_status == "success"),
            )
            .filter(ProjectInsight.id == None)
        )

        # Get number of projects that can be processed in this round
        remaining = limit - projects_count
        language_projects = query.limit(remaining).all()

        # Add projects to pending processing list
        for project in language_projects:
            if project not in projects:  # Avoid duplicates
                projects.append(project)
                projects_count += 1

    return projects


async def analyze_single_project(project: Project, language: str):
    """
    Analyze single project and store results
    """
    db = SessionLocal()
    try:
        logger.info(f"Start analyzing project {project.full_name} ({language})")

        # Check again if successful analysis already exists, avoid duplicate work
        existing_insight = (
            db.query(ProjectInsight)
            .filter(
                ProjectInsight.project_id == project.id,
                ProjectInsight.language == language,
                ProjectInsight.analysis_status == "success",
            )
            .first()
        )

        if existing_insight:
            logger.info(
                f"Project {project.full_name} ({language}) already has successful analysis results, skip"
            )
            return True

        # Prepare project data
        project_data = {
            "id": project.id,
            "name": project.name,
            "owner": project.owner,
            "full_name": project.full_name,
            "description": project.description,
            "repository_url": project.repository_url,
            "language": project.language,
            "stars_count": project.stars_count,
            "forks_count": project.forks_count,
        }

        # Use analysis service to analyze project
        try:
            success, insight = await ProjectAnalysisService.create_or_update_insight(
                project, project_data, language
            )

            if success:
                logger.info(f"Successfully analyzed project {project.full_name} ({language})")
                return True
            else:
                logger.warning(
                    f"Analysis of project {project.full_name} ({language}) was not completed successfully"
                )
                return False

        except Exception as analysis_error:
            logger.error(
                f"Error occurred while analyzing project {project.full_name} ({language}): {analysis_error}"
            )
            return False

    except Exception as e:
        logger.error(
            f"Error occurred while preparing to analyze project {project.full_name} ({language}): {e}"
        )
        return False

    finally:
        db.close()
