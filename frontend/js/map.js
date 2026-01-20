/* map.js
   Initializes the Leaflet map and orchestrates interactions:
   - mode switching (site vs state)
   - map click sampling (/api/report/pixel)
   - dropdown selection (/state_metrics)
   - cursor styles and small UX niceties
*/

'use strict';

(function () {
  // Config
  const apiBase = "http://127.0.0.1:8000";  // For local dev

  // App state
  let map;
  let layers = {};
  let lastClickedCoords = null;
  let activeMode = 'site'; // default
  const initialView = { center: [6.0, 45.0], zoom: 6 }; // For reset

  // Helper to switch modes and update UI/cursor
  function switchMode(mode) {
    activeMode = mode;
    // Tab classes
    const siteTab = document.getElementById('site-tab');
    const stateTab = document.getElementById('state-tab');
    if (siteTab && stateTab) {
      siteTab.classList.toggle('active', mode === 'site');
      siteTab.setAttribute('aria-selected', mode === 'site');
      stateTab.classList.toggle('active', mode === 'state');
      stateTab.setAttribute('aria-selected', mode === 'state');
    }
    // sections
    const siteSection = document.getElementById('site-report');
    const stateSection = document.getElementById('state-report');
    if (siteSection && stateSection) {
      siteSection.classList.toggle('hidden', mode !== 'site');
      stateSection.classList.toggle('hidden', mode !== 'state');
    }

    // Hide site scores in site mode
    const siteSolarArea = document.getElementById('site-solar-area-metric');
    const siteWindArea = document.getElementById('site-wind-area-metric');
    if (siteSolarArea && siteWindArea) {
      const display = (mode === 'site') ? 'none' : 'block';
      siteSolarArea.style.display = display;
      siteWindArea.style.display = display;
    }

    // set cursor
    if (map && map.getContainer) {
      map.getContainer().style.cursor = (mode === 'site') ? 'crosshair' : 'default';
    }
  }

  // Initialize map and layers
  function initMap() {
    map = L.map('map').setView(initialView.center, initialView.zoom);

    // Base tile
    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // scale control
    L.control.scale({ imperial: false }).addTo(map);

    // initialize layers and attach them
    window.initMapLayers(map).then(l => {
      layers = l;

      // Add map-based layer control for the 3 layers
      L.control.layers(null, {
        'Solar Layer': layers.solarLayer,
        'Wind Layer': layers.windLayer,
        'Federal States': layers.statesLayer
      }).addTo(map);
    }).catch(err => {
      console.error('Layer init error:', err);
      layers = {};
    });

    // click handling - site pixel sampling
    map.on('click', async (e) => {
      // switch to site mode on click
      switchMode('site');
      const lat = e.latlng.lat;
      const lon = e.latlng.lng;
      lastClickedCoords = { lat, lon };

      // show popup immediately while fetching
      const popup = L.popup({ closeOnClick: false, autoClose: true })
        .setLatLng(e.latlng)
        .setContent('Loading...')
        .openOn(map);

      try {
        const res = await fetch(`${apiBase}/api/report/pixel?lon=${lon}&lat=${lat}`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();

        // **ADDED**: Fetch state name for better context in popup and dashboard header
        const stateRes = await fetch(`${apiBase}/state_metrics?lat=${lat}&lon=${lon}`);
        let stateName = "Unknown";
        if (stateRes.ok) {
            const stateData = await stateRes.json();
            stateName = stateData.state_name || "Unknown";
        }

        // attach coords and state name to data for dashboard
        data.lat = lat;
        data.lon = lon;
        data.state_name = stateName;

        // update dashboard in site mode (sends the raw data object)
        if (window.updateDashboard) window.updateDashboard(data, 'site');

        // **MODIFIED**: update popup with a clean table format.
        const popupContent = `
          <b>Site in ${stateName} (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)</b>
          <table style="width:100%; margin-top: 5px; border-collapse: collapse;">
            <tr><th style="text-align:left;">Solar Score</th><td style="text-align:right;">${data.solar_mean_score?.toFixed(2) ?? 'N/A'}</td></tr>
            <tr><th style="text-align:left;">Wind Score</th><td style="text-align:right;">${data.wind_mean_score?.toFixed(2) ?? 'N/A'}</td></tr>
          </table>`;
        popup.setContent(popupContent);
      } catch (err) {
        console.error('Pixel fetch error:', err);
        popup.setContent('<b>No data here</b>');
      }
    });

    // wire UI controls after DOM
    document.addEventListener('DOMContentLoaded', () => {
      const siteTab = document.getElementById('site-tab');
      const stateTab = document.getElementById('state-tab');
      if (siteTab) siteTab.addEventListener('click', () => switchMode('site'));
      if (stateTab) stateTab.addEventListener('click', () => switchMode('state'));

      // dropdown
      const dropdown = document.getElementById('stateDropdown');
      const dropdownBtn = document.getElementById('dropdown-btn');
      if (dropdown) {
        dropdown.addEventListener('change', async () => {
          const state = dropdown.value;
          if (state) {
            document.getElementById('search-status').textContent = 'Loading...';
            await fetchAndZoomState(state);
          }
        });
      }
      if (dropdownBtn) {
        dropdownBtn.addEventListener('click', async () => {
          const state = dropdown.value;
          if (state) {
            document.getElementById('search-status').textContent = 'Loading...';
            await fetchAndZoomState(state);
          }
        });
      }

      // Refresh button (repurposed to reset map view)
      const refreshBtn = document.getElementById('refresh-view-btn');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
          map.setView(initialView.center, initialView.zoom);
          const statusEl = document.getElementById('refresh-status');
          if (statusEl) statusEl.textContent = 'Map reset';
          setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 3000);
        });
      }
    });

    // set initial mode
    switchMode(activeMode);
  }

  // Reusable: fetch state metrics and zoom to the feature
  async function fetchAndZoomState(stateName) {
    try {
      // switch mode
      switchMode('state');

      // fetch numeric metrics
      const res = await fetch(`${apiBase}/state_metrics?state=${encodeURIComponent(stateName)}`);
      if (!res.ok) throw new Error(`State API returned ${res.status}`);
      const data = await res.json();

      // **ADDED**: Add state_name to the data object so the dashboard can use it.
      data.state_name = stateName;

      // fetch geo to find geometry and bounds
      const geoRes = await fetch(`${apiBase}/states`);
      if (!geoRes.ok) throw new Error('Failed to load states geo');
      const geoData = await geoRes.json();

      const feature = geoData.features.find(f => (f.properties.state_name || '').toLowerCase() === (stateName || '').toLowerCase());
      if (feature) {
        const layer = L.geoJSON(feature);
        map.fitBounds(layer.getBounds(), { padding: [20, 20] });
      }

      // update state dashboard
      if (window.updateDashboard) window.updateDashboard(data, 'state');
      document.getElementById('search-status').textContent = `Showing ${stateName}`;

      return true;
    } catch (err) {
      console.error('State fetch/zoom error:', err);
      document.getElementById('search-status').textContent = 'State not found';
      return false;
    } finally {
      setTimeout(() => { document.getElementById('search-status').textContent = ''; }, 3000);
    }
  }

  // Wire init on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    initMap();
  });

  // Expose global helpers for layerManager usage
  window.switchMode = switchMode;
  window.fetchAndZoomState = fetchAndZoomState;

})();

// end of map.js