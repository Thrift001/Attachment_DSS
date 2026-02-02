import rasterio

tif_path = "D:\\Attachment_DSS\\backend\\data\\rasters\\GHI.tif"  # <-- change to your file path

with rasterio.open(tif_path) as src:
    transform = src.transform
    crs = src.crs
    width = src.width
    height = src.height
    bounds = src.bounds
    res_x, res_y = src.res

print("=== Raster Metadata ===")
print(f"CRS: {crs}")
print(f"Width (cols): {width}")
print(f"Height (rows): {height}")
print(f"Bounds: {bounds}")
print(f"Pixel Size X: {res_x}")
print(f"Pixel Size Y: {res_y}")
print(f"Transform: {transform}")
