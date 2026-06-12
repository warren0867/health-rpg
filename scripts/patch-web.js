// expo export 후 dist/index.html에 PWA 태그를 주입한다.
// 사용: node scripts/patch-web.js  (npm run build:web 에 포함됨)
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'dist', 'index.html');
let html = fs.readFileSync(file, 'utf8');

if (html.includes('rel="manifest"')) {
  console.log('이미 패치됨 — 건너뜀');
  process.exit(0);
}

const BASE = '/health-rpg';
const inject = `
    <link rel="manifest" href="${BASE}/manifest.json" />
    <meta name="theme-color" content="#F5F7F9" />
    <link rel="apple-touch-icon" href="${BASE}/icons/apple-touch-icon.png" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="HealthRPG" />
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
          navigator.serviceWorker.register('${BASE}/sw.js', { scope: '${BASE}/' });
        });
      }
    </script>
  </head>`;

html = html.replace('</head>', inject);
fs.writeFileSync(file, html);
console.log('dist/index.html PWA 패치 완료');
