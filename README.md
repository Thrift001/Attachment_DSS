Somalia Renewable Energy Decision Support System (DSS)
🌍 Empowering Decentralized Energy Planning through Geospatial Intelligence

(https://img.shields.io/badge/Backend-Railway-blueviolet)

(https://img.shields.io/badge/Frontend-Netlify-00C7B7)


(https://img.shields.io/badge/Database-PostGIS-336791)


(https://img.shields.io/badge/GIS-Rasterio-06532C)

The Somalia DSS is a production-grade Spatial Data Infrastructure (SDI) developed for ADRA Somalia. It serves as a strategic tool for field officers and energy planners to conduct high-resolution feasibility assessments for solar and wind infrastructure. By performing real-time spatial joins between geodetic coordinates and multi-layered raster datasets, the system provides instant technical dossiers for any pixel within the Somali territory.

🚀 Key Features

High-Resolution Raster Sampling: Extracting pixel-level data from over 300MB of analytical GeoTIFFs (GHI, WPD, Slopes).

Administrative Vector Intelligence: Real-time PostGIS queries for Federal State boundaries and technical statistics.

LCOE Modeling: Dynamic Levelized Cost of Energy (LCOE) estimation based on geographical resource potential.

Demand Center Orchestration: Integration of World Bank-verified population hubs and infrastructure nodes.

Hybrid Cloud Architecture: High-speed Nginx Tile Map Service (TMS) co-located with a containerized Geoprocessing API.

🛠️ Technical Stack
Component	Technology	Responsibility
Frontend	Vanilla JS, Leaflet.js	Geodetic Visualization & Client-side Orchestration
Backend	FastAPI (Python 3.10+)	High-concurrency Geoprocessing API
Spatial DB	PostGIS (PostgreSQL 17)	Relational Geometry Store & Topological Queries
Geoprocessing	Rasterio, GDAL, Shapely	Raster Sampling & Affine Transformations
DevOps	Docker, Nginx, Git LFS	Containerization & Asset Lifecycle Management
📂 Project Structure

├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI Application & Geoprocessing Routes
│   │   ├── database.py         # SQLAlchemy Spatial Engine Configuration
│   │   ├── models.py           # OGC-compliant Spatial Schemas
│   │   ├── rasters/            # Local high-resolution GeoTIFF store
│   │   └── database_stats.py   # Technical Attribute Ingestion Logic
│   └── requirements.txt        # GIS Binary Dependencies
├── frontend/
│   ├── js/
│   │   ├── map.js              # Geodetic Telemetry Engine
│   │   └── layerManager.js     # SDI Data Orchestrator
│   ├── solar_tiles/            # TMS Heatmap Shards
│   └── index.html              # DSS Dashboard Interface
├── Dockerfile                  # API Geoprocessing Image
├── Dockerfile.frontend         # Nginx Static Asset Distributor
└── master_spatial_sync.py      # Master ETL Pipeline
🛰️ GIS Professional Documentation
Geodetic Integrity

All spatial operations utilize the WGS 84 (EPSG:4326) coordinate reference system. The backend engine performs automated affine transformations to map user-provided coordinates to the native projection of the underlying resource rasters (UTM Zones 37N/38N).

Data Orchestration (ETL)

The system implements a custom ETL pipeline (master_spatial_sync.py) that normalizes administrative technical indices from CSV dossiers and serializes GeoJSON MultiPolygons into Well-Known Binary (WKB) format for the PostGIS RDBMS.

Raster SAM Engine

The Sampling Analytical Model (SAM) is baked into the Docker environment using the osgeo/gdal base image. This ensures sub-second response times by providing the rasterio engine with direct I/O access to localized GeoTIFF assets, bypassing the latency of external cloud storage mounts.

🔧 Local Development

Clone & Setup Git LFS:

git clone https://github.com/Thrift001/Attachment_DSS.git
git lfs install
git lfs pull

Initialize Infrastructure:

docker-compose up --build

Synchronize Spatial Data:

$env:DATABASE_URL="postgresql://postgres:thrift@localhost:5585/somalia_dss_new"
python master_spatial_sync.py
📈 Deployment Status

Production API: Hosted on Railway utilizing containerized PostGIS and OSGeo GDAL.

Production UI: Hosted on Netlify for high-speed Global CDN distribution of map tiles.

Tile Store: 300MB of PNG tiles managed via direct binary injection to Nginx nodes.

🤝 Credits & Partnership

Developed as a strategic geospatial initiative by ADRA Somalia in partnership with the GeoPsy Research team.

© 2026 ADRA Somalia. All geodetic data and resource potential maps are protected under internal spatial policy.



graph TD
    User((User/Field Officer)) -->|WGS84 Coordinates| Frontend[Netlify Edge CDN]
    Frontend -->|Asynchronous Fetch| API[Railway Geoprocessing API]
    API -->|ST_Contains Query| DB[(PostGIS RDBMS)]
    API -->|Pixel Sampling| Rasters[Raster SAM Engine]
    Rasters -->|Extract GHI/WPD/Slope| API
    DB -->|Administrative Metadata| API
    API -->|JSON Dossier| Frontend
    Frontend -->|Live Visual Updates| User
