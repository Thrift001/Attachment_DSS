/* 
   dashboard.js - FULL DECISION ENGINE (UNABRIDGED)
   Features: Fixed Wizard Loop, Premium Gauges, Full Hardware Logic.
*/

(() => {
  const COLORS = { GREEN: "#065C53", GOLD: "#FFC82E", SLATE: "#64748b", NEUTRAL: "#f1f5f9" };
  let solarGauge, windGauge, solarGaugeState, windGaugeState;
  let wizardState = { section: null, step: 1, data: {} };

  const safeSetText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  // --- 1. DECISION AGENT (0-10 SCALE) ---
  const DecisionAgent = {
    weights: { solar: 0.7, wind: 0.3, slopeLimit: 15 },
    analyze: (data) => {
      const s = data.solar_mean_score || 0;
      const w = data.wind_mean_score || 0;
      const slope = data.slope || 0;

      if (slope > DecisionAgent.weights.slopeLimit) return `❌ <strong>Constraint:</strong> Slope (${slope.toFixed(1)}°) is high. Civil works costs will increase.`;
      if (s >= 8) return `🌟 <strong>Prime (8-10):</strong> Exceptional yield in ${data.state_name || 'this area'}. Ideal for ADRA microgrids.`;
      if (s >= 6) return `✅ <strong>High (6-8):</strong> Consistent output. Recommended for Solar Water Pumping (SWP).`;
      if (s >= 4) return `💡 <strong>Moderate (4-6):</strong> Suitable for schools and clinics with hybrid storage.`;
      return `⚠️ <strong>Low Potential (0-4):</strong> Sub-optimal resources. Use for small domestic lighting only.`;
    }
  };

  // --- 2. GAUGE LOGIC ---
  function createGauge(id) {
    const canvas = document.getElementById(id);
    if (!canvas) return null;
    return new Chart(canvas.getContext('2d'), {
      type: 'doughnut',
      data: { datasets: [{ data: [0, 10], backgroundColor: [COLORS.GREEN, COLORS.NEUTRAL], borderWidth: 0, cutout: '82%' }] },
      options: { rotation: -90, circumference: 180, plugins: { legend: { display: false }, tooltip: { enabled: false } }, aspectRatio: 1.6, animation: { duration: 1000 } }
    });
  }

  function updateGaugeUI(gauge, val, valId) {
    if (!gauge) return;
    const score = Number(val || 0);
    gauge.data.datasets[0].data = [score, 10 - score];
    const color = score < 4.5 ? COLORS.SLATE : (score < 7.5 ? COLORS.GOLD : COLORS.GREEN);
    gauge.data.datasets[0].backgroundColor[0] = color;
    gauge.update();
    const textEl = document.getElementById(valId);
    if (textEl) { textEl.textContent = score.toFixed(1); textEl.style.color = color; }
  }

  // --- 3. CONTEXT-AWARE WIZARD (FULL TECHNICAL BRANCHING) ---
  window.selWiz = (section) => {
    wizardState = { section: section, step: 1, data: {} };
    document.getElementById('wizard-results').classList.add('hidden');
    renderWizardStep();
  };

  window.resetWiz = () => {
    wizardState = { section: null, step: 1, data: {} };
    document.getElementById('wizard-results').classList.add('hidden');
    renderWizardStep();
  };

  window.procWiz = (val) => {
    wizardState.data[wizardState.step] = val;
    const s = wizardState.section, st = wizardState.step;

    if (s === 'water-pumping') {
      if (st === 1) {
        if (val === 'surface') return finishWiz("Model: DHFS300 (1500W; PV 6×335W)", "Optimized for surface water points in " + wizardState.loc);
        wizardState.step = 2; 
      } else if (st === 2) {
        if (val === '31-40') return finishWiz("Model: SUNFLO-B 500C (500W; PV 4×200W; Max 6m³/day)");
        if (val === '41-50') return finishWiz("Model: SUNFLO-A 270H (270W; PV 4×200W; Max 3m³/day)");
        if (val === '51-60') return finishWiz("Model: SUNFLO-S 300 (300W; PV 2×200W; Max 3m³/day)");
        if (val === '61-70') { wizardState.step = 7; } else { wizardState.step = 3; }
      } else if (st === 3) {
        if (val === '1') return finishWiz("Model: SUNFLO-S 150");
        if (val === '2') return finishWiz("Model: SUNFLO-A 150H");
        return finishWiz("Model: SUNFLO-B 120H");
      } else if (st === 7) {
        return finishWiz(val === '12' ? "Model: SUNFLO-B 1000C (Motor 1000W)" : "Model: SUNFLO-A 600H (Motor 600W)");
      }
    } else if (s === 'refrigeration') {
      if (val === 'less-55') return finishWiz("Model: SUNFRIDGE 55 (80W; 430x230x315mm)");
      if (val === '51-130') return finishWiz("Model: SUNFRIDGE 130 (128W; 513x530x585mm)");
      return finishWiz("Model: SUNFRIDGE 240 (150W; 993x516x594mm)");
    } else if (s === 'drying') {
      return finishWiz(val === 'passive' ? "Supplier: Grekkon Ltd, Kenya" : "Supplier: Aqua Hub Kenya", "Agri-product dryer configuration.");
    } else if (s === 'cooking') {
      if (st === 1) { wizardState.step = 2; } 
      else {
        let res = wizardState.data[1] === 'single' ? "Single Induction (Athel Tech; 400W Panel)" : "Double Induction (Athel Tech; 800W Panel)";
        if (val === 'yes') res += " + 6L Pressure Cooker (SCODE, Kenya)";
        return finishWiz(res);
      }
    }
    renderWizardStep();
  };

  function renderWizardStep() {
    const container = document.getElementById('wizard-step-content');
    if (!container) return;
    if (!wizardState.section) {
      container.innerHTML = `<p class="small"><b>Choose ADRA Project Type:</b></p>
        <button class="wizard-option-btn" onclick="window.selWiz('water-pumping')">💧 Water Pumping</button>
        <button class="wizard-option-btn" onclick="window.selWiz('refrigeration')">❄️ Cold Storage</button>
        <button class="wizard-option-btn" onclick="window.selWiz('drying')">🌾 Solar Drying</button>
        <button class="wizard-option-btn" onclick="window.selWiz('cooking')">🍳 Clean Cooking</button>`;
      return;
    }
    const s = wizardState.section, st = wizardState.step;
    if (s === 'water-pumping') {
        if (st === 1) wizQ("Water Source", [{l:"Surface (Tank/Lake)",v:"surface"},{l:"Well/Borehole",v:"underground"}]);
        if (st === 2) wizQ("Head Height (Lift)", [{l:"Shallow (<30m)",v:"less-30"},{l:"31-40m",v:"31-40"},{l:"41-50m",v:"41-50"},{l:"51-60m",v:"51-60"},{l:"Deep (61-70m)",v:"61-70"}]);
        if (st === 3 || st === 7) wizQ("Daily Demand", [{l:"1-3 m³",v:"1"},{l:"4 m³",v:"4"},{l:"12 m³+",v:"12"}]);
    } else if (s === 'refrigeration') wizQ("Volume Required", [{l:"<55L",v:"less-55"},{l:"51-130L",v:"51-130"},{l:"131-240L",v:"131-240"}]);
    else if (s === 'drying') wizQ("System Type", [{l:"Passive (Natural)",v:"passive"},{l:"Active (Fans)",v:"active"}]);
    else if (s === 'cooking') {
        if (st === 1) wizQ("Burner Type", [{l:"Single Plate",v:"single"},{l:"Double Plate",v:"double"}]);
        else wizQ("Add Pressure Cooker?", [{l:"Yes (6L)",v:"yes"},{l:"No",v:"no"}]);
    }
  }

  function wizQ(title, opts) {
    const container = document.getElementById('wizard-step-content');
    let html = `<p class="small"><b>${title}</b></p>`;
    opts.forEach(o => html += `<button class="wizard-option-btn" onclick="window.procWiz('${o.v}')">${o.l}</button>`);
    html += `<button class="btn" style="background:#eee; color:#333; margin-top:5px;" onclick="window.resetWiz()">⬅ Back</button>`;
    container.innerHTML = html;
  }

  function finishWiz(model, context = "") {
    document.getElementById('wizard-step-content').innerHTML = `<p class="small">Selection Optimized ✅</p>`;
    const res = document.getElementById('wizard-results');
    res.classList.remove('hidden');
    res.innerHTML = `<div class="agent-box" style="background:white; border-left:5px solid var(--adra-gold);">
        <strong style="color:var(--adra-green)">${model}</strong><br><small>${context}</small></div>
        <button class="btn btn-secondary" style="margin-top:10px;" onclick="window.resetWiz()">New Search</button>`;
  }

  // --- 4. PUBLIC DSS INTERFACE ---
  window.updateDashboard = async function(data, mode = "site") {
    if (!data) return;
    wizardState.loc = data.state_name;
    document.getElementById('loading').style.display = 'none';
    document.getElementById('agent-insight').innerHTML = DecisionAgent.analyze(data);

    if (mode === "site") {
      safeSetText('report-sub', `${data.lat.toFixed(3)}, ${data.lon.toFixed(3)}`);
      safeSetText('state-name-display', data.state_name || 'N/A');
      safeSetText('mean-slope', `${data.slope?.toFixed(1) || 0}°`);
      safeSetText('mean-ghi', data.mean_ghi?.toFixed(2) || 'N/A');
      safeSetText('mean-wind-speed', data.mean_wind_speed_ms?.toFixed(1) || 'N/A');
      safeSetText('mean-wpd', data.mean_wpd?.toFixed(1) || 'N/A');
      safeSetText('lcoe-solar', `$${(0.15 - (data.solar_mean_score * 0.005)).toFixed(3)}`);
      safeSetText('lcoe-wind', `$${(0.12 - (data.wind_mean_score * 0.004)).toFixed(3)}`);
      updateGaugeUI(solarGauge, data.solar_mean_score, 'val-solar');
      updateGaugeUI(windGauge, data.wind_mean_score, 'val-wind');
      document.getElementById('wizard-suggestion').style.display = 'block';
      document.getElementById('wizard-suggestion').innerHTML = data.solar_mean_score > 7 ? `💡 Agent: Highly recommendation for <strong>Water Pumping</strong> infrastructure.` : `💡 Agent: Suggesting low-power lighting/refrigeration.`;
    } else {
      safeSetText('report-sub', data.state_name);
      safeSetText('solar-area-state', `${data.solar_highly_suitable_km2?.toLocaleString() || 0} km²`);
      safeSetText('wind-area-state', `${data.wind_highly_suitable_km2?.toLocaleString() || 0} km²`);
      updateGaugeUI(solarGaugeState, data.solar_mean_score, 'val-solar-state');
      updateGaugeUI(windGaugeState, data.wind_mean_score, 'val-wind-state');
    }
  };

  document.addEventListener("DOMContentLoaded", () => {
    solarGauge = createGauge("solarGauge");
    windGauge = createGauge("windGauge");
    solarGaugeState = createGauge("solarGaugeState");
    windGaugeState = createGauge("windGaugeState");
    renderWizardStep();
  });
})();