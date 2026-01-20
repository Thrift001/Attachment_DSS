# inspector.py
import os
import numpy as np
import rasterio

RASTER_DIR = os.path.join(os.path.dirname(__file__), "rasters")

def inspect_raster(path: str):
    print("=" * 60)
    print(f"Inspecting raster: {path}")
    with rasterio.open(path) as src:
        print("Driver:", src.driver)
        print("CRS:", src.crs)
        print("Bounds:", src.bounds)
        print("Width x Height:", src.width, "x", src.height)
        print("Resolution:", src.res)
        print("Count (bands):", src.count)
        print("Dtype:", src.dtypes)
        print("NoData value:", src.nodata)
        print("Transform:", src.transform)
        print("Metadata tags:", src.tags())

        band = src.read(1, masked=True)

        # Handle strange NoData values
        if src.nodata is not None:
            band = np.where(band == src.nodata, np.nan, band)

        n_cells = src.width * src.height
        print("Total cells:", n_cells)

        if n_cells > 200_000_000:  # Too big → sample only
            print("⚠️ Raster too large, sampling 1% of cells for stats...")
            mask = np.random.choice([False, True], size=band.shape, p=[0.99, 0.01])
            sample = band[mask]
            sample = sample[~np.isnan(sample)]
            if sample.size > 0:
                print("   min:", float(np.nanmin(sample)))
                print("   max:", float(np.nanmax(sample)))
                print("   mean:", float(np.nanmean(sample)))
            else:
                print("   No valid data in sample")
        else:
            data = np.ma.filled(band, np.nan)
            valid = data[~np.isnan(data)]
            if valid.size > 0:
                print("   min:", float(np.nanmin(valid)))
                print("   max:", float(np.nanmax(valid)))
                print("   mean:", float(np.nanmean(valid)))
            else:
                print("   No valid data")

if __name__ == "__main__":
    for r in os.listdir(RASTER_DIR):
        if r.lower().endswith(".tif"):
            inspect_raster(os.path.join(RASTER_DIR, r))
