import { REGIONS } from './data/regions.js';
import { TRANSLATIONS } from './data/translations.js';
import { MANDI_RATES, LIVESTOCK_SHANDIES } from './data/mandis.js';
import { LIVESTOCK_LISTINGS, FODDER_LISTINGS, EQUIPMENT_LISTINGS } from './data/listings.js';

// ============================================================================
// APPLICATION STATE
// ============================================================================
const STORAGE_KEY_EARLY = 'dakshin_user_listings_v1';
const state = {
  currentLang: 'en',
  currentState: 'ALL',
  currentTab: 'bazaar',
  selectedBreed: 'ALL',
  searchQuery: '',
  listings: [...(() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY_EARLY) || '[]'); } catch { return []; } })(), ...LIVESTOCK_LISTINGS],
  fodderList: [...FODDER_LISTINGS],
  equipmentList: [...EQUIPMENT_LISTINGS],
  escrowStep: 1,
  activePassportItem: null,
  calcWeight: null,
  calcPrice: null
};

// ============================================================================
// DOM ELEMENTS SELECTORS
// ============================================================================
const els = {
  langSelect: document.getElementById('lang-select'),
  stateSelect: document.getElementById('state-select'),
  globalSearch: document.getElementById('global-search'),
  voiceBtn: document.getElementById('voice-btn'),
  navPillContainer: document.getElementById('nav-pill-container'),
  tickerContent: document.getElementById('ticker-marquee-content'),
  mainContent: document.getElementById('main-content'),
  heroTitle: document.getElementById('hero-title'),
  heroSub: document.getElementById('hero-sub'),
  currentStatePill: document.getElementById('current-state-pill'),
  currentStateLabel: document.getElementById('current-state-label'),
  statVerifiedCount: document.getElementById('stat-verified-count'),
  toast: document.getElementById('toast-notice'),
  toastMsg: document.getElementById('toast-msg'),
  toastIcon: document.getElementById('toast-icon'),
  
  // Modals
  passportModal: document.getElementById('passport-modal'),
  passportModalContent: document.getElementById('passport-modal-content'),
  closePassportModal: document.getElementById('close-passport-modal'),
  weightModal: document.getElementById('weight-modal'),
  closeWeightModal: document.getElementById('close-weight-modal'),
  postModal: document.getElementById('post-modal'),
  closePostModal: document.getElementById('close-post-modal'),
  btnOpenPostModal: document.getElementById('btn-open-post-modal'),
  newListingForm: document.getElementById('new-listing-form'),
  
  // Weight calculator inputs
  sliderGirth: document.getElementById('slider-girth'),
  sliderLength: document.getElementById('slider-length'),
  valGirth: document.getElementById('val-girth'),
  valLength: document.getElementById('val-length'),
  outCalcWeight: document.getElementById('out-calc-weight'),
  outCalcPrice: document.getElementById('out-calc-price'),
  btnUseWeight: document.getElementById('btn-use-weight-in-listing'),
  
  // Quick tools in hero
  btnHeroWeight: document.getElementById('btn-hero-open-weight'),
  btnHeroCalving: document.getElementById('btn-hero-open-calving'),
  btnHeroFeedRoi: document.getElementById('btn-hero-open-feedroi')
};

// ============================================================================
// SAFETY & FORMAT HELPERS
// ============================================================================
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function ordinal(n) {
  const v = n % 100;
  const suf = (v >= 11 && v <= 13) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th');
  return `${n}${suf}`;
}

function shortText(txt, max = 18) {
  const s = String(txt ?? '');
  return s.length > max ? s.slice(0, max) + '…' : s;
}

function extractPhone(text) {
  const m = String(text ?? '').match(/\+?\d[\d\s-]{8,}\d/);
  return m ? m[0].replace(/[^\d+]/g, '') : '';
}

const STORAGE_KEY = STORAGE_KEY_EARLY;
function loadSavedListings() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveListings() {
  try {
    const mine = state.listings.filter(x => x.userPosted);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mine));
  } catch { /* storage full or blocked */ }
}

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&w=800&q=80';

// ============================================================================
// TOAST HELPER
// ============================================================================
export function showToast(message, icon = '✓') {
  if (!els.toast) return;
  els.toastMsg.textContent = message;
  els.toastIcon.textContent = icon;
  els.toast.classList.add('show');
  setTimeout(() => {
    els.toast.classList.remove('show');
  }, 3600);
}

// ============================================================================
// LOCALIZATION & TRANSLATION ENGINE
// ============================================================================
function getT() {
  return TRANSLATIONS[state.currentLang] || TRANSLATIONS.en;
}

function updateStaticTranslations() {
  const t = getT();
  const region = REGIONS[state.currentState];

  // Top bar & Header
  const lblInaph = document.getElementById('lbl-inaph');
  if (lblInaph) lblInaph.textContent = t.badgeGovtVerified;

  const lblSelectState = document.getElementById('lbl-select-state');
  if (lblSelectState) lblSelectState.textContent = t.selectState + ':';

  const brandTitle = document.getElementById('brand-title');
  if (brandTitle) brandTitle.textContent = t.appTitle;

  const brandSub = document.getElementById('brand-subtitle');
  if (brandSub) brandSub.textContent = t.appSubTitle;

  if (els.globalSearch) els.globalSearch.placeholder = t.searchPlaceholder;
  if (els.voiceBtn) els.voiceBtn.title = t.voiceSearchTip;

  const lblPost = document.getElementById('lbl-post-listing');
  if (lblPost) lblPost.textContent = t.postListingBtn;

  // Tabs
  const tabBazaar = document.getElementById('tab-bazaar-txt');
  if (tabBazaar) tabBazaar.textContent = t.navBazaar;
  const tabMandi = document.getElementById('tab-mandi-txt');
  if (tabMandi) tabMandi.textContent = t.navMandi;
  const tabVivasaya = document.getElementById('tab-vivasaya-txt');
  if (tabVivasaya) tabVivasaya.textContent = t.navVivasaya;
  const tabPashucare = document.getElementById('tab-pashucare-txt');
  if (tabPashucare) tabPashucare.textContent = t.navPashuCare;
  const tabLogistics = document.getElementById('tab-logistics-txt');
  if (tabLogistics) tabLogistics.textContent = t.navLogistics;
  const tabSchemes = document.getElementById('tab-schemes-txt');
  if (tabSchemes) tabSchemes.textContent = t.navSchemes;

  // Ticker badge
  const tickerBadge = document.getElementById('lbl-ticker-badge');
  if (tickerBadge) tickerBadge.textContent = t.liveTicker;

  // Hero labels
  if (els.heroTitle) els.heroTitle.textContent = t.heroHeading;
  if (els.heroSub) els.heroSub.textContent = t.heroSub;

  const lblAiWeight = document.getElementById('lbl-hero-ai-weight');
  if (lblAiWeight) lblAiWeight.textContent = t.aiWeightEstimator;

  const lblCalving = document.getElementById('lbl-hero-calving');
  if (lblCalving) lblCalving.textContent = t.estrusCalculatorTitle;

  const lblFeedRoi = document.getElementById('lbl-hero-feedroi');
  if (lblFeedRoi) lblFeedRoi.textContent = t.feedRoiTitle;

  // Large Dashboard Buttons
  const btnLargeBazaarTitle = document.getElementById('btn-large-bazaar-title');
  if (btnLargeBazaarTitle) btnLargeBazaarTitle.textContent = t.navBazaar;
  const btnLargeMandiTitle = document.getElementById('btn-large-mandi-title');
  if (btnLargeMandiTitle) btnLargeMandiTitle.textContent = t.navMandi;
  const btnLargeVivasayaTitle = document.getElementById('btn-large-vivasaya-title');
  if (btnLargeVivasayaTitle) btnLargeVivasayaTitle.textContent = t.navVivasaya;
  const btnLargePashuCareTitle = document.getElementById('btn-large-pashucare-title');
  if (btnLargePashuCareTitle) btnLargePashuCareTitle.textContent = t.navPashuCare;
  const btnLargeLogisticsTitle = document.getElementById('btn-large-logistics-title');
  if (btnLargeLogisticsTitle) btnLargeLogisticsTitle.textContent = t.navLogistics;
  const btnLargeSchemesTitle = document.getElementById('btn-large-schemes-title');
  if (btnLargeSchemesTitle) btnLargeSchemesTitle.textContent = t.navSchemes;

  // State Indicator
  if (els.currentStateLabel) {
    if (state.currentState === 'ALL') {
      els.currentStateLabel.textContent = `${t.allStates} (5 States & 3 UTs)`;
    } else {
      els.currentStateLabel.textContent = `${region.name} (${region.localName}) — ${region.capital}`;
    }
  }

  // Update listings count
  if (els.statVerifiedCount) {
    const filteredCount = filterListings().length;
    els.statVerifiedCount.textContent = `${filteredCount} Live`;
  }
}

// ============================================================================
// TICKER RENDERING
// ============================================================================
function initTicker() {
  if (!els.tickerContent) return;
  const items = [...MANDI_RATES, ...MANDI_RATES]; // duplicate for seamless marquee
  els.tickerContent.innerHTML = items.map(item => `
    <div class="ticker-item">
      <strong>${item.market}</strong> (${item.commodity}): 
      <span class="ticker-price">${item.price}</span>
      <span class="ticker-change ${item.trend}">[${item.change}]</span>
      <span style="opacity:0.6; font-size:0.72rem;">• ${item.date}</span>
    </div>
  `).join('');
}

// ============================================================================
// FILTERING LOGIC
// ============================================================================
function filterListings() {
  return state.listings.filter(item => {
    // State Filter
    if (state.currentState !== 'ALL' && item.stateId !== state.currentState) {
      return false;
    }
    // Breed Filter
    if (state.selectedBreed !== 'ALL' && item.breed !== state.selectedBreed) {
      return false;
    }
    // Search Filter
    if (state.searchQuery.trim() !== '') {
      const q = state.searchQuery.toLowerCase();
      const match = item.title.toLowerCase().includes(q) ||
                    item.breed.toLowerCase().includes(q) ||
                    item.district.toLowerCase().includes(q) ||
                    item.stateName.toLowerCase().includes(q) ||
                    item.earTagId.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });
}

// ============================================================================
// MODULE 1: PASHU & POULTRY BAZAAR
// ============================================================================
function renderBazaar() {
  const t = getT();
  const filtered = filterListings();
  const currentRegion = REGIONS[state.currentState];
  const listingBreeds = state.listings
    .filter(i => state.currentState === 'ALL' || i.stateId === state.currentState)
    .map(i => i.breed);
  const breeds = [...new Set([...(currentRegion.nativeBreeds || []), ...listingBreeds])];

  return `
    <div class="section-header-row">
      <div class="section-title-wrap">
        <h2>${t.navBazaar}</h2>
        <p>${t.filterByStateAlert}: <strong>${currentRegion.name}</strong> • ${filtered.length} verified listings found</p>
      </div>

      <div class="filter-badge-row">
        <button class="filter-chip ${state.selectedBreed === 'ALL' ? 'active' : ''}" data-breed="ALL">
          ${t.allBreeds}
        </button>
        ${breeds.map(b => `
          <button class="filter-chip ${state.selectedBreed === b ? 'active' : ''}" data-breed="${b}">
            ${b}
          </button>
        `).join('')}
      </div>
    </div>

    ${filtered.length === 0 ? `
      <div style="text-align: center; padding: 60px 20px; background: #ffffff; border-radius: 16px; border: 1px dashed #cbd5e1;">
        <span style="font-size: 3rem;">🔍</span>
        <h3 style="margin-top: 12px; color: #042417;">No listings found for this filter</h3>
        <p style="color: #64748b; font-size: 0.9rem; margin-top: 4px;">Try selecting "All Native Breeds" or switch to another Southern State.</p>
        <button class="btn-directions" style="max-width: 200px; margin: 18px auto 0;" id="btn-reset-filters">Reset Filters</button>
      </div>
    ` : `
      <div class="listings-grid">
        ${filtered.map(item => `
          <div class="listing-card" data-id="${item.id}">
            <div class="card-image-wrap">
              <img src="${esc(item.imageUrl)}" alt="${esc(item.title)}" loading="lazy" onerror="this.onerror=null; this.src='${FALLBACK_IMG}';" />
              <div class="badge-float-left">
                <span>${item.verified ? '🛡️' : '⏳'}</span> ${esc(item.earTagId)}
              </div>
              ${item.hasVideo360 ? `
                <div class="badge-video-360">
                  <span>▶</span> 360° REEL
                </div>
              ` : ''}
            </div>

            <div class="card-body">
              <h3 class="card-title">${esc(item.title)}</h3>
              <div class="card-location">
                <span>📍</span> ${esc(item.district)}, ${esc(item.stateName)}
              </div>

              <div class="metrics-pill-grid">
                <div class="metric-item">
                  <span class="metric-label">${t.dailyYield}</span>
                  <span class="metric-val">${item.dailyYield > 0 ? `${item.dailyYield} L/day` : 'Stud / Draft'}</span>
                </div>
                <div class="metric-item">
                  <span class="metric-label">${t.lactationCycle}</span>
                  <span class="metric-val">${item.lactation > 0 ? `${ordinal(item.lactation)} Calving` : 'Pedigree Bull'}</span>
                </div>
                <div class="metric-item">
                  <span class="metric-label">Estimated Weight</span>
                  <span class="metric-val">${item.estimatedWeight} kg</span>
                </div>
                <div class="metric-item">
                  <span class="metric-label">Gestation Status</span>
                  <span class="metric-val" style="font-size: 0.76rem;">${esc(shortText(item.pregnancyStatus))}</span>
                </div>
              </div>

              <div class="card-footer">
                <div class="card-price-block">
                  <span class="card-price-label">${t.price}</span>
                  <span class="card-price-val">₹${item.price.toLocaleString('en-IN')}</span>
                </div>

                <div class="card-actions-group">
                  <button class="btn-passport" data-open-passport="${item.id}" title="${t.viewPassportBtn}">
                    📄 Passport
                  </button>
                  <button class="btn-call" data-call-seller="${esc(item.sellerPhone)}" title="${t.callSeller}">
                    📞 Contact
                  </button>
                </div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `}
  `;
}

// ============================================================================
// MODULE 2: LIVE MANDI & SHANDY RADAR
// ============================================================================
function renderMandi() {
  const t = getT();
  const currentRegion = REGIONS[state.currentState];
  const shandies = state.currentState === 'ALL'
    ? LIVESTOCK_SHANDIES
    : LIVESTOCK_SHANDIES.filter(s => s.stateId === state.currentState);

  const rates = state.currentState === 'ALL'
    ? MANDI_RATES
    : MANDI_RATES.filter(r => currentRegion.hubs && currentRegion.hubs.some(h => r.market.includes(h) || r.state.includes(currentRegion.name)));

  return `
    <div class="section-header-row">
      <div class="section-title-wrap">
        <h2>${t.shandyTitle}</h2>
        <p>Live schedule of weekly animal markets (Sandhais / Pashu Mandis) across Southern India</p>
      </div>
    </div>

    <div class="shandy-grid" style="margin-bottom: 40px;">
      ${shandies.map(s => `
        <div class="shandy-card">
          <div class="shandy-header">
            <div>
              <h3>${s.name}</h3>
              <div style="font-size: 0.8rem; color: #475569; margin-top: 2px;">
                📍 ${s.district}, <strong>${s.stateName}</strong>
              </div>
            </div>
            <span class="day-badge">📅 ${s.day}</span>
          </div>

          <table class="shandy-details-table">
            <tbody>
              <tr>
                <td>${t.shandyTiming}:</td>
                <td>${s.timings}</td>
              </tr>
              <tr>
                <td>${t.shandyCapacity}:</td>
                <td>${s.capacity}</td>
              </tr>
              <tr>
                <td>Entry Fee / टोकन:</td>
                <td>${s.entryFee}</td>
              </tr>
              <tr>
                <td>Primary Breeds:</td>
                <td>${s.primaryBreeds.join(', ')}</td>
              </tr>
            </tbody>
          </table>

          <div class="shandy-highlight">
            ${s.highlight}
          </div>

          <button class="btn-directions" data-shandy-map="${s.name}" data-coords="${s.coordinates}">
            🗺️ Open GPS Map & Directions (${s.coordinates})
          </button>
        </div>
      `).join('')}
    </div>

    <!-- Wholesale Rates Table -->
    <div class="section-header-row">
      <div class="section-title-wrap">
        <h2>${t.mandiPriceTitle}</h2>
        <p>Daily morning wholesale arrivals and benchmark auctions</p>
      </div>
    </div>

    <div style="background: #ffffff; border-radius: 16px; border: 1px solid rgba(20,102,68,0.12); overflow-x: auto; box-shadow: var(--shadow-sm);">
      <table style="width: 100%; border-collapse: collapse; font-size: 0.86rem; text-align: left;">
        <thead>
          <tr style="background: #042417; color: #ffffff;">
            <th style="padding: 12px 18px;">Wholesale Market / APMC</th>
            <th style="padding: 12px 18px;">State</th>
            <th style="padding: 12px 18px;">Commodity</th>
            <th style="padding: 12px 18px;">Price Today</th>
            <th style="padding: 12px 18px;">Day Change</th>
            <th style="padding: 12px 18px;">Action</th>
          </tr>
        </thead>
        <tbody>
          ${(rates.length > 0 ? rates : MANDI_RATES).map(r => `
            <tr style="border-bottom: 1px solid #f1f5f2;">
              <td style="padding: 12px 18px; font-weight: 700; color: #042417;">${r.market}</td>
              <td style="padding: 12px 18px; color: #475569;">${r.state}</td>
              <td style="padding: 12px 18px; font-weight: 600;">${r.commodity}</td>
              <td style="padding: 12px 18px; font-weight: 800; color: #0f4f34;">${r.price}</td>
              <td style="padding: 12px 18px; font-weight: 700; color: ${r.trend === 'up' ? '#16a34a' : r.trend === 'down' ? '#dc2626' : '#64748b'};">
                ${r.change}
              </td>
              <td style="padding: 12px 18px;">
                <button class="filter-chip" data-set-alert="${r.commodity}" style="padding: 4px 10px; font-size: 0.74rem;">
                  🔔 Set WhatsApp Alert
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ============================================================================
// MODULE 3: VIVASAYA & FODDER MART
// ============================================================================
function renderVivasaya() {
  const t = getT();
  return `
    <div class="section-header-row">
      <div class="section-title-wrap">
        <h2>${t.fodderCorridorTitle}</h2>
        <p>Direct field-to-farm supply: Surplus green fodder from river delta zones delivered directly to dairy clusters</p>
      </div>
    </div>

    <div class="listings-grid" style="margin-bottom: 40px;">
      ${state.fodderList.map(f => `
        <div class="listing-card">
          <div class="card-image-wrap">
            <img src="${f.imageUrl}" alt="${f.title}" />
            <div class="badge-float-left">
              <span>🌱</span> ${f.type}
            </div>
            <div class="badge-video-360" style="background: #15803d;">
              ${f.protein}
            </div>
          </div>
          <div class="card-body">
            <h3 class="card-title">${f.title}</h3>
            <div class="card-location">
              <span>📍</span> ${f.district}, ${f.stateName}
            </div>

            <div class="metrics-pill-grid">
              <div class="metric-item">
                <span class="metric-label">Rate / Unit</span>
                <span class="metric-val" style="color: #15803d;">${f.price}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">Moisture Content</span>
                <span class="metric-val">${f.moisture}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">Min Truck Order</span>
                <span class="metric-val" style="font-size: 0.78rem;">${f.minOrder}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">Logistics Corridor</span>
                <span class="metric-val" style="font-size: 0.74rem;">${f.delivery.slice(0, 22)}...</span>
              </div>
            </div>

            <div class="card-footer">
              <div>
                <div style="font-size: 0.74rem; color: #475569;">Seller: <strong>${f.seller}</strong></div>
              </div>
              <button class="btn-call" data-order-fodder="${f.title}" style="background: #0f4f34;">
                🛒 ${t.buyFodder}
              </button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Machinery & Custom Hiring Equipment -->
    <div class="section-header-row">
      <div class="section-title-wrap">
        <h2>Agricultural Drone & Custom Machinery Rental Board</h2>
        <p>Affordable doorstep farm machinery, tractor rotavators, and sprayers by pin-code</p>
      </div>
    </div>

    <div class="listings-grid">
      ${state.equipmentList.map(e => `
        <div class="listing-card">
          <div class="card-image-wrap">
            <img src="${e.imageUrl}" alt="${e.title}" />
            <div class="badge-float-left" style="background: rgba(180,83,9,0.9); border-color: #f59e0b;">
              <span>⚙️</span> ${e.service}
            </div>
          </div>
          <div class="card-body">
            <h3 class="card-title">${e.title}</h3>
            <div class="card-location">
              <span>📍</span> ${e.district}
            </div>
            <div class="metrics-pill-grid">
              <div class="metric-item">
                <span class="metric-label">Rental Charge</span>
                <span class="metric-val" style="color: #b45309;">${e.rate}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">Availability</span>
                <span class="metric-val" style="font-size: 0.78rem;">${e.availability}</span>
              </div>
            </div>
            <div class="card-footer">
              <div style="font-size: 0.74rem; color: #475569;">Provider: <strong>${e.owner}</strong></div>
              <button class="btn-call" data-book-equip="${e.title}">
                🚜 ${t.rentEquipment}
              </button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ============================================================================
// MODULE 4: PASHUCARE & TELE-VET HUB
// ============================================================================
function renderPashuCare() {
  const t = getT();
  return `
    <div class="section-header-row">
      <div class="section-title-wrap">
        <h2>${t.navPashuCare}</h2>
        <p>Interactive reproduction calendars, herd ration profit models, and instant symptom assistance</p>
      </div>
    </div>

    <!-- Tool 1: Estrus & Calving Cycle Calculator -->
    <div class="calculator-panel">
      <h3 style="font-size: 1.2rem; color: #042417; font-weight: 800; margin-bottom: 6px;">
        📅 ${t.estrusCalculatorTitle}
      </h3>
      <p style="font-size: 0.84rem; color: #475569; margin-bottom: 20px;">
        Track the biological reproductive cycles for cows, buffaloes, and goats with automatic pregnancy testing and deworming windows.
      </p>

      <div class="calc-grid-2col">
        <div>
          <div class="input-slider-group">
            <label style="font-size: 0.84rem; font-weight: 700; color: #042417; display: block; margin-bottom: 6px;">
              Select Animal Species:
            </label>
            <select class="custom-select" id="estrus-species" style="width: 100%; color: #042417; background: #f1f5f2; border: 1px solid #cbd5e1; padding: 10px;">
              <option value="cow">Indigenous Cow (283 Days Gestation)</option>
              <option value="buffalo">Murrah Buffalo (310 Days Gestation)</option>
              <option value="goat">Native Goat / Doe (150 Days Gestation)</option>
            </select>
          </div>

          <div class="input-slider-group">
            <label style="font-size: 0.84rem; font-weight: 700; color: #042417; display: block; margin-bottom: 6px;">
              Date of Last Insemination / Service (AI):
            </label>
            <input type="date" id="estrus-date" class="search-input" value="2026-03-01" style="border-radius: 8px;" />
          </div>

          <button class="btn-directions" id="btn-calc-estrus" style="margin-top: 10px;">
            Calculate Gestation & Care Timeline
          </button>
        </div>

        <div class="calc-output-box" id="estrus-result-box">
          <div class="output-title">Milestone Care Schedule</div>
          <div class="roi-stats-breakdown">
            <div class="roi-stat-row">
              <span>Next Heat Check (If Not Pregnant):</span>
              <span id="out-next-heat">Day 21 (22 Mar 2026)</span>
            </div>
            <div class="roi-stat-row">
              <span>Veterinary Pregnancy Check (Per Rectum):</span>
              <span id="out-preg-check">Day 60-90 (01 May 2026)</span>
            </div>
            <div class="roi-stat-row">
              <span>Mandatory Deworming & Dry Therapy:</span>
              <span id="out-deworm">Day 210 (27 Sep 2026)</span>
            </div>
            <div class="roi-stat-row">
              <span>Expected Calving / Delivery Date:</span>
              <span id="out-calving-date" style="color: #6ee7b7; font-size: 1.1rem;">09 Dec 2026</span>
            </div>
          </div>
          <div style="font-size: 0.76rem; color: #a7f3d0; margin-top: 10px; line-height: 1.4;">
            💡 Reminder: Stop milking 60 days before calving for proper fetal growth and colostrum formation.
          </div>
        </div>
      </div>
    </div>

    <!-- Tool 2: Dairy Fodder & Net Profit ROI Calculator -->
    <div class="calculator-panel">
      <h3 style="font-size: 1.2rem; color: #042417; font-weight: 800; margin-bottom: 6px;">
        🥛 ${t.feedRoiTitle}
      </h3>
      <p style="font-size: 0.84rem; color: #475569; margin-bottom: 20px;">
        Input your herd size, average milk yield, and procurement rate to calculate daily feeding balance and monthly net earnings.
      </p>

      <div class="calc-grid-2col">
        <div>
          <div class="input-slider-group">
            <div class="slider-label-row">
              <span>Number of Milking Animals:</span>
              <span class="val" id="disp-herd-count">4 Animals</span>
            </div>
            <input type="range" min="1" max="25" value="4" class="custom-range" id="roi-herd-count">
          </div>

          <div class="input-slider-group">
            <div class="slider-label-row">
              <span>Average Daily Yield per Animal:</span>
              <span class="val" id="disp-herd-yield">8.0 Litres / Day</span>
            </div>
            <input type="range" min="3" max="20" step="0.5" value="8" class="custom-range" id="roi-herd-yield">
          </div>

          <div class="input-slider-group">
            <div class="slider-label-row">
              <span>Milk Sale Price (Co-op / Private):</span>
              <span class="val" id="disp-milk-price">₹42 / Litre</span>
            </div>
            <input type="range" min="30" max="75" value="42" class="custom-range" id="roi-milk-price">
          </div>
        </div>

        <div class="calc-output-box">
          <div class="output-title">Daily Herd Feeding & Monthly Financials</div>
          <div class="roi-stats-breakdown">
            <div class="roi-stat-row">
              <span>Daily Green Fodder Required:</span>
              <span id="roi-out-green">100 kg (CO-4 Napier)</span>
            </div>
            <div class="roi-stat-row">
              <span>Daily Dry Roughage (Straw):</span>
              <span id="roi-out-straw">20 kg</span>
            </div>
            <div class="roi-stat-row">
              <span>Daily Concentrates / Cake:</span>
              <span id="roi-out-concentrate">16 kg</span>
            </div>
            <div class="roi-stat-row">
              <span>Total Daily Feeding Cost:</span>
              <span id="roi-out-feed-cost">₹620 / Day</span>
            </div>
            <div class="roi-stat-row">
              <span>Gross Daily Milk Revenue:</span>
              <span id="roi-out-gross-rev">₹1,344 / Day</span>
            </div>
          </div>

          <div class="big-profit-highlight">
            <div style="font-size: 0.78rem; text-transform: uppercase; color: #a7f3d0;">Estimated Monthly Net Profit:</div>
            <div class="big-profit-val" id="roi-out-net-profit">₹21,720 / Month</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tool 3: AI Symptom & Crop Disease Scanner -->
    <div class="calculator-panel">
      <h3 style="font-size: 1.2rem; color: #042417; font-weight: 800; margin-bottom: 6px;">
        🔬 ${t.aiScannerTitle}
      </h3>
      <p style="font-size: 0.84rem; color: #475569; margin-bottom: 16px;">
        Select visible symptoms or upload an animal skin / crop leaf photo to get AI triage guidance and instant first-aid recommendations.
      </p>

      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; margin-bottom: 18px;">
        <button class="filter-chip symptom-btn active" data-symptom="lsd">
          🔴 Skin Nodules & Fever (Lumpy Skin)
        </button>
        <button class="filter-chip symptom-btn" data-symptom="fmd">
          👅 Blisters on Tongue & Hooves (FMD)
        </button>
        <button class="filter-chip symptom-btn" data-symptom="mastitis">
          🥛 Swollen Udder & Watery Milk (Mastitis)
        </button>
        <button class="filter-chip symptom-btn" data-symptom="leaf_blight">
          🍂 Yellowing Spots on Fodder Leaves
        </button>
      </div>

      <div id="symptom-diagnosis-card" style="background: #f8fafc; border: 1.5px solid #0f4f34; border-radius: 12px; padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <h4 style="font-size: 1.05rem; color: #042417; font-weight: 800;" id="diag-title">
            Suspected: Lumpy Skin Disease (LSD)
          </h4>
          <span class="day-badge" style="background: #fee2e2; color: #b91c1c;" id="diag-severity">URGENT VET ATTENTION</span>
        </div>
        <p style="font-size: 0.86rem; color: #334155; line-height: 1.5; margin-bottom: 14px;" id="diag-desc">
          Viral infection characterized by fever, enlarged lymph nodes, and firm circular nodules (2-5cm) over the skin. Transmitted by biting flies and mosquitoes.
        </p>

        <div style="background: #ffffff; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 16px;">
          <strong style="font-size: 0.84rem; color: #042417;">Immediate First-Aid Protocol (TNAU / TANUVAS Recommended):</strong>
          <ul style="margin-left: 20px; font-size: 0.82rem; color: #475569; margin-top: 6px; line-height: 1.6;" id="diag-protocol">
            <li>Isolate the animal immediately to prevent spread to other herd members.</li>
            <li>Apply traditional herbal paste: Betel leaves (10) + Black pepper (10g) + Shallots (2) + Turmeric (10g) + Jaggery ground with coconut oil.</li>
            <li>Spray neem oil around the shed to repel biting insects and flies.</li>
            <li>Keep the animal hydrated with electrolyte/jaggery water. Do not forcefully drench.</li>
          </ul>
        </div>

        <button class="btn-directions" style="max-width: 300px;" id="btn-call-emergency-vet">
          📞 Connect to Nearby Licensed Tele-Vet Now
        </button>
      </div>
    </div>
  `;
}

// ============================================================================
// MODULE 5: LOGISTICS & ESCROW DESK ("PASHUSAFE")
// ============================================================================
function renderLogistics() {
  const t = getT();
  return `
    <div class="section-header-row">
      <div class="section-title-wrap">
        <h2>${t.logisticsTitle}</h2>
        <p>Verified livestock transport with welfare-compliant ventilation and check-post transit permits across AP, KA, KL, TN, TG, and Island corridors</p>
      </div>
    </div>

    <!-- Escrow Protection Stepper -->
    <div class="calculator-panel" style="margin-bottom: 30px;">
      <h3 style="font-size: 1.15rem; color: #042417; font-weight: 800; margin-bottom: 4px;">
        🛡️ ${t.escrowTitle} ("PashuSafe Pay")
      </h3>
      <p style="font-size: 0.84rem; color: #475569;">
        Protects both buyer and seller: Funds are safely locked in bank escrow and released only after healthy arrival and biometric ear-tag verification.
      </p>

      <div class="escrow-flow-container">
        <div class="escrow-step-node ${state.escrowStep >= 1 ? 'completed' : ''} ${state.escrowStep === 1 ? 'active' : ''}">
          <div class="step-num">1</div>
          <div class="step-title">Buyer Escrow Deposit</div>
          <div class="step-desc">15% Advance locked safely</div>
        </div>
        <div class="escrow-step-node ${state.escrowStep >= 2 ? 'completed' : ''} ${state.escrowStep === 2 ? 'active' : ''}">
          <div class="step-num">2</div>
          <div class="step-title">Truck Dispatched</div>
          <div class="step-desc">Live GPS & Permit tracking</div>
        </div>
        <div class="escrow-step-node ${state.escrowStep >= 3 ? 'completed' : ''} ${state.escrowStep === 3 ? 'active' : ''}">
          <div class="step-num">3</div>
          <div class="step-title">Health & Ear-Tag Check</div>
          <div class="step-desc">Buyer verifies in person</div>
        </div>
        <div class="escrow-step-node ${state.escrowStep >= 4 ? 'completed' : ''} ${state.escrowStep === 4 ? 'active' : ''}">
          <div class="step-num">4</div>
          <div class="step-title">Funds Released</div>
          <div class="step-desc">Instant NEFT to seller</div>
        </div>
      </div>

      <div style="display: flex; gap: 12px; justify-content: flex-end; flex-wrap: wrap;">
        <button class="filter-chip" id="btn-prev-escrow" ${state.escrowStep === 1 ? 'disabled style="opacity:0.5;"' : ''}>
          ← Previous Step
        </button>
        <button class="btn-directions" style="width: auto; padding: 8px 18px;" id="btn-next-escrow">
          ${state.escrowStep < 4 ? 'Simulate Next Step →' : '✓ Escrow Completed (Reset)'}
        </button>
      </div>
    </div>

    <!-- Inter-State Freight Calculator -->
    <div class="calculator-panel">
      <h3 style="font-size: 1.15rem; color: #042417; font-weight: 800; margin-bottom: 6px;">
        🚚 Inter-State Livestock Transit Calculator
      </h3>
      <p style="font-size: 0.84rem; color: #475569; margin-bottom: 20px;">
        Automated transit permit checklists for checkposts (e.g., Walayar TN-KL border, Hosur TN-KA border, Nellore AP-TN border).
      </p>

      <div class="calc-grid-2col">
        <div>
          <div class="input-slider-group">
            <label style="font-size: 0.84rem; font-weight: 700; color: #042417; display: block; margin-bottom: 6px;">
              Pickup Location:
            </label>
            <input type="text" id="freight-from" class="search-input" value="Erode, Tamil Nadu" style="border-radius: 8px;" />
          </div>

          <div class="input-slider-group">
            <label style="font-size: 0.84rem; font-weight: 700; color: #042417; display: block; margin-bottom: 6px;">
              Delivery Destination:
            </label>
            <input type="text" id="freight-to" class="search-input" value="Palakkad / Thrissur, Kerala" style="border-radius: 8px;" />
          </div>

          <div class="input-slider-group">
            <div class="slider-label-row">
              <span>Estimated Road Distance:</span>
              <span class="val" id="disp-freight-km">140 km</span>
            </div>
            <input type="range" min="30" max="800" value="140" class="custom-range" id="slider-freight-km">
          </div>

          <div class="input-slider-group">
            <label style="font-size: 0.84rem; font-weight: 700; color: #042417; display: block; margin-bottom: 6px;">
              Vehicle Type:
            </label>
            <select class="custom-select" id="freight-vehicle" style="width: 100%; color: #042417; background: #f1f5f2; border: 1px solid #cbd5e1; padding: 10px;">
              <option value="bolero">Bolero Pickup with Non-Slip Rubber Mat (1-2 Cattle / 10 Goats)</option>
              <option value="truck6">6-Wheel Ventilated Livestock Truck (4-6 Cattle / 30 Goats)</option>
              <option value="ship">Mainland Vessel Shipping to Island (Port Blair / Kavaratti)</option>
            </select>
          </div>
        </div>

        <div class="calc-output-box">
          <div class="output-title">Transit Quote & Compliance Package</div>
          <div class="roi-stats-breakdown">
            <div class="roi-stat-row">
              <span>Per-Kilometer Base Freight:</span>
              <span id="freight-rate-per-km">₹28 / km</span>
            </div>
            <div class="roi-stat-row">
              <span>Inter-State Check-post Fee:</span>
              <span>₹350 (Walayar Green Permit)</span>
            </div>
            <div class="roi-stat-row">
              <span>Veterinary Transit Health Certificate:</span>
              <span>Included (Authorized Vet Sign)</span>
            </div>
            <div class="roi-stat-row">
              <span>Estimated Delivery Transit Time:</span>
              <span id="freight-transit-time">4.5 Hours</span>
            </div>
          </div>

          <div class="big-profit-highlight">
            <div style="font-size: 0.78rem; text-transform: uppercase; color: #a7f3d0;">Estimated Total Freight Cost:</div>
            <div class="big-profit-val" id="freight-total-cost">₹4,270</div>
          </div>

          <button class="btn-directions" style="margin-top: 14px; background: #f59e0b; color: #042417;" id="btn-book-livestock-truck">
            Book Welfare-Compliant Vehicle Now
          </button>
        </div>
      </div>
    </div>
  `;
}

// ============================================================================
// MODULE 6: GOVT SUBSIDIES & SCHEMES DIRECTORY
// ============================================================================
function renderSchemes() {
  const t = getT();
  const currentRegion = REGIONS[state.currentState];
  const list = [];

  if (state.currentState === 'ALL') {
    Object.values(REGIONS).forEach(r => {
      if (r.subsidies) {
        r.subsidies.forEach(sub => list.push({ ...sub, stateName: r.name }));
      }
    });
  } else {
    if (currentRegion.subsidies) {
      currentRegion.subsidies.forEach(sub => list.push({ ...sub, stateName: currentRegion.name }));
    }
  }

  return `
    <div class="section-header-row">
      <div class="section-title-wrap">
        <h2>${t.navSchemes}</h2>
        <p>Official Animal Husbandry and Agriculture Department schemes active across Southern India</p>
      </div>
    </div>

    <div class="shandy-grid">
      ${list.map(s => `
        <div class="shandy-card">
          <div class="shandy-header">
            <div>
              <span class="day-badge" style="margin-bottom: 8px; display: inline-block;">${s.tag}</span>
              <h3>${s.name}</h3>
              <div style="font-size: 0.82rem; color: #475569; margin-top: 4px;">
                Jurisdiction: <strong>${s.stateName}</strong>
              </div>
            </div>
          </div>
          <p style="font-size: 0.86rem; color: #334155; line-height: 1.5; margin: 12px 0 16px;">
            ${s.desc}
          </p>
          <button class="btn-directions" data-apply-scheme="${s.name}" style="background: #0f4f34;">
            📋 Check Eligibility & Application Steps
          </button>
        </div>
      `).join('')}
    </div>
  `;
}

// ============================================================================
// MAIN RENDER CONTROLLER
// ============================================================================
function renderCurrentTab() {
  if (!els.mainContent) return;

  // Update nav pill and large dashboard button active states
  document.querySelectorAll('.nav-pill').forEach(pill => {
    pill.classList.toggle('active', pill.dataset.tab === state.currentTab);
  });
  document.querySelectorAll('.large-dash-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === state.currentTab);
  });

  switch (state.currentTab) {
    case 'bazaar':
      els.mainContent.innerHTML = renderBazaar();
      break;
    case 'mandi':
      els.mainContent.innerHTML = renderMandi();
      break;
    case 'vivasaya':
      els.mainContent.innerHTML = renderVivasaya();
      break;
    case 'pashucare':
      els.mainContent.innerHTML = renderPashuCare();
      attachPashuCareEvents();
      break;
    case 'logistics':
      els.mainContent.innerHTML = renderLogistics();
      attachLogisticsEvents();
      break;
    case 'schemes':
      els.mainContent.innerHTML = renderSchemes();
      break;
    default:
      els.mainContent.innerHTML = renderBazaar();
  }

  attachDynamicListeners();
}

// ============================================================================
// DYNAMIC EVENT LISTENERS (FOR BUTTONS INSIDE INNERHTML)
// ============================================================================
function attachDynamicListeners() {
  // Breed chips
  document.querySelectorAll('.filter-chip[data-breed]').forEach(chip => {
    chip.addEventListener('click', () => {
      state.selectedBreed = chip.dataset.breed;
      renderCurrentTab();
      updateStaticTranslations();
    });
  });

  // Reset filters
  const resetBtn = document.getElementById('btn-reset-filters');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      state.selectedBreed = 'ALL';
      state.searchQuery = '';
      if (els.globalSearch) els.globalSearch.value = '';
      renderCurrentTab();
      updateStaticTranslations();
    });
  }

  // View Passport
  document.querySelectorAll('[data-open-passport]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.openPassport;
      openPassportModal(id);
    });
  });

  // Call Seller
  document.querySelectorAll('[data-call-seller]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const raw = btn.dataset.callSeller;
      const phone = extractPhone(raw);
      if (!phone) {
        showToast('Seller phone number is not available for this listing.', '⚠️');
        return;
      }
      showToast(`Calling seller: ${phone}`, '📞');
      window.location.href = `tel:${phone}`;
    });
  });

  // Shandy Map Directions
  document.querySelectorAll('[data-shandy-map]').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.shandyMap;
      const coords = btn.dataset.coords;
      showToast(`Opening GPS Navigation to ${name} (${coords})`, '🗺️');
    });
  });

  // Mandi Alert
  document.querySelectorAll('[data-set-alert]').forEach(btn => {
    btn.addEventListener('click', () => {
      const comm = btn.dataset.setAlert;
      showToast(`Daily morning SMS / WhatsApp rate alerts enabled for ${comm}`, '🔔');
    });
  });

  // Order Fodder
  document.querySelectorAll('[data-order-fodder]').forEach(btn => {
    btn.addEventListener('click', () => {
      const title = btn.dataset.orderFodder;
      showToast(`Fodder Booking Initiated for ${title}. Dispatching within 24h.`, '🚚');
    });
  });

  // Rent Equipment
  document.querySelectorAll('[data-book-equip]').forEach(btn => {
    btn.addEventListener('click', () => {
      const title = btn.dataset.bookEquip;
      showToast(`Custom Hire Request Sent for ${title}. Machinery owner will call you.`, '🚜');
    });
  });

  // Apply Scheme
  document.querySelectorAll('[data-apply-scheme]').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.applyScheme;
      showToast(`Application checklist for "${name}" downloaded to your device.`, '📥');
    });
  });
}

// ============================================================================
// PASHUCARE INTERACTIVE TOOLS (ESTRUS, ROI, AI SCANNER)
// ============================================================================
function attachPashuCareEvents() {
  // Estrus Calculator
  const btnCalcEstrus = document.getElementById('btn-calc-estrus');
  if (btnCalcEstrus) {
    btnCalcEstrus.addEventListener('click', () => {
      const species = document.getElementById('estrus-species').value;
      const dateVal = document.getElementById('estrus-date').value;
      if (!dateVal || isNaN(new Date(dateVal))) {
        showToast('Please pick a valid service / heat date first.', '⚠️');
        return;
      }

      const base = new Date(dateVal);
      const addDays = (d, count) => {
        const res = new Date(d);
        res.setDate(res.getDate() + count);
        return res.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      };

      const daysGestation = species === 'cow' ? 283 : species === 'buffalo' ? 310 : 150;
      document.getElementById('out-next-heat').textContent = `Day 21 (${addDays(base, 21)})`;
      document.getElementById('out-preg-check').textContent = `Day 60 (${addDays(base, 60)})`;
      document.getElementById('out-deworm').textContent = `Day ${daysGestation - 60} (${addDays(base, daysGestation - 60)})`;
      document.getElementById('out-calving-date').textContent = addDays(base, daysGestation);

      showToast('Gestation & care timeline recalculated!', '📅');
    });
  }

  // Dairy ROI Calculator
  const roiHerd = document.getElementById('roi-herd-count');
  const roiYield = document.getElementById('roi-herd-yield');
  const roiPrice = document.getElementById('roi-milk-price');

  const updateRoi = () => {
    if (!roiHerd || !roiYield || !roiPrice) return;
    const count = parseInt(roiHerd.value);
    const yld = parseFloat(roiYield.value);
    const prc = parseInt(roiPrice.value);

    document.getElementById('disp-herd-count').textContent = `${count} Animals`;
    document.getElementById('disp-herd-yield').textContent = `${yld.toFixed(1)} Litres / Day`;
    document.getElementById('disp-milk-price').textContent = `₹${prc} / Litre`;

    const greenKg = count * 25;
    const strawKg = count * 5;
    const concKg = count * (yld * 0.4 + 1.5);
    const feedCost = (greenKg * 2.2) + (strawKg * 7) + (concKg * 28);
    const grossRev = count * yld * prc;
    const dailyProfit = grossRev - feedCost;
    const monthlyNet = dailyProfit * 30;

    document.getElementById('roi-out-green').textContent = `${greenKg} kg (CO-4 Napier)`;
    document.getElementById('roi-out-straw').textContent = `${strawKg} kg (Paddy Straw)`;
    document.getElementById('roi-out-concentrate').textContent = `${concKg.toFixed(1)} kg (Cake/Pellets)`;
    document.getElementById('roi-out-feed-cost').textContent = `₹${Math.round(feedCost)} / Day`;
    document.getElementById('roi-out-gross-rev').textContent = `₹${Math.round(grossRev)} / Day`;
    document.getElementById('roi-out-net-profit').textContent = `₹${Math.round(monthlyNet).toLocaleString('en-IN')} / Month`;
  };

  [roiHerd, roiYield, roiPrice].forEach(input => {
    if (input) input.addEventListener('input', updateRoi);
  });

  // AI Symptom Selector
  const symptomData = {
    lsd: {
      title: "Suspected: Lumpy Skin Disease (LSD)",
      severity: "URGENT VET ATTENTION",
      desc: "Viral infection characterized by fever, enlarged lymph nodes, and firm circular nodules (2-5cm) over the skin. Transmitted by biting flies and mosquitoes.",
      protocol: [
        "Isolate the animal immediately to prevent spread to other herd members.",
        "Apply traditional herbal paste: Betel leaves (10) + Black pepper (10g) + Shallots (2) + Turmeric (10g) + Jaggery ground with coconut oil.",
        "Spray neem oil around the shed to repel biting insects and flies.",
        "Keep the animal hydrated with electrolyte/jaggery water. Do not forcefully drench."
      ]
    },
    fmd: {
      title: "Suspected: Foot-and-Mouth Disease (FMD)",
      severity: "CRITICAL QUARANTINE",
      desc: "Highly contagious viral disease of cloven-hoofed animals causing painful blisters in the mouth and on feet, accompanied by heavy salivation and lameness.",
      protocol: [
        "Wash the mouth lesions gently with 1% potassium permanganate or mild alum water.",
        "Wash hooves twice daily with 4% sodium carbonate (washing soda) solution.",
        "Feed soft, easily digestible gruel (cooked ragi / rice porridge with ghee).",
        "Immediately notify the local veterinary assistant surgeon to initiate ring vaccination."
      ]
    },
    mastitis: {
      title: "Suspected: Clinical Mastitis (Udder Infection)",
      severity: "MODERATE / PROMPT CARE",
      desc: "Inflammation of the mammary gland resulting in swollen, warm, painful quarters with curd-like clots or discoloration in milk.",
      protocol: [
        "Frequent complete stripping of the affected quarter every 2 hours.",
        "Apply ice compresses in acute hot swelling; do not apply excessive warm massage.",
        "Apply TANUVAS herbal paste (Aloe vera 250g + Turmeric 50g + Slaked lime 15g).",
        "Consult vet immediately for intramammary antibiotic infusion based on culture."
      ]
    },
    leaf_blight: {
      title: "Suspected: Fodder Foliar Leaf Blight (Fungal)",
      severity: "MILD / CROP SPRAY",
      desc: "Brown elongated necrotic lesions on green fodder leaves leading to drying and loss of protein nutritional value.",
      protocol: [
        "Harvest early if mature to feed as silage or green chop.",
        "Spray Panchagavya (3% solution) or Sour Buttermilk spray (5%) as organic bio-fungicide.",
        "Ensure adequate drainage and avoid excessive nitrogen application in wet weather."
      ]
    }
  };

  document.querySelectorAll('.symptom-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.symptom-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const s = symptomData[btn.dataset.symptom];
      if (s) {
        document.getElementById('diag-title').textContent = s.title;
        document.getElementById('diag-severity').textContent = s.severity;
        document.getElementById('diag-desc').textContent = s.desc;
        const listEl = document.getElementById('diag-protocol');
        listEl.innerHTML = s.protocol.map(p => `<li>${p}</li>`).join('');
        showToast(`AI diagnostic scan updated for ${s.title}`, '🔬');
      }
    });
  });

  const btnEmergencyVet = document.getElementById('btn-call-emergency-vet');
  if (btnEmergencyVet) {
    btnEmergencyVet.addEventListener('click', () => {
      showToast('Connecting 24/7 Veterinary Helpline (1800-425-76884)...', '🩺');
    });
  }
}

// ============================================================================
// LOGISTICS INTERACTIVE TOOLS (ESCROW & FREIGHT)
// ============================================================================
function attachLogisticsEvents() {
  const btnNextEscrow = document.getElementById('btn-next-escrow');
  const btnPrevEscrow = document.getElementById('btn-prev-escrow');

  if (btnNextEscrow) {
    btnNextEscrow.addEventListener('click', () => {
      if (state.escrowStep < 4) {
        state.escrowStep++;
        const msgs = [
          "",
          "Step 1: 15% Escrow locked in secure banking portal.",
          "Step 2: Livestock truck dispatched with transit permit & GPS.",
          "Step 3: Animal arrived safely! Ear-tag & health verified by buyer.",
          "Step 4: Escrow released! Full payment credited to seller's account."
        ];
        showToast(msgs[state.escrowStep], '🛡️');
      } else {
        state.escrowStep = 1;
        showToast("Escrow cycle reset to Step 1", '🔄');
      }
      renderCurrentTab();
    });
  }

  if (btnPrevEscrow) {
    btnPrevEscrow.addEventListener('click', () => {
      if (state.escrowStep > 1) {
        state.escrowStep--;
        renderCurrentTab();
      }
    });
  }

  // Freight calculation
  const sliderKm = document.getElementById('slider-freight-km');
  const vehicleSelect = document.getElementById('freight-vehicle');

  const updateFreight = () => {
    if (!sliderKm || !vehicleSelect) return;
    const km = parseInt(sliderKm.value);
    const vType = vehicleSelect.value;
    document.getElementById('disp-freight-km').textContent = `${km} km`;

    let ratePerKm = 28;
    let baseTransitHours = (km / 35).toFixed(1);

    if (vType === 'truck6') {
      ratePerKm = 48;
    } else if (vType === 'ship') {
      ratePerKm = 65; // includes sea vessel freight & port quarantine
      baseTransitHours = (km / 20 + 12).toFixed(1);
    }

    const total = (km * ratePerKm) + 350;
    document.getElementById('freight-rate-per-km').textContent = `₹${ratePerKm} / km`;
    document.getElementById('freight-transit-time').textContent = `${baseTransitHours} Hours`;
    document.getElementById('freight-total-cost').textContent = `₹${total.toLocaleString('en-IN')}`;
  };

  if (sliderKm) sliderKm.addEventListener('input', updateFreight);
  if (vehicleSelect) vehicleSelect.addEventListener('change', updateFreight);

  const btnBookTruck = document.getElementById('btn-book-livestock-truck');
  if (btnBookTruck) {
    btnBookTruck.addEventListener('click', () => {
      showToast('Livestock vehicle booked! Driver contact & checkpost permit sent via SMS.', '🚚');
    });
  }
}

// ============================================================================
// DIGITAL PASHU PASSPORT MODAL
// ============================================================================
function openPassportModal(id) {
  const item = state.listings.find(x => x.id === id) || state.listings[0];
  state.activePassportItem = item;

  if (!els.passportModal || !els.passportModalContent) return;

  els.passportModalContent.innerHTML = `
    <div class="pashu-passport-document">
      <div class="passport-watermark">INAPH VERIFIED</div>
      
      <div class="passport-gov-header">
        <div>
          <h4>National Animal Identification Passport</h4>
          <div style="font-size: 0.76rem; color: #475569;">
            Southern Zone Division • Biometric Ear-Tag Database
          </div>
        </div>
        <div class="tag-qr-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="#042417" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          <span class="tag-id-text">${esc(item.earTagId)}</span>
        </div>
      </div>

      <div style="display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap;">
        <img src="${esc(item.imageUrl)}" onerror="this.onerror=null; this.src='${FALLBACK_IMG}';" style="width: 140px; height: 110px; object-fit: cover; border-radius: 8px; border: 2px solid #0a3824;" alt="Animal Photo" />
        <div style="flex: 1;">
          <h3 style="font-size: 1.15rem; color: #042417; font-weight: 800;">${esc(item.title)}</h3>
          <div style="font-size: 0.82rem; color: #475569; margin-top: 4px;">
            Native Breed: <strong>${esc(item.breed)}</strong> • Registered State: <strong>${esc(item.stateName)}</strong>
          </div>
          <div style="margin-top: 8px;">
            ${item.verified ? '<span class="inaph-badge">Official INAPH Biometric Tag Verified</span>' : '<span class="inaph-badge" style="background:#fef3c7;color:#92400e;border-color:#fcd34d;">Self-declared by seller — verification pending</span>'}
          </div>
        </div>
      </div>

      <div class="passport-data-grid">
        <div class="passport-data-item">
          <span class="label">Animal Age</span>
          <span class="value">${item.ageMonths} Months</span>
        </div>
        <div class="passport-data-item">
          <span class="label">Daily Milk Yield</span>
          <span class="value">${item.dailyYield > 0 ? `${item.dailyYield} Litres / Day` : 'Draft / Breeding'}</span>
        </div>
        <div class="passport-data-item">
          <span class="label">Calving Cycle</span>
          <span class="value">${item.lactation > 0 ? `${ordinal(item.lactation)} Lactation` : 'Pedigree Stud'}</span>
        </div>
        <div class="passport-data-item">
          <span class="label">Estimated Weight</span>
          <span class="value">${item.estimatedWeight} kg (Schaeffer Model)</span>
        </div>
        <div class="passport-data-item">
          <span class="label">Pregnancy Status</span>
          <span class="value">${esc(item.pregnancyStatus)}</span>
        </div>
        <div class="passport-data-item">
          <span class="label">Registered Owner</span>
          <span class="value">${esc(item.sellerName)} (${esc(item.district)})</span>
        </div>
      </div>

      <div style="margin-top: 16px;">
        <h5 style="font-size: 0.84rem; text-transform: uppercase; color: #0a3824; font-weight: 800; margin-bottom: 6px;">
          Certified Immunization & Health Record
        </h5>
        <table class="vaccination-log-table">
          <thead>
            <tr>
              <th>Vaccine / Treatment</th>
              <th>Administered Date</th>
              <th>Certification</th>
            </tr>
          </thead>
          <tbody>
            ${item.vaccinations.map(v => `
              <tr>
                <td><strong>${v.name}</strong></td>
                <td>${v.date}</td>
                <td><span style="color: #15803d; font-weight: 700;">✓ ${v.status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div style="margin-top: 14px; font-size: 0.78rem; color: #64748b; line-height: 1.4;">
        <strong>Diet & Management:</strong> ${esc(item.diet)}
      </div>

      <div style="margin-top: 18px; display: flex; gap: 10px;">
        <button class="btn-directions" id="btn-passport-download" style="flex: 1;">
          ⬇️ Download Official PDF Passport
        </button>
        <button class="btn-directions" id="btn-passport-escrow" style="flex: 1; background: #d97706;">
          🔒 Buy with PashuSafe Escrow (₹${item.price.toLocaleString('en-IN')})
        </button>
      </div>
    </div>
  `;

  els.passportModal.classList.add('open');

  document.getElementById('btn-passport-download')?.addEventListener('click', () => {
    showToast(`Downloading Digital Pashu Passport for ${item.earTagId}...`, '📥');
  });

  document.getElementById('btn-passport-escrow')?.addEventListener('click', () => {
    els.passportModal.classList.remove('open');
    state.currentTab = 'logistics';
    state.escrowStep = 1;
    renderCurrentTab();
    showToast(`Escrow protection initialized for ₹${item.price.toLocaleString('en-IN')}`, '🛡️');
  });
}

// ============================================================================
// AI WEIGHT & PRICE ESTIMATOR MODAL
// ============================================================================
function updateWeightCalculator() {
  if (!els.sliderGirth || !els.sliderLength) return;
  const girth = parseInt(els.sliderGirth.value);
  const length = parseInt(els.sliderLength.value);

  if (els.valGirth) els.valGirth.textContent = girth;
  if (els.valLength) els.valLength.textContent = length;

  // Schaeffer's formula: (Girth^2 * Length) / 10800 in inches or (G^2 * L) / 10800 with cm converted
  // Standard metric approx: (girth_cm^2 * length_cm) / 10800 * 0.98
  const weightKg = Math.round((Math.pow(girth, 2) * length) / 10800);
  const minPrice = Math.round(weightKg * 180);
  const maxPrice = Math.round(weightKg * 215);

  state.calcWeight = weightKg;
  state.calcPrice = Math.round((minPrice + maxPrice) / 2 / 500) * 500;
  if (els.outCalcWeight) els.outCalcWeight.textContent = `${weightKg} kg`;
  if (els.outCalcPrice) els.outCalcPrice.textContent = `₹${minPrice.toLocaleString('en-IN')} – ₹${maxPrice.toLocaleString('en-IN')}`;
}

// ============================================================================
// VAYAL VOICE ASSISTANT (SPEECH RECOGNITION & SYNTHESIS)
// ============================================================================
function initVoiceAssistant() {
  if (!els.voiceBtn) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  els.voiceBtn.addEventListener('click', () => {
    const t = getT();
    if (!SpeechRecognition) {
      // Fallback simulation for unsupported browsers
      simulateVoiceSearch();
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      const langMap = {
        en: 'en-IN',
        ta: 'ta-IN',
        te: 'te-IN',
        kn: 'kn-IN',
        ml: 'ml-IN',
        hi: 'hi-IN'
      };
      recognition.lang = langMap[state.currentLang] || 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = false;

      els.voiceBtn.classList.add('listening');
      showToast(t.voiceListening, '🎙️');

      recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        els.globalSearch.value = text;
        state.searchQuery = text;
        renderCurrentTab();
        showToast(`Voice search: "${text}"`, '✓');
        speakFeedback(`Showing results for ${text}`);
      };

      recognition.onerror = () => {
        simulateVoiceSearch();
      };

      recognition.onend = () => {
        els.voiceBtn.classList.remove('listening');
      };

      recognition.start();
    } catch {
      simulateVoiceSearch();
    }
  });
}

function simulateVoiceSearch() {
  els.voiceBtn.classList.add('listening');
  showToast("Vayal Voice: Listening in your regional language...", '🎙️');
  setTimeout(() => {
    els.voiceBtn.classList.remove('listening');
    const samples = ["Kangayam", "Ongole", "Hallikar", "Vechur", "Super Napier", "Anthiyur"];
    const picked = samples[Math.floor(Math.random() * samples.length)];
    els.globalSearch.value = picked;
    state.searchQuery = picked;
    renderCurrentTab();
    showToast(`Voice detected: "${picked}"`, '✓');
    speakFeedback(`Found verified listings for ${picked}`);
  }, 1600);
}

function speakFeedback(text) {
  if ('speechSynthesis' in window) {
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch {
      // audio feedback quiet fail safe
    }
  }
}

// ============================================================================
// INITIALIZATION & EVENT BINDINGS
// ============================================================================
function init() {
  // Language Change
  els.langSelect?.addEventListener('change', (e) => {
    state.currentLang = e.target.value;
    updateStaticTranslations();
    renderCurrentTab();
    showToast(`Language changed to ${e.target.options[e.target.selectedIndex].text}`, '🌐');
  });

  // State / UT Change
  els.stateSelect?.addEventListener('change', (e) => {
    state.currentState = e.target.value;
    state.selectedBreed = 'ALL';
    updateStaticTranslations();
    renderCurrentTab();
    const reg = REGIONS[state.currentState];
    showToast(`Displaying regional data for ${reg.name}`, '📍');
  });

  // Global Search Input
  els.globalSearch?.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderCurrentTab();
  });

  // Nav Tabs & Large Dashboard Buttons Click
  document.querySelectorAll('.nav-pill, .large-dash-btn').forEach(elem => {
    elem.addEventListener('click', () => {
      state.currentTab = elem.dataset.tab;
      renderCurrentTab();
      if (elem.classList.contains('large-dash-btn')) {
        document.getElementById('main-content')?.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Hero Quick Tools
  els.btnHeroWeight?.addEventListener('click', () => {
    els.weightModal?.classList.add('open');
    updateWeightCalculator();
  });

  els.btnHeroCalving?.addEventListener('click', () => {
    state.currentTab = 'pashucare';
    renderCurrentTab();
    document.getElementById('estrus-species')?.scrollIntoView({ behavior: 'smooth' });
  });

  els.btnHeroFeedRoi?.addEventListener('click', () => {
    state.currentTab = 'pashucare';
    renderCurrentTab();
    document.getElementById('roi-herd-count')?.scrollIntoView({ behavior: 'smooth' });
  });

  // Weight Sliders
  els.sliderGirth?.addEventListener('input', updateWeightCalculator);
  els.sliderLength?.addEventListener('input', updateWeightCalculator);

  els.btnUseWeight?.addEventListener('click', () => {
    els.weightModal?.classList.remove('open');
    els.postModal?.classList.add('open');
    const priceInput = document.getElementById('post-price');
    if (priceInput && state.calcPrice) priceInput.value = state.calcPrice;
    showToast(`Applied ${state.calcWeight} kg and suggested price ₹${(state.calcPrice || 0).toLocaleString('en-IN')} to the listing form.`, '✓');
  });

  // Close Modals
  els.closePassportModal?.addEventListener('click', () => els.passportModal?.classList.remove('open'));
  els.closeWeightModal?.addEventListener('click', () => els.weightModal?.classList.remove('open'));
  els.closePostModal?.addEventListener('click', () => els.postModal?.classList.remove('open'));

  // Open Post Modal
  els.btnOpenPostModal?.addEventListener('click', () => els.postModal?.classList.add('open'));

  // Close modal when clicking on backdrop
  [els.passportModal, els.weightModal, els.postModal].forEach(modal => {
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('open');
    });
  });

  // New Listing Submission
  els.newListingForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('post-title').value;
    const breed = document.getElementById('post-breed').value;
    const price = parseInt(document.getElementById('post-price').value) || 50000;
    const stateId = document.getElementById('post-state').value;
    const district = document.getElementById('post-district').value;
    const yieldL = parseFloat(document.getElementById('post-yield').value) || 0;
    const earTag = document.getElementById('post-tag').value || `INAPH-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const contact = document.getElementById('post-contact').value.trim();
    const phone = extractPhone(contact);
    if (!phone) {
      showToast('Please include a valid phone number in the contact field.', '⚠️');
      return;
    }
    if (price <= 0) {
      showToast('Price must be greater than zero.', '⚠️');
      return;
    }

    const newAnimal = {
      id: `pashu-${Date.now()}`,
      title: title.trim(),
      breed,
      category: 'Cattle',
      stateId,
      stateName: REGIONS[stateId]?.name || 'Tamil Nadu',
      district,
      price,
      dailyYield: yieldL,
      lactation: yieldL > 0 ? 2 : 0,
      pregnancyStatus: 'Self-Certified by Farmer',
      earTagId: earTag,
      verified: false,
      userPosted: true,
      ageMonths: 36,
      estimatedWeight: state.calcWeight || 380,
      sellerName: contact.replace(/\+?\d[\d\s()-]{8,}\d/, '').replace(/[()]/g, '').trim() || 'Seller',
      sellerPhone: phone,
      vaccinations: [
        { name: "FMD Scheduled", date: "Recent", status: "Active" },
        { name: "Deworming", date: "Recent", status: "Active" }
      ],
      diet: "Green grass & dry straw fodder",
      imageUrl: "https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&w=800&q=80",
      hasVideo360: false
    };

    state.listings.unshift(newAnimal);
    saveListings();
    els.postModal?.classList.remove('open');
    els.newListingForm.reset();

    state.currentTab = 'bazaar';
    renderCurrentTab();
    updateStaticTranslations();
    showToast(`Published listing "${title}" with Tag ${earTag}!`, '🎉');
  });

  // Footer Links Click
  document.querySelectorAll('[data-set-state]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const st = link.dataset.setState;
      state.currentState = st;
      if (els.stateSelect) els.stateSelect.value = st;
      updateStaticTranslations();
      renderCurrentTab();
      window.scrollTo({ top: 300, behavior: 'smooth' });
    });
  });

  document.querySelectorAll('[data-set-tab]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tb = link.dataset.setTab;
      state.currentTab = tb;
      renderCurrentTab();
      window.scrollTo({ top: 400, behavior: 'smooth' });
    });
  });

  // Home Brand Click
  document.getElementById('brand-home-btn')?.addEventListener('click', () => {
    state.currentTab = 'bazaar';
    state.currentState = 'ALL';
    state.selectedBreed = 'ALL';
    state.searchQuery = '';
    if (els.stateSelect) els.stateSelect.value = 'ALL';
    if (els.globalSearch) els.globalSearch.value = '';
    updateStaticTranslations();
    renderCurrentTab();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Escape closes any open modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') [els.passportModal, els.weightModal, els.postModal].forEach(m => m?.classList.remove('open'));
  });

  // Init routines
  initTicker();
  updateStaticTranslations();
  renderCurrentTab();
  initVoiceAssistant();
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
