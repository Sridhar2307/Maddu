import fs from 'fs';
import path from 'path';
import https from 'https';

const viteSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path fill="#bd34fe" d="m27.5 4.5l-11 20l-1.5 2.5l-1.5-2.5l-11-20l11.5 3.5z"/><path fill="#41d1ff" d="m14 3l-11.5 3.5l11 20l1.5 2.5l1.5-2.5l1.5-3z"/><path fill="#ffea83" d="m17 7l-8 7h5l-2 7l9-10h-5z"/></svg>`;

const logos = [
  { name: 'VITE 6', inlineSvg: viteSvg },
  { name: 'FAST API', url: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/fastapi/fastapi-original.svg' },
  { name: 'PYTHON', url: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg' },
  { name: 'POSTGRESQL', url: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg' },
  { name: 'PRISMA', url: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/prisma/prisma-original.svg' },
  { name: 'DOCKER', url: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg' },
  { name: 'JAVASCRIPT', url: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg' }
];

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function run() {
  const logoItems = [];
  for (const l of logos) {
    try {
      let svg = l.inlineSvg ? l.inlineSvg : await fetchText(l.url);
      svg = svg.replace(/<\?xml.*?\?>/gi, '').replace(/<!DOCTYPE.*?>/gi, '');
      const b64 = Buffer.from(svg).toString('base64');
      logoItems.push({ name: l.name, dataUri: `data:image/svg+xml;base64,${b64}` });
      console.log(`Ready: ${l.name}`);
    } catch (e) {
      console.error(`Failed ${l.name}:`, e.message);
    }
  }

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Tech Logos Strip - DakshinAgriHub</title>
  <style>
    body { margin: 0; padding: 40px; background: #0f172a; font-family: 'Times New Roman', Times, serif; color: #fff; text-align: center; }
    h2 { font-size: 1.4rem; color: #38bdf8; margin-bottom: 6px; font-family: sans-serif; }
    p { color: #94a3b8; font-family: sans-serif; font-size: 14px; margin-bottom: 30px; }
    .strip-wrapper { display: flex; justify-content: center; }
    .strip-container { display: flex; align-items: center; justify-content: space-around; background: #ffffff; padding: 25px 35px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.4); width: 850px; gap: 25px; }
    .item { display: flex; flex-direction: column; align-items: center; gap: 10px; width: 100px; }
    .item img { width: 50px; height: 50px; object-fit: contain; }
    .label { font-size: 13px; font-weight: 700; color: #02203c; letter-spacing: 0.5px; }
  </style>
</head>
<body>
  <h2>🌾 DakshinAgriHub — Tech Stack Logos Strip</h2>
  <p>Ready to capture! Press <b>Win + Shift + S</b> to snip this exact banner into your PowerPoint slide.</p>
  <div class="strip-wrapper">
    <div class="strip-container" id="strip">
      ${logoItems.map(item => `
        <div class="item">
          <img src="${item.dataUri}" alt="${item.name}" />
          <span class="label">${item.name}</span>
        </div>
      `).join('')}
    </div>
  </div>
</body>
</html>`;

  fs.writeFileSync('slide3_images/tech_logos_strip.html', htmlContent);
  const userDownloads = path.resolve(process.env.USERPROFILE || 'C:\\Users\\Sridhar\'s Nitro', 'Downloads', 'slide3_images');
  fs.writeFileSync(path.join(userDownloads, 'tech_logos_strip.html'), htmlContent);

  const width = 850;
  const height = 100;
  const colWidth = width / logoItems.length;
  
  const svgElements = logoItems.map((item, idx) => {
    const cx = idx * colWidth + colWidth / 2;
    return `
      <g transform="translate(${cx - 25}, 12)">
        <image href="${item.dataUri}" width="50" height="50" />
        <text x="25" y="72" text-anchor="middle" font-family="'Times New Roman', serif" font-weight="bold" font-size="12" fill="#031e38">${item.name}</text>
      </g>
    `;
  }).join('\n');

  const bannerSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="#ffffff" rx="8" />
    ${svgElements}
  </svg>`;

  fs.writeFileSync('slide3_images/tech_logos_strip.svg', bannerSvg);
  fs.writeFileSync(path.join(userDownloads, 'tech_logos_strip.svg'), bannerSvg);
  console.log('✓ Successfully generated all 7 logos banner!');
}

run();
