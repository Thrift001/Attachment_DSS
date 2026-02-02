import os
import pandas as pd
from sqlalchemy import create_engine

# --- CONFIGURATION ---
# GIS PROFESSIONAL COMMENT: Automated path resolution for statistical CSV ingestion.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_URL = os.getenv("DATABASE_URL", "postgresql://postgres:thrift@localhost:5585/somalia_dss_new")
CSV_PATH = os.path.join(BASE_DIR, "Final_State_Statistics.csv")
TABLE_NAME = "state_statistics"

# --- EXECUTION ---
print("Connecting to the spatial database...")
engine = create_engine(DB_URL)

if not os.path.exists(CSV_PATH):
    print(f"[ERROR] Source stats file not found at: {CSV_PATH}")
else:
    print(f"Reading administrative data from {CSV_PATH}...")
    df = pd.read_csv(CSV_PATH)

    print(f"Synchronizing metrics into the '{TABLE_NAME}' table...")
    # SQL Transaction: Replaces technical indicators table with verified metrics.
    df.to_sql(TABLE_NAME, engine, if_exists='replace', index=False)
    print("SUCCESS: SDI attribute tables updated.")