# =========================================================================
# Somalia DSS - High-Performance Tile Map Service (TMS)
# Logic: Utilizing Nginx to serve static Geodetic assets and Leaflet logic.
# =========================================================================
FROM nginx:alpine

# GIS PROFESSIONAL COMMENT: Setting the target directory for the 
# Somalia DSS Spatial Interface.
WORKDIR /usr/share/nginx/html

# GIS DATA INJECTION: During the 'railway up' process, these commands 
# map the local directory contents to the production web-root.
COPY frontend/ .

# Expose the standard HTTP port for public access
EXPOSE 80

# GIS PROFESSIONAL COMMENT: Executing Nginx in the foreground to ensure 
# container persistence within the Railway orchestration layer.
CMD ["nginx", "-g", "daemon off;"]