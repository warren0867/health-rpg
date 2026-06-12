// expo export 후 dist/index.html에 PWA 태그를 주입한다.
// 사용: node scripts/patch-web.js  (npm run build:web 에 포함됨)
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
const file = path.join(dist, 'index.html');
let html = fs.readFileSync(file, 'utf8');

// GitHub Pages 필수 (항상 실행): Jekyll이 _expo/ 폴더를 무시하지 않도록
fs.writeFileSync(path.join(dist, '.nojekyll'), '');

if (html.includes('rel="manifest"')) {
  // HTML은 이미 패치됨 — 404.html만 갱신
  fs.copyFileSync(file, path.join(dist, '404.html'));
  console.log('.nojekyll + 404.html 갱신 (HTML은 이미 패치됨)');
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

// SPA 라우팅: 직접 URL 접근/새로고침 시 404 대신 앱 로드
fs.copyFileSync(file, path.join(dist, '404.html'));

console.log('dist/index.html PWA 패치 + .nojekyll + 404.html 완료');
