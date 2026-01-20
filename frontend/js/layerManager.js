// // layerManager.js
/* layerManager.js
   Responsible for creating map layers and controls.
   Exposes initLayers(map) -> returns {windLayer, solarLayer, statesLayer}
*/

(function () {
  // We rely on same-host API. Change apiBase if needed for production.
  const apiBase = "http://127.0.0.1:8000";  // For local dev

  function createTileLayers(map) {
    // Create dedicated panes and zIndex ordering
    if (!map.getPane('windPane')) map.createPane('windPane');
    map.getPane('windPane').style.zIndex = 400;

    if (!map.getPane('solarPane')) map.createPane('solarPane');
    map.getPane('solarPane').style.zIndex = 401;

    const windLayer = L.tileLayer('../wind_tiles/{z}/{x}/{y}.png', {
      pane: 'windPane',
      minZoom: 5,
      maxZoom: 11,
      attribution: 'Wind Potential',
      opacity: 0.8
    });

    const solarLayer = L.tileLayer('../solar_tiles/{z}/{x}/{y}.png', {
      pane: 'solarPane',
      minZoom: 5,
      maxZoom: 11,
      attribution: 'Solar Potential',
      opacity: 0.8
    });

    return { windLayer, solarLayer };
  }

  function createStatesLayer(data) {
    if (!data || !data.features) return L.layerGroup();

    // ensure statesPane exists
    const paneName = 'statesPane';
    // style and tooltip/popup
    const geo = L.geoJSON(data, {
      pane: paneName,
      style: function(feature) {
        return {
          color: '#323232',
          weight: 2,
          fillOpacity: 0
        };
      },
      onEachFeature: function (feature, layer) {
        const name = feature.properties.state_name || 'Unknown';
        // Tooltip (non-permanent on small screens)
        layer.bindTooltip(name, { permanent: true, offset: [0, -16], className: 'state-label' });
        layer.bindPopup(`<b>${name}</b><br>Solar: ${feature.properties.solar_mean_score ?? 'N/A'}<br>Wind: ${feature.properties.wind_mean_score ?? 'N/A'}`);

        // click handler: use global function for zoom+fetch
        layer.on('click', function () {
          if (window.fetchAndZoomState) {
            window.fetchAndZoomState(name);
            // Switch UI to state mode
            if (window.switchMode) window.switchMode('state');
          }
        });
      }
    });

    return geo;
  }

  function addLayerControls(map, layers) {
    // Create custom control for checkboxes & opacity (keeps UI minimal).
    const control = L.control({ position: 'topright' });
    control.onAdd = function () {
      const div = L.DomUtil.create('div', 'leaflet-control-custom layer-control');
      div.innerHTML = `
        <div class="layer-row"><label><input type="checkbox" id="ctrl-wind" checked> Wind</label></div>
        <div class="layer-row"><label><input type="checkbox" id="ctrl-solar" checked> Solar</label></div>
        <div class="layer-row"><label><input type="checkbox" id="ctrl-states" checked> States</label></div>
      `;
      L.DomEvent.disableClickPropagation(div);

      // Wiring will be done later after element is added to DOM
      setTimeout(() => {
        const elWind = div.querySelector('#ctrl-wind');
        const elSolar = div.querySelector('#ctrl-solar');
        const elStates = div.querySelector('#ctrl-states');

        if (elWind) elWind.addEventListener('change', e => e.target.checked ? map.addLayer(layers.windLayer) : map.removeLayer(layers.windLayer));
        if (elSolar) elSolar.addEventListener('change', e => e.target.checked ? map.addLayer(layers.solarLayer) : map.removeLayer(layers.solarLayer));
        if (elStates) elStates.addEventListener('change', e => e.target.checked ? map.addLayer(layers.statesLayer) : map.removeLayer(layers.statesLayer));
      }, 0);

      return div;
    };
    control.addTo(map);
  }

  async function initLayers(map) {
    const tileLayers = createTileLayers(map);
    tileLayers.windLayer.addTo(map);
    tileLayers.solarLayer.addTo(map);

    // Fetch states geojson
    try {
      const res = await fetch(`${apiBase}/states`);
      if (!res.ok) throw new Error('Failed to load states GeoJSON');
      const data = await res.json();

      // create pane & layer
      if (!map.getPane('statesPane')) map.createPane('statesPane');
      map.getPane('statesPane').style.zIndex = 402;

      const statesLayer = createStatesLayer(data).addTo(map);

      const layers = {
        ...tileLayers,
        statesLayer
      };

      // Attach layer control
      addLayerControls(map, layers);

      // Also wire right-hand UI layer controls to these layers (if present)
      // Opacity sliders and checkboxes in DOM
      const solarOpacityEl = document.getElementById('solarOpacity');
      const windOpacityEl = document.getElementById('windOpacity');
      const solarCheckbox = document.getElementById('solar-layer');
      const windCheckbox = document.getElementById('wind-layer');
      const statesCheckbox = document.getElementById('states-layer');

      if (solarOpacityEl) solarOpacityEl.addEventListener('input', (e) => tileLayers.solarLayer.setOpacity(Number(e.target.value)));
      if (windOpacityEl) windOpacityEl.addEventListener('input', (e) => tileLayers.windLayer.setOpacity(Number(e.target.value)));

      if (solarCheckbox) solarCheckbox.addEventListener('change', (e) => e.target.checked ? map.addLayer(tileLayers.solarLayer) : map.removeLayer(tileLayers.solarLayer));
      if (windCheckbox) windCheckbox.addEventListener('change', (e) => e.target.checked ? map.addLayer(tileLayers.windLayer) : map.removeLayer(tileLayers.windLayer));
      if (statesCheckbox) statesCheckbox.addEventListener('change', (e) => e.target.checked ? map.addLayer(statesLayer) : map.removeLayer(statesLayer));

      return { ...layers, statesLayer };
    } catch (err) {
      console.error("Error init layers:", err);
      // return tile layers anyway so map isn't empty
      return { ...tileLayers, statesLayer: L.layerGroup() };
    }
  }

  // Expose initLayers globally
  window.initMapLayers = initLayers;

})();

//end of layerManager.js