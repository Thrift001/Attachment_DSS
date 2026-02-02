import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# =========================================================================
# GIS DATABASE CONNECTOR
# Logic: Dynamically resolves the RDBMS endpoint based on the environment.
# =========================================================================

# GIS PROFESSIONAL COMMENT: Automated Endpoint Detection. 
# In production (Railway/Render), DATABASE_URL is provided by the host.
# In local development (Offline), we fallback to the local loopback address.
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    # Standardizing Render/Railway URI for SQLAlchemy compatibility
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
elif not DATABASE_URL:
    # Local Development Fallback
    DATABASE_URL = "postgresql://postgres:thrift@localhost:5585/somalia_dss_new"

print(f"[INFO] Initializing Spatial Engine with endpoint: {DATABASE_URL.split('@')[-1]}")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """
    GIS PROFESSIONAL COMMENT: Dependency generator for providing database
    sessions to FastAPI endpoints. Ensures resource cleanup after transaction.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()