import os
import rasterio

# =========================================================================
# GIS INFRASTRUCTURE AUDIT: Raster Data Store Verification
# Logic: This script verifies the existence and geodetic integrity of 
# the GeoTIFF assets within the production environment.
# =========================================================================

def audit_raster_store():
    # GIS PROFESSIONAL COMMENT: Retrieving the operational directory 
    # from the environment metadata.
    raster_dir = os.getenv("RASTER_DIR", "/data/rasters")
    
    print(f"[INFO] Initiating audit of Raster Data Store at: {raster_dir}")
    
    # List of critical analytical assets required for the Somalia DSS
    required_rasters = [
        "Solar_Potential_Final_Map.tif",
        "Wind_Potential_Final_Map.tif",
        "GHI.tif",
        "Wind_Speed.tif",
        "WPD.tif",
        "Slopes.tif"
    ]
    
    if not os.path.exists(raster_dir):
        print(f"[ERROR] Critical failure: Path {raster_dir} does not exist in the production container.")
        return

    found_files = os.listdir(raster_dir)
    print(f"[INFO] Files detected in production volume: {found_files}")

    for raster_name in required_rasters:
        path = os.path.join(raster_dir, raster_name)
        if raster_name in found_files:
            try:
                # GIS PROFESSIONAL COMMENT: Executing a test-open to verify 
                # GDAL driver compatibility and coordinate reference system (CRS) headers.
                with rasterio.open(path) as src:
                    print(f"[SUCCESS] {raster_name} is VALID. CRS: {src.crs} | Bounds: {src.bounds}")
            except Exception as e:
                print(f"[ERROR] {raster_name} found but CORRUPT or UNREADABLE: {e}")
        else:
            print(f"[CRITICAL] {raster_name} MISSING from production environment.")

if __name__ == "__main__":
    audit_raster_store()