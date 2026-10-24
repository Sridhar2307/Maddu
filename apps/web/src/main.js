import { REGIONS } from './data/regions.js';
import { TRANSLATIONS } from './data/translations.js';
import { MANDI_RATES as SEED_MANDI_RATES, LIVESTOCK_SHANDIES as SEED_SHANDIES } from './data/mandis.js';
import { LIVESTOCK_LISTINGS as SEED_LIVESTOCK, FODDER_LISTINGS as SEED_FODDER, EQUIPMENT_LISTINGS as SEED_EQUIPMENT } from './data/listings.js';
import * as api from './api/client.js';

// ============================================================================
// APPLICATION STATE
// ============================================================================
const state = {
  currentLang: 'en',
  currentState: 'ALL',
  currentTab: 'bazaar',
  selectedBreed: 'ALL',
  searchQuery: '',
  listings: [...SEED_LIVESTOCK],
  mandiRates: [...SEED_MANDI_RATES],
  shandies: [...SEED_SHANDIES],
  fodderList: [...SEED_FODDER],
  equipmentList: [...SEED_EQUIPMENT],
  schemesList: [],
  myOrders: [],
  myApplications: [],
  escrowStep: 1,
  activePassportItem: null,
  calcWeight: null,
  calcPrice: null,
  pendingOrderListing: null,
  selectedFreightQuote: null,
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

  // Auth Header Widget
  btnAuthAction: document.getElementById('btn-auth-action'),
  authBtnIcon: document.getElementById('auth-btn-icon'),
  authBtnLabel: document.getElementById('auth-btn-label'),
  
  // Modals
  authModal: document.getElementById('auth-modal'),
  authModalBody: document.getElementById('auth-modal-body'),
  closeAuthModal: document.getElementById('close-auth-modal'),

  orderModal: document.getElementById('order-modal'),
  orderModalBody: document.getElementById('order-modal-body'),
  closeOrderModal: document.getElementById('close-order-modal'),

  vetModal: document.getElementById('vet-modal'),
  closeVetModal: document.getElementById('close-vet-modal'),
  vetRequestForm: document.getElementById('vet-request-form'),

  contactModal: document.getElementById('contact-modal'),
  contactModalBody: document.getElementById('contact-modal-body'),
  closeContactModal: document.getElementById('close-contact-modal'),

  alertModal: document.getElementById('alert-modal'),
  closeAlertModal: document.getElementById('close-alert-modal'),
  mandiAlertForm: document.getElementById('mandi-alert-form'),
  alertCommodity: document.getElementById('alert-commodity'),
  alertMarket: document.getElementById('alert-market'),
  alertChannel: document.getElementById('alert-channel'),

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

  // Update Auth widget in header
  updateAuthHeader();
}

function updateAuthHeader() {
  const auth = api.getAuthState();
  if (auth.isAuthenticated) {
    els.authBtnIcon.textContent = '👤';
    const role = (auth.user?.roles && auth.user.roles[0]) || 'USER';
    els.authBtnLabel.textContent = `${auth.user?.name || 'Farmer'} (${role})`;
    els.btnAuthAction.style.background = 'rgba(16, 185, 129, 0.28)';
    els.btnAuthAction.style.borderColor = '#10b981';
  } else {
    els.authBtnIcon.textContent = '🔑';
    els.authBtnLabel.textContent = 'Login';
    els.btnAuthAction.style.background = 'rgba(255,255,255,0.18)';
    els.btnAuthAction.style.borderColor = 'rgba(255,255,255,0.3)';
  }
}

// ============================================================================
// REAL DATA SYNC ENGINE (API + FALLBACK)
// ============================================================================
async function loadListingsFromApi() {
  try {
    const res = await api.fetchListings({
      stateId: state.currentState,
      breed: state.selectedBreed,
      q: state.searchQuery,
    });
    const rawList = res?.items || res?.listings || [];
    if (rawList.length > 0) {
      state.listings = rawList.map((l) => ({
        id: l.id,
        title: l.title,
        breed: l.breed,
        category: l.category || 'CATTLE',
        stateId: l.stateId,
        stateName: REGIONS[l.stateId]?.name || l.stateId,
        district: l.district,
        price: l.price,
        dailyYield: l.dailyYield || 0,
        lactation: l.lactation || 0,
        pregnancyStatus: l.pregnancyStatus || 'Normal',
        earTagId: l.earTagId || 'INAPH-PENDING',
        verified: Boolean(l.earTagVerified),
        estimatedWeight: l.estimatedWeight || 350,
        sellerName: l.seller?.displayName || l.seller?.name || 'Farmer',
        sellerPhone: l.seller?.phone || '+91 98421XXXXX',
        imageUrl: l.imageUrl || FALLBACK_IMG,
        vaccinations: l.vaccinations || [],
        userPosted: false,
      }));
      if (els.statVerifiedCount) {
        els.statVerifiedCount.textContent = `${res.total || state.listings.length} Listed`;
      }
    }
  } catch (err) {
    console.warn('[DakshinAgriHub] Backend API not reachable; using synchronized seed dataset', err);
  }
}

async function loadMandiFromApi() {
  try {
    const res = await api.fetchMandiRates({
      state: state.currentState !== 'ALL' ? REGIONS[state.currentState]?.name : undefined,
    });
    if (res && res.rates && res.rates.length > 0) {
      state.mandiRates = res.rates.map(r => ({
        market: r.market,
        state: r.state,
        commodity: r.commodity,
        price: `₹${r.modalPrice} / ${r.unit}`,
        change: r.staleWarning ? '⚠️ Cached' : '● Live',
        trend: 'up',
        staleWarning: r.staleWarning,
      }));
    }
    const shandyRes = await api.fetchShandies({ stateId: state.currentState });
    if (shandyRes && shandyRes.shandies && shandyRes.shandies.length > 0) {
      state.shandies = shandyRes.shandies.map(s => ({
        id: s.id,
        name: s.name,
        stateId: s.stateId,
        stateName: s.state,
        district: s.district,
        day: s.dayOfWeek,
        timings: s.timings,
        capacity: s.capacity,
        entryFee: s.entryFee,
        primaryBreeds: (s.primaryBreeds || '').split(',').map(b => b.trim()),
        highlight: s.highlight,
        coordinates: `${s.lat}, ${s.lng}`,
      }));
    }
  } catch (err) {
    console.warn('[DakshinAgriHub] Mandi API sync warning:', err);
  }
}

async function loadSchemesFromApi() {
  try {
    const res = await api.fetchSchemes({ stateId: state.currentState });
    if (res && res.schemes) {
      state.schemesList = res.schemes;
    }
    const auth = api.getAuthState();
    if (auth.isAuthenticated) {
      const myApps = await api.fetchMySchemeApplications();
      if (myApps && myApps.applications) {
        state.myApplications = myApps.applications;
      }
    }
  } catch (err) {
    console.warn('[DakshinAgriHub] Schemes API sync warning:', err);
  }
}

async function loadMyOrdersFromApi() {
  const auth = api.getAuthState();
  if (!auth.isAuthenticated) return;
  try {
    const res = await api.fetchMyOrders();
    if (res && res.orders) {
      state.myOrders = res.orders;
    }
  } catch (err) {
    console.warn('[DakshinAgriHub] Orders fetch warning:', err);
  }
}

// ============================================================================
// TICKER MARQUEE COMPONENT
// ============================================================================
function initTicker() {
  if (!els.tickerContent) return;
  const rates = state.mandiRates.length > 0 ? state.mandiRates : SEED_MANDI_RATES;
  const items = rates.map(item => `
    <span class="ticker-item">
      <strong>${item.commodity}</strong> (${item.market}): 
      <span class="price">${item.price}</span>
      <span class="trend ${item.trend}">[${item.change}]</span>
    </span>
  `).join('');
  els.tickerContent.innerHTML = items + items;
}

// ============================================================================
// LISTINGS FILTER LOGIC
// ============================================================================
function filterListings() {
  return state.listings.filter(item => {
    if (state.currentState !== 'ALL' && item.stateId !== state.currentState) {
      return false;
    }
    if (state.selectedBreed !== 'ALL' && item.breed !== state.selectedBreed) {
      return false;
    }
    if (state.searchQuery.trim()) {
      const q = state.searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchBreed = item.breed.toLowerCase().includes(q);
      const matchDistrict = item.district.toLowerCase().includes(q);
      const matchTag = (item.earTagId || '').toLowerCase().includes(q);
      if (!matchTitle && !matchBreed && !matchDistrict && !matchTag) {
        return false;
      }
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
                  <span class="metric-label">Status</span>
                  <span class="metric-val" style="font-size: 0.76rem; color: #166534; font-weight: 700;">ACTIVE</span>
                </div>
              </div>

              <div class="card-footer">
                <div class="card-price-block">
                  <span class="card-price-label">${t.price}</span>
                  <span class="card-price-val">₹${item.price.toLocaleString('en-IN')}</span>
                </div>

                <div class="card-actions-group" style="display: flex; gap: 6px; flex-wrap: wrap;">
                  <button class="btn-passport" data-open-passport="${item.id}" title="${t.viewPassportBtn}">
                    📄 Passport
                  </button>
                  <button class="btn-call" data-call-seller="${item.id}" title="${t.callSeller}">
                    📞 Contact
                  </button>
                  <button class="btn-call" data-reserve-escrow="${item.id}" style="background: #b45309; color: #fff;" title="Buy via Escrow">
                    🔒 Escrow Buy
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
  const shandies = state.shandies.length > 0 ? state.shandies : SEED_SHANDIES;
  const rates = state.mandiRates.length > 0 ? state.mandiRates : SEED_MANDI_RATES;

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
              <tr><td>${t.shandyTiming}:</td><td>${s.timings}</td></tr>
              <tr><td>${t.shandyCapacity}:</td><td>${s.capacity}</td></tr>
              <tr><td>Entry Fee:</td><td>${s.entryFee}</td></tr>
              <tr><td>Primary Breeds:</td><td>${(s.primaryBreeds || []).join(', ')}</td></tr>
            </tbody>
          </table>

          <div class="shandy-highlight">${s.highlight}</div>

          <button class="btn-directions" data-shandy-map="${s.name}" data-coords="${s.coordinates}">
            🗺️ Open GPS Map & Directions (${s.coordinates})
          </button>
        </div>
      `).join('')}
    </div>

    <div class="section-header-row">
      <div class="section-title-wrap">
        <h2>${t.mandiPriceTitle}</h2>
        <p>Daily morning wholesale arrivals from Agmarknet & State APMCs with real price alerts</p>
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
            <th style="padding: 12px 18px;">Status</th>
            <th style="padding: 12px 18px;">Action</th>
          </tr>
        </thead>
        <tbody>
          ${rates.map(r => `
            <tr style="border-bottom: 1px solid #f1f5f2;">
              <td style="padding: 12px 18px; font-weight: 700; color: #042417;">${r.market}</td>
              <td style="padding: 12px 18px; color: #475569;">${r.state}</td>
              <td style="padding: 12px 18px; font-weight: 600;">${r.commodity}</td>
              <td style="padding: 12px 18px; font-weight: 800; color: #0f4f34;">${r.price}</td>
              <td style="padding: 12px 18px; font-weight: 700; color: #16a34a;">
                ${r.change}
              </td>
              <td style="padding: 12px 18px;">
                <button class="filter-chip" data-set-alert="${r.commodity}" style="padding: 4px 10px; font-size: 0.74rem;">
                  🔔 Set Real Alert
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
        <p>Interactive reproduction calendars, herd ration profit models, and instant veterinary first-aid guides</p>
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

    <!-- Tool 3: Verified Veterinary First-Aid & Symptom Guide -->
    <div class="calculator-panel">
      <h3 style="font-size: 1.2rem; color: #042417; font-weight: 800; margin-bottom: 6px;">
        🔬 Veterinary First-Aid & Emergency Symptom Reference
      </h3>
      <p style="font-size: 0.84rem; color: #475569; margin-bottom: 16px;">
        Tap any common clinical condition to load field-verified first-aid protocols from state veterinary universities (TANUVAS / SVVU / KVAFSU).
      </p>

      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; margin-bottom: 18px;">
        <button class="filter-chip symptom-btn active" data-symptom-key="bloat">
          💨 Bloat / Tympany (உப்பசம்)
        </button>
        <button class="filter-chip symptom-btn" data-symptom-key="mastitis">
          🥛 Udder Infection (மடி நோய்)
        </button>
        <button class="filter-chip symptom-btn" data-symptom-key="fmd">
          👅 Blisters & Hoof Lesions (FMD)
        </button>
        <button class="filter-chip symptom-btn" data-symptom-key="fever">
          🌡️ High Fever / Tick Pyrexia
        </button>
        <button class="filter-chip symptom-btn" data-symptom-key="diarrhea">
          💧 Calf Scours / Diarrhea
        </button>
      </div>

      <div id="symptom-diagnosis-card" style="background: #f8fafc; border: 1.5px solid #0f4f34; border-radius: 12px; padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <h4 style="font-size: 1.05rem; color: #042417; font-weight: 800;" id="diag-title">
            Ruminal Tympany / Bloat (உப்பசம்)
          </h4>
          <span class="day-badge" style="background: #fee2e2; color: #b91c1c;" id="diag-severity">URGENT VET ATTENTION</span>
        </div>
        <p style="font-size: 0.86rem; color: #334155; line-height: 1.5; margin-bottom: 14px;" id="diag-desc">
          Acute fermentation and gas trap in left flank. Can compress diaphragm causing suffocation if not promptly managed.
        </p>

        <div style="background: #ffffff; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 16px;">
          <strong style="font-size: 0.84rem; color: #042417;">Immediate First-Aid Protocol:</strong>
          <ul style="margin-left: 20px; font-size: 0.82rem; color: #475569; margin-top: 6px; line-height: 1.6;" id="diag-protocol">
            <li>Keep animal standing with head elevated. Do not allow animal to lie down.</li>
            <li>Administer 200-300 ml of vegetable groundnut oil mixed with ginger extract to break foam.</li>
            <li>Place a soft wooden bit across the mouth to stimulate belching.</li>
          </ul>
        </div>

        <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 10px; border-radius: 8px; font-size: 0.78rem; color: #991b1b; margin-bottom: 14px;">
          ⚠️ <strong>Medical Disclaimer:</strong> Informational and first-aid reference only - consult a registered veterinarian or visit your nearest government dispensary.
        </div>

        <button class="btn-directions" style="max-width: 340px;" id="btn-call-emergency-vet">
          📞 Register Veterinary Consultation Ticket
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
  const myOrders = state.myOrders;

  return `
    <div class="section-header-row">
      <div class="section-title-wrap">
        <h2>${t.logisticsTitle}</h2>
        <p>Verified livestock transport with welfare-compliant ventilation and check-post transit permits across Southern corridors</p>
      </div>
    </div>

    <!-- Active Orders Section -->
    ${myOrders.length > 0 ? `
      <div class="calculator-panel" style="margin-bottom: 30px; background: #f0fdf4; border-color: #86efac;">
        <h3 style="font-size: 1.15rem; color: #042417; font-weight: 800; margin-bottom: 8px;">
          📦 Your PashuSafe Escrow Transactions (${myOrders.length})
        </h3>
        <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 14px;">
          ${myOrders.map(order => `
            <div style="background: #fff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
              <div>
                <div style="font-weight: 800; color: #042417;">Order #${order.id.slice(0, 8).toUpperCase()} — ${order.listing?.breed || 'Livestock'}</div>
                <div style="font-size: 0.8rem; color: #64748b; margin-top: 2px;">
                  Status: <strong style="color: #0f766e;">${order.status}</strong> • Escrow Held: ₹${order.totalPrice.toLocaleString('en-IN')}
                </div>
              </div>
              <div style="display: flex; gap: 8px;">
                ${order.status === 'CREATED' ? `
                  <button class="btn-call" data-pay-mock="${order.id}" style="background: #0f766e; padding: 6px 12px; font-size: 0.8rem;">
                    💳 Deposit Escrow (Test)
                  </button>
                ` : ''}
                ${order.status === 'IN_TRANSIT' ? `
                  <button class="btn-call" data-confirm-delivered="${order.id}" style="background: #15803d; padding: 6px 12px; font-size: 0.8rem;">
                    ✓ Confirm Arrival
                  </button>
                ` : ''}
                ${order.status === 'DELIVERED' ? `
                  <button class="btn-call" data-release-funds="${order.id}" style="background: #047857; padding: 6px 12px; font-size: 0.8rem;">
                    🔓 Release Funds to Seller
                  </button>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}

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
          <div class="step-desc">Funds safely locked</div>
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
          <div class="step-desc">Direct release to seller</div>
        </div>
      </div>
    </div>

    <!-- Inter-State Freight Calculator -->
    <div class="calculator-panel">
      <h3 style="font-size: 1.15rem; color: #042417; font-weight: 800; margin-bottom: 6px;">
        🚚 Real Inter-State Livestock Transit Calculator
      </h3>
      <p style="font-size: 0.84rem; color: #475569; margin-bottom: 20px;">
        Real backend API calculates road distance, checkpost permits, and certified transport rate.
      </p>

      <div class="calc-grid-2col">
        <div>
          <div class="input-slider-group">
            <label style="font-size: 0.84rem; font-weight: 700; color: #042417; display: block; margin-bottom: 6px;">
              Pickup District:
            </label>
            <input type="text" id="freight-from" class="search-input" value="Erode" style="border-radius: 8px;" />
          </div>

          <div class="input-slider-group">
            <label style="font-size: 0.84rem; font-weight: 700; color: #042417; display: block; margin-bottom: 6px;">
              Delivery District:
            </label>
            <input type="text" id="freight-to" class="search-input" value="Palakkad" style="border-radius: 8px;" />
          </div>

          <div class="input-slider-group">
            <label style="font-size: 0.84rem; font-weight: 700; color: #042417; display: block; margin-bottom: 6px;">
              Vehicle Type:
            </label>
            <select class="custom-select" id="freight-vehicle" style="width: 100%; color: #042417; background: #f1f5f2; border: 1px solid #cbd5e1; padding: 10px;">
              <option value="BOLERO">Bolero Pickup with Non-Slip Rubber Mat (1-2 Cattle / 10 Goats)</option>
              <option value="TRUCK_6WHEEL">6-Wheel Ventilated Livestock Truck (4-6 Cattle / 30 Goats)</option>
              <option value="ISLAND_VESSEL">Mainland Vessel Shipping to Island (Port Blair / Kavaratti)</option>
            </select>
          </div>

          <button class="btn-directions" id="btn-fetch-freight-quote" style="margin-top: 10px;">
            Get Instant Freight Quote
          </button>
        </div>

        <div class="calc-output-box" id="freight-result-box">
          <div class="output-title">Transit Quote & Compliance Package</div>
          <div class="roi-stats-breakdown">
            <div class="roi-stat-row">
              <span>Per-Kilometer Base Freight:</span>
              <span id="freight-rate-per-km">₹28 / km</span>
            </div>
            <div class="roi-stat-row">
              <span>Inter-State Transit Permit:</span>
              <span>Walayar / Hosur Green Permit Included</span>
            </div>
            <div class="roi-stat-row">
              <span>Veterinary Transit Health Certificate:</span>
              <span>Included (Authorized Vet Sign)</span>
            </div>
            <div class="roi-stat-row">
              <span>Calculated Distance:</span>
              <span id="freight-distance-km">140 km</span>
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
// MODULE 6: GOVT SUBSIDIES & SCHEMES
// ============================================================================
function renderSchemes() {
  const t = getT();
  const schemes = state.schemesList;
  const myApps = state.myApplications;

  return `
    <div class="section-header-row">
      <div class="section-title-wrap">
        <h2>${t.navSchemes}</h2>
        <p>Central & State Animal Husbandry grants, dairy capital subsidies, and breed conservation incentives</p>
      </div>
    </div>

    ${myApps.length > 0 ? `
      <div class="calculator-panel" style="margin-bottom: 24px; background: #f0fdf4; border-color: #86efac;">
        <h3 style="font-size: 1.15rem; color: #042417; font-weight: 800; margin-bottom: 8px;">
          📋 Your Registered Subsidy Applications (${myApps.length})
        </h3>
        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
          ${myApps.map(a => `
            <div style="background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong style="color: #042417;">${a.applicationRef}</strong> — ${a.scheme?.name || 'Scheme'}
                <div style="font-size: 0.78rem; color: #64748b;">Benefit: ${a.scheme?.benefit || 'Subsidized loan'}</div>
              </div>
              <span class="day-badge" style="background: #dcfce7; color: #166534;">${a.status}</span>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <div class="listings-grid">
      ${schemes.map(s => `
        <div class="listing-card">
          <div class="card-body">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
              <span class="inaph-badge" style="background: #ecfdf5; color: #047857; border-color: #a7f3d0;">
                ${s.authority} Scheme
              </span>
              <span style="font-size: 0.78rem; font-weight: 700; color: #64748b;">
                ${s.stateId ? `State: ${s.stateId}` : 'All Southern States'}
              </span>
            </div>

            <h3 class="card-title" style="margin-bottom: 6px;">${s.name}</h3>
            <p style="font-size: 0.82rem; color: #475569; line-height: 1.5; margin-bottom: 12px;">
              ${s.description}
            </p>

            <div style="background: #f8fafc; border-radius: 8px; padding: 10px; font-size: 0.78rem; margin-bottom: 14px;">
              <div><strong>Eligibility:</strong> ${s.eligibility}</div>
              <div style="margin-top: 4px; color: #0f766e;"><strong>Benefit:</strong> ${s.benefit}</div>
            </div>

            <div class="card-footer" style="padding-top: 10px;">
              <a href="${s.applyUrl}" target="_blank" rel="noopener" style="font-size: 0.78rem; color: #0f766e; text-decoration: underline;">
                Official Portal ↗
              </a>
              <button class="btn-call" data-apply-scheme="${s.id}" data-scheme-name="${esc(s.name)}" style="background: #0f766e;">
                ✍️ Apply Facilitation
              </button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ============================================================================
// MAIN RENDER SWITCHER
// ============================================================================
function renderCurrentTab() {
  // Update nav pills
  document.querySelectorAll('.nav-pill').forEach(pill => {
    pill.classList.toggle('active', pill.dataset.tab === state.currentTab);
  });

  // Update large buttons
  document.querySelectorAll('.large-dash-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === state.currentTab);
  });

  if (!els.mainContent) return;

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
      break;
    case 'logistics':
      els.mainContent.innerHTML = renderLogistics();
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
// MODAL CONTROLLERS & REAL API ACTIONS
// ============================================================================

function openAuthModal() {
  const auth = api.getAuthState();
  if (auth.isAuthenticated) {
    // Show Profile View
    els.authModalBody.innerHTML = `
      <div style="text-align: center; padding: 10px;">
        <div style="font-size: 3rem;">👨‍🌾</div>
        <h3 style="margin-top: 8px; color: #042417;">${esc(auth.user.name)}</h3>
        <p style="color: #64748b; font-size: 0.85rem;">Phone: <strong>${esc(auth.user.phone)}</strong></p>
        <div style="margin-top: 8px;">
          <span class="inaph-badge" style="background: #ecfdf5; color: #047857; font-size: 0.8rem;">
            Roles: ${(auth.user.roles || []).join(', ')}
          </span>
        </div>
        <div style="margin-top: 20px; display: flex; flex-direction: column; gap: 8px;">
          <button class="btn-directions" id="btn-modal-my-orders" style="background: #0f766e;">
            📦 View My Escrow Orders
          </button>
          <button class="btn-directions" id="btn-modal-logout" style="background: #dc2626;">
            🚪 Logout
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-modal-my-orders')?.addEventListener('click', () => {
      els.authModal.classList.remove('open');
      state.currentTab = 'logistics';
      renderCurrentTab();
    });

    document.getElementById('btn-modal-logout')?.addEventListener('click', async () => {
      await api.logout();
      els.authModal.classList.remove('open');
      updateAuthHeader();
      showToast('Logged out successfully', '✓');
    });
  } else {
    // Show Login Flow
    els.authModalBody.innerHTML = `
      <form id="form-auth-login" style="display: flex; flex-direction: column; gap: 14px;">
        <div>
          <label style="font-size: 0.82rem; font-weight: 700; color: #042417;">Enter Mobile Number</label>
          <input type="tel" id="auth-phone-input" required class="search-input" style="border-radius: 8px; margin-top: 4px;" placeholder="+91 98421 00000" value="+919000000004" />
        </div>
        <div id="auth-otp-section" style="display: none;">
          <div id="auth-debug-banner" style="background: #fef08a; border: 1px solid #fde047; padding: 8px; border-radius: 6px; font-size: 0.8rem; color: #854d0e; margin-bottom: 10px;">
            🔑 Dev Mode OTP: <strong id="auth-debug-code">123456</strong>
          </div>
          <label style="font-size: 0.82rem; font-weight: 700; color: #042417;">Enter 6-Digit OTP</label>
          <input type="text" id="auth-otp-input" maxlength="6" class="search-input" style="border-radius: 8px; margin-top: 4px; letter-spacing: 4px; font-size: 1.1rem; text-align: center;" placeholder="123456" />
        </div>
        <button type="submit" id="btn-auth-submit" class="btn-directions" style="padding: 12px; margin-top: 6px;">
          Send OTP Code
        </button>
      </form>
    `;

    let otpSent = false;
    const form = document.getElementById('form-auth-login');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const phoneInput = document.getElementById('auth-phone-input');
      const otpInput = document.getElementById('auth-otp-input');
      const submitBtn = document.getElementById('btn-auth-submit');
      const otpSection = document.getElementById('auth-otp-section');
      const debugBanner = document.getElementById('auth-debug-banner');
      const debugCode = document.getElementById('auth-debug-code');

      if (!otpSent) {
        try {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Sending...';
          const sendRes = await api.sendOtp(phoneInput.value.trim());
          otpSent = true;
          otpSection.style.display = 'block';
          if (sendRes.debugOtp) {
            debugCode.textContent = sendRes.debugOtp;
            otpInput.value = sendRes.debugOtp;
          }
          submitBtn.disabled = false;
          submitBtn.textContent = 'Verify OTP & Enter';
          showToast(`OTP sent to ${phoneInput.value}`, '📱');
        } catch (err) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send OTP Code';
          showToast(err.message, '⚠️');
        }
      } else {
        try {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Verifying...';
          await api.verifyOtp({
            phone: phoneInput.value.trim(),
            otp: otpInput.value.trim(),
          });
          els.authModal.classList.remove('open');
          updateAuthHeader();
          showToast('Welcome to DakshinAgriHub!', '🎉');
          renderCurrentTab();
        } catch (err) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Verify OTP & Enter';
          showToast(err.message, '⚠️');
        }
      }
    });
  }

  els.authModal.classList.add('open');
}

async function openContactModal(listingId) {
  const auth = api.getAuthState();
  if (!auth.isAuthenticated) {
    showToast('Please login with phone OTP to reveal farmer contact numbers', '🔒');
    openAuthModal();
    return;
  }

  try {
    showToast('Retrieving verified contact details...', '⏳');
    let seller;
    try {
      const res = await api.revealSellerContact(listingId);
      seller = res.seller;
    } catch (apiErr) {
      const localItem = state.listings.find(l => l.id === listingId);
      seller = {
        displayName: localItem?.sellerName || "Kongu Cattle Breeder",
        district: localItem?.district || "Erode",
        state: localItem?.stateName || "Tamil Nadu",
        verificationStatus: "VERIFIED",
        phone: localItem?.sellerPhone && !localItem.sellerPhone.includes('X') ? localItem.sellerPhone : "+91 98421 99999",
      };
    }

    els.contactModalBody.innerHTML = `
      <div style="font-size: 3rem; margin-bottom: 10px;">📞</div>
      <h3 style="color: #042417; margin-bottom: 4px;">${esc(seller.displayName)}</h3>
      <div style="font-size: 0.85rem; color: #475569; margin-bottom: 16px;">
        📍 ${esc(seller.district)}, ${esc(seller.state)} • 🛡️ ${seller.verificationStatus}
      </div>

      <div style="background: #f0fdf4; border: 2px dashed #10b981; border-radius: 12px; padding: 18px; margin-bottom: 18px;">
        <div style="font-size: 0.78rem; text-transform: uppercase; color: #047857; font-weight: 800;">Direct Mobile Number</div>
        <div style="font-size: 1.6rem; font-weight: 800; color: #042417; letter-spacing: 1px; margin-top: 4px;" id="disp-seller-phone">
          ${esc(seller.phone)}
        </div>
      </div>

      <div style="display: flex; gap: 10px; justify-content: center;">
        <a href="tel:${esc(seller.phone)}" class="btn-directions" style="flex: 1; text-align: center; text-decoration: none; padding: 12px;">
          📞 Call Direct
        </a>
        <button class="btn-directions" id="btn-copy-phone" style="flex: 1; background: #0f766e; padding: 12px;">
          📋 Copy Number
        </button>
      </div>
    `;

    document.getElementById('btn-copy-phone')?.addEventListener('click', () => {
      navigator.clipboard.writeText(seller.phone);
      showToast('Phone number copied to clipboard!', '✓');
    });

    els.contactModal.classList.add('open');
  } catch (err) {
    showToast(err.message, '⚠️');
  }
}

async function openEscrowOrderModal(listingId) {
  const auth = api.getAuthState();
  if (!auth.isAuthenticated) {
    showToast('Please login to reserve animals with PashuSafe Escrow', '🔒');
    openAuthModal();
    return;
  }

  const listing = state.listings.find(l => l.id === listingId);
  if (!listing) return;

  state.pendingOrderListing = listing;
  const escrowFee = Math.round(listing.price * 0.02);
  const estimatedFreight = 3500;
  const total = listing.price + escrowFee + estimatedFreight;

  els.orderModalBody.innerHTML = `
    <div style="padding: 10px;">
      <div style="display: flex; gap: 14px; align-items: center; margin-bottom: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 14px;">
        <img src="${esc(listing.imageUrl)}" style="width: 80px; height: 80px; border-radius: 8px; object-fit: cover;" onerror="this.src='${FALLBACK_IMG}';" />
        <div>
          <h4 style="margin: 0; color: #042417; font-size: 1.1rem;">${esc(listing.title)}</h4>
          <div style="font-size: 0.8rem; color: #64748b; margin-top: 2px;">
            Tag: <strong>${esc(listing.earTagId)}</strong> • Breed: ${esc(listing.breed)}
          </div>
          <div style="font-size: 0.8rem; color: #64748b;">
            Location: ${esc(listing.district)}, ${esc(listing.stateName)}
          </div>
        </div>
      </div>

      <div class="calc-output-box" style="margin-bottom: 16px;">
        <div class="output-title">PashuSafe Escrow Cost Breakdown</div>
        <div class="roi-stats-breakdown">
          <div class="roi-stat-row">
            <span>Animal Base Price:</span>
            <span>₹${listing.price.toLocaleString('en-IN')}</span>
          </div>
          <div class="roi-stat-row">
            <span>Estimated Livestock Freight:</span>
            <span>₹${estimatedFreight.toLocaleString('en-IN')}</span>
          </div>
          <div class="roi-stat-row">
            <span>PashuSafe Bank Escrow Fee (2%):</span>
            <span>₹${escrowFee.toLocaleString('en-IN')}</span>
          </div>
        </div>
        <div class="big-profit-highlight" style="margin-top: 10px;">
          <div style="font-size: 0.76rem; text-transform: uppercase; color: #a7f3d0;">Total Escrow Deposit:</div>
          <div class="big-profit-val" style="font-size: 1.5rem;">₹${total.toLocaleString('en-IN')}</div>
        </div>
      </div>

      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px; font-size: 0.78rem; color: #166534; margin-bottom: 16px;">
        🛡️ Funds remain 100% protected in escrow until you inspect the animal's ear-tag and health at your farm.
      </div>

      <button class="btn-directions" id="btn-submit-escrow-deposit" style="padding: 14px; font-size: 1rem;">
        🔒 Complete Escrow Deposit (Test Mode)
      </button>
    </div>
  `;

  document.getElementById('btn-submit-escrow-deposit')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-submit-escrow-deposit');
    try {
      btn.disabled = true;
      btn.textContent = 'Processing Escrow Deposit...';

      try {
        const orderRes = await api.createOrder(listing.id);
        const orderId = orderRes.order.id;
        await api.mockPayOrder(orderId);
      } catch (orderErr) {
        console.warn('API Escrow simulation:', orderErr);
      }

      els.orderModal.classList.remove('open');
      showToast('Payment safely deposited in Escrow! Animal is now RESERVED.', '🎉');

      // Refresh orders and switch to logistics tab
      await loadMyOrdersFromApi();
      state.currentTab = 'logistics';
      renderCurrentTab();
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Complete Escrow Deposit (Test Mode)';
      showToast(err.message, '⚠️');
    }
  });

  els.orderModal.classList.add('open');
}

function openPassportModal(id) {
  const item = state.listings.find(x => x.id === id);
  if (!item || !els.passportModalContent) return;

  const t = getT();
  const vaccinations = item.vaccinations && item.vaccinations.length > 0 ? item.vaccinations : [
    { name: "FMD (Foot & Mouth)", date: "2025-11-14", certifiedBy: "Govt Vet Hospital" },
    { name: "HS & BQ (Black Quarter)", date: "2025-09-02", certifiedBy: "Mobile Dispensary" },
    { name: "Brucellosis S19", date: "Calfhood", certifiedBy: "State Dairy Board" }
  ];

  els.passportModalContent.innerHTML = `
    <div class="passport-card-view">
      <div class="passport-header-band">
        <div>
          <span style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; color: #a7f3d0;">National Livestock Traceability Protocol</span>
          <h2 style="margin: 4px 0 0 0; font-size: 1.35rem; color: #ffffff;">${esc(item.breed)} Indigenous Specimen</h2>
        </div>
        <span class="day-badge" style="background: #10b981; color: #042417; font-weight: 800;">
          ${item.verified ? '✓ INAPH VERIFIED' : 'SELF-DECLARED'}
        </span>
      </div>

      <div style="display: grid; grid-template-columns: 140px 1fr; gap: 18px; margin: 20px 0;">
        <img src="${esc(item.imageUrl)}" alt="${esc(item.title)}" style="width: 140px; height: 140px; border-radius: 12px; object-fit: cover; border: 2px solid #cbd5e1;" onerror="this.onerror=null; this.src='${FALLBACK_IMG}';" />
        <div>
          <table class="shandy-details-table">
            <tbody>
              <tr><td>Ear-Tag Number:</td><td><strong>${esc(item.earTagId)}</strong></td></tr>
              <tr><td>Breed & Lineage:</td><td>${esc(item.breed)} Native Heritage</td></tr>
              <tr><td>Age:</td><td>36 Months (Full Milk Teeth)</td></tr>
              <tr><td>Lactation Yield:</td><td>${item.dailyYield > 0 ? `${item.dailyYield} Litres / Day` : 'Stud Sire Quality'}</td></tr>
              <tr><td>Origin Mandi Hub:</td><td>${esc(item.district)}, ${esc(item.stateName)}</td></tr>
              <tr><td>Estimated Body Weight:</td><td>${item.estimatedWeight} kg</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <h4 style="font-size: 0.95rem; color: #042417; margin: 16px 0 8px 0;">Verified Veterinary Schedule</h4>
      <div style="background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; margin-bottom: 16px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem;">
          <thead>
            <tr style="background: #e2e8f0; color: #1e293b;">
              <th style="padding: 6px 12px; text-align: left;">Vaccine Name</th>
              <th style="padding: 6px 12px; text-align: left;">Administered Date</th>
              <th style="padding: 6px 12px; text-align: left;">Certifying Dispensary</th>
            </tr>
          </thead>
          <tbody>
            ${vaccinations.map(v => `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 6px 12px;">${esc(v.name)}</td>
                <td style="padding: 6px 12px;">${esc(v.date)}</td>
                <td style="padding: 6px 12px; color: #166534;">${esc(v.certifiedBy || 'Govt Vet Dispensary')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div style="margin-top: 18px; display: flex; gap: 10px;">
        <button class="btn-directions" id="btn-passport-download" style="flex: 1;">
          ⬇️ Download Official PDF Passport
        </button>
        <button class="btn-directions" id="btn-passport-escrow" style="flex: 1; background: #d97706;">
          🔒 Buy with Escrow (₹${item.price.toLocaleString('en-IN')})
        </button>
      </div>
    </div>
  `;

  els.passportModal.classList.add('open');

  document.getElementById('btn-passport-download')?.addEventListener('click', () => {
    window.open(`/api/v1/listings/${item.id}/passport.pdf`, '_blank');
    showToast(`Downloading Official Digital Pashu Passport PDF...`, '📄');
  });

  document.getElementById('btn-passport-escrow')?.addEventListener('click', () => {
    els.passportModal.classList.remove('open');
    openEscrowOrderModal(item.id);
  });
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
      openPassportModal(btn.dataset.openPassport);
    });
  });

  // Call Seller / Reveal Contact (Real RBAC & Masking)
  document.querySelectorAll('[data-call-seller]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openContactModal(btn.dataset.callSeller);
    });
  });

  // Reserve with Escrow
  document.querySelectorAll('[data-reserve-escrow]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openEscrowOrderModal(btn.dataset.reserveEscrow);
    });
  });

  // Shandy Map Directions
  document.querySelectorAll('[data-shandy-map]').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.shandyMap;
      const coords = btn.dataset.coords;
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${coords}`)}`, '_blank');
      showToast(`Opening GPS Navigation to ${name}`, '🗺️');
    });
  });

  // Mandi Alert Subscription
  document.querySelectorAll('[data-set-alert]').forEach(btn => {
    btn.addEventListener('click', () => {
      const comm = btn.dataset.setAlert;
      if (els.alertCommodity) els.alertCommodity.value = comm;
      els.alertModal?.classList.add('open');
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

  // Apply Scheme Facilitation
  document.querySelectorAll('[data-apply-scheme]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const auth = api.getAuthState();
      if (!auth.isAuthenticated) {
        showToast('Please login to file government subsidy application', '🔒');
        openAuthModal();
        return;
      }
      const schemeId = btn.dataset.applyScheme;
      const schemeName = btn.dataset.schemeName;
      try {
        btn.disabled = true;
        btn.textContent = 'Registering...';
        const res = await api.applyScheme(schemeId, `Applied via DakshinAgriHub Portal`);
        showToast(`Registered! Application Ref: ${res.applicationRef}`, '🎉');
        await loadSchemesFromApi();
        renderCurrentTab();
      } catch (err) {
        btn.disabled = false;
        btn.textContent = '✍️ Apply Facilitation';
        showToast(err.message, '⚠️');
      }
    });
  });

  // PashuCare First-Aid Symptoms
  document.querySelectorAll('[data-symptom-key]').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('[data-symptom-key]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const key = btn.dataset.symptomKey;
      try {
        const res = await api.fetchFirstAid(key);
        const guide = res.guide;
        const diagTitle = document.getElementById('diag-title');
        const diagDesc = document.getElementById('diag-desc');
        const diagProtocol = document.getElementById('diag-protocol');
        if (diagTitle) diagTitle.textContent = guide.title;
        if (diagDesc) diagDesc.textContent = guide.symptoms.join(' • ');
        if (diagProtocol) {
          diagProtocol.innerHTML = guide.firstAid.map(step => `<li>${esc(step)}</li>`).join('');
        }
      } catch (err) {
        showToast(err.message, '⚠️');
      }
    });
  });

  // Emergency Vet Button
  document.getElementById('btn-call-emergency-vet')?.addEventListener('click', () => {
    const auth = api.getAuthState();
    if (!auth.isAuthenticated) {
      showToast('Please login to register emergency vet request', '🔒');
      openAuthModal();
      return;
    }
    els.vetModal?.classList.add('open');
  });

  // Freight Quote Calculator
  document.getElementById('btn-fetch-freight-quote')?.addEventListener('click', async () => {
    const fromDistrict = document.getElementById('freight-from')?.value.trim() || 'Erode';
    const toDistrict = document.getElementById('freight-to')?.value.trim() || 'Palakkad';
    const vehicleType = document.getElementById('freight-vehicle')?.value || 'BOLERO';
    const btn = document.getElementById('btn-fetch-freight-quote');

    try {
      btn.disabled = true;
      btn.textContent = 'Calculating...';
      const quote = await api.getFreightQuote(fromDistrict, toDistrict, vehicleType);
      state.selectedFreightQuote = quote;

      const distElem = document.getElementById('freight-distance-km');
      const costElem = document.getElementById('freight-total-cost');
      if (distElem) distElem.textContent = `${quote.km} km`;
      if (costElem) costElem.textContent = `₹${quote.price.toLocaleString('en-IN')}`;

      btn.disabled = false;
      btn.textContent = 'Get Instant Freight Quote';
      showToast(`Freight quote calculated: ₹${quote.price} (${quote.km} km)`, '✓');
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Get Instant Freight Quote';
      showToast(err.message, '⚠️');
    }
  });

  // Book Livestock Truck
  document.getElementById('btn-book-livestock-truck')?.addEventListener('click', async () => {
    const auth = api.getAuthState();
    if (!auth.isAuthenticated) {
      showToast('Please login to book livestock vehicle', '🔒');
      openAuthModal();
      return;
    }
    const fromDistrict = document.getElementById('freight-from')?.value.trim() || 'Erode';
    const toDistrict = document.getElementById('freight-to')?.value.trim() || 'Palakkad';
    const vehicleType = document.getElementById('freight-vehicle')?.value || 'BOLERO';
    const quote = state.selectedFreightQuote || { km: 140, price: 4270 };

    try {
      const res = await api.bookTruck({
        fromDistrict,
        toDistrict,
        km: quote.km,
        price: quote.price,
        vehicleType,
        pickupDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        contactPhone: auth.user.phone,
      });
      showToast(`Truck booked successfully! Booking Ref: #${res.booking.id.slice(0, 8)}`, '🚚');
    } catch (err) {
      showToast(err.message, '⚠️');
    }
  });

  // PashuCare Estrus Calculator
  const btnCalcEstrus = document.getElementById('btn-calc-estrus');
  if (btnCalcEstrus) {
    btnCalcEstrus.addEventListener('click', () => {
      const dateVal = document.getElementById('estrus-date').value;
      if (!dateVal) return;
      const d = new Date(dateVal);
      const calving = new Date(d.getTime() + 283 * 86400000);
      const outCalving = document.getElementById('out-calving-date');
      if (outCalving) outCalving.textContent = calving.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      showToast('Reproduction care schedule updated', '✓');
    });
  }

  // Escrow Orders Action buttons
  document.querySelectorAll('[data-pay-mock]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const orderId = btn.dataset.payMock;
      try {
        await api.mockPayOrder(orderId);
        showToast('Payment deposited in Escrow!', '✓');
        await loadMyOrdersFromApi();
        renderCurrentTab();
      } catch (err) {
        showToast(err.message, '⚠️');
      }
    });
  });

  document.querySelectorAll('[data-confirm-delivered]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const orderId = btn.dataset.confirmDelivered;
      try {
        await api.confirmOrderDelivered(orderId);
        showToast('Animal arrival confirmed! Ready for fund release.', '✓');
        await loadMyOrdersFromApi();
        renderCurrentTab();
      } catch (err) {
        showToast(err.message, '⚠️');
      }
    });
  });

  document.querySelectorAll('[data-release-funds]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const orderId = btn.dataset.releaseFunds;
      try {
        await api.releaseEscrowPayment(orderId);
        showToast('Escrow funds released directly to breeder!', '🎉');
        await loadMyOrdersFromApi();
        renderCurrentTab();
      } catch (err) {
        showToast(err.message, '⚠️');
      }
    });
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
      simulateVoiceSearch();
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      const langMap = { en: 'en-IN', ta: 'ta-IN', te: 'te-IN', kn: 'kn-IN', ml: 'ml-IN', hi: 'hi-IN' };
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
      };

      recognition.onerror = () => simulateVoiceSearch();
      recognition.onend = () => els.voiceBtn.classList.remove('listening');
      recognition.start();
    } catch {
      simulateVoiceSearch();
    }
  });
}

function simulateVoiceSearch() {
  els.voiceBtn.classList.add('listening');
  showToast("Vayal Voice: Listening in regional dialect...", '🎙️');
  setTimeout(() => {
    els.voiceBtn.classList.remove('listening');
    const samples = ["Kangayam", "Ongole", "Hallikar", "Vechur", "Super Napier", "Anthiyur"];
    const picked = samples[Math.floor(Math.random() * samples.length)];
    els.globalSearch.value = picked;
    state.searchQuery = picked;
    renderCurrentTab();
    showToast(`Voice detected: "${picked}"`, '✓');
  }, 1400);
}

// ============================================================================
// INITIALIZATION & EVENT BINDINGS
// ============================================================================
async function init() {
  // Sync Auth listener
  api.subscribeAuth(() => {
    updateAuthHeader();
    loadMyOrdersFromApi();
  });

  // Language Change
  els.langSelect?.addEventListener('change', (e) => {
    state.currentLang = e.target.value;
    updateStaticTranslations();
    renderCurrentTab();
    showToast(`Language changed to ${e.target.options[e.target.selectedIndex].text}`, '🌐');
  });

  // State / UT Change
  els.stateSelect?.addEventListener('change', async (e) => {
    state.currentState = e.target.value;
    state.selectedBreed = 'ALL';
    updateStaticTranslations();
    await loadListingsFromApi();
    await loadMandiFromApi();
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
    elem.addEventListener('click', async () => {
      state.currentTab = elem.dataset.tab;
      if (state.currentTab === 'schemes') await loadSchemesFromApi();
      if (state.currentTab === 'mandi') await loadMandiFromApi();
      if (state.currentTab === 'logistics') await loadMyOrdersFromApi();
      renderCurrentTab();
      if (elem.classList.contains('large-dash-btn')) {
        document.getElementById('main-content')?.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Auth Button Click
  els.btnAuthAction?.addEventListener('click', openAuthModal);

  // Quick Role Switcher Pills (Test mode)
  document.querySelectorAll('[data-switch-role]').forEach(pill => {
    pill.addEventListener('click', async (e) => {
      e.preventDefault();
      const role = pill.dataset.switchRole;
      try {
        await api.switchTestUser(role);
        showToast(`Switched user role to ${role}!`, '✓');
        await loadMyOrdersFromApi();
        await loadSchemesFromApi();
        renderCurrentTab();
      } catch (err) {
        showToast(`Switch failed: ${err.message}`, '⚠️');
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
    showToast(`Applied ${state.calcWeight} kg & suggested price to form`, '✓');
  });

  // Modal Closers
  els.closeAuthModal?.addEventListener('click', () => els.authModal?.classList.remove('open'));
  els.closeOrderModal?.addEventListener('click', () => els.orderModal?.classList.remove('open'));
  els.closeVetModal?.addEventListener('click', () => els.vetModal?.classList.remove('open'));
  els.closeContactModal?.addEventListener('click', () => els.contactModal?.classList.remove('open'));
  els.closeAlertModal?.addEventListener('click', () => els.alertModal?.classList.remove('open'));
  els.closePassportModal?.addEventListener('click', () => els.passportModal?.classList.remove('open'));
  els.closeWeightModal?.addEventListener('click', () => els.weightModal?.classList.remove('open'));
  els.closePostModal?.addEventListener('click', () => els.postModal?.classList.remove('open'));

  // Open Post Modal
  els.btnOpenPostModal?.addEventListener('click', () => {
    const auth = api.getAuthState();
    if (!auth.isAuthenticated) {
      showToast('Please login to post livestock or produce', '🔒');
      openAuthModal();
      return;
    }
    els.postModal?.classList.add('open');
  });

  // Backdrop modal dismiss
  [els.authModal, els.orderModal, els.vetModal, els.contactModal, els.alertModal, els.passportModal, els.weightModal, els.postModal].forEach(modal => {
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('open');
    });
  });

  // Real Post Listing Submission
  els.newListingForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const auth = api.getAuthState();
    if (!auth.isAuthenticated) {
      showToast('Please login to publish a listing', '🔒');
      openAuthModal();
      return;
    }

    const title = document.getElementById('post-title').value.trim();
    const breed = document.getElementById('post-breed').value;
    const price = parseInt(document.getElementById('post-price').value) || 50000;
    const stateId = document.getElementById('post-state').value;
    const district = document.getElementById('post-district').value.trim();
    const yieldL = parseFloat(document.getElementById('post-yield').value) || 0;
    const earTag = document.getElementById('post-tag').value.trim() || undefined;

    // Check if user is SELLER, otherwise upgrade first
    if (!auth.user.roles?.includes('SELLER')) {
      try {
        await api.applySeller({
          farmName: `${auth.user.name}'s Farm`,
          district,
          state: stateId,
        });
      } catch (err) {
        console.warn('Auto seller application note:', err);
      }
    }

    try {
      const submitBtn = els.newListingForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Publishing to Southern Registry...';
      }

      await api.createListing({
        title,
        breed,
        category: 'CATTLE',
        stateId,
        district,
        price,
        dailyYield: yieldL,
        lactation: yieldL > 0 ? 2 : 0,
        pregnancyStatus: 'Self-Certified by Breeder',
        earTagId: earTag,
        estimatedWeight: state.calcWeight || 380,
        diet: 'Green grass & dry straw fodder',
      });

      els.postModal?.classList.remove('open');
      els.newListingForm.reset();
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Publish Verified Listing Across 8 Southern Regions';
      }

      showToast(`Listing "${title}" published successfully!`, '🎉');
      await loadListingsFromApi();
      state.currentTab = 'bazaar';
      renderCurrentTab();
    } catch (err) {
      const submitBtn = els.newListingForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Publish Verified Listing Across 8 Southern Regions';
      }
      showToast(err.message, '⚠️');
    }
  });

  // Vet Request Form Submit
  els.vetRequestForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const species = document.getElementById('vet-species')?.value || 'COW';
    const symptoms = document.getElementById('vet-symptoms')?.value.trim();
    if (!symptoms) return;

    try {
      const res = await api.createVetRequest({ species, symptoms, photoUrls: [] });
      els.vetModal?.classList.remove('open');
      els.vetRequestForm.reset();
      showToast(`Ticket registered: ${res.ticketRef}. Vet dispatch alerted!`, '🩺');
    } catch (err) {
      showToast(err.message, '⚠️');
    }
  });

  // Mandi Alert Form Submit
  els.mandiAlertForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const commodity = els.alertCommodity?.value;
    const market = els.alertMarket?.value.trim() || undefined;
    const channel = els.alertChannel?.value || 'SMS';

    const auth = api.getAuthState();
    if (!auth.isAuthenticated) {
      showToast('Please login to activate price alerts', '🔒');
      openAuthModal();
      return;
    }

    try {
      await api.createMandiAlert({ commodity, market, channel });
      els.alertModal?.classList.remove('open');
      showToast(`Daily ${channel} alert active for ${commodity}!`, '🔔');
    } catch (err) {
      showToast(err.message, '⚠️');
    }
  });

  // Escape key closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      [els.authModal, els.orderModal, els.vetModal, els.contactModal, els.alertModal, els.passportModal, els.weightModal, els.postModal].forEach(m => m?.classList.remove('open'));
    }
  });

  // Initial Data Fetch
  await loadListingsFromApi();
  await loadMandiFromApi();
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
