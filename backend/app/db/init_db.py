from sqlalchemy.orm import Session

from app.db.base import Base, engine
from app.models.project import Project, ProjectInsight, Tag
from app.core.logging import get_logger

# Configure logging
logger = get_logger(__name__)


def init_db() -> None:
    """
    Initialize database table structure
    """
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created")


if __name__ == "__main__":
    init_db()
