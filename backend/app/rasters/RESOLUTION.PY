import os
import rasterio

folder_path = r"D:\Attachment_DSS\backend\data\rasters"

print(f"\nScanning folder: {folder_path}\n")

for file in os.listdir(folder_path):
    if file.lower().endswith(".tif"):
        tif_path = os.path.join(folder_path, file)

        try:
            with rasterio.open(tif_path) as src:
                print("========================================")
                print(f"File: {file}")
                print(f"CRS: {src.crs}")
                print(f"Width (cols): {src.width}")
                print(f"Height (rows): {src.height}")
                print(f"Bounds: {src.bounds}")
                print(f"Pixel Size X: {src.res[0]}")
                print(f"Pixel Size Y: {src.res[1]}")
                print(f"Transform:\n{src.transform}")
                print("========================================\n")

        except Exception as e:
            print(f"❌ Failed to read {file}: {e}\n")
