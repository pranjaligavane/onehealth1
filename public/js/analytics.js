/**
 * ONEHEALTH AI - Analytics & Epidemiological Surveillance Engine
 * Displays village outbreak alerts, disease heatmaps, and screening statistics.
 */

class OneHealthAnalytics {
  constructor() {
    this.riskChart = null;
    this.categoryChart = null;
    this.villageChart = null;
  }

  async renderDashboard(casesList, containerElement) {
    if (!containerElement) return;

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

    // 3. Render HTML Layout
    containerElement.innerHTML = `
      <div class="analytics-container">
        <!-- Summary Cards -->
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-num">${total}</span>
            <span class="stat-label">Total Screenings</span>
          </div>
          <div class="stat-card border-red">
            <span class="stat-num color-red">${redCount}</span>
            <span class="stat-label">Critical Red Risk</span>
          </div>
          <div class="stat-card border-orange">
            <span class="stat-num color-orange">${orangeCount}</span>
            <span class="stat-label">Urgent Orange</span>
          </div>
          <div class="stat-card border-green">
            <span class="stat-num color-green">${humanCount + childCount} : ${livestockCount}</span>
            <span class="stat-label">Human vs Livestock</span>
          </div>
        </div>

        <!-- Outbreak Alerts Banner -->
        <div class="alerts-section">
          <h3 class="section-title">🚨 Active Outbreak & Disease Surveillance Alerts</h3>
          <div class="alerts-list">
            ${alerts.length > 0 ? alerts.map(a => `
              <div class="alert-card alert-${a.severity.toLowerCase()}">
                <div class="alert-header">
                  <span class="alert-badge">${a.severity}</span>
                  <strong>${a.title}</strong>
                </div>
                <p class="alert-village">📍 Target Area: <strong>${a.village}</strong> | Group: <strong>${a.target_group}</strong></p>
                <p class="alert-desc">${a.description}</p>
                ${a.precautions ? `<div class="alert-precautions"><strong>Mandatory Precautions:</strong> ${a.precautions}</div>` : ''}
              </div>
            `).join('') : '<p class="text-muted">No active critical epidemic alerts at this time.</p>'}
          </div>
        </div>

        <!-- Chart Grid -->
        <div class="charts-grid">
          <div class="chart-card">
            <h4>Risk Stratification Triage</h4>
            <div class="canvas-wrapper">
              <canvas id="chartRisk"></canvas>
            </div>
          </div>
          <div class="chart-card">
            <h4>Screenings by OneHealth Sector</h4>
            <div class="canvas-wrapper">
              <canvas id="chartCategory"></canvas>
            </div>
          </div>
        </div>

        <!-- Village Distribution Table -->
        <div class="table-card">
          <h4>Village-Level Surveillance Breakdown</h4>
          <table class="data-table">
            <thead>
              <tr>
                <th>Village / Settlement</th>
                <th>Screened Cases</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(villageCounts).map(([v, count]) => `
                <tr>
                  <td><strong>${v}</strong></td>
                  <td>${count} cases</td>
                  <td><span class="badge ${count > 5 ? 'badge-orange' : 'badge-green'}">${count > 5 ? 'Elevated Activity' : 'Routine'}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // 4. Initialize Charts if Chart.js is loaded
    this.initCharts(redCount, orangeCount, yellowCount, greenCount, humanCount, childCount, livestockCount);
  }

  initCharts(red, orange, yellow, green, human, child, livestock) {
    if (typeof Chart === 'undefined') return;

    // Destroy existing instances if any
    if (this.riskChart) this.riskChart.destroy();
    if (this.categoryChart) this.categoryChart.destroy();

    const ctxRisk = document.getElementById('chartRisk');
    if (ctxRisk) {
      this.riskChart = new Chart(ctxRisk, {
        type: 'doughnut',
        data: {
          labels: ['Critical Red', 'Urgent Orange', 'Moderate Yellow', 'Low Green'],
          datasets: [{
            data: [red, orange, yellow, green],
            backgroundColor: ['#ef4444', '#f97316', '#eab308', '#22c55e']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      });
    }

    const ctxCat = document.getElementById('chartCategory');
    if (ctxCat) {
      this.categoryChart = new Chart(ctxCat, {
        type: 'pie',
        data: {
          labels: ['Human General', 'Child Development', 'Livestock / Vet'],
          datasets: [{
            data: [human, child, livestock],
            backgroundColor: ['#3b82f6', '#8b5cf6', '#10b981']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      });
    }
  }
}

window.oneHealthAnalytics = new OneHealthAnalytics();
