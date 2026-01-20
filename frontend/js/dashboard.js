/* dashboard.js
   Responsible for gauges and updating the dashboard for both Site and State modes.
   Exposes updateDashboard(data, mode) where mode is "site" or "state".
*/

(() => {
  // Module scope
const apiBase = "http://127.0.0.1:8000" ;  // For local dev

  // Chart instances
  let solarGauge, windGauge;
  let solarGaugeState, windGaugeState;

  // Create gauge helper (Chart.js doughnut)
  function classifyScore(value) {
    if (value == null) return { color: "#ddd", label: "No data" };
    const v = Number(value);
    if (v < 2) return { color: "#3f007d", label: "Lowest Potential" };
    if (v < 4) return { color: "#2c7ef7", label: "Low Potential" };
    if (v < 6) return { color: "#7fff00", label: "Moderate Potential" };
    if (v < 8) return { color: "#ff6600", label: "High Potential" };
    return { color: "#b30000", label: "Highest Potential" };
  }

  function createGauge(ctx, label) {
    return new Chart(ctx, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [0, 10],
          backgroundColor: ['#3f007d', '#ddd'],
          borderWidth: 0,
          userData: {}
        }]
      },
      options: {
        rotation: -90,
        circumference: 180,
        cutout: '70%',
        plugins: {
          doughnutlabel: {
            labels: [
              { text: "0.0", font: { size: 16 } },
              { text: "No data", font: { size: 12 } },
              { text: label, font: { size: 12 } }
            ]
          },
          legend: { display: false },
          tooltip: {
            enabled: true,
            callbacks: {
              label: function(context) {
                const ud = context.dataset.userData || {};
                const score = context.parsed?.toFixed?.(1) ?? context.parsed;
                if (ud.isSolar) {
                  const ghi = ud.data?.mean_ghi?.toFixed?.(2) ?? 'N/A';
                  return `Solar Score: ${score} | GHI: ${ghi}`;
                } else if (ud.isWind) {
                  const ws = ud.data?.mean_wind_speed_ms?.toFixed?.(2) ?? 'N/A';
                  return `Wind Score: ${score} | Mean speed: ${ws}`;
                }
                return `Score: ${score}`;
              }
            }
          }
        }
      }
    });
  }

  function updateGauge(gauge, value, displayElId, data, opts = {}) {
    if (!gauge) return;
    const numeric = Number(value ?? 0);
    const max = 10;
    gauge.data.datasets[0].data[0] = numeric;
    gauge.data.datasets[0].data[1] = Math.max(0, max - numeric);

    // store data for tooltip
    gauge.data.datasets[0].userData = { data, isSolar: !!opts.isSolar, isWind: !!opts.isWind };

    const { color, label } = classifyScore(numeric);
    gauge.data.datasets[0].backgroundColor[0] = color;

    // update label center
    const labels = gauge.options.plugins.doughnutlabel.labels;
    labels[0].text = numeric.toFixed(1);
    labels[1].text = label;

    gauge.update();

    const valueEl = document.getElementById(displayElId);
    if (valueEl) valueEl.textContent = numeric.toFixed(1);
  }

  // Public API: update dashboard
  async function updateDashboard(data, mode = "site") {
    // mode: "site" or "state"
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';

    if (!data) return;

    if (mode === "site") {
      document.getElementById('report-sub').textContent = `${data.lat?.toFixed?.(2) ?? 'N/A'}, ${data.lon?.toFixed?.(2) ?? 'N/A'}`;
      document.getElementById('solar-area').textContent = (data.solar_highly_suitable_km2 ?? 'N/A').toString();
      document.getElementById('wind-area').textContent = (data.wind_highly_suitable_km2 ?? 'N/A').toString();
      document.getElementById('mean-ghi').textContent = data.mean_ghi?.toFixed?.(2) ?? 'N/A';
      document.getElementById('mean-wind-speed').textContent = data.mean_wind_speed_ms?.toFixed?.(2) ?? 'N/A';
      document.getElementById('mean-wpd').textContent = data.mean_wpd?.toFixed?.(2) ?? 'N/A';
      document.getElementById('mean-slope').textContent = data.slope?.toFixed?.(0) ?? 'N/A';
      document.getElementById('lcoe-solar').textContent = data.lcoe_solar?.toFixed?.(3) ?? 'N/A';
      document.getElementById('lcoe-wind').textContent = data.lcoe_wind?.toFixed?.(3) ?? 'N/A';
      updateGauge(solarGauge, data.solar_mean_score ?? 0, 'solar-gauge-value', data, { isSolar: true });
      updateGauge(windGauge, data.wind_mean_score ?? 0, 'wind-gauge-value', data, { isWind: true });
    } else {
      // State mode
      document.getElementById('report-sub').textContent = data.state_name ?? 'Region';
      document.getElementById('solar-area-state').textContent = (data.solar_highly_suitable_km2 ?? 'N/A').toString();
      document.getElementById('wind-area-state').textContent = (data.wind_highly_suitable_km2 ?? 'N/A').toString();
      document.getElementById('mean-ghi-state').textContent = data.mean_ghi?.toFixed?.(2) ?? 'N/A';
      document.getElementById('mean-wind-speed-state').textContent = data.mean_wind_speed_ms?.toFixed?.(2) ?? 'N/A';
      document.getElementById('mean-wpd-state').textContent = data.mean_wpd?.toFixed?.(2) ?? 'N/A';
      document.getElementById('mean-slope-state').textContent = data.mean_slope?.toFixed?.(1) ?? 'N/A';
      document.getElementById('lcoe-solar-state').textContent = data.lcoe_solar?.toFixed?.(3) ?? 'N/A';
      document.getElementById('lcoe-wind-state').textContent = data.lcoe_wind?.toFixed?.(3) ?? 'N/A';
      updateGauge(solarGaugeState, data.solar_mean_score ?? 0, 'solar-gauge-value-state', data, { isSolar: true });
      updateGauge(windGaugeState, data.wind_mean_score ?? 0, 'wind-gauge-value-state', data, { isWind: true });
    }
  }

  // New: Questionnaire logic
  let currentSection = null;
  let currentQNum = 1;
  let answers = {};

  function startQuestionnaire() {
    const questionnaireSection = document.getElementById('questionnaire-section');
    if (questionnaireSection) questionnaireSection.style.display = 'block';
    resetQuestionnaire();
  }

  function resetQuestionnaire() {
    currentSection = null;
    currentQNum = 1;
    answers = {};
    const form = document.getElementById('questionnaire-form');
    const results = document.getElementById('questionnaire-results');
    if (form) form.innerHTML = '';
    if (results) results.innerHTML = '';
    showSectionSelector();
  }

  function showSectionSelector() {
    const form = document.getElementById('questionnaire-form');
    form.innerHTML = `
      <h4>Select Application</h4>
      <select id="app-section">
        <option value="">Select</option>
        <option value="water-pumping">Solar Water Pumping</option>
        <option value="refrigeration">Solar Refrigeration/Freezing</option>
        <option value="drying">Solar Drying</option>
        <option value="cooking">Solar Cooking</option>
      </select>
      <button onclick="handleSectionSelect()">Start</button>
    `;
  }

  window.handleSectionSelect = function() {
    const select = document.getElementById('app-section');
    currentSection = select.value;
    if (currentSection) {
      currentQNum = 1;
      showQuestion(currentSection, currentQNum);
    }
  };

  function showQuestion(section, qNum) {
    const form = document.getElementById('questionnaire-form');
    form.innerHTML = '';
    let content = '';

    if (section === 'water-pumping') {
      if (qNum === 1) {
        content = `
          <h4>Solar Water Pumping</h4>
          <label>Q1) What is your source of water?</label>
          <select id="q1">
            <option value="">Select</option>
            <option value="surface">Surface water (e.g ponds, streams,rivers, lakes, harvested rainwater in tanks)</option>
            <option value="underground">Underground water (shallow wells, boreholes)</option>
          </select>
        `;
      } else if (qNum === 2) {
        content = `
          <h4>Solar Water Pumping</h4>
          <label>Q2) What is the approximate static head (vertical lift)? (Hint: This is the net vertical distance the fluid must be lifted from its initial level to its final destination)</label>
          <select id="q2">
            <option value="">Select</option>
            <option value="less-30">Less than 30 m</option>
            <option value="31-40">31-40m</option>
            <option value="41-50">41-50m</option>
            <option value="51-60">51-60m</option>
            <option value="61-70">61-70m</option>
          </select>
        `;
      } else if (qNum === 3) {
        content = `
          <h4>Solar Water Pumping</h4>
          <label>Q3) Select your daily water requirement in cubic meters(m3) from the list.</label>
          <select id="q3">
            <option value="">Select</option>
            <option value="1">1 m3</option>
            <option value="2">2 m3</option>
            <option value="3">3 m3</option>
          </select>
        `;
      } else if (qNum === 7) {
        content = `
          <h4>Solar Water Pumping</h4>
          <label>Q7) Select your daily water requirement in cubic meters(m3) from the list.</label>
          <select id="q7">
            <option value="">Select</option>
            <option value="4">4 m3</option>
            <option value="12">12 m3</option>
          </select>
        `;
      }
    } else if (section === 'refrigeration') {
      if (qNum === 1) {
        content = `
          <h4>Solar Refrigeration/Freezing</h4>
          <label>Q1) What is the approximate volume (litres) of goods that you would want to refrigerate/freeze? (Hint: 1000 litres=1m3)</label>
          <select id="q1">
            <option value="">Select</option>
            <option value="less-55">Less than 55</option>
            <option value="51-130">51-130</option>
            <option value="131-240">131-240</option>
          </select>
        `;
      }
    } else if (section === 'drying') {
      if (qNum === 1) {
        content = `
          <h4>Solar Drying</h4>
          <label>Q1) Which type of dryer best suits your needs?</label>
          <select id="q1">
            <option value="">Select</option>
            <option value="passive">Passive dryer (Hint: rely on natural convection to dry produce and might take longer although faster than direct sun drying)</option>
            <option value="active">Active dryer (Hint: they use fans for forced convection, thereby increasing efficiency making produce to dry faster)</option>
          </select>
        `;
      }
    } else if (section === 'cooking') {
      if (qNum === 1) {
        content = `
          <h4>Solar Cooking</h4>
          <label>Q1) Which of the following solar cooker induction plates best suits your needs?</label>
          <select id="q1">
            <option value="">Select</option>
            <option value="single">single burner induction plates</option>
            <option value="double">double burner induction plates</option>
          </select>
        `;
      } else if (qNum === 2) {
        content = `
          <h4>Solar Cooking</h4>
          <label>Q2) Are you interested in solar electric pressure cooker with 6L capacity?</label>
          <select id="q2">
            <option value="">Select</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        `;
      }
    }

    form.innerHTML = content + '<button onclick="handleAnswer()">Next</button>';
  }

  window.handleAnswer = function() {
    const results = document.getElementById('questionnaire-results');
    let recommendation = '';

    if (currentSection === 'water-pumping') {
      if (currentQNum === 1) {
        answers.q1 = document.getElementById('q1').value;
        if (answers.q1 === 'surface') {
          recommendation = 'Recommended pump model: DHFS300 (motor rating 1500W; PV module 6×335W)';
          showResults(recommendation);
          return;
        } else if (answers.q1 === 'underground') {
          currentQNum = 2;
          showQuestion(currentSection, currentQNum);
          return;
        }
      } else if (currentQNum === 2) {
        answers.q2 = document.getElementById('q2').value;
        if (answers.q2 === 'less-30') {
          currentQNum = 3;
          showQuestion(currentSection, currentQNum);
          return;
        } else if (answers.q2 === '31-40') {
          recommendation = 'Recommended pump model: SUNFLO-B 500C (motor rating 500 W; PV module 4×200W) (maximum daily discharge is 6m3)';
          showResults(recommendation);
          return;
        } else if (answers.q2 === '41-50') {
          recommendation = 'Recommended pump model: SUNFLO-A 270H (motor rating 270W; PV module 4×200W) (maximum daily discharge is 3m3)';
          showResults(recommendation);
          return;
        } else if (answers.q2 === '51-60') {
          recommendation = 'Recommended pump model: SUNFLO-S 300 (motor rating 300W; PV module 2×200W) (maximum daily discharge is 3m3)';
          showResults(recommendation);
          return;
        } else if (answers.q2 === '61-70') {
          currentQNum = 7;
          showQuestion(currentSection, currentQNum);
          return;
        }
      } else if (currentQNum === 3) {
        answers.q3 = document.getElementById('q3').value;
        if (answers.q3 === '1') {
          recommendation = 'Recommended pump model: SUNFLO-S 150 (motor rating 120W; PV module 1×200W)';
        } else if (answers.q3 === '2') {
          recommendation = 'Recommended pump model: SUNFLO-A 150H (motor rating 150W; PV module 1×200W)';
        } else if (answers.q3 === '3') {
          recommendation = 'Recommended pump model: SUNFLO-B 120H (motor rating 120W; PV module 1×200W)';
        }
        showResults(recommendation);
        return;
      } else if (currentQNum === 7) {
        answers.q7 = document.getElementById('q7').value;
        if (answers.q7 === '4') {
          recommendation = 'Recommended pump model: SUNFLO-A 600H (motor rating 600W; PV module 4×200W)';
        } else if (answers.q7 === '12') {
          recommendation = 'Recommended pump model: SUNFLO-B 1000C (motor rating 1000W; PV module 8×200W)';
        }
        showResults(recommendation);
        return;
      }
    } else if (currentSection === 'refrigeration') {
      if (currentQNum === 1) {
        answers.q1 = document.getElementById('q1').value;
        if (answers.q1 === 'less-55') {
          recommendation = 'Recommended freezer model: SUNFRIDGE 55 (power requirement 80W; internal dimension430x230x315)';
        } else if (answers.q1 === '51-130') {
          recommendation = 'Recommended freezer model: SUNFRIDGE 130 (power requirement 128W; internal dimension 513x530x585)';
        } else if (answers.q1 === '131-240') {
          recommendation = 'Recommended freezer model: SUNFRIDGE 240 (power requirement 150W; internal dimension 993x516x594)';
        }
        showResults(recommendation);
        return;
      }
    } else if (currentSection === 'drying') {
      if (currentQNum === 1) {
        answers.q1 = document.getElementById('q1').value;
        if (answers.q1 === 'passive') {
          recommendation = 'Recommended supplier: Grekkon Limited, Kenya';
        } else if (answers.q1 === 'active') {
          recommendation = 'Recommended supplier: Aqua Hub Kenya LTD';
        }
        showResults(recommendation);
        return;
      }
    } else if (currentSection === 'cooking') {
      if (currentQNum === 1) {
        answers.q1 = document.getElementById('q1').value;
        if (answers.q1 === 'single') {
          recommendation = 'Recommended supplier: Athel Technology, Kenya (with specific configurations including 400W panels and 300Ah batteries)';
        } else if (answers.q1 === 'double') {
          recommendation = 'Recommended supplier: Athel Technology, Kenya (with specific configuration including 800W panels and 600Ah batteries)';
        }
        currentQNum = 2;
        showQuestion(currentSection, currentQNum);
        return;
      } else if (currentQNum === 2) {
        answers.q2 = document.getElementById('q2').value;
        if (answers.q2 === 'yes') {
          recommendation += '<br>Recommended for solar electric pressure cooker: SCODE, Kenya (specific configuration including 400W of power requirement and operates on 24 V DC)';
        } // If no, no additional
        showResults(recommendation);
        return;
      }
    }
  }

  function showResults(message) {
    const form = document.getElementById('questionnaire-form');
    form.innerHTML = '';
    const results = document.getElementById('questionnaire-results');
    results.innerHTML = `<p>${message}</p><button onclick="resetQuestionnaire()">Restart</button>`;
  }

  // Initialize gauges on DOM load
  document.addEventListener("DOMContentLoaded", () => {
    try {
      solarGauge = createGauge(document.getElementById("solarGauge").getContext('2d'), "Solar");
      windGauge = createGauge(document.getElementById("windGauge").getContext('2d'), "Wind");
      solarGaugeState = createGauge(document.getElementById("solarGaugeState").getContext('2d'), "Solar");
      windGaugeState = createGauge(document.getElementById("windGaugeState").getContext('2d'), "Wind");
    } catch (err) {
      console.warn("Could not initialize gauges:", err);
    }

    // Wire questionnaire button
    const questionnaireBtn = document.getElementById('questionnaire-btn');
    if (questionnaireBtn) questionnaireBtn.addEventListener('click', startQuestionnaire);
  });

  // Export functions to window so other modules can call
  window.updateDashboard = updateDashboard;
  window.handleSectionSelect = handleSectionSelect;
  window.handleAnswer = handleAnswer;
  window.resetQuestionnaire = resetQuestionnaire;

})();

// end of dashboard.js