/**
 * =========================================================================
 * map.js - SPATIAL ORCHESTRATION ENGINE (FULL UNABRIDGED)
 * =========================================================================
 * GIS PROFESSIONAL COMMENT: This engine manages geodetic telemetry and 
 * coordinates the asynchronous sampling of multi-layer raster datasets.
 */

'use strict';

(function () {
  /**
   * HYBRID API CONFIGURATION
   * GIS PROFESSIONAL COMMENT: Automated SDI Endpoint resolution.
   * Logic: Dynamically toggles between local loopback (Offline) and the 
   * production Railway API (Online) to ensure continuous system availability.
   */
  const apiBase = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:8000"
    : "https://dss-dashboard-production.up.railway.app"; 

  /* Geodetic entry point: Center of Somali Peninsula area of interest */
  const initialView = { center: [5.15, 46.2], zoom: 6 }; 

  /* Spatial extent constraints to prevent out-of-bounds telemetry requests */
  const SOMALIA_BOUNDS = { lat: [-1.5, 12.0], lon: [41.0, 51.5] };

  let map;
  let layers = {}; 
  let activeMarker = null;
  let highlightLayer = null;

  /**
   * Switches UI states and handles autonomous layer shutoff.
   */
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
    
    // --- FOCUS MODE: AUTO SHUTOFF BOUNDARIES ---
    /* GIS Logic: Toggling vector administrative boundaries to reduce visual clutter during raster analysis */
    if (layers.statesLayer) {
        if (isSite) {
            map.removeLayer(layers.statesLayer);
        } else {
            map.addLayer(layers.statesLayer);
        }
    }

    if (map && map.getContainer) {
      map.getContainer().style.cursor = isSite ? 'crosshair' : 'default';
    }
  }

  function highlightFederalState(feature) {
    if (highlightLayer) map.removeLayer(highlightLayer);
    highlightLayer = L.geoJSON(feature, {
        style: { color: '#FFC82E', weight: 4, fillColor: '#FFC82E', fillOpacity: 0.3 }
    }).addTo(map);
  }

  /**
   * ANALYTIC PIPELINE
   * PRESERVED: townData parameter for deep demographic injection.
   * GIS Logic: Performs a spatial join between point geometry and multi-layered raster datasets.
   */
  async function orchestrateSpatialAnalysis(lat, lon, source = "manual", townData = null) {
    const statusEl = document.getElementById('search-status');
    const loadingEl = document.getElementById('loading');
    const agentEl = document.getElementById('agent-insight');
    
    switchMode('site');
    if (loadingEl) loadingEl.style.display = 'block';
    if (highlightLayer) map.removeLayer(highlightLayer); 

    if (activeMarker) map.removeLayer(activeMarker);
    activeMarker = L.marker([lat, lon]).addTo(map);
    map.setView([lat, lon], Math.max(map.getZoom(), 11));

    try {
      /**
       * GIS PROFESSIONAL COMMENT: Parallel Spatial Query.
       * Logic: Simultaneously sampling the Raster Data Store (Pixel Level) 
       * and the Vector RDBMS (State Metrics) to assemble the site dossier.
       */
      const [pixelRes, stateRes] = await Promise.all([
        fetch(`${apiBase}/api/report/pixel?lon=${lon}&lat=${lat}`),
        fetch(`${apiBase}/state_metrics?lat=${lat}&lon=${lon}`)
      ]);

      if (!pixelRes.ok) throw new Error("Data mismatch");
      
      const pixelData = await pixelRes.json();
      const stateData = stateRes.ok ? await stateRes.json() : { state_name: "Unmapped Region" };

      // FULL CONTEXT PRESERVATION
      const finalData = { 
        ...pixelData, 
        ...townData, // This restores the pop, source_url, etc.
        lat: lat, 
        lon: lon, 
        state_name: stateData.state_name || "Unmapped Region" 
      };

      if (window.updateDashboard) {
        window.updateDashboard(finalData, 'site');
      }

      // FOCUS MODE POPUP
      const popupContent = `
        <div style="border-top: 3px solid #FFC82E; padding-top:5px; font-family: sans-serif; min-width:220px;">
          <b style="color:#065C53; font-size:1.1rem;">Site Focused Analysis</b><br>
          <small style="color:#64748b; font-weight:bold;">${finalData.state_name}</small>
          <p style="font-size:0.75rem; margin: 8px 0; color: #334155; line-height:1.4;">
            <b>Spatial Mode:</b> Admin boundaries auto-toggled to reveal underlying resource rasters.
          </p>
          <hr style="border:0; border-top:1px solid #e2e8f0; margin:10px 0;">
          <div style="display:flex; justify-content:space-between; gap:10px; font-size:0.85rem;">
            <span>Solar: <b>${pixelData.solar_mean_score?.toFixed(2)}</b></span>
            <span>Wind: <b>${pixelData.wind_mean_score?.toFixed(2)}</b></span>
          </div>
        </div>`;
      
      activeMarker.bindPopup(popupContent).openPopup();
      if (statusEl && source !== "gps") statusEl.textContent = "Data successfully orchestrated.";

    } catch (err) {
      if (statusEl) statusEl.textContent = "Error: Point outside valid coverage.";
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
    } catch (e) { if (statusEl) statusEl.textContent = "Regional server error."; }
  }

  /**
   * GPS ORCHESTRATOR
   * GIS Logic: Real-time acquisition of user geodetic position for localized decision support.
   */
  async function triggerGPSOrchestrator() {
    const statusEl = document.getElementById('search-status');
    const agentEl = document.getElementById('agent-insight');
    if (!navigator.geolocation) { statusEl.textContent = "GPS Not Detected."; return; }
    statusEl.textContent = "🛰️ satellite Lock...";
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude } = pos.coords;
      const inSomalia = (latitude >= SOMALIA_BOUNDS.lat[0] && latitude <= SOMALIA_BOUNDS.lat[1]) &&
                        (longitude >= SOMALIA_BOUNDS.lon[0] && longitude <= SOMALIA_BOUNDS.lon[1]);
      if (inSomalia) { orchestrateSpatialAnalysis(latitude, longitude, "gps"); } 
      else {
          statusEl.style.color = "var(--adra-gold)";
          statusEl.textContent = "Context: Kenya (Simulation Mode)";
          agentEl.innerHTML = `<strong>Geospatial Agent:</strong> Detected outside Somalia. Executing <b>Mogadishu Simulation</b>.`;
          setTimeout(() => { orchestrateSpatialAnalysis(2.0467, 45.3438, "manual"); statusEl.style.color = ""; }, 1500);
      }
    }, err => { statusEl.textContent = "GPS Blocked."; }, { enableHighAccuracy: true });
  }

  function initMap() {
    map = L.map('map', { zoomControl: false }).setView(initialView.center, initialView.zoom);
    setTimeout(() => { map.invalidateSize(); }, 200);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; ADRA Somalia', className: 'muted-tiles' }).addTo(map);
    L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);

    window.initMapLayers(map).then(l => {
      layers = l;
      L.control.layers(null, {
        '<span style="color:#065C53;font-weight:bold;">Solar Map</span>': l.solarLayer,
        '<span style="color:#065C53;font-weight:bold;">Wind Map</span>': l.windLayer,
        'Town Hubs': l.townsLayer,
        'Administrative Borders': l.statesLayer
      }, { collapsed: false }).addTo(map);
    });

    map.on('click', e => orchestrateSpatialAnalysis(e.latlng.lat, e.latlng.lng));

    document.getElementById('gps-btn').onclick = triggerGPSOrchestrator;
    document.getElementById('stateDropdown').onchange = (e) => fetchAndZoomState(e.target.value);
    document.getElementById('refresh-view-btn').onclick = () => {
        map.setView(initialView.center, initialView.zoom);
        if (highlightLayer) map.removeLayer(highlightLayer);
        if (activeMarker) map.removeLayer(activeMarker);
        if (layers.statesLayer) map.addLayer(layers.statesLayer);
    };
    document.getElementById('site-tab').onclick = () => switchMode('site');
    document.getElementById('state-tab').onclick = () => switchMode('state');
    document.getElementById('print-report-btn').onclick = () => window.print();
  }
  
  document.addEventListener('DOMContentLoaded', initMap);
  window.orchestrateSpatialAnalysis = orchestrateSpatialAnalysis;
  window.fetchAndZoomState = fetchAndZoomState;
  window.switchMode = switchMode;
})();