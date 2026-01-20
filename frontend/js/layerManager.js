/* 
   layerManager.js - GIS LAYER ORCHESTRATOR (FULL)
   Loads Raster Tiles and Regional Shapefiles.
*/

(function () {
  const apiBase = "http://127.0.0.1:8000";

  function createTileLayers(map) {
    if (!map.getPane('windPane')) map.createPane('windPane');
    map.getPane('windPane').style.zIndex = 400;

    if (!map.getPane('solarPane')) map.createPane('solarPane');
    map.getPane('solarPane').style.zIndex = 401;

    // Relative paths to frontend root
    const windLayer = L.tileLayer('./wind_tiles/{z}/{x}/{y}.png', {
      pane: 'windPane',
      minZoom: 5, maxZoom: 11,
      attribution: 'Wind Potential',
      opacity: 0.7
    });

    const solarLayer = L.tileLayer('./solar_tiles/{z}/{x}/{y}.png', {
      pane: 'solarPane',
      minZoom: 5, maxZoom: 11,
      attribution: 'Solar Potential',
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
        const name = feature.properties.state_name || 'Unknown';
        layer.bindTooltip(name, { sticky: true, className: 'state-label-tooltip' });
        layer.on('click', function (e) {
          L.DomEvent.stopPropagation(e);
          if (window.fetchAndZoomState) window.fetchAndZoomState(name);
        });
      }
    });
  }

  async function initLayers(map) {
    const tileLayers = createTileLayers(map);
    tileLayers.windLayer.addTo(map);
    tileLayers.solarLayer.addTo(map);

    try {
      const res = await fetch(`${apiBase}/states`);
      if (!res.ok) throw new Error('API Offline');
      const data = await res.json();
      const statesLayer = createStatesLayer(data, map).addTo(map);
      return { ...tileLayers, statesLayer };
    } catch (err) {
      console.warn("GIS Orchestrator: Backend not reachable. Ensure FastAPI is running on port 8000.");
      return { ...tileLayers, statesLayer: L.layerGroup() };
    }
  }

  window.initMapLayers = initLayers;
})();