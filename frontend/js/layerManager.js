/**
 * =========================================================================
 * layerManager.js - SPATIAL DATA ORCHESTRATOR (FULL UNABRIDGED)
 * =========================================================================
 * Responsibility: Handles the lifecycle of GIS layers including raster tiles,
 * administrative boundaries (Shapefiles), and high-density demand centers (Towns).
 */

(function () {
  const apiBase = "https://dss-dashboard-production.up.railway.app"; 

  function createTileLayers(map) {
    if (!map.getPane('windPane')) map.createPane('windPane');
    map.getPane('windPane').style.zIndex = 400;
    if (!map.getPane('solarPane')) map.createPane('solarPane');
    map.getPane('solarPane').style.zIndex = 401;

    const windLayer = L.tileLayer('./wind_tiles/{z}/{x}/{y}.png', {
      pane: 'windPane',
      minZoom: 5, 
      maxZoom: 11,
      attribution: 'Wind Potential © ADRA Somalia',
      opacity: 0.7 
    });

    const solarLayer = L.tileLayer('./solar_tiles/{z}/{x}/{y}.png', {
      pane: 'solarPane',
      minZoom: 5, 
      maxZoom: 11,
      attribution: 'Solar Potential © ADRA Somalia',
      opacity: 0.7
    });

    return { windLayer, solarLayer };
  }

  function createStatesLayer(data, map) {
    if (!data || !data.features) return L.layerGroup();
    if (!map.getPane('statesPane')) map.createPane('statesPane');
    map.getPane('statesPane').style.zIndex = 405;

    return L.geoJSON(data, {
      pane: 'statesPane',
      style: { color: '#065C53', weight: 2, fillOpacity: 0.05, dashArray: '3' },
      onEachFeature: function (feature, layer) {
        /* GIS PROFESSIONAL COMMENT: Mapping administrative name keys from both 
           RDBMS source (state_name) and JS fallback source (States). */
        const name = feature.properties.state_name || feature.properties.States || 'Unknown Region';
        
        layer.bindTooltip(name, { sticky: true, className: 'state-label-tooltip' });
        
        layer.on('click', function (e) {
          L.DomEvent.stopPropagation(e);
          if (window.fetchAndZoomState) {
            window.fetchAndZoomState(name);
          }
        });
      }
    });
  }

  function createTownsLayer(data, map) {
    if (!data || !data.features) return L.layerGroup();
    if (!map.getPane('townsPane')) map.createPane('townsPane');
    map.getPane('townsPane').style.zIndex = 650; 

    return L.geoJSON(data, {
        pane: 'townsPane',
        pointToLayer: function (feature, latlng) {
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
            layer.bindTooltip(`<b>${props.name} Hub</b><br>Pop: ${props.pop}`, { 
                direction: 'top', 
                offset: [0, -10] 
            });
            
            layer.on('click', function (e) {
                L.DomEvent.stopPropagation(e);
                if (window.orchestrateSpatialAnalysis) {
                    const coords = layer.getLatLng();
                    window.orchestrateSpatialAnalysis(coords.lat, coords.lng, "town", props);
                }
            });
        }
    });
  }

  async function initLayers(map) {
    const tileLayers = createTileLayers(map);
    tileLayers.windLayer.addTo(map);
    tileLayers.solarLayer.addTo(map);

    let statesLayer = L.layerGroup();
    let townsLayer = L.layerGroup();

    // Independent fetch logic to prevent 500 errors from blocking the whole map
    try {
      const statesRes = await fetch(`${apiBase}/states`);
      if (statesRes.ok) {
        const statesData = await statesRes.json();
        statesLayer = createStatesLayer(statesData, map).addTo(map);
      } else {
        throw new Error('States API 500');
      }
    } catch (err) {
      console.warn("GIS Orchestrator: States API failed. Loading local fallback geometries.");
      if (typeof json_FederalStates_1 !== 'undefined') {
        statesLayer = createStatesLayer(json_FederalStates_1, map).addTo(map);
      }
    }

    try {
      const townsRes = await fetch(`${apiBase}/api/towns`);
      if (townsRes.ok) {
        const townsData = await townsRes.json();
        townsLayer = createTownsLayer(townsData, map).addTo(map);
      }
    } catch (err) {
      console.warn("GIS Orchestrator: Towns API unreachable.");
    }

    return { ...tileLayers, statesLayer, townsLayer };
  }

  window.initMapLayers = initLayers;
})();