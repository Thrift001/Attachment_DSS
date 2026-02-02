/**
 * =========================================================================
 * layerManager.js - SPATIAL DATA ORCHESTRATOR
 * =========================================================================
 * Responsibility: Handles the lifecycle of GIS layers including raster tiles,
 * administrative boundaries (Shapefiles), and high-density demand centers (Towns).
 * 
 * Version: 2.0.0 (Production)
 * Branding: ADRA Somalia
 * =========================================================================
 */

(function () {
  /**
   * HYBRID API CONFIGURATION
   * GIS INFRASTRUCTURE: Ensures communication between frontend client and
   * centralized Geospatial Backend regardless of deployment environment.
   */
  const apiBase = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:8000"
    : "https://your-backend-name.onrender.com"; // STAKEHOLDER: Replace with verified Render URL

  /**
   * SECTION: RASTER TILES
   * Orchestrates the loading of Solar and Wind potential heatmaps.
   * GIS LOGIC: Leverages XYZ Tile schemes for high-performance rendering of 
   * dense energy potential indices.
   */
  function createTileLayers(map) {
    // Initialize dedicated panes for energy overlays to manage visual hierarchy
    if (!map.getPane('windPane')) map.createPane('windPane');
    map.getPane('windPane').style.zIndex = 400;

    if (!map.getPane('solarPane')) map.createPane('solarPane');
    map.getPane('solarPane').style.zIndex = 401;

    // Define Wind Potential Layer (Derived from Wind Power Density Rasters)
    const windLayer = L.tileLayer('./wind_tiles/{z}/{x}/{y}.png', {
      pane: 'windPane',
      minZoom: 5, 
      maxZoom: 11,
      attribution: 'Wind Potential © ADRA Somalia',
      opacity: 0.7 
    });

    // Define Solar Potential Layer (Derived from Global Horizontal Irradiance)
    const solarLayer = L.tileLayer('./solar_tiles/{z}/{x}/{y}.png', {
      pane: 'solarPane',
      minZoom: 5, 
      maxZoom: 11,
      attribution: 'Solar Potential © ADRA Somalia',
      opacity: 0.7
    });

    return { windLayer, solarLayer };
  }

  /**
   * SECTION: ADMINISTRATIVE BOUNDARIES
   * Processes GeoJSON data derived from Federal State shapefiles.
   * GIS LOGIC: Provides administrative context for regional energy planning (ADM1).
   */
  function createStatesLayer(data, map) {
    if (!data || !data.features) return L.layerGroup();
    
    // Ensure boundaries sit above rasters but below demand centers
    if (!map.getPane('statesPane')) map.createPane('statesPane');
    map.getPane('statesPane').style.zIndex = 405;

    return L.geoJSON(data, {
      pane: 'statesPane',
      style: { 
        color: '#065C53',      // ADRA Green
        weight: 2, 
        fillOpacity: 0.05, 
        dashArray: '3'         
      },
      onEachFeature: function (feature, layer) {
        const name = feature.properties.state_name || 'Unknown';
        
        // Contextual Tooltip for rapid regional identification
        layer.bindTooltip(name, { sticky: true, className: 'state-label-tooltip' });
        
        // CLICK HANDLER: Orchestrates regional analysis via map.js
        layer.on('click', function (e) {
          L.DomEvent.stopPropagation(e);
          if (window.fetchAndZoomState) {
            window.fetchAndZoomState(name);
          }
        });
      }
    });
  }

  /**
   * SECTION: MAJOR TOWNS (DEMAND CENTERS)
   * Orchestrates the display of verified urban hubs. 
   * GIS LOGIC: Point-based feature representation of World Bank verified 
   * population centers for targeted infrastructure investment.
   */
  function createTownsLayer(data, map) {
    if (!data || !data.features) return L.layerGroup();
    
    // Town Pane: Highest z-index to remain interactive above all overlays
    if (!map.getPane('townsPane')) map.createPane('townsPane');
    map.getPane('townsPane').style.zIndex = 650; 

    return L.geoJSON(data, {
        pane: 'townsPane',
        pointToLayer: function (feature, latlng) {
            // ADRA Custom Icon: City glyph on Gold background
            const cityIcon = L.divIcon({
                className: 'town-icon-marker',
                html: `<div class="town-icon-base"><i class="fas fa-city"></i></div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });
            return L.marker(latlng, { icon: cityIcon });
        },
        onEachFeature: function (feature, layer) {
            const props = feature.properties;
            
            // Rich Tooltip: Show Name and Verified Population immediately
            layer.bindTooltip(`<b>${props.name} Hub</b><br>Pop: ${props.pop}`, { 
                direction: 'top', 
                offset: [0, -10] 
            });
            
            // CLICK HANDLER: Triggers full Site/Town analysis and dashboard refresh
            layer.on('click', function (e) {
                L.DomEvent.stopPropagation(e);
                if (window.orchestrateSpatialAnalysis) {
                    const coords = layer.getLatLng();
                    // Pass Town metadata (props) to orchestrator for dashboard enrichment
                    window.orchestrateSpatialAnalysis(coords.lat, coords.lng, "town", props);
                }
            });
        }
    });
  }

  /**
   * CORE INITIALIZATION: Parallel Fetching
   * GIS Logic: Concurrently requests spatial datasets to optimize load times 
   * for data-heavy map visualizations.
   */
  async function initLayers(map) {
    const tileLayers = createTileLayers(map);
    tileLayers.windLayer.addTo(map);
    tileLayers.solarLayer.addTo(map);

    try {
      // Simultaneous retrieval of regional and town datasets from API endpoints
      const [statesRes, townsRes] = await Promise.all([
        fetch(`${apiBase}/states`),
        fetch(`${apiBase}/api/towns`)
      ]);

      if (!statesRes.ok || !townsRes.ok) throw new Error('Spatial Data API Offline');
      
      const statesData = await statesRes.json();
      const townsData = await townsRes.json();
      
      // Construct interactive vector layers
      const statesLayer = createStatesLayer(statesData, map).addTo(map);
      const townsLayer = createTownsLayer(townsData, map).addTo(map);

      return { ...tileLayers, statesLayer, townsLayer };
    } catch (err) {
      console.warn("GIS Orchestrator: Backend not reachable. Ensure FastAPI is running on port 8000.");
      // Graceful degradation: Return tile layers even if vector data fails
      return { ...tileLayers, statesLayer: L.layerGroup(), townsLayer: L.layerGroup() };
    }
  }

  // Expose global interface for map.js orchestration
  window.initMapLayers = initLayers;
})();