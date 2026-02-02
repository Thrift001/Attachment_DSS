import os
import json
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from shapely.geometry import shape
from geoalchemy2.shape import from_shape
from .database import Base, engine
from .models import FederalState

# =========================================================================
# SPATIAL DATA MIGRATION: GeoJSON-to-PostGIS Orchestrator
# Logic: Parses serialized JavaScript objects into OGC-compliant geometries
# for the Somalia Decision Support System.
# =========================================================================

# GIS PROFESSIONAL COMMENT: Defining the geodetic reference system (SRID 4326)
# to ensure coordinate alignment during the relational mapping process.
SRID = 4326

# GIS PROFESSIONAL COMMENT: Path resolution for the local Javascript 
# Spatial Data Source.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
JS_FILE_PATH = os.path.join(BASE_DIR, "..", "..", "frontend", "js", "FederalStates_1.js")

def run_spatial_ingestion():
    print(f"[INFO] Accessing Spatial Data Source: {JS_FILE_PATH}")
    
    if not os.path.exists(JS_FILE_PATH):
        print(f"[ERROR] Source file missing at: {JS_FILE_PATH}")
        return

    # GIS PROFESSIONAL COMMENT: Sanitizing the JavaScript file to extract 
    # the raw GeoJSON FeatureCollection.
    with open(JS_FILE_PATH, 'r', encoding='utf-8') as f:
        content = f.read()
        # Removing 'var json_FederalStates_1 = ' and the trailing ';'
        json_str = content.split('=', 1)[1].strip().rstrip(';')
        data = json.loads(json_str)

    # GIS PROFESSIONAL COMMENT: Initializing high-level session factory 
    # for transactional integrity during bulk geometry ingestion.
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        print(f"[INFO] Purging existing boundary records to refresh SDI layers...")
        db.query(FederalState).delete()
        
        features = data.get("features", [])
        print(f"[INFO] Synchronizing {len(features)} Federal State geometries...")

        for feature in features:
            props = feature.get("properties", {})
            geom_data = feature.get("geometry")
            
            # GIS PROFESSIONAL COMMENT: Mapping administrative attributes.
            # Using the 'States' key from the source JS and mapping it to the 
            # 'state_name' column in the production schema.
            state_name = props.get("States", "Unknown Region")
            
            # GIS PROFESSIONAL COMMENT: Translating GeoJSON geometry into 
            # Shapely objects for conversion to binary PostGIS format.
            spatial_geometry = shape(geom_data)
            
            new_state = FederalState(
                state_name=state_name,
                geom=from_shape(spatial_geometry, srid=SRID)
            )
            db.add(new_state)

        db.commit()
        print(f"[SUCCESS] Spatial Infrastructure synchronized. {len(features)} states live.")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Spatial Migration failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_spatial_ingestion()
