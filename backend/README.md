# IdeaBase.ai Backend

IdeaBase.ai backend is a FastAPI-based Python application for scraping GitHub Trending projects and using AI to analyze their commercial value and entrepreneurial opportunities.

## Features

- Automatic scraping of GitHub Trending projects
- Commercial value analysis using OpenAI GPT-4 model
- RESTful API interfaces for data access
- Scheduled task system for automatic data updates

## Tech Stack

- FastAPI: Modern, high-performance web framework
- SQLAlchemy: ORM for database interaction
- Celery: Distributed task queue
- Redis: Cache and task queue backend
- OpenAI API: AI analysis engine
- PostgreSQL: Relational database

## Installation and Setup

### Prerequisites

- Python 3.9+
- PostgreSQL
- Redis

### Environment Setup

1. Create virtual environment

```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate  # Windows
```

2. Install dependencies

```bash
pip install -r requirements.txt
```

3. Create `.env` file

```bash
# Database configuration
POSTGRES_SERVER=localhost
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=ideabase

# Redis configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# OpenAI API
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4

# GitHub API (optional, improves scraping speed and stability)
GITHUB_TOKEN=your_github_token
```

4. Initialize database

```bash
alembic upgrade head
```

### Running the Application

1. Start backend API service

```bash
uvicorn main:app --reload
```

2. Start Celery worker (handles scheduled tasks)

```bash
celery -A app.tasks.scrape_trending worker --loglevel=info
```

3. Start Celery beat (schedules periodic tasks)

```bash
celery -A app.tasks.scrape_trending beat --loglevel=info
```

## API Documentation

After starting the service, visit the following URLs to view API documentation:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Development

### Adding New Features

1. Define new data models in `app/models`
2. Create database migration using Alembic: `alembic revision --autogenerate -m "description"`
3. Add business logic in `app/services`
4. Create new API routes in `app/api/endpoints`
5. Register routes in `app/api/api.py`

## Testing

Run unit tests:

```bash
pytest
```

## Deployment

Docker deployment is recommended. See `docker/backend/Dockerfile` and `docker-compose.yml` in the project root directory.
