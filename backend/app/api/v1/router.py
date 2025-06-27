from fastapi import APIRouter

from app.api.v1.endpoints import projects, admin

api_router = APIRouter()

api_router.include_router(projects.router, tags=["projects"])

api_router.include_router(admin.router, tags=["admin"])
