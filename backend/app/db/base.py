from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

# Create SQLAlchemy engine
engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))

# Create database session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declare base model class
Base = declarative_base()


# Get database session dependency function
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
