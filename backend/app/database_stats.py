import pandas as pd
from sqlalchemy import create_engine

# --- CONFIGURATION ---
DB_URL = "postgresql://postgres:thrift@localhost:5585/somalia_dss_new"
CSV_PATH = "D:/Attachment/DSS/Somalia_DSS_Project/csv/Final_State_Statistics.csv"
TABLE_NAME = "state_statistics"

# --- EXECUTION ---
print("Connecting to the database...")
engine = create_engine(DB_URL)

print(f"Reading data from {CSV_PATH}...")
df = pd.read_csv(CSV_PATH)

# IMPORTANT: Make sure your CSV column names match the database table names EXACTLY.
# If they don't, rename them in pandas before loading.
# Example: df = df.rename(columns={"Federal_State": "state_name"})

print(f"Loading data into the '{TABLE_NAME}' table...")
# Use 'if_exists='replace'' to wipe the table before loading, or 'append' to add new rows.
df.to_sql(TABLE_NAME, engine, if_exists='replace', index=False)

print("SUCCESS: Data has been loaded into the database.")