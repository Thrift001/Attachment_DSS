# =========================================================================
#  DSS BACKEND API (FastAPI) - Production-Ready Version
#  Integrates SQLAlchemy session pattern, raster sampling, and Demand Centers.
#  Refactored: January 2026 for ADRA Somalia Decision Support System
# =========================================================================

import os
from typing import Optional, Any

import numpy as np
import pyproj
import rasterio
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pyproj import Transformer
from sqlalchemy import text
from sqlalchemy.orm import Session
from dotenv import load_dotenv

# Attempt to obtain pyproj's data directory in a way that works across pyproj versions
try:
    # pyproj exposes datadir as a submodule in some installations
    import pyproj.datadir as _datadir  # type: ignore
    _proj_datadir = _datadir.get_data_dir()
except Exception:
    # fallback: try accessing datadir attribute on the pyproj module or leave None
    try:
        _proj_datadir = pyproj.datadir.get_data_dir()  # type: ignore
    except Exception:
        _proj_datadir = None

from . import models
from .database import engine, get_db


# Fix PROJ conflict (force pyproj to use its bundled proj.db)
# -------------------------------------------------------------------------
if _proj_datadir:
    os.environ["PROJ_LIB"] = _proj_datadir

# -------------------------------------------------------------------------
# Load environment variables
# -------------------------------------------------------------------------
load_dotenv()

app = FastAPI(title="DSS Backend API", version="1.0")

# -------------------------------------------------------------------------
# Middleware & Static frontend
# GIS PROFESSIONAL COMMENT: Implemented Hybrid CORS policy to allow secure 
# communication between Netlify production and Render API infrastructure.
# -------------------------------------------------------------------------
allowed_origins = [
    "http://127.0.0.1:5500", # Local development
    "http://localhost:5500",
    "https://your-frontend-name.netlify.app" # Replace with your actual Netlify URL
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Fine for public DSS, or replace with allowed_origins list above
    allow_credentials= True,
    allow_methods=["*"],
    allow_headers=["*"],
)

frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

# -------------------------------------------------------------------------
# Database setup
# -------------------------------------------------------------------------
models.Base.metadata.create_all(bind=engine)

# -------------------------------------------------------------------------
# Raster configuration
# GIS PROFESSIONAL COMMENT: Hybrid Path Resolution. 
# Uses Linux path /data/rasters for Docker/Render and local relative path for Windows dev.
# -------------------------------------------------------------------------
RASTER_DIR = os.getenv("RASTER_DIR", os.path.join(os.path.dirname(__file__), "rasters"))
os.makedirs(RASTER_DIR, exist_ok=True)

RASTER_PATHS = {
    "solar_mean_score": os.path.join(RASTER_DIR, "Solar_Potential_Final_Map.tif"),
    "wind_mean_score": os.path.join(RASTER_DIR, "Wind_Potential_Final_Map.tif"),
    "mean_ghi": os.path.join(RASTER_DIR, "GHI.tif"),
    "mean_wind_speed_ms": os.path.join(RASTER_DIR, "Wind_Speed.tif"),
    "mean_wpd": os.path.join(RASTER_DIR, "WPD.tif"),
    "slope": os.path.join(RASTER_DIR, "Slopes.tif"),
}

open_rasters = {}
for key, path in RASTER_PATHS.items():
    if not os.path.exists(path):
        # Professional Warning: Raster missing from Spatial Data Infrastructure path
        print(f"[ERROR] Spatial asset missing: {path}")
        continue
    open_rasters[key] = rasterio.open(path)

# Cache for coordinate transformations
_transformers = {}


def reproject_point(lon: float, lat: float, target_crs):
    """
    GIS PROFESSIONAL COMMENT: Reproject WGS84 (EPSG:4326) coordinates 
    to native Raster Coordinate Reference System (CRS) for accurate pixel sampling.
    """
    try:
        key = target_crs.to_string()
        if key not in _transformers:
            _transformers[key] = Transformer.from_crs("EPSG:4326", target_crs, always_xy=True)
        return _transformers[key].transform(lon, lat)
    except Exception as e:
        print(f"[WARN] Reprojection failed for CRS={target_crs}: {e}")
        return lon, lat


# -------------------------------------------------------------------------
# API Endpoints
# -------------------------------------------------------------------------

@app.get("/api/towns")
def get_major_towns():
    """
    Orchestrates GeoJSON for the 6 most influential Somali Hubs.
    Data verified using World Bank SURP II (2024) and NBS Somalia Population Estimates.
    Links provide direct access to verified data sources for technical reporting.
    """
    towns = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature", 
                "properties": {
                    "name": "Mogadishu", 
                    "type": "National Capital", 
                    "pop": "2,610,483", 
                    "infra": "Major International Port & Airport",
                    "source": "World Bank SURP II",
                    "source_url": "https://projects.worldbank.org/en/projects-operations/project-detail/P170922"
                }, 
                "geometry": {"type": "Point", "coordinates": [45.3182, 2.0469]}
            },
            {
                "type": "Feature", 
                "properties": {
                    "name": "Hargeisa", 
                    "type": "Major Economic Hub", 
                    "pop": "1,200,000", 
                    "infra": "Inland Logistics & Trade Hub",
                    "source": "NBS Statistical Yearbook",
                    "source_url": "https://www.nbs.gov.so/"
                }, 
                "geometry": {"type": "Point", "coordinates": [44.0650, 9.5624]}
            },
            {
                "type": "Feature", 
                "properties": {
                    "name": "Bosaso", 
                    "type": "Port City", 
                    "pop": "700,000", 
                    "infra": "Primary Maritime Export Hub",
                    "source": "Puntland NBS Survey",
                    "source_url": "https://www.nbs.gov.so/"
                }, 
                "geometry": {"type": "Point", "coordinates": [49.1816, 11.2842]}
            },
            {
                "type": "Feature", 
                "properties": {
                    "name": "Kismayo", 
                    "type": "Strategic Port City", 
                    "pop": "183,000", 
                    "infra": "Deepwater Port Hub",
                    "source": "World Bank Somalia Urban Profile",
                    "source_url": "https://projects.worldbank.org/en/projects-operations/project-detail/P170922"
                }, 
                "geometry": {"type": "Point", "coordinates": [42.5454, -0.3582]}
            },
            {
                "type": "Feature", 
                "properties": {
                    "name": "Baidoa", 
                    "type": "Regional Agri-Hub", 
                    "pop": "800,000", 
                    "infra": "Agricultural Trade Node",
                    "source": "UN-OCHA Pop. Estimates",
                    "source_url": "https://data.humdata.org/group/som"
                }, 
                "geometry": {"type": "Point", "coordinates": [43.6492, 3.1133]}
            },
            {
                "type": "Feature", 
                "properties": {
                    "name": "Garowe", 
                    "type": "Administrative Capital", 
                    "pop": "190,000", 
                    "infra": "Governmental and Logistics Node",
                    "source": "Puntland NBS Office",
                    "source_url": "https://www.nbs.gov.so/"
                }, 
                "geometry": {"type": "Point", "coordinates": [48.4845, 8.4064]}
            }
        ]
    }
    return towns

@app.get("/states")
def get_states(db: Session = Depends(get_db)):
    """
    GIS PROFESSIONAL COMMENT: Spatial Querying to fetch administrative polygons (MultiPolygon)
    with integrated statistical attributes for regional visualization.
    """
    query = text("""
        SELECT jsonb_build_object(
            'type', 'FeatureCollection',
            'features', jsonb_agg(feature)
        )
        FROM (
            SELECT jsonb_build_object(
                'type', 'Feature',
                'geometry', ST_AsGeoJSON(f.geom)::jsonb,
                'properties', jsonb_build_object(
                    'id', f.id,
                    'state_name', f.states,
                    'mean_ghi', s.mean_ghi,
                    'mean_wpd', s.mean_wpd,
                    'mean_wind_speed_ms', s.mean_wind_speed_ms,
                    'solar_highly_suitable_km2', s.solar_highly_suitable_km2,
                    'solar_mean_score', s.solar_mean_score,
                    'wind_highly_suitable_km2', s.wind_highly_suitable_km2,
                    'wind_mean_score', s.wind_mean_score
                )
            ) AS feature
            FROM federal_states f
            LEFT JOIN state_statistics s
                ON LOWER(f.states) = LOWER(s.state_name)
        ) features;
    """)
    try:
        result = db.execute(query).scalar_one_or_none()
        return result or {"type": "FeatureCollection", "features": []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error in /states: {e}")



@app.get("/state_metrics")
def get_state_metrics(
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    state: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    GIS PROFESSIONAL COMMENT: Point-in-Polygon lookup using PostGIS ST_Contains 
    to retrieve regional aggregated energy metrics based on geographical location.
    """
    try:
        if state:
            query = text("""
                SELECT * FROM state_statistics
                WHERE state_name ILIKE :state
                LIMIT 1;
            """)
            result = db.execute(query, {"state": state}).fetchone()

        elif lat is not None and lon is not None:
            if not (-2 < lat < 12) or not (41 < lon < 52):
                raise HTTPException(status_code=400, detail="Coordinates outside Somalia bounds")
            query = text("""
                SELECT s.* FROM state_statistics s
                JOIN federal_states f ON LOWER(s.state_name) = LOWER(f.states)
                WHERE ST_Contains(
                    f.geom,
                    ST_SetSRID(ST_Point(:lon, :lat), 4326)
                )
                LIMIT 1;
            """)
            result = db.execute(query, {"lat": lat, "lon": lon}).fetchone()
        else:
            raise HTTPException(status_code=400, detail="Provide either lat/lon or state name")

        if not result:
            raise HTTPException(status_code=404, detail="No state found")

        data = dict(result._mapping)
        solar_score = data.get("solar_mean_score")
        wind_score = data.get("wind_mean_score")

        # GIS PROFESSIONAL COMMENT: LCOE (Levelized Cost of Energy) estimation modeling
        data["lcoe_solar"] = round(0.15 - (solar_score * 0.005), 3) if solar_score else None
        data["lcoe_wind"] = round(0.12 - (wind_score * 0.004), 3) if wind_score else None
        return data

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching state metrics: {e}")


@app.get("/api/report/pixel")
def get_pixel_report(lon: float, lat: float):
    """
    GIS PROFESSIONAL COMMENT: High-resolution Pixel Sampling engine. 
    Retrieves site-specific resource data from GeoTIFF raster layers.
    """
    if not (-180 <= lon <= 180 and -90 <= lat <= 90):
        raise HTTPException(status_code=400, detail="Invalid lat/lon")
    # Tighten to Somalia bounds for efficiency
    if not (40.5 < lon < 51.5 and -2 < lat < 12):
        raise HTTPException(status_code=400, detail="Coordinates outside Somalia bounds")

    try:
        data = {}
        for key, src in open_rasters.items():
            raster_crs = src.crs
            # Log CRS for debugging
            print(f"[DEBUG] Sampling {key} with CRS: {raster_crs}")

            if raster_crs.is_projected:  # Reproject only for projected CRS (e.g., UTM)
                x, y = reproject_point(lon, lat, raster_crs)
                coords = [(x, y)]
            else:  # Assume geographic (WGS84/4326 variant), use degrees directly
                coords = [(lon, lat)]

            value = next(src.sample(coords))[0]

            # Handle nodata robustly (GIS standard for missing observations)
            nodata = src.nodata
            if nodata is not None:
                try:
                    if abs(float(value) - nodata) < 1e-10:
                        value = np.nan
                except Exception:
                    value = np.nan

            if np.isnan(value):
                value = None
            else:
                value = float(value)

            data[key] = value

        if not any(v is not None for v in data.values()):
            raise HTTPException(status_code=404, detail="No data at this location (likely offshore)")

        return data

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pixel sampling error: {e}")


@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    """Health check for API, database, rasters, and PROJ setup."""
    status: dict[str, Any] = {"api": "ok"}

    # Check database connection
    try:
        db.execute(text("SELECT 1;"))
        status["database"] = "ok"
    except Exception as e:
        status["database"] = f"error: {e}"

    # Check rasters
    raster_status = {}
    for key, src in open_rasters.items():
        try:
            raster_status[key] = "ok" if src else "not loaded"
        except Exception as e:
            raster_status[key] = f"error: {e}"
    status["rasters"] = raster_status

    # Check PROJ path configuration
    status["proj_lib"] = os.environ.get("PROJ_LIB", "not set")

    return status