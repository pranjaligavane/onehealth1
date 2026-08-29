/**
 * ONEHEALTH AI - Analytics & Epidemiological Surveillance Engine
 * Displays village outbreak alerts, disease heatmaps, and screening statistics in multiple languages.
 */

class OneHealthAnalytics {
  constructor() {
    this.riskChart = null;
    this.categoryChart = null;
    this.villageChart = null;
  }

  async renderDashboard(casesList, containerElement) {
    if (!containerElement) return;

    const lang = window.oneHealthI18n.currentLang;
    const t = (k) => window.oneHealthI18n.t(k);

    // 1. Calculate stats from local IndexedDB cases
    const total = casesList.length;
    let humanCount = 0, childCount = 0, livestockCount = 0;
    let redCount = 0, orangeCount = 0, yellowCount = 0, greenCount = 0;
    const villageCounts = {};
    const conditionCounts = {};

    for (const c of casesList) {
      if (c.case_type === 'human_general') humanCount++;
      else if (c.case_type === 'child_development') childCount++;
      else if (c.case_type === 'livestock') livestockCount++;

      if (c.risk_level === 'RED') redCount++;
      else if (c.risk_level === 'ORANGE') orangeCount++;
      else if (c.risk_level === 'YELLOW') yellowCount++;
      else greenCount++;

      const v = c.village || 'Kopargaon';
      villageCounts[v] = (villageCounts[v] || 0) + 1;

      const cond = c.primary_condition || 'General';
      conditionCounts[cond] = (conditionCounts[cond] || 0) + 1;
    }

    // 2. Fetch outbreak alerts from IndexedDB
    const alerts = await window.oneHealthDB.getAlerts();

    const lblTotal = lang === 'mr' ? 'एकूण तपासण्या' : lang === 'hi' ? 'कुल जांच' : 'Total Screenings';
    const lblRed = lang === 'mr' ? 'लाल आणीबाणी केसेस' : lang === 'hi' ? 'गंभीर लाल जोखिम' : 'Critical Red Risk';
    const lblOrange = lang === 'mr' ? 'केशरी तातडीच्या केसेस' : lang === 'hi' ? 'नारंगी त्वरित केसेस' : 'Urgent Orange';
    const lblRatio = lang === 'mr' ? 'मानव : पशुधन गुणोत्तर' : lang === 'hi' ? 'मानव : पशुधन अनुपात' : 'Human vs Livestock';

    const lblTargetArea = lang === 'mr' ? 'बाधित क्षेत्र' : lang === 'hi' ? 'प्रभावित क्षेत्र' : 'Target Area';
    const lblPrecaution = lang === 'mr' ? 'तातडीने घ्यावयाची काळजी:' : lang === 'hi' ? 'आवश्यक सावधानियां:' : 'Mandatory Precautions:';

    // 3. Render HTML Layout
    containerElement.innerHTML = `
      <div class="analytics-container">
        <!-- Summary Cards -->
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-num">${total}</span>
            <span class="stat-label">${lblTotal}</span>
          </div>
          <div class="stat-card border-red">
            <span class="stat-num color-red">${redCount}</span>
            <span class="stat-label">${lblRed}</span>
          </div>
          <div class="stat-card border-orange">
            <span class="stat-num color-orange">${orangeCount}</span>
            <span class="stat-label">${lblOrange}</span>
          </div>
          <div class="stat-card border-green">
            <span class="stat-num color-green">${humanCount + childCount} : ${livestockCount}</span>
            <span class="stat-label">${lblRatio}</span>
          </div>
        </div>

        <!-- Outbreak Alerts Banner -->
        <div class="alerts-section">
          <h3 class="section-title">🚨 ${t('surveillance_title')}</h3>
          <div class="alerts-list">
            ${alerts.length > 0 ? alerts.map(a => `
              <div class="alert-card alert-${a.severity.toLowerCase()}">
                <div class="alert-header">
                  <span class="alert-badge">${a.severity}</span>
                  <strong>${a.title}</strong>
                </div>
                <p class="alert-village">📍 ${lblTargetArea}: <strong>${a.village}</strong> | Group: <strong>${a.target_group}</strong></p>
                <p class="alert-desc">${a.description}</p>
                ${a.precautions ? `<div class="alert-precautions"><strong>${lblPrecaution}</strong> ${a.precautions}</div>` : ''}
              </div>
            `).join('') : `<p class="text-muted">${lang === 'mr' ? 'सध्या कोणतेही सक्रिय साथीचे आजार आढळलेले नाहीत.' : 'No active critical epidemic alerts at this time.'}</p>`}
          </div>
        </div>

        <!-- Chart Grid -->
        <div class="charts-grid">
          <div class="chart-card">
            <h4>${lang === 'mr' ? 'जोखीम स्तर वर्गीकरण' : lang === 'hi' ? 'जोखिम वर्गीकरण' : 'Risk Stratification Triage'}</h4>
            <div class="canvas-wrapper">
              <canvas id="chartRisk"></canvas>
            </div>
          </div>
          <div class="chart-card">
            <h4>${lang === 'mr' ? 'विभागानुसार तपासणी' : lang === 'hi' ? 'विभाग अनुसार जांच' : 'Screenings by OneHealth Sector'}</h4>
            <div class="canvas-wrapper">
              <canvas id="chartCategory"></canvas>
            </div>
          </div>
        </div>

        <!-- Village Distribution Table -->
        <div class="table-card">
          <h4>${lang === 'mr' ? 'गावनिहाय रोग सर्वेक्षण तपशील' : lang === 'hi' ? 'गांव अनुसार निगरानी विवरण' : 'Village-Level Surveillance Breakdown'}</h4>
          <table class="data-table">
            <thead>
              <tr>
                <th>${lang === 'mr' ? 'गाव / परिसर' : lang === 'hi' ? 'गांव / क्षेत्र' : 'Village / Settlement'}</th>
                <th>${lang === 'mr' ? 'तपासलेली प्रकरणे' : lang === 'hi' ? 'जांच मामले' : 'Screened Cases'}</th>
                <th>${lang === 'mr' ? 'स्थिती' : lang === 'hi' ? 'स्थिति' : 'Status'}</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(villageCounts).map(([v, count]) => `
                <tr>
                  <td><strong>${v}</strong></td>
                  <td>${count} ${lang === 'mr' ? 'प्रकरणे' : lang === 'hi' ? 'मामले' : 'cases'}</td>
                  <td><span class="badge ${count > 5 ? 'badge-orange' : 'badge-green'}">${count > 5 ? (lang === 'mr' ? 'वाढीव संसर्ग' : 'Elevated Activity') : (lang === 'mr' ? 'सामान्य' : 'Routine')}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // 4. Render Chart.js visual graphs
    this.renderCharts(redCount, orangeCount, yellowCount, greenCount, humanCount, childCount, livestockCount);
  }

  renderCharts(red, orange, yellow, green, human, child, livestock) {
    if (typeof Chart === 'undefined') return;

    const ctxRisk = document.getElementById('chartRisk');
    if (ctxRisk) {
      if (this.riskChart) this.riskChart.destroy();
      this.riskChart = new Chart(ctxRisk, {
        type: 'doughnut',
        data: {
          labels: ['Critical (RED)', 'Urgent (ORANGE)', 'Moderate (YELLOW)', 'Low (GREEN)'],
          datasets: [{
            data: [red, orange, yellow, green],
            backgroundColor: ['#ef4444', '#f97316', '#eab308', '#10b981'],
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
          }
        }
      });
    }

    const ctxCat = document.getElementById('chartCategory');
    if (ctxCat) {
      if (this.categoryChart) this.categoryChart.destroy();
      this.categoryChart = new Chart(ctxCat, {
        type: 'bar',
        data: {
          labels: ['Human General', 'Child Dev', 'Livestock / Vet'],
          datasets: [{
            label: 'Screened Cases',
            data: [human, child, livestock],
            backgroundColor: ['#0f766e', '#0284c7', '#10b981'],
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1 } }
          }
        }
      });
    }
  }
}

window.oneHealthAnalytics = new OneHealthAnalytics();
