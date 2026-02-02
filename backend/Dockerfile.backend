# =========================================================================
# Somalia DSS - Production Geoprocessing Environment
# Base: OSGeo GDAL Ubuntu-Small (Optimized for Rasterio/PyProj)
# =========================================================================
FROM osgeo/gdal:ubuntu-small-3.6.2

# Set system environment for GIS libraries
ENV PYTHONUNBUFFERED=1
ENV PROJ_LIB=/usr/share/proj

WORKDIR /app

# Install Python and PostGIS client dependencies
# GIS PROFESSIONAL COMMENT: Installing build-essential and libpq-dev 
# to compile C-extensions for psycopg2 and GeoAlchemy2.
RUN apt-get update && apt-get install -y \
    python3-pip \
    python3-dev \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy application source code
# GIS PROFESSIONAL COMMENT: Maintaining a clean directory structure 
# for the FastAPI spatial endpoints.
COPY backend/app/ /app/app/

# GIS DATA INJECTION: Packing high-resolution GeoTIFFs into the image
# This ensures the Sampling API has immediate access to the Raster Data Store.
COPY backend/app/rasters/ /data/rasters/

# Set the operational directory for the Raster Sampling Engine
ENV RASTER_DIR=/data/rasters

EXPOSE 8000

# Start command utilizing Uvicorn for high-concurrency spatial requests
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]