# =========================================================================
# Somalia DSS - Production Geoprocessing Environment
# Base: OSGeo GDAL (Optimized for Rasterio/PyProj/GDAL)
# =========================================================================
FROM osgeo/gdal:ubuntu-small-3.6.2

# Set system environment for GIS libraries
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PROJ_LIB=/usr/share/proj

WORKDIR /app

# Install system dependencies
# GIS PROFESSIONAL COMMENT: Maintaining libexpat1 for XML metadata parsing 
# and ensuring the Python package manager is optimized for the Linux environment.
RUN apt-get update && apt-get install -y \
    python3-pip \
    python3-dev \
    build-essential \
    libpq-dev \
    libexpat1 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip3 install --no-cache-dir -U pip setuptools wheel
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy application source code
# GIS PROFESSIONAL COMMENT: Copying the entire backend directory to 
# preserve the package structure required for relative imports.
COPY backend/ /app/backend/

# GIS DATA INJECTION: Packing high-resolution GeoTIFFs into the image
# Logic: Ensuring the geoprocessing engine has local access to the 
# Solar and Wind potential datasets at the predefined /data/rasters path.
COPY backend/app/rasters/ /data/rasters/

# Set the operational directory for the Raster Sampling Engine
ENV RASTER_DIR=/data/rasters
# Ensure Python can find the 'backend' package
ENV PYTHONPATH=/app

EXPOSE 8000

# GIS PROFESSIONAL COMMENT: Environment Variable Expansion. 
# We use the shell-form command to ensure the dynamic $PORT assigned by 
# the infrastructure provider is correctly injected into the ASGI server.
CMD uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT