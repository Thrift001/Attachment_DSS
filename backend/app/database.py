import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# GIS PROFESSIONAL COMMENT: Automated RDBMS Endpoint Detection.
# Resolves Render's 'postgres://' URI convention to SQLAlchemy's 'postgresql://' standard.
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
elif not DATABASE_URL:
    # Fallback to local development endpoint
    DATABASE_URL = "postgresql://postgres:thrift@localhost:5585/somalia_dss_new"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Dependency for providing spatial database sessions."""
    db = SessionLocal()
    print("[INFO] Spatial DB Session initiated")
    try:
        yield db
    finally:
        db.close()
        print("[INFO] Spatial DB Session terminated")