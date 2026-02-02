/**
 * =========================================================================
 * layerManager.js - SPATIAL DATA ORCHESTRATOR (FULL UNABRIDGED)
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
   * GIS PROFESSIONAL COMMENT: Automated SDI Endpoint resolution.
   * Logic: Ensures client-side geoprocessing logic maps correctly to the
   * production backend URL in a cloud environment.
   */
  const apiBase = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:8000"
    : "https://dss-dashboard-production.up.railway.app"; 

  /**
   * SECTION: RASTER TILES
   * Orchestrates the loading of Solar and Wind potential heatmaps.
   * Uses dedicated Leaflet panes to manage visual stacking (zIndex).
   */
  function createTileLayers(map) {
    // Initialize dedicated panes for energy overlays
    if (!map.getPane('windPane')) map.createPane('windPane');
    map.getPane('windPane').style.zIndex = 400;

    if (!map.getPane('solarPane')) map.createPane('solarPane');
    map.getPane('solarPane').style.zIndex = 401;

    // Define Wind Potential Layer (WPD derived)
    const windLayer = L.tileLayer('./wind_tiles/{z}/{x}/{y}.png', {
      pane: 'windPane',
      minZoom: 5, 
      maxZoom: 11,
      attribution: 'Wind Potential © ADRA Somalia',
      opacity: 0.7 // Optimized for visibility of base map and overlays
    });

    // Define Solar Potential Layer (GHI derived)
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
   * Implements interactive highlighting and regional analysis triggers.
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
        dashArray: '3'         // Dashed border for administrative distinction
      },
      onEachFeature: function (feature, layer) {
        /**
         * GIS PROFESSIONAL COMMENT: Property Key Verification.
         * Logic: Corrects the absence of state names by checking both the 
         * database 'state_name' key and the local 'States' key from FederalStates_1.js.
         */
        const name = feature.properties.state_name || feature.properties.States || 'Unknown Region';
        
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
   * Uses GIS icons to identify high-priority investment nodes.
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
   * Gathers all spatial layers and demand center data concurrently.
   */
  async function initLayers(map) {
    const tileLayers = createTileLayers(map);
    tileLayers.windLayer.addTo(map);
    tileLayers.solarLayer.addTo(map);

    try {
      /**
       * GIS PROFESSIONAL COMMENT: Fault-Tolerant SDI Fetching.
       * Logic: Attempts to fetch regional boundaries from the RDBMS. If a 
       * server error occurs, the engine initiates a fallback to the local 
       * 'json_FederalStates_1' dataset to preserve visualization.
       */
      const statesRes = await fetch(`${apiBase}/states`);
      let statesData;

      if (statesRes.ok) {
        statesData = await statesRes.json();
      } else {
        throw new Error('API States Error');
      }

      const townsRes = await fetch(`${apiBase}/api/towns`);
      const townsData = await townsRes.json();
      
      const statesLayer = createStatesLayer(statesData, map).addTo(map);
      const townsLayer = createTownsLayer(townsData, map).addTo(map);

      return { ...tileLayers, statesLayer, townsLayer };

    } catch (err) {
      console.warn("GIS Orchestrator: Backend API unreachable. Executing Local Fallback for Federal States.");
      
      let statesLayer = L.layerGroup();
      if (typeof json_FederalStates_1 !== 'undefined') {
        statesLayer = createStatesLayer(json_FederalStates_1, map).addTo(map);
      }

      return { ...tileLayers, statesLayer, townsLayer: L.layerGroup() };
    }
  }

  // Expose global interface for map.js
  window.initMapLayers = initLayers;
})();