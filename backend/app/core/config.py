import os
from pathlib import Path
from typing import Any, Dict, List, Optional

from pydantic import PostgresDsn, validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # PostgreSQL database settings
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "localhost")
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "ideabase")
    SQLALCHEMY_DATABASE_URI: Optional[PostgresDsn] = None

    @validator("SQLALCHEMY_DATABASE_URI", pre=True)
    def assemble_db_connection(cls, v: Optional[str], values: Dict[str, Any]) -> Any:
        if isinstance(v, str):
            return v
        return PostgresDsn.build(
            scheme="postgresql",
            username=values.get("POSTGRES_USER"),
            password=values.get("POSTGRES_PASSWORD"),
            host=values.get("POSTGRES_SERVER"),
            path=f"{values.get('POSTGRES_DB') or ''}",
        )

    # Redis settings
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))

    # OpenAI API settings
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4")
    OPENAI_BASE_URL: str = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")

    # GitHub API settings
    GITHUB_TOKEN: Optional[str] = os.getenv("GITHUB_TOKEN")

    # Scraper settings
    SCRAPE_INTERVAL_HOURS: int = int(os.getenv("SCRAPE_INTERVAL_HOURS", "24"))

    # CORS settings
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",  # Local development frontend
        "http://localhost:8000",  # Local development backend
        "https://ideabase.ai",  # Production domain
        "http://ideabase.ai",  # Production domain (HTTP)
        "https://www.ideabase.ai",  # www subdomain
        "http://www.ideabase.ai",  # www subdomain (HTTP)
    ]

    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "IdeaBase"

    # Data Limits - Data limitation configuration
    MAX_TOTAL_RESULTS: int = int(
        os.getenv("MAX_TOTAL_RESULTS", "100")
    )  # Maximum number of returned results
    MAX_SINGLE_REQUEST: int = int(
        os.getenv("MAX_SINGLE_REQUEST", "50")
    )  # Maximum number per single request
    DEFAULT_PAGE_SIZE: int = int(os.getenv("DEFAULT_PAGE_SIZE", "20"))  # Default page size

    class Config:
        case_sensitive = True
        # Support reading from .env file (if exists) and directly from environment variables
        env_file = ".env"
        # Allow additional environment variables to avoid validation errors
        extra = "ignore"


settings = Settings()
