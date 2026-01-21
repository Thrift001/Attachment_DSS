/* 
   map.js - FULL DSS ORCHESTRATOR (UNABRIDGED - 2026 RESET)
   Orchestrates: 
   - Multi-Agent Spatial Analysis (FastAPI Integration)
   - GPS AOI Intelligence (Somalia vs. Kenya Context)
   - Federal State Highlighting (Shapefile Data)
   - ADRA Somalia Visual Identity
*/

'use strict';

(function () {
  // --- 1. CORE CONFIGURATION ---
  const apiBase = "http://127.0.0.1:8000"; 
  const initialView = { center: [5.15, 46.2], zoom: 6 }; 
  const SOMALIA_BOUNDS = { lat: [-1.5, 12.0], lon: [41.0, 51.5] };

  let map;
  let activeMarker = null;
  let highlightLayer = null;

  // --- 2. UI MODE ORCHESTRATION ---
  function switchMode(mode) {
    const isSite = mode === 'site';
    const sTab = document.getElementById('site-tab');
    const stTab = document.getElementById('state-tab');
    const sRep = document.getElementById('site-report');
    const stRep = document.getElementById('state-report');

    // Standardize ADRA Branding Toggle
    if (sTab) sTab.classList.toggle('active', isSite);
    if (stTab) stTab.classList.toggle('active', !isSite);
    if (sRep) sRep.classList.toggle('hidden', !isSite);
    if (stRep) stRep.classList.toggle('hidden', isSite);
    
    if (map && map.getContainer) {
      map.getContainer().style.cursor = isSite ? 'crosshair' : 'default';
    }
  }

  // --- 3. SHAPEFILE HIGHLIGHT AGENT ---
  function highlightFederalState(feature) {
    if (highlightLayer) map.removeLayer(highlightLayer);
    
    // Highlight in ADRA Gold (#FFC82E) to confirm regional selection
    highlightLayer = L.geoJSON(feature, {
        style: { 
            color: '#FFC82E', 
            weight: 4, 
            fillColor: '#FFC82E', 
            fillOpacity: 0.3 
        }
    }).addTo(map);
  }

  // --- 4. ANALYTIC PIPELINE (THE ORCHESTRATOR) ---
  async function orchestrateSpatialAnalysis(lat, lon, source = "manual") {
    const statusEl = document.getElementById('search-status');
    const loadingEl = document.getElementById('loading');
    const agentEl = document.getElementById('agent-insight');
    
    switchMode('site');
    if (loadingEl) loadingEl.style.display = 'block';
    if (highlightLayer) map.removeLayer(highlightLayer); 

    // Visual Marker Orchestration
    if (activeMarker) map.removeLayer(activeMarker);
    activeMarker = L.marker([lat, lon]).addTo(map);
    map.setView([lat, lon], Math.max(map.getZoom(), 11));

    try {
      // Execute Concurrent Agent Fetching (Pixel Data + Regional Meta-data)
      const [pixelRes, stateRes] = await Promise.all([
        fetch(`${apiBase}/api/report/pixel?lon=${lon}&lat=${lat}`),
        fetch(`${apiBase}/state_metrics?lat=${lat}&lon=${lon}`)
      ]);

      if (!pixelRes.ok) throw new Error("Outside data domain");
      
      const pixelData = await pixelRes.json();
      const stateData = stateRes.ok ? await stateRes.json() : { state_name: "Unmapped Region" };

      // Enrich Data Object for Dashboard Hand-off
      const finalData = { 
        ...pixelData, 
        lat: lat, 
        lon: lon, 
        state_name: stateData.state_name || "Unmapped Region" 
      };

      // Trigger Decision Engine
      if (window.updateDashboard) {
        window.updateDashboard(finalData, 'site');
      }

      // Contextual ADRA Popup
      const popupContent = `
        <div style="border-top: 3px solid #FFC82E; padding-top:5px; font-family: sans-serif;">
          <b style="color:#065C53; font-size:1.1rem;">ADRA Site Context</b><br>
          <small style="color:#64748b; font-weight:bold; text-transform:uppercase;">${finalData.state_name}</small>
          <hr style="border:0; border-top:1px solid #e2e8f0;">
          <div style="display:flex; justify-content:space-between;">
            <span>Solar: <b>${pixelData.solar_mean_score?.toFixed(2)}</b></span>
            <span>Wind: <b>${pixelData.wind_mean_score?.toFixed(2)}</b></span>
          </div>
        </div>`;
      
      activeMarker.bindPopup(popupContent).openPopup();
      
      if (source !== "gps") {
        statusEl.textContent = "Coordinate analysis synchronized.";
      }

    } catch (err) {
      if (statusEl) statusEl.textContent = "Error: Point lacks valid raster coverage.";
      if (agentEl) agentEl.textContent = "Spatial Agent: Target coordinate is outside Somalia energy mapping domain.";
    } finally {
      if (loadingEl) loadingEl.style.display = 'none';
    }
  }

  // --- 5. REGIONAL ANALYSIS (SHAPEFILE INTEGRATION) ---
  async function fetchAndZoomState(stateName) {
    const statusEl = document.getElementById('search-status');
    const agentEl = document.getElementById('agent-insight');

    try {
      switchMode('state');
      if (statusEl) statusEl.textContent = `Orchestrating Region: ${stateName}`;
      
      const res = await fetch(`${apiBase}/state_metrics?state=${encodeURIComponent(stateName)}`);
      const data = await res.json();
      data.state_name = stateName;

      // Access current map state features
      const geoRes = await fetch(`${apiBase}/states`);
      const geoData = await geoRes.json();
      const feature = geoData.features.find(f => (f.properties.state_name || '').toLowerCase() === stateName.toLowerCase());

      if (feature) {
        highlightFederalState(feature); 
        map.fitBounds(L.geoJSON(feature).getBounds(), { padding: [40, 40] });
      }
      
      if (window.updateDashboard) window.updateDashboard(data, 'state');

    } catch (e) { 
        if (statusEl) statusEl.textContent = "Regional telemetry failed.";
    }
  }

  // --- 6. GPS INTELLIGENCE AGENT (KENYAN DEV PROTOCOL) ---
  async function triggerGPSOrchestrator() {
    const statusEl = document.getElementById('search-status');
    const agentEl = document.getElementById('agent-insight');

    if (!navigator.geolocation) { 
        statusEl.textContent = "GPS Failure: Hardware not detected."; 
        return; 
    }

    statusEl.textContent = "🛰️ Querying Satellite Constellation...";
    
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude } = pos.coords;
      
      // Determine if Coordinate is within Somalia AOI
      const inSomalia = (latitude >= SOMALIA_BOUNDS.lat[0] && latitude <= SOMALIA_BOUNDS.lat[1]) &&
                        (longitude >= SOMALIA_BOUNDS.lon[0] && longitude <= SOMALIA_BOUNDS.lon[1]);
      
      if (inSomalia) {
        statusEl.textContent = "📍 AOI Confirmed: Somalia Mission Area.";
        orchestrateSpatialAnalysis(latitude, longitude, "gps");
      } else {
          // --- THE CLEVER KENYAN DEV MESSAGE ---
          statusEl.style.color = "var(--adra-gold)";
          statusEl.textContent = "AOI Context: Kenya (Development Mode).";
          
          agentEl.innerHTML = `
            <div style="border-left: 4px solid var(--adra-gold); padding-left:12px;">
                <strong>Geospatial Agent:</strong> Location detected outside Somalia mission area. 
                <br><small>Initiating <b>Development Simulation</b>. Redirecting to high-potential 
                corridor in <i>Mogadishu, Banadir</i> for system validation.</small>
            </div>
          `;

          // Trigger simulation after a brief delay for readability
          setTimeout(() => {
              orchestrateSpatialAnalysis(2.0467, 45.3438, "manual"); 
              statusEl.style.color = "";
          }, 1800);
      }
    }, err => { 
        statusEl.textContent = "GPS Request Denied by User."; 
    }, { enableHighAccuracy: true });
  }

  // --- 7. SYSTEM INITIALIZATION ---
  function initMap() {
    map = L.map('map', { zoomControl: false }).setView(initialView.center, initialView.zoom);
    
 // Add this to ensure map fills the encased container properly
    setTimeout(() => { map.invalidateSize(); }, 200);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    
    // Muted Base Layer to make ADRA Overlays stand out
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
        attribution: '&copy; ADRA Somalia Energy DSS',
        className: 'muted-tiles'
    }).addTo(map);
    
    L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);

    // Orchestrate Layers from LayerManager.js
    if (window.initMapLayers) {
        window.initMapLayers(map).then(l => {
          L.control.layers(null, {
            '<span style="color:#065C53;font-weight:bold;">Solar Potential</span>': l.solarLayer,
            '<span style="color:#065C53;font-weight:bold;">Wind Potential</span>': l.windLayer,
            'Federal Boundaries': l.statesLayer
          }, { collapsed: false, position: 'topright' }).addTo(map);
        });
    }

    // Map Event Listeners
    map.on('click', e => orchestrateSpatialAnalysis(e.latlng.lat, e.latlng.lng));

    document.getElementById('gps-btn').onclick = triggerGPSOrchestrator;
    document.getElementById('stateDropdown').onchange = (e) => fetchAndZoomState(e.target.value);
    
    document.getElementById('refresh-view-btn').onclick = () => {
        map.setView(initialView.center, initialView.zoom);
        if (highlightLayer) map.removeLayer(highlightLayer);
        if (activeMarker) map.removeLayer(activeMarker);
        document.getElementById('agent-insight').textContent = "Map Reset. System standby.";
    };

    document.getElementById('site-tab').onclick = () => switchMode('site');
    document.getElementById('state-tab').onclick = () => switchMode('state');
    document.getElementById('print-report-btn').onclick = () => window.print();
  }
  
  // STARTUP
  document.addEventListener('DOMContentLoaded', initMap);

  // EXPOSE INTERFACES
  window.fetchAndZoomState = fetchAndZoomState;
  window.switchMode = switchMode;

})();