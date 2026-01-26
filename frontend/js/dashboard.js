/**
 * =========================================================================
 * dashboard.js - DECISION INTELLIGENCE ENGINE (FULL UNABRIDGED)
 * =========================================================================
 */

(() => {
  const COLORS = { GREEN: "#065C53", GOLD: "#FFC82E", SLATE: "#64748b", NEUTRAL: "#f1f5f9" };
  
  let solarGauge, windGauge, solarGaugeState, windGaugeState;
  let wizardState = { section: null, step: 1, data: {}, loc: "" };

  const safeSetText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  const DecisionAgent = {
    weights: { solar: 0.7, wind: 0.3, slopeLimit: 15 },
    analyze: (data) => {
      const s = data.solar_mean_score || 0;
      const w = data.wind_mean_score || 0;
      const slope = data.slope || 0;

      if (slope > DecisionAgent.weights.slopeLimit) return `❌ <strong>Constraint:</strong> High Slope (${slope.toFixed(1)}°). Engineering risk for ground arrays.`;
      if (s >= 8.5) return `🌟 <strong>Prime Site:</strong> Exceptional solar resource in ${data.state_name}. Priority for microgrids.`;
      if (s >= 7.0) return `✅ <strong>High Potential:</strong> Consistent yield. Recommended for Solar Water Pumping.`;
      if (s >= 4.5) return `💡 <strong>Moderate:</strong> Viable for community health clinics and basic lighting.`;
      return `⚠️ <strong>Low Resource:</strong> Marginal energy density. Targeted domestic units only.`;
    }
  };

  // --- COMPONENT LOGIC ---
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
    const color = score < 4.5 ? COLORS.SLATE : (score < 7.0 ? COLORS.GOLD : COLORS.GREEN);
    gauge.data.datasets[0].backgroundColor[0] = color;
    gauge.update();
    const textEl = document.getElementById(valId);
    if (textEl) { textEl.textContent = score.toFixed(1); textEl.style.color = color; }
  }

  // --- WIZARD ENGINE (UNABRIDGED HARDWARE DATA) ---
  window.selWiz = (section) => {
    wizardState = { section, step: 1, data: {} };
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
        if (val === 'surface') return finishWiz("Model: DHFS300 (1500W Motor; PV 6×335W)", `Optimized for surface points in ${wizardState.loc}`);
        wizardState.step = 2; 
      } else if (st === 2) {
        if (val === '31-40') return finishWiz("Model: SUNFLO-B 500C (500W; PV 4×200W)", "Max 6m³/day discharge.");
        if (val === '41-50') return finishWiz("Model: SUNFLO-A 270H (270W; PV 4×200W)", "Max 3m³/day discharge.");
        if (val === '51-60') return finishWiz("Model: SUNFLO-S 300 (300W; PV 2×200W)", "Max 3m³/day discharge.");
        if (val === '61-70') wizardState.step = 7; 
        else wizardState.step = 3; 
      } else if (st === 3) {
        if (val === '1') return finishWiz("Model: SUNFLO-S 150 (Motor 120W)");
        if (val === '2') return finishWiz("Model: SUNFLO-A 150H (Motor 150W)");
        return finishWiz("Model: SUNFLO-B 120H (Motor 120W)");
      } else if (st === 7) {
        return finishWiz(val === '12' ? "Model: SUNFLO-B 1000C (1000W)" : "Model: SUNFLO-A 600H (600W)");
      }
    } else if (s === 'refrigeration') {
      if (val === 'less-55') return finishWiz("SUNFRIDGE 55", "80W; Dim: 430x230x315mm");
      if (val === '51-130') return finishWiz("SUNFRIDGE 130", "128W; Dim: 513x530x585mm");
      return finishWiz("SUNFRIDGE 240", "150W; Dim: 993x516x594mm");
    } else if (s === 'drying') {
      return finishWiz(val === 'passive' ? "Supplier: Grekkon Limited, Kenya" : "Supplier: Aqua Hub Kenya");
    } else if (s === 'cooking') {
      if (st === 1) wizardState.step = 2; 
      else {
        let res = wizardState.data[1] === 'single' ? "Single Induction (400W Panel)" : "Double Induction (800W Panel)";
        if (val === 'yes') res += " + SCODE 6L Pressure Cooker";
        return finishWiz(res);
      }
    }
    renderWizardStep();
  };

  function renderWizardStep() {
    const container = document.getElementById('wizard-step-content');
    if (!container || !wizardState.section) {
      if (container) container.innerHTML = `<p class="small"><b>Select Application:</b></p>
        <button class="wizard-option-btn" onclick="window.selWiz('water-pumping')">💧 Water Pumping</button>
        <button class="wizard-option-btn" onclick="window.selWiz('refrigeration')">❄️ Cold Storage</button>
        <button class="wizard-option-btn" onclick="window.selWiz('drying')">🌾 Solar Drying</button>
        <button class="wizard-option-btn" onclick="window.selWiz('cooking')">🍳 Clean Cooking</button>`;
      return;
    }
    const st = wizardState.step, s = wizardState.section;
    if (s === 'water-pumping') {
        if (st === 1) wizQ("Water Source", [{l:"Surface",v:"surface"},{l:"Borehole",v:"underground"}]);
        if (st === 2) wizQ("Head Height", [{l:"<30m",v:"less-30"},{l:"31-40m",v:"31-40"},{l:"Deep (61-70m)",v:"61-70"}]);
        if (st === 3 || st === 7) wizQ("Daily Demand", [{l:"1-3m³",v:"1"},{l:"12m³+",v:"12"}]);
    } else if (s === 'refrigeration') wizQ("Volume", [{l:"<55L",v:"less-55"},{l:"130L",v:"51-130"},{l:"240L",v:"131-240"}]);
    else if (s === 'drying') wizQ("Type", [{l:"Passive",v:"passive"},{l:"Active",v:"active"}]);
    else if (s === 'cooking') {
        if (st === 1) wizQ("Burner", [{l:"Single",v:"single"},{l:"Double",v:"double"}]);
        else wizQ("Add Cooker?", [{l:"Yes",v:"yes"},{l:"No",v:"no"}]);
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
    document.getElementById('wizard-step-content').innerHTML = `<p class="small">Matching Complete ✅</p>`;
    const res = document.getElementById('wizard-results');
    res.classList.remove('hidden');
    res.innerHTML = `<div class="agent-box" style="background:white; border-left:4px solid var(--adra-gold);">
        <strong style="color:var(--adra-green)">${model}</strong><br><small>${context}</small></div>
        <button class="btn btn-secondary" style="margin-top:10px;" onclick="window.resetWiz()">New Search</button>`;
  }

  /**
   * PUBLIC DASHBOARD UPDATE
   * RESTORED: Town Metadata Orchestration.
   */
  window.updateDashboard = async function(data, mode = "site") {
    if (!data) return;
    wizardState.loc = data.state_name;
    document.getElementById('loading').style.display = 'none';
    document.getElementById('agent-insight').innerHTML = DecisionAgent.analyze(data);

    // --- RESTORED TOWN METADATA CARD ---
    const townBox = document.getElementById('town-metadata-box');
    if (data.pop && townBox) {
        townBox.classList.remove('hidden');
        townBox.innerHTML = `
            <div class="agent-box" style="background:#fff; border-top: 3px solid var(--adra-gold); box-shadow: 0 4px 10px rgba(0,0,0,0.05); margin-bottom:15px;">
                <small style="color:var(--adra-gold); font-weight:800; text-transform:uppercase;">Demand Center Context</small>
                <h4 style="margin:5px 0; color:var(--adra-green);">${data.name}</h4>
                <div style="font-size:0.8rem; line-height:1.6;">
                    <b>Est. Population:</b> ${data.pop} <br>
                    <b>Critical Infra:</b> ${data.infra} <br>
                    <a href="${data.source_url || '#'}" target="_blank" style="color: var(--adra-green); text-decoration: underline; font-weight: 800;">
                        Verify Demographic Source <i class="fas fa-external-link-alt"></i>
                    </a>
                </div>
                <hr style="margin:10px 0; border:0; border-top:1px solid #eee;">
                <p class="small" style="font-style:italic; margin:0;">Target: High-density urban energy demand.</p>
            </div>`;
    } else if (townBox) townBox.classList.add('hidden');

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