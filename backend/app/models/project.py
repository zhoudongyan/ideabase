import json

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Table, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.mutable import MutableDict
from sqlalchemy.types import TypeDecorator

from datetime import datetime

from app.db.base import Base


# Custom type converter to handle conversion between Python dict and JSONB
class JSONBType(TypeDecorator):
    impl = JSONB

    def process_bind_param(self, value, dialect):
        if value is not None:
            # Convert Python objects to JSON strings
            return json.dumps(value)
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            # Convert JSON strings back to Python objects
            return value
        return value


# Many-to-many relationship intermediate table for projects and tags
project_tag = Table(
    "project_tag",
    Base.metadata,
    Column("project_id", Integer, ForeignKey("projects.id"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id"), primary_key=True),
)


class Project(Base):
    """GitHub Trending project model"""

    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    owner = Column(String(255), nullable=False)
    full_name = Column(String(512), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    repository_url = Column(String(512), nullable=False)
    homepage_url = Column(String(512), nullable=True)
    language = Column(String(100), nullable=True)
    stars_count = Column(Integer, default=0)
    forks_count = Column(Integer, default=0)

    # Scraping related fields
    trending_date = Column(DateTime, default=datetime.utcnow)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    insights = relationship(
        "ProjectInsight", back_populates="project", cascade="all, delete-orphan"
    )
    tags = relationship("Tag", secondary=project_tag, back_populates="projects")


class ProjectInsight(Base):
    """Project AI analysis insights"""

    __tablename__ = "project_insights"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    analysis_version = Column(String, nullable=True)
    analysis_status = Column(
        String, default="success", nullable=True
    )  # Add analysis status field, default to success
    language = Column(
        String(10), default="en", nullable=False
    )  # Insight analysis language, default English

    # Use Text type to store JSON strings
    business_value = Column(Text, nullable=True)
    market_opportunity = Column(Text, nullable=True)
    startup_ideas = Column(Text, nullable=True)
    target_audience = Column(Text, nullable=True)
    competition_analysis = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="insights")


class Tag(Base):
    """Project tag model"""

    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    category = Column(
        String(100), nullable=True
    )  # Tag category, such as "Technology", "Domain", etc.

    # Relationships
    projects = relationship("Project", secondary=project_tag, back_populates="tags")
