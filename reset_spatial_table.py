import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# =========================================================================
# SDI SCHEMA RECONCILIATION SCRIPT
# Logic: Purges desynchronized spatial relations to allow for 
# structural alignment with the DSS Python Models.
# =========================================================================

load_dotenv()

# GIS PROFESSIONAL COMMENT: Establishing administrative connection to the 
# production RDBMS via the established TCP Proxy.
DB_URL = "postgresql://postgres:thrift@interchange.proxy.rlwy.net:44328/somalia_dss_new"

def reconcile_schema():
    engine = create_engine(DB_URL)
    try:
        with engine.connect() as conn:
            print("[INFO] Initiating Table Drop for: federal_states")
            # GIS PROFESSIONAL COMMENT: Dropping the relation to remove 
            # the legacy 'states' column constraint.
            conn.execute(text("DROP TABLE IF EXISTS federal_states CASCADE;"))
            conn.commit()
            print("[SUCCESS] Legacy spatial table purged. Ready for schema re-initialization.")
    except Exception as e:
        print(f"[ERROR] Schema reconciliation failed: {e}")

if __name__ == "__main__":
    reconcile_schema()