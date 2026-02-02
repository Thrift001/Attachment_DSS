import os
import rasterio
from rasterio.warp import calculate_default_transform, reproject
from rasterio.enums import Resampling

INPUT_DIR = r"D:\Attachment_DSS\backend\data\rasters"
OUTPUT_DIR = r"D:\Attachment_DSS\backend\data\rasters\processed"

TARGET_CRS = "EPSG:32638"
BASE_RES = 100      # meters
FINAL_FACTOR = 10   # 100 m -> 1000 m

os.makedirs(OUTPUT_DIR, exist_ok=True)

def reproject_and_resample(src_path, dst_path, target_res):
    print(f"🔁 Reprojecting + resampling → {os.path.basename(dst_path)}")

    with rasterio.open(src_path) as src:
        transform, width, height = calculate_default_transform(
            src.crs,
            TARGET_CRS,
            src.width,
            src.height,
            *src.bounds,
            resolution=(target_res, target_res)
        )

        meta = src.meta.copy()
        meta.update({
            "crs": TARGET_CRS,
            "transform": transform,
            "width": width,
            "height": height
        })

        with rasterio.open(dst_path, "w", **meta) as dst:
            reproject(
                source=rasterio.band(src, 1),
                destination=rasterio.band(dst, 1),
                src_transform=src.transform,
                src_crs=src.crs,
                dst_transform=transform,
                dst_crs=TARGET_CRS,
                resampling=Resampling.bilinear
            )

def degrade_to_1km(src_path, dst_path):
    print(f"📉 Degrading to 1 km → {os.path.basename(dst_path)}")

    with rasterio.open(src_path) as src:
        new_width = src.width // FINAL_FACTOR
        new_height = src.height // FINAL_FACTOR

        new_transform = src.transform * src.transform.scale(
            src.width / new_width,
            src.height / new_height
        )

        meta = src.meta.copy()
        meta.update({
            "width": new_width,
            "height": new_height,
            "transform": new_transform
        })

        data = src.read(
            out_shape=(1, new_height, new_width),
            resampling=Resampling.average
        )

        with rasterio.open(dst_path, "w", **meta) as dst:
            dst.write(data)

print("\n🚀 DSS RASTER STANDARDIZATION PIPELINE STARTED\n")

for file in os.listdir(INPUT_DIR):
    if not file.lower().endswith(".tif"):
        continue

    src_path = os.path.join(INPUT_DIR, file)
    base_name = os.path.splitext(file)[0]

    print(f"\n==============================")
    print(f"📂 Processing: {file}")

    with rasterio.open(src_path) as src:
        crs = src.crs
        res_x, res_y = src.res

    # STEP 1: Reproject / normalize to 100 m
    temp_100m = os.path.join(OUTPUT_DIR, f"{base_name}_100m.tif")

    if crs != rasterio.crs.CRS.from_string(TARGET_CRS) or abs(res_x - BASE_RES) > 1:
        reproject_and_resample(src_path, temp_100m, BASE_RES)
    else:
        print("✅ CRS and resolution already correct (100 m)")
        temp_100m = src_path

    # STEP 2: Degrade to 1 km (skip ultra-coarse rasters)
    if res_x <= BASE_RES * FINAL_FACTOR:
        final_1km = os.path.join(OUTPUT_DIR, f"{base_name}_1km.tif")
        degrade_to_1km(temp_100m, final_1km)
    else:
        print("⚠️ Raster coarser than 1 km — skipped degradation")

print("\n✅ PIPELINE COMPLETE — ALL RASTERS STANDARDIZED\n")
