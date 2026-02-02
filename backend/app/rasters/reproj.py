import rasterio
from rasterio.enums import Resampling

src_path = "D:\\Attachment_DSS\\backend\\data\\rasters\\Slope.tif"
dst_path = "D:\\Attachment_DSS\\backend\\data\\rasters\\Slope_1km.tif"
factor = 34  # aggregation factor

with rasterio.open(src_path) as src:
    new_width = src.width // factor
    new_height = src.height // factor

    transform = src.transform * src.transform.scale(
        src.width / new_width,
        src.height / new_height
    )

    kwargs = src.meta.copy()
    kwargs.update({
        "height": new_height,
        "width": new_width,
        "transform": transform
    })
  # READ from source with aggregation
    data = src.read(
        out_shape=(src.count, new_height, new_width),
        resampling=Resampling.average
    )

    with rasterio.open(dst_path, "w", **kwargs) as dst:
        dst.write(data)