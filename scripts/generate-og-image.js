// Renders public/og-image.png (1200x630) through a real browser.
//
//   npm install --save-dev playwright
//   npx playwright install chromium
//   node scripts/generate-og-image.js
//
// Playwright is intentionally NOT in package.json: Vercel installs devDependencies
// during a build, and pulling a browser engine on every deploy to regenerate a
// static image nobody changed is a poor trade. Install it ad hoc when you need it.
//
// The machine this repo is usually maintained from has no Node, so the committed
// PNG was produced by generate-og-image.py, which draws the same layout with
// Pillow. If you change the design here, change it there too.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

async function run() {
  // The logo lives in src/assets (it is imported by the app header), not public/.
  const logoPath = path.join(__dirname, '..', 'src', 'assets', 'sallysupport-logo.png');
  const logoBuffer = fs.readFileSync(logoPath);
  const logoDataUri = `data:image/png;base64,${logoBuffer.toString('base64')}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    width: 1200px; height: 630px;
    background: #FFFFFF;
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    position: relative;
    overflow: hidden;
  }
  .bar { position: absolute; left:0; top:0; bottom:0; width:14px; background:#4A90C4; }
  .content { position: absolute; left:90px; top:64px; right:80px; }
  .logo { width:240px; height:auto; display:block; margin-bottom:56px; }
  .eyebrow {
    font-size:20px; font-weight:700; letter-spacing:0.15em; text-transform:uppercase;
    color:#4A90C4; margin-bottom:18px;
  }
  .title {
    font-size:64px; font-weight:800; color:#1A2B4A; margin-bottom:22px; line-height:1.05;
    max-width:760px; letter-spacing:-0.01em;
  }
  .byline { font-size:26px; font-style:italic; font-weight:500; color:#1E8A7B; margin-bottom:14px; }
  .body-line { font-size:21px; font-weight:400; color:#5A6170; max-width:600px; line-height:1.5; }
  .chart { position:absolute; right:80px; bottom:64px; display:flex; align-items:flex-end; gap:10px; }
  .chart .col { width:30px; background:#4A90C4; }
  .chart .col.tall { background:#1A2B4A; }
</style>
</head>
<body>
  <div class="bar"></div>
  <div class="content">
    <img class="logo" src="${logoDataUri}" />
    <p class="eyebrow">Live Industry Benchmark</p>
    <h1 class="title">The Admin Roadmap Report</h1>
    <p class="byline">A report for home care agencies by SallySupport</p>
    <p class="body-line">How home care agencies hire, staff, and grow their office teams.</p>
  </div>
  <div class="chart">
    <div class="col" style="height:44px"></div>
    <div class="col" style="height:66px"></div>
    <div class="col" style="height:52px"></div>
    <div class="col tall" style="height:104px"></div>
    <div class="col" style="height:74px"></div>
  </div>
</body>
</html>`;

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.screenshot({
    path: path.join(__dirname, '..', 'public', 'og-image.png'),
    clip: { x: 0, y: 0, width: 1200, height: 630 },
  });
  await browser.close();
  console.log('Saved public/og-image.png');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
