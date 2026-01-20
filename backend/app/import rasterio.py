import rasterio

# Print Rasterio + PROJ version
print("Rasterio version:", rasterio.__version__)
try:
    from rasterio.crs import PROJ_VERSION
    print("PROJ version (from Rasterio):", PROJ_VERSION)
except Exception as e:
    print("Could not get PROJ version:", e)

# Now check CRS of each raster you opened
rasters = {
    'solar_mean_score': r'D:\Attachment_DSS\backend\app\rasters\Solar_Potential_Final_Map.tif',
    'wind_mean_score': r'D:\Attachment_DSS\backend\app\rasters\Wind_Potential_Final_Map.tif',
    'mean_ghi': r'D:\Attachment_DSS\backend\app\rasters\GHI.tif',
    'mean_wind_speed_ms': r'D:\Attachment_DSS\backend\app\rasters\Wind_Speed.tif',
    'mean_wpd': r'D:\Attachment_DSS\backend\app\rasters\WPD.tif',
    'slope': r'D:\Attachment_DSS\backend\app\rasters\Slopes.tif',
}

for key, path in rasters.items():
    try:
        with rasterio.open(path) as src:
            print(f"{key}: CRS = {src.crs}, bounds = {src.bounds}")
    except Exception as e:
        print(f"{key}: ERROR -> {e}")
