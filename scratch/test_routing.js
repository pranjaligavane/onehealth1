const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');
const js = fs.readFileSync('public/js/app.js', 'utf8');

const secRegex = /<section[^>]+id=["']([^"']+)["']/g;
let m;
const sectionIds = [];
while ((m = secRegex.exec(html)) !== null) {
  sectionIds.push(m[1]);
}
console.log('Index.html Section IDs:', sectionIds);

const navRegex = /navigateTo\(["']([^"']+)["']/g;
const navViews = new Set();
while ((m = navRegex.exec(html)) !== null) {
  navViews.add(m[1]);
}
while ((m = navRegex.exec(js)) !== null) {
  navViews.add(m[1]);
}

console.log('All navigateTo arguments:');
for (const v of navViews) {
  const directId = 'view-' + v;
  const hyphenId = 'view-' + v.replace(/_/g, '-');
  const underscoreId = 'view-' + v.replace(/-/g, '_');
  const found = sectionIds.includes(directId) || sectionIds.includes(hyphenId) || sectionIds.includes(underscoreId);
  console.log(`View '${v}': ${found ? 'FOUND (' + (sectionIds.find(s => s === directId || s === hyphenId || s === underscoreId)) + ')' : 'MISSING!'}`);
}
