import fs from 'fs';
import path from 'path';
import https from 'https';

const diagrams = [
  {
    name: 'diagram1_top_banner',
    title: 'Top Banner - Data & Regional Scale',
    code: `flowchart LR
    s1["5 SOUTHERN STATES & 3 UTs<br/>Coverage: TN, AP, TG, KA, KL, PY, AN, LD"] ==> s2["3.8+ CRORE LIVESTOCK<br/>Census Population Covered"]
    s2 ==> s3["150+ APMC MANDIS<br/>Daily Agmarknet Price Sync"]
    s3 ==> s4["6 REGIONAL LANGUAGES<br/>Tamil, Telugu, Kannada, Mal, Hin, Eng"]
    s4 ==> s5["283-DAY GESTATION CYCLE<br/>Estrus to Calving Health Alerts"]

    style s1 fill:#e0f2fe,stroke:#0284c7,stroke-width:2px,color:#0369a1
    style s2 fill:#f0fdf4,stroke:#16a34a,stroke-width:2px,color:#15803d
    style s3 fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#b45309
    style s4 fill:#f3e8ff,stroke:#9333ea,stroke-width:2px,color:#7e22ce
    style s5 fill:#ffe4e6,stroke:#e11d48,stroke-width:2px,color:#be123c`
  },
  {
    name: 'diagram2_vertical_architecture',
    title: 'Left Vertical Flowchart - End to End Architecture',
    code: `flowchart TD
    in["1. INPUT & TELEMETRY<br/>• Farmer Cattle & Fodder Listings<br/>• INAPH 12-Digit Ear-Tags<br/>• Daily Agmarknet Mandi Feeds<br/>• Tele-Vet Consultation Requests"]
    
    c1(["⚡ Real-Time REST & Scheduled Cron"])
    
    eng["2. INTELLIGENCE ENGINE<br/>• Shaeffer's Biometric Weight AI<br/>• 283-Day Gestation Countdown<br/>• Haversine Dynamic Freight Router"]
    
    c2(["🛡️ Tamper-Proof Verification"])
    
    escrow["3. PASHUSAFE ESCROW LAYER<br/>• Concurrency Guard: 409 Anti-Double Selling<br/>• Anti-Scraping Phone Masking<br/>• Dynamic PDFKit QR Passport Generator"]
    
    c3(["📱 Ear-Tag QR Scanned on Delivery"])
    
    hub["4. ACTION HUB & MULTI-PORTAL<br/>• 4 Portals: Buyer, Seller, Vet, Admin<br/>• 6-Language Vernacular Voice AI<br/>• Automated SMS & WhatsApp Alerts"]

    in --> c1
    c1 --> eng
    eng --> c2
    c2 --> escrow
    escrow --> c3
    c3 --> hub

    style in fill:#f8fafc,stroke:#64748b,stroke-width:2px,color:#0f172a
    style c1 fill:#dcfce7,stroke:#16a34a,stroke-width:1.5px,color:#15803d
    style eng fill:#e0f2fe,stroke:#0284c7,stroke-width:2px,color:#0369a1
    style c2 fill:#dcfce7,stroke:#16a34a,stroke-width:1.5px,color:#15803d
    style escrow fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#b45309
    style c3 fill:#dcfce7,stroke:#16a34a,stroke-width:1.5px,color:#15803d
    style hub fill:#f3e8ff,stroke:#9333ea,stroke-width:2px,color:#7e22ce`
  },
  {
    name: 'diagram3_ai_engine_specs',
    title: 'Center Block 1 - AI & Engine Specifications',
    code: `flowchart TD
    root["AI and Engine Specifications"]
    
    c1["Biometric Weight AI<br/>Shaeffer's Formula<br/>Girth² × Length / 10800<br/>Prevents Broker Fraud"]
    c2["PashuSafe Escrow<br/>Finite State Machine<br/>Held → Dispatched → Delivered<br/>Locked Until QR Tag Scan"]
    c3["Vayal Voice Assistant<br/>Web Speech + Dialect<br/>6 Indic Native Languages<br/>Built for Low-Literacy"]
    c4["Haversine Logistics<br/>Multi-Modal Router<br/>Pickup, 6-Wheel & Ferry<br/>Zero Deadhead Mileage"]

    root --> c1
    root --> c2
    root --> c3
    root --> c4

    style root fill:#0284c7,stroke:#0369a1,stroke-width:2px,color:#ffffff
    style c1 fill:#f0fdf4,stroke:#16a34a,stroke-width:1.5px,color:#15803d
    style c2 fill:#fef3c7,stroke:#d97706,stroke-width:1.5px,color:#b45309
    style c3 fill:#f3e8ff,stroke:#9333ea,stroke-width:1.5px,color:#7e22ce
    style c4 fill:#e0f2fe,stroke:#0284c7,stroke-width:1.5px,color:#0369a1`
  },
  {
    name: 'diagram4_pipeline_latency',
    title: 'Center Block 2 - Pipeline Latency Stepper',
    code: `flowchart LR
    p1["1. Listing & Biometrics<br/>Latency: < 1 sec"] --> p2["2. Passport & QR Gen<br/>Latency: < 500 ms"]
    p2 --> p3["3. Mandi Price Sync<br/>Hourly Cron: < 2 min"]
    p3 --> p4["4. Escrow Webhook<br/>Instant Callback"]
    p4 --> p5["5. Total Page Latency<br/>Sub-second: < 800 ms"]

    style p1 fill:#e0f2fe,stroke:#0284c7,stroke-width:1.5px,color:#0369a1
    style p2 fill:#f0fdf4,stroke:#16a34a,stroke-width:1.5px,color:#15803d
    style p3 fill:#fef3c7,stroke:#d97706,stroke-width:1.5px,color:#b45309
    style p4 fill:#f3e8ff,stroke:#9333ea,stroke-width:1.5px,color:#7e22ce
    style p5 fill:#dcfce7,stroke:#15803d,stroke-width:2px,color:#15803d`
  },
  {
    name: 'diagram5_all_in_one',
    title: 'All-In-One Full Architecture Slide',
    code: `flowchart TD
    subgraph SCALE["REGIONAL DATA SCALE & COVERAGE"]
        direction LR
        s1["5 SOUTHERN STATES & 3 UTs"] ==> s2["3.8+ CRORE LIVESTOCK"] ==> s3["150+ APMC MANDIS"] ==> s4["6 REGIONAL LANGUAGES"] ==> s5["283-DAY CARE CYCLE"]
    end

    subgraph ARCH["END-TO-END WORKFLOW"]
        direction TB
        in["1. INPUT: Cattle, Fodder & INAPH Tags"] --> sync(["Real-Time REST & Scheduled Cron"])
        sync --> eng["2. ENGINE: Biometric AI & Gestation"]
        eng --> verify(["Tamper-Proof Verification"])
        verify --> escrow["3. ESCROW: PashuSafe & QR Passport"]
        escrow --> scan(["Ear-Tag Scanned on Delivery"])
        scan --> hub["4. ACTION HUB: 4 Portals & Voice AI"]
    end

    subgraph ENGINES["AI & ENGINE SPECIFICATIONS"]
        direction LR
        c1["Shaeffer's Formula<br/>Girth² × Length / 10800"]
        c2["PashuSafe Escrow<br/>Held → Dispatched → Delivered"]
        c3["Vayal Voice Assistant<br/>6 Indic Languages"]
        c4["Haversine Logistics<br/>Zero-Waste Fodder Router"]
    end

    subgraph LATENCY["PIPELINE PERFORMANCE"]
        direction LR
        p1["Listing < 1s"] --> p2["Passport < 500ms"] --> p3["Mandi Cron < 2m"] --> p4["Escrow Instant"] --> p5["Total Latency < 800ms"]
    end

    SCALE --> ARCH
    ARCH --> ENGINES
    ENGINES --> LATENCY

    style SCALE fill:#f0f9ff,stroke:#0284c7,stroke-width:1.5px
    style ARCH fill:#fafaf9,stroke:#78716c,stroke-width:1.5px
    style ENGINES fill:#f5f3ff,stroke:#7c3aed,stroke-width:1.5px
    style LATENCY fill:#f0fdf4,stroke:#16a34a,stroke-width:1.5px`
  }
];

const targetDir = path.resolve('slide3_images');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const downloadsDir = path.resolve(process.env.USERPROFILE || 'C:\\Users\\Sridhar\'s Nitro', 'Downloads', 'slide3_images');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Status ${res.statusCode} for ${url}`));
      }
      const file = fs.createWriteStream(destPath);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('Generating and downloading images for all 5 diagrams...');
  for (const item of diagrams) {
    const payload = JSON.stringify({
      code: item.code,
      mermaid: { theme: 'default' }
    });
    const b64 = Buffer.from(payload).toString('base64');
    
    // 1. Download SVG (Vector - sharp for any slide resolution)
    const svgUrl = `https://mermaid.ink/svg/${b64}`;
    const svgPath = path.join(targetDir, `${item.name}.svg`);
    const svgDownloadPath = path.join(downloadsDir, `${item.name}.svg`);
    
    // 2. Download PNG (High-res image)
    const pngUrl = `https://mermaid.ink/img/${b64}?scale=2`;
    const pngPath = path.join(targetDir, `${item.name}.png`);
    const pngDownloadPath = path.join(downloadsDir, `${item.name}.png`);

    try {
      console.log(`Downloading ${item.title}...`);
      await downloadFile(svgUrl, svgPath);
      fs.copyFileSync(svgPath, svgDownloadPath);
      
      await downloadFile(pngUrl, pngPath);
      fs.copyFileSync(pngPath, pngDownloadPath);
      console.log(`✓ Saved ${item.name}.png and ${item.name}.svg`);
    } catch (err) {
      console.error(`Failed ${item.name}:`, err.message);
    }
  }
  console.log('\nAll images successfully downloaded!');
  console.log('Locations:');
  console.log('1. Workspace: ' + targetDir);
  console.log('2. Downloads: ' + downloadsDir);
}

run();

