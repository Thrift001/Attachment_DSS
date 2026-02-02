import os
import json
import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from shapely.geometry import shape
from geoalchemy2.shape import from_shape

# GIS PROFESSIONAL COMMENT: Importing normalized models to ensure 
# transactional consistency across the Spatial Data Infrastructure.
from backend.app.database import Base, engine
from backend.app.models import FederalState, StateStatistic

# =========================================================================
# SOMALIA DSS - MASTER SPATIAL SYNCHRONIZATION (V2 - INTEGRITY FIXED)
# Logic: Orchestrates schema reset and handles name-mapping between 
# administrative dossiers (CSV) and geodetic boundaries (JS).
# =========================================================================

SRID = 4326
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, "backend", "app", "Final_State_Statistics.csv")
JS_FILE_PATH = os.path.join(BASE_DIR, "frontend", "js", "FederalStates_1.js")

# GIS PROFESSIONAL COMMENT: Administrative Name Resolver.
# Maps short-form technical indices to official OGC boundary identifiers.
NAME_MAP = {
    "Banadir": "Banadir Regional Admin",
    "Hiraan": "Hirshabelle",
    "Awdal": "Somaliland",
    "Galgaduud": "Galmudug",
    "Mudug": "Mudug (Split Region)",
    "Bari": "Puntland",
    "Gedo": "Jubaland",
    "Bakool": "Southwest State"
}

def run_master_sync():
    db_url = os.getenv("DATABASE_URL")
    if not db_url or "localhost" in db_url:
        db_url = "postgresql://postgres:thrift@interchange.proxy.rlwy.net:44328/somalia_dss_new"
    
    print(f"[INFO] Initializing Master Sync on endpoint: {db_url.split('@')[-1]}")
    prod_engine = create_engine(db_url)
    
    print("[INFO] Purging legacy tables: federal_states, state_statistics")
    with prod_engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS state_statistics CASCADE;"))
        conn.execute(text("DROP TABLE IF EXISTS federal_states CASCADE;"))
        conn.commit()

    print("[INFO] Reconstructing Spatial Schema...")
    Base.metadata.create_all(bind=prod_engine)

    SessionLocal = sessionmaker(bind=prod_engine)
    db = SessionLocal()

    try:
        # --- PHASE 1: GEOMETRY INGESTION ---
        print(f"[INFO] Parsing Spatial Data Source: {JS_FILE_PATH}")
        with open(JS_FILE_PATH, 'r', encoding='utf-8') as f:
            content = f.read()
            json_str = content.split('=', 1)[1].strip().rstrip(';')
            spatial_data = json.loads(json_str)

        features = spatial_data.get("features", [])
        print(f"[INFO] Synchronizing {len(features)} geodetic boundaries...")
        
        for feature in features:
            props = feature.get("properties", {})
            geom_data = feature.get("geometry")
            # GIS PROFESSIONAL COMMENT: Extracting the primary administrative key.
            state_name = props.get("States", "Unknown Region")
            
            spatial_geometry = shape(geom_data)
            new_state = FederalState(
                state_name=state_name,
                geom=from_shape(spatial_geometry, srid=SRID)
            )
            db.add(new_state)
        
        # Flush to ensure parent rows exist before children (Foreign Key requirement)
        db.flush()

        # --- PHASE 2: ATTRIBUTE ALIGNMENT & INGESTION ---
        print(f"[INFO] Ingesting Technical Attribute Dossier: {CSV_PATH}")
        df = pd.read_csv(CSV_PATH)

        # GIS PROFESSIONAL COMMENT: Normalizing technical attributes.
        # Re-mapping CSV short-names to match the PostGIS Primary Key index.
        df['state_name'] = df['state_name'].replace(NAME_MAP)

        print(f"[INFO] Uploading technical metrics for: {df['state_name'].tolist()}")
        df.to_sql("state_statistics", prod_engine, if_exists='append', index=False)

        db.commit()
        print("[SUCCESS] SDI Master Synchronization Complete. Relational integrity established.")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Master Sync failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_master_sync()