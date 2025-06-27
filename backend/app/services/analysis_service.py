from typing import Dict, Any, Optional, Tuple, List

from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError, IntegrityError

from app.models.project import Project, ProjectInsight
from app.services.ai.analyzer import ProjectAnalyzer
from app.db.base import SessionLocal
from app.core.logging import get_logger

# Configure logging
logger = get_logger(__name__)


class ProjectAnalysisService:
    """
    Project analysis service providing functionality to create and update project insights
    Contains logic to handle race conditions
    """

    @staticmethod
    async def create_or_update_insight(
        project: Project, project_data: Dict[str, Any], language: str
    ) -> Tuple[bool, Optional[ProjectInsight]]:
        """
        Create or update project insight, handling possible race conditions

        Args:
            project: Project object
            project_data: Project data
            language: Analysis language, such as 'en' or 'zh'

        Returns:
            Tuple[bool, Optional[ProjectInsight]]:
                - First value indicates whether operation was successful
                - Second value is the created or updated insight object (if successful)
        """
        db = SessionLocal()
        try:
            logger.info(f"Start {language} analysis for project: {project.full_name}")

            # Start transaction
            db.begin()

            # Use SELECT FOR UPDATE to lock rows, preventing concurrent access conflicts
            existing_insight = (
                db.query(ProjectInsight)
                .filter(
                    ProjectInsight.project_id == project.id,
                    ProjectInsight.language == language,
                )
                .with_for_update()  # Add row-level lock
                .first()
            )

            # Use analyzer for specified language
            analyzer = ProjectAnalyzer(output_language=language)
            analysis_result = await analyzer.analyze_project(project_data)

            try:
                if existing_insight:
                    # Update existing record
                    existing_insight.business_value = analysis_result.get("business_value")
                    existing_insight.market_opportunity = analysis_result.get("market_opportunity")
                    existing_insight.startup_ideas = analysis_result.get("startup_ideas")
                    existing_insight.target_audience = analysis_result.get("target_audience")
                    existing_insight.competition_analysis = analysis_result.get(
                        "competition_analysis"
                    )
                    existing_insight.analysis_version = analyzer.model_name
                    existing_insight.analysis_status = analysis_result.get(
                        "analysis_status", "success"
                    )
                    existing_insight.last_updated = datetime.utcnow()
                    logger.info(f"Update {language} analysis for project: {project.full_name}")
                    insight_to_return = existing_insight
                else:
                    # Create new record
                    project_insight = ProjectInsight(
                        project_id=project.id,
                        business_value=analysis_result.get("business_value"),
                        market_opportunity=analysis_result.get("market_opportunity"),
                        startup_ideas=analysis_result.get("startup_ideas"),
                        target_audience=analysis_result.get("target_audience"),
                        competition_analysis=analysis_result.get("competition_analysis"),
                        analysis_version=analyzer.model_name,
                        analysis_status=analysis_result.get("analysis_status", "success"),
                        language=language,
                    )
                    db.add(project_insight)
                    logger.info(f"Create {language} analysis for project: {project.full_name}")
                    insight_to_return = project_insight

                db.commit()
                db.refresh(insight_to_return)
                logger.info(
                    f"Successfully completed {language} analysis for project: {project.full_name}"
                )
                return True, insight_to_return

            except IntegrityError as e:
                db.rollback()
                logger.error(
                    f"Unique constraint violation when storing {language} analysis result for project: {project.full_name}: {e}"
                )

                # Try to handle conflict using session retry
                try:
                    # Restart transaction
                    db.begin()

                    # Since there might be concurrent insertion, need to check again if record already exists
                    existing_insight = (
                        db.query(ProjectInsight)
                        .filter(
                            ProjectInsight.project_id == project.id,
                            ProjectInsight.language == language,
                        )
                        .with_for_update()  # Ensure row is locked
                        .first()
                    )

                    if existing_insight:
                        # Record already exists, update it
                        existing_insight.business_value = analysis_result.get("business_value")
                        existing_insight.market_opportunity = analysis_result.get(
                            "market_opportunity"
                        )
                        existing_insight.startup_ideas = analysis_result.get("startup_ideas")
                        existing_insight.target_audience = analysis_result.get("target_audience")
                        existing_insight.competition_analysis = analysis_result.get(
                            "competition_analysis"
                        )
                        existing_insight.analysis_version = analyzer.model_name
                        existing_insight.analysis_status = analysis_result.get(
                            "analysis_status", "success"
                        )
                        existing_insight.last_updated = datetime.utcnow()

                        db.commit()
                        db.refresh(existing_insight)
                        logger.info(
                            f"Successfully updated {language} analysis for project: {project.full_name} through retry"
                        )
                        return True, existing_insight
                    else:
                        # Record should exist (because conflict just occurred), but now it doesn't - this is unusual
                        # Try one creation operation
                        new_insight = ProjectInsight(
                            project_id=project.id,
                            business_value=analysis_result.get("business_value"),
                            market_opportunity=analysis_result.get("market_opportunity"),
                            startup_ideas=analysis_result.get("startup_ideas"),
                            target_audience=analysis_result.get("target_audience"),
                            competition_analysis=analysis_result.get("competition_analysis"),
                            analysis_version=analyzer.model_name,
                            analysis_status=analysis_result.get("analysis_status", "success"),
                            language=language,
                            created_at=datetime.utcnow(),
                            last_updated=datetime.utcnow(),
                        )

                        db.add(new_insight)
                        db.commit()
                        db.refresh(new_insight)
                        logger.info(
                            f"Successfully stored {language} analysis for project: {project.full_name} after conflict"
                        )
                        return True, new_insight

                except SQLAlchemyError as retry_error:
                    db.rollback()
                    logger.error(f"Error during retry to handle conflict: {retry_error}")

                    # Last attempt: directly query existing record and return
                    try:
                        final_insight = (
                            db.query(ProjectInsight)
                            .filter(
                                ProjectInsight.project_id == project.id,
                                ProjectInsight.language == language,
                            )
                            .first()
                        )

                        if final_insight:
                            logger.info(
                                f"Successfully found existing {language} analysis record for project: {project.full_name}"
                            )
                            return True, final_insight
                    except Exception as e:
                        logger.error(f"Final query attempt failed: {e}")

                    return False, None

            except Exception as e:
                db.rollback()
                logger.error(
                    f"Error storing {language} analysis result for project: {project.full_name}: {e}"
                )
                return False, None

        except Exception as e:
            logger.error(f"Error analyzing project {project.full_name} ({language}): {e}")
            return False, None
        finally:
            # Ensure database connection is closed
            db.close()

    @staticmethod
    def check_if_insights_needed(
        project: Project, languages: List[str] = ["en", "zh"]
    ) -> Dict[str, bool]:
        """
        Check if project needs analysis for specified languages

        Args:
            project: Project object
            languages: List of languages to check

        Returns:
            Dict[str, bool]: Dictionary indicating whether analysis is needed for each language
        """
        db = SessionLocal()
        try:
            needs_analysis = {}

            for language in languages:
                # Check if successful analysis result already exists
                existing_insight = (
                    db.query(ProjectInsight)
                    .filter(
                        ProjectInsight.project_id == project.id,
                        ProjectInsight.analysis_status == "success",
                        ProjectInsight.language == language,
                    )
                    .first()
                )

                # If no successful insight, then analysis is needed
                needs_analysis[language] = existing_insight is None

            return needs_analysis

        except Exception as e:
            logger.error(f"Error checking analysis needs for project {project.full_name}: {e}")
            # If error occurs, default to needing analysis for all
            return {lang: True for lang in languages}
        finally:
            db.close()
