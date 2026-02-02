import os
import json
import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from shapely.geometry import shape
from geoalchemy2.shape import from_shape

# GIS PROFESSIONAL COMMENT: Importing SDI models to enforce schema 
# constraints during the multi-phase ETL process.
from backend.app.database import Base
from backend.app.models import FederalState, StateStatistic

# =========================================================================
# SOMALIA DSS - MASTER SPATIAL SYNCHRONIZATION (V3 - TRANSACTION FIXED)
# Logic: Ensures Parent-Child relational integrity by committing geodetic 
# boundaries before injecting administrative attribute datasets.
# =========================================================================

SRID = 4326
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, "backend", "app", "Final_State_Statistics.csv")
JS_FILE_PATH = os.path.join(BASE_DIR, "frontend", "js", "FederalStates_1.js")

# GIS PROFESSIONAL COMMENT: Technical Name Mapping.
# Resolves discrepancies between technical dossiers and official boundary names.
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
    # GIS PROFESSIONAL COMMENT: Administrative Endpoint Resolution.
    db_url = os.getenv("DATABASE_URL")
    if not db_url or "localhost" in db_url:
        db_url = "postgresql://postgres:thrift@interchange.proxy.rlwy.net:44328/somalia_dss_new"
    
    print(f"[INFO] Initializing Master Sync on endpoint: {db_url.split('@')[-1]}")
    prod_engine = create_engine(db_url)
    
    # GIS PROFESSIONAL COMMENT: Schema Reconciliation.
    # We purge the child table (statistics) before the parent table (boundaries).
    print("[INFO] Purging legacy spatial relations...")
    with prod_engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS state_statistics CASCADE;"))
        conn.execute(text("DROP TABLE IF EXISTS federal_states CASCADE;"))
        conn.commit()

    print("[INFO] Reconstructing Spatial Schema...")
    Base.metadata.create_all(bind=prod_engine)

    # Initialize Session
    SessionLocal = sessionmaker(bind=prod_engine)
    db = SessionLocal()

    try:
        # --- PHASE 1: GEOMETRY INGESTION (THE PARENT DATA) ---
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
            state_name = props.get("States", "Unknown Region")
            
            spatial_geometry = shape(geom_data)
            new_state = FederalState(
                state_name=state_name,
                geom=from_shape(spatial_geometry, srid=SRID)
            )
            db.add(new_state)
        
        # GIS PROFESSIONAL COMMENT: Critical Commit.
        # We must finalize the write-operation for the FederalState table 
        # to satisfy Foreign Key constraints before proceeding to Phase 2.
        db.commit()
        print("[SUCCESS] Geodetic boundaries committed to SDI.")

        # --- PHASE 2: ATTRIBUTE ALIGNMENT & INGESTION (THE CHILD DATA) ---
        print(f"[INFO] Ingesting Technical Attribute Dossier: {CSV_PATH}")
        df = pd.read_csv(CSV_PATH)

        # Normalize the name column to match the committed boundaries
        df['state_name'] = df['state_name'].replace(NAME_MAP)

        print(f"[INFO] Linking metrics to committed administrative keys...")
        # Direct write via engine to handle the dataframe upload
        df.to_sql("state_statistics", prod_engine, if_exists='append', index=False)

        print("[SUCCESS] SDI Master Synchronization Complete. Full relational logic enabled.")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Master Sync failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_master_sync()