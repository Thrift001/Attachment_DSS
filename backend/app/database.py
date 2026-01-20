import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Prefer Render's DATABASE_URL, fallback to local for dev
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:thrift@localhost:5585/somalia_dss_new"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    print("Database session created")
    try:
        yield db
    finally:
        db.close()  # end of database.py
        print("Database session closed")        