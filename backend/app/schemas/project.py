from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, HttpUrl, Field


class TagBase(BaseModel):
    name: str
    category: Optional[str] = None


class TagCreate(TagBase):
    pass


class Tag(TagBase):
    id: int

    class Config:
        from_attributes = True


class ProjectBase(BaseModel):
    name: str
    owner: str
    full_name: str
    description: Optional[str] = None
    language: Optional[str] = None
    repository_url: HttpUrl
    homepage_url: Optional[HttpUrl] = None


class ProjectCreate(ProjectBase):
    pass


class Project(ProjectBase):
    id: int
    stars_count: int
    forks_count: int
    trending_date: datetime
    created_at: datetime
    last_updated: datetime
    tags: List[Tag] = []

    class Config:
        from_attributes = True


class ProjectInsightBase(BaseModel):
    business_value: Optional[str] = None
    market_opportunity: Optional[str] = None
    startup_ideas: Optional[str] = None
    target_audience: Optional[str] = None
    competition_analysis: Optional[str] = None
    analysis_status: Optional[str] = "success"
    language: str = "en"  # Default to English


class ProjectInsightCreate(ProjectInsightBase):
    project_id: int


class ProjectInsight(ProjectInsightBase):
    id: int
    project_id: int
    analysis_version: Optional[str] = None
    created_at: datetime
    last_updated: datetime

    class Config:
        from_attributes = True


# Model for API responses
class ProjectResponse(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[Project]
    message: Optional[str] = (
        None  # Optional hint message for informing users about data limitations etc.
    )

    class Config:
        from_attributes = True
