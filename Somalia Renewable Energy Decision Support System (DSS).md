# Somalia Renewable Energy Decision Support System (DSS)

**Production-Grade Spatial Data Infrastructure (SDI) for Evidence-Based Planning**

Live Demo | API Health

[![Backend-FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Database-PostGIS](https://img.shields.io/badge/Database-PostGIS-336791?logo=postgresql&logoColor=white)](https://postgis.net/)
[![Infrastructure-Railway](https://img.shields.io/badge/Infrastructure-Railway-blueviolet)](https://railway.app/)
[![Storage-Git LFS](https://img.shields.io/badge/Storage-Git_LFS-F05032?logo=git&logoColor=white)](https://git-lfs.github.com/)

## Summary

Developed a full-stack Geospatial Decision Support System for ADRA Somalia that automates renewable energy site-selection. The platform enables field officers to perform real-time geoprocessing queries against 300MB+ of high-resolution raster data to estimate solar/wind potential and project ROI instantly.

## Performance Benchmarks

*   **API Latency:** < 150ms for multi-layer spatial joins and pixel extraction.
*   **Data Volume:** Orchestrates 300MB+ of analytical GeoTIFFs and ~12,500 localized map tiles.
*   **Scalability:** Containerized architecture optimized for concurrent geoprocessing requests.
*   **Efficiency:** Reduced site-suitability assessment time from days to sub-second automated reporting.

## Architecture Diagram

```mermaid
graph TD
    A[User/Field Officer] --> B(WGS84 Coordinates)
    A --> C(Live Visual Updates)
    B --> D[Netlify Edge CDN]
    C --> D
    D --> E[Railway Geoprocessing API]
    E --> F(Asynchronous Fetch)
    E --> G(JSON Dossier)
    E --> H(ST_Contains Query)
    E --> I(Administrative Metadata)
    E --> J(Pixel Sampling)
    E --> K(Extract GH1/WPD/Slope)
    H --> L[PostGIS RDBMS]
    I --> L
    J --> M[Raster SAM Engine]
    K --> M
```

## Key Engineering Accomplishments

1.  **High-Concurrency Geoprocessing API**
    Engineered a Python-based API using FastAPI to handle asynchronous spatial telemetry. Implemented a Raster Sampling Analytical Model (SAM) using Rasterio and GDAL to perform localized value extraction from multi-gigabit environmental indices.

2.  **Spatial Data Engineering (ETL)**
    Architected a custom ETL pipeline to synchronize administrative technical dossiers (CSV) with complex geodetic MultiPolygons. Resolved relational integrity issues via a fuzzy-match name resolver, ensuring 100% join accuracy between diverse spatial data sources.

3.  **Production Infrastructure & DevOps**
    Containerized the geoprocessing environment using specialized Docker images to resolve deep C-library dependencies (PROJ/GDAL). Orchestrated a dual-cloud deployment: Railway for heavy geoprocessing logic and Netlify for high-speed Tile Map Service (TMS) distribution. Managed large-scale binary assets (>200MB) through Git LFS, ensuring repository performance and deployment stability.

4.  **Energy Modeling Logic**
    Integrated Levelized Cost of Energy (LCOE) algorithmic modeling to provide stakeholders with instant financial feasibility estimates based on real-time geographical coordinates.

## Technical Stack

*   **Backend:** Python, FastAPI, SQLAlchemy, GeoAlchemy2.
*   **Geospatial:** PostGIS, Rasterio, GDAL, PyProj, Shapely.
*   **Frontend:** Vanilla JavaScript, Leaflet.js, Nginx.
*   **Data:** PostgreSQL, GeoTIFF, GeoJSON, TMS (XYZ Tiles).
*   **DevOps:** Docker, Git LFS, Railway CLI, Netlify CLI.

## Local Development & Setup

```bash
# 1. Clone with Large File Storage
git lfs install
git clone https://github.com/Thrift001/Attachment_DSS.git

# 2. Initialize Spatial Infrastructure
docker-compose up --build

# 3. Synchronize Master SDI Data
$env:DATABASE_URL="postgresql://postgres:thrift@localhost:5585/somalia_dss_new"
python master_spatial_sync.py
```

## Stakeholders & Partnership

Developed as a strategic geospatial initiative by ADRA Somalia in partnership with the GeoPsy Research team. This tool provides a centralized Spatial Data Infrastructure (SDI) for decentralized energy planning across the Somali Peninsula.

© 2026 ADRA Somalia. Technical indices verified via World Bank and NBS datasets.
