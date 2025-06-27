from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from app.db.base import get_db
from app.models.project import (
    Project as ProjectModel,
    ProjectInsight as ProjectInsightModel,
    Tag as TagModel,
)
from app.schemas.project import Project, ProjectInsight, ProjectResponse
from app.core.logging import get_logger
from app.core.config import settings

from app.services.ai.analyzer import ProjectAnalyzer
from app.services.analysis_service import ProjectAnalysisService

router = APIRouter()

logger = get_logger(__name__)


@router.get("/projects", response_model=ProjectResponse)
async def get_projects(
    search: Optional[str] = Query(None, description="Search project name or description"),
    language: Optional[str] = None,
    days: Optional[int] = Query(
        None, ge=1, description="Get projects from recent days, if not provided get all"
    ),
    limit: int = Query(settings.DEFAULT_PAGE_SIZE, ge=1, le=settings.MAX_SINGLE_REQUEST),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """
    Get GitHub trending projects list with pagination and language filtering support
    Optionally get projects from recent days, if not provided get all projects
    Support searching by project name or description

    Note: For server performance, maximum {settings.MAX_TOTAL_RESULTS} records returned
    """
    # Check if offset exceeds maximum limit
    if offset >= settings.MAX_TOTAL_RESULTS:
        return {
            "total": 0,
            "limit": limit,
            "offset": offset,
            "data": [],
            "message": "limit_reached",
        }

    query = db.query(ProjectModel)

    # Apply search filtering
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (ProjectModel.name.ilike(search_term))
            | (ProjectModel.description.ilike(search_term))
            | (ProjectModel.full_name.ilike(search_term))
        )

    # Apply language filtering
    if language:
        query = query.filter(ProjectModel.language == language)

    # Apply time filtering if days specified
    if days:
        days_ago = datetime.utcnow() - timedelta(days=days)
        query = query.filter(ProjectModel.trending_date >= days_ago)

    # Sort by popularity (star count) and trending_date
    query = query.order_by(ProjectModel.trending_date.desc(), ProjectModel.stars_count.desc())

    # Get total count, but limit within max_total_results
    total_count = query.count()
    total = min(total_count, settings.MAX_TOTAL_RESULTS)

    # Calculate actual retrievable count
    remaining = settings.MAX_TOTAL_RESULTS - offset
    actual_limit = min(limit, remaining)

    if actual_limit <= 0:
        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "data": [],
            "message": "limit_reached",
        }

    # Apply pagination
    projects = query.offset(offset).limit(actual_limit).all()

    response_data = {"total": total, "limit": limit, "offset": offset, "data": projects}

    # If approaching limit, add hint message
    if offset + limit >= settings.MAX_TOTAL_RESULTS:
        response_data["message"] = "approaching_limit"

    return response_data


@router.get("/languages", response_model=List[dict])
async def get_languages(db: Session = Depends(get_db)):
    """
    Get language statistics for all projects
    """
    # Use SQL aggregate query to get language statistics, no time range restriction
    result = (
        db.query(ProjectModel.language, func.count(ProjectModel.id).label("count"))
        .filter(ProjectModel.language.isnot(None))  # Only exclude projects without language
        .group_by(ProjectModel.language)
        .order_by(func.count(ProjectModel.id).desc())
        .all()
    )

    # Convert to dictionary list
    languages = [
        {"language": lang, "count": count}
        for lang, count in result
        if lang  # Ensure language is not empty again
    ]

    return languages


@router.get("/{owner}/{repo}", response_model=Project)
async def get_project_by_name(owner: str, repo: str, db: Session = Depends(get_db)):
    """
    Get project details by owner/repo format
    """
    full_name = f"{owner}/{repo}"
    project = db.query(ProjectModel).filter(ProjectModel.full_name == full_name).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("/{owner}/{repo}/insights", response_model=ProjectInsight)
async def get_project_insights_by_name(
    owner: str,
    repo: str,
    language: Optional[str] = Query("en", description="洞察内容的语言，默认为英文"),
    db: Session = Depends(get_db),
):
    """
    Get project AI analysis results by owner/repo format, supports specifying language
    """
    from sqlalchemy import exc
    from datetime import datetime

    full_name = f"{owner}/{repo}"
    project = db.query(ProjectModel).filter(ProjectModel.full_name == full_name).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        # First try to get the latest analysis result for specified language
        insight = (
            db.query(ProjectInsightModel)
            .filter(
                ProjectInsightModel.project_id == project.id,
                ProjectInsightModel.language == language,
            )
            .order_by(ProjectInsightModel.created_at.desc())
            .first()
        )

        # If there's already a successful analysis insight record, return directly
        if insight and insight.analysis_status == "success":
            return insight

        # If no insight record exists, or insight record analysis status is failed, need to re-analyze
        if not insight or insight.analysis_status == "failed":
            # If it's a failed status record, log it
            if insight and insight.analysis_status == "failed":
                logger.info(f"Re-analyzing failed project: {project.id}, language: {language}")

            # Convert SQLAlchemy model to dictionary for analysis
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

            # Use analysis service to process project
            success, new_insight = await ProjectAnalysisService.create_or_update_insight(
                project, project_data, language
            )

            if success and new_insight:
                # Use returned insight object directly, no need to query database again
                return new_insight

            # If creation failed through service, check if it was created by other processes during this time
            insight = (
                db.query(ProjectInsightModel)
                .filter(
                    ProjectInsightModel.project_id == project.id,
                    ProjectInsightModel.language == language,
                )
                .order_by(ProjectInsightModel.created_at.desc())
                .first()
            )

            # If record exists at this point, it might be created concurrently, return directly
            if insight:
                return insight

            # If still no record, return temporary error info object (dictionary form, not associated with ORM session)
            current_time = datetime.utcnow()
            return {
                "id": -1,  # Use special ID to identify temporary object
                "project_id": project.id,
                "business_value": "Cannot analyze project, please try again later",
                "market_opportunity": "No data, please try again later",
                "startup_ideas": "No data, please try again later",
                "target_audience": "No data, please try again later",
                "competition_analysis": "No data, please try again later",
                "analysis_version": "unknown",
                "analysis_status": "failed",
                "language": language,
                "created_at": current_time,
                "last_updated": current_time,
            }

        # Check if insight is in processing status (Note: this status is not implemented yet)
        if insight and insight.analysis_status == "processing":
            return insight

        return insight

    except exc.IntegrityError as e:
        db.rollback()
        logger.error(f"Unique constraint violation when creating project insight: {e}")

        # Try to get record again, might have been created by other processes during conflict
        try:
            insight = (
                db.query(ProjectInsightModel)
                .filter(
                    ProjectInsightModel.project_id == project.id,
                    ProjectInsightModel.language == language,
                )
                .order_by(ProjectInsightModel.created_at.desc())
                .first()
            )
            if insight:
                return insight
        except Exception as query_error:
            logger.error(f"Error re-querying record after conflict: {query_error}")

        # If still unable to get, return temporary error object (dictionary form, not associated with ORM session)
        current_time = datetime.utcnow()
        return {
            "id": -1,  # Use special ID to identify temporary object
            "project_id": project.id,
            "business_value": "Database conflict, please try again later",
            "market_opportunity": "No data, please try again later",
            "startup_ideas": "No data, please try again later",
            "target_audience": "No data, please try again later",
            "competition_analysis": "No data, please try again later",
            "analysis_version": "unknown",
            "analysis_status": "failed",
            "language": language,
            "created_at": current_time,
            "last_updated": current_time,
        }

    except Exception as e:
        # If analysis fails, return dictionary with error information (not associated with ORM session)
        logger.error(f"Error analyzing project {project.full_name}: {str(e)}")

        current_time = datetime.utcnow()
        return {
            "id": -1,  # Use special ID to identify temporary object
            "project_id": project.id,
            "business_value": (
                f"Sorry, there was an error analyzing this project: {str(e)[:100]}..."
            ),
            "market_opportunity": "No data, please try again later",
            "startup_ideas": "No data, please try again later",
            "target_audience": "No data, please try again later",
            "competition_analysis": "No data, please try again later",
            "analysis_version": "unknown",
            "analysis_status": "failed",
            "language": language,
            "created_at": current_time,
            "last_updated": current_time,
        }
