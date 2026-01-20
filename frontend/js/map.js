/* 
   map.js - FULL DSS ORCHESTRATOR (UNABRIDGED)
   Handles GPS, State Highlighting, and Analytics Orchestration.
*/

'use strict';

(function () {
  const apiBase = "http://127.0.0.1:8000"; 
  const initialView = { center: [5.15, 46.2], zoom: 6 }; 
  const SOMALIA_BOUNDS = { lat: [-1.5, 12.0], lon: [41.0, 51.5] };

  let map;
  let activeMarker = null;
  let highlightLayer = null;

  function switchMode(mode) {
    const isSite = mode === 'site';
    const sTab = document.getElementById('site-tab');
    const stTab = document.getElementById('state-tab');
    const sRep = document.getElementById('site-report');
    const stRep = document.getElementById('state-report');

    if (sTab) sTab.classList.toggle('active', isSite);
    if (stTab) stTab.classList.toggle('active', !isSite);
    if (sRep) sRep.classList.toggle('hidden', !isSite);
    if (stRep) stRep.classList.toggle('hidden', isSite);
    if (map) map.getContainer().style.cursor = isSite ? 'crosshair' : 'default';
  }

  function highlightFederalState(feature) {
    if (highlightLayer) map.removeLayer(highlightLayer);
    highlightLayer = L.geoJSON(feature, {
        style: { color: '#FFC82E', weight: 4, fillColor: '#FFC82E', fillOpacity: 0.3 }
    }).addTo(map);
  }

  async function orchestrateSpatialAnalysis(lat, lon, source = "manual") {
    const statusEl = document.getElementById('search-status');
    const loadingEl = document.getElementById('loading');
    
    switchMode('site');
    if (loadingEl) loadingEl.style.display = 'block';
    if (highlightLayer) map.removeLayer(highlightLayer); 

    if (activeMarker) map.removeLayer(activeMarker);
    activeMarker = L.marker([lat, lon]).addTo(map);
    map.setView([lat, lon], Math.max(map.getZoom(), 11));

    try {
      const [pixelRes, stateRes] = await Promise.all([
        fetch(`${apiBase}/api/report/pixel?lon=${lon}&lat=${lat}`),
        fetch(`${apiBase}/state_metrics?lat=${lat}&lon=${lon}`)
      ]);

      if (!pixelRes.ok) throw new Error();
      const pixelData = await pixelRes.json();
      const stateData = stateRes.ok ? await stateRes.json() : { state_name: "Unmapped Area" };

      const finalData = { ...pixelData, lat, lon, state_name: stateData.state_name };
      if (window.updateDashboard) window.updateDashboard(finalData, 'site');
      if (statusEl) statusEl.textContent = "Point Analysis Synchronized.";

    } catch (err) {
      if (statusEl) statusEl.textContent = "Error: Coordinate outside data domain.";
    } finally {
      if (loadingEl) loadingEl.style.display = 'none';
    }
  }

  async function fetchAndZoomState(stateName) {
    const statusEl = document.getElementById('search-status');
    try {
      switchMode('state');
      if (statusEl) statusEl.textContent = `Syncing Region: ${stateName}`;
      
      const res = await fetch(`${apiBase}/state_metrics?state=${encodeURIComponent(stateName)}`);
      const data = await res.json();
      data.state_name = stateName;

      const geoRes = await fetch(`${apiBase}/states`);
      const geoData = await geoRes.json();
      const feature = geoData.features.find(f => (f.properties.state_name || '').toLowerCase() === stateName.toLowerCase());

      if (feature) {
        highlightFederalState(feature); 
        map.fitBounds(L.geoJSON(feature).getBounds(), { padding: [40, 40] });
      }
      if (window.updateDashboard) window.updateDashboard(data, 'state');
    } catch (e) { 
        if (statusEl) statusEl.textContent = "Regional server connection failed.";
    }
  }

  async function triggerGPSOrchestrator() {
    const statusEl = document.getElementById('search-status');
    if (!navigator.geolocation) { statusEl.textContent = "GPS Not Supported."; return; }
    statusEl.textContent = "🛰️ satellite Lock...";
    
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude } = pos.coords;
      const inSom = (latitude >= SOMALIA_BOUNDS.lat[0] && latitude <= SOMALIA_BOUNDS.lat[1]) &&
                    (longitude >= SOMALIA_BOUNDS.lon[0] && longitude <= SOMALIA_BOUNDS.lon[1]);
      if (inSom) orchestrateSpatialAnalysis(latitude, longitude, "gps");
      else {
          statusEl.textContent = "Kenya Context: Simulating Somalia Site...";
          orchestrateSpatialAnalysis(2.0467, 45.3438); 
      }
    }, err => { statusEl.textContent = "GPS Blocked."; });
  }

  function initMap() {
    map = L.map('map', { zoomControl: false }).setView(initialView.center, initialView.zoom);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; ADRA Somalia' }).addTo(map);
    L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);

    window.initMapLayers(map).then(l => {
      L.control.layers(null, { 'Solar Potential': l.solarLayer, 'Wind Potential': l.windLayer, 'Borders': l.statesLayer }, { collapsed: false }).addTo(map);
    });

    map.on('click', e => orchestrateSpatialAnalysis(e.latlng.lat, e.latlng.lng));

    document.getElementById('gps-btn').onclick = triggerGPSOrchestrator;
    document.getElementById('stateDropdown').onchange = (e) => fetchAndZoomState(e.target.value);
    document.getElementById('refresh-view-btn').onclick = () => {
        map.setView(initialView.center, initialView.zoom);
        if (highlightLayer) map.removeLayer(highlightLayer);
        if (activeMarker) map.removeLayer(activeMarker);
    };
    document.getElementById('site-tab').onclick = () => switchMode('site');
    document.getElementById('state-tab').onclick = () => switchMode('state');
    document.getElementById('print-report-btn').onclick = () => window.print();
  }
  
  document.addEventListener('DOMContentLoaded', initMap);
  window.fetchAndZoomState = fetchAndZoomState;
  window.switchMode = switchMode;
})();