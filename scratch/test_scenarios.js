const fs = require('fs');
const code = fs.readFileSync('public/js/trust-engine.js', 'utf8');

global.window = {
  addEventListener: () => {}
};
global.navigator = { onLine: true };
eval(code);

(async () => {
  const engine = window.oneHealthTrust;
  const scenarios = engine.getDemoScenarios();
  console.log('Testing', scenarios.length, 'scenarios:');
  for (const sc of scenarios) {
    const res = await engine.verifyClaim(sc.text);
    console.log(`[PASS] ${sc.id}: Status=${res.status} | Risk=${res.riskLevel} | Topic="${res.topic}" | Sources=${res.sourcesChecked.length}`);
  }
  // Test user custom claim
  const custom = 'Oral rehydration solution (ORS) can help prevent and treat dehydration caused by diarrhea by replacing lost fluids and electrolytes.';
  const customRes = await engine.verifyClaim(custom);
  console.log(`[PASS] User Query: Status=${customRes.status} | Topic="${customRes.topic}" | Sources=${customRes.sourcesChecked.length}`);
})();
