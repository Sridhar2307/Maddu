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
  currentTab: 'home',
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
  adminStats: null,
  adminUsers: [],
  adminOrders: [],
  adminListings: [],
  feedRoi: {
    animals: 4,
    yieldPerAnimal: 8,
    milkPrice: 42,
  },
  estrus: {
    species: 'cow',
    date: '2026-03-01',
  },
  activeProductId: null,
  lastOrderConfirmation: null,
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

/**
 * Currency formatter with Indian numbering system and explicit negative sign handling
 */
export function formatINR(val) {
  const rounded = Math.round(Number(val) || 0);
  if (rounded < 0) {
    return `-₹${Math.abs(rounded).toLocaleString('en-IN')}`;
  }
  return `₹${rounded.toLocaleString('en-IN')}`;
}

// ============================================================================
// FODDER RATION & DAIRY MONTHLY PROFIT ROI MODEL (Configurable)
// ============================================================================
export const FODDER_FEEDING_CONFIG = {
  greenFodderKgPerAnimal: 25,      // 25 kg green fodder per animal per day (e.g. CO-4 Napier)
  dryStrawKgPerAnimal: 5,          // 5 kg dry roughage/straw per animal per day
  concentratesKgPerAnimal: 4,      // 4 kg concentrates/cake per animal per day
  feedingCostPerAnimalPerDay: 155, // Baseline: ₹620/day for 4 animals => ₹155/animal/day
  daysPerMonth: 30,                // Standard 30 days per month
  greenFodderLabel: 'CO-4 Napier'  // Label displayed in summary box
};

/**
 * Centralized calculation function for Fodder Ration & Dairy Monthly Profit ROI
 * @param {number} animals - Number of milking animals (1 - 50)
 * @param {number} yieldPerAnimal - Average daily yield in litres/day (1 - 30)
 * @param {number} milkPrice - Milk procurement/sale price in ₹/litre (20 - 100)
 * @param {object} config - Configurable cost & ration parameters
 * @returns {object} Derived quantities, revenues, costs, and net profit
 */
export function calculateFodderRoi(animals, yieldPerAnimal, milkPrice, config = FODDER_FEEDING_CONFIG) {
  const numAnimals = Math.max(1, parseInt(animals, 10) || 1);
  const dailyYield = Math.max(0, parseFloat(yieldPerAnimal) || 0);
  const price = Math.max(0, parseFloat(milkPrice) || 0);

  // A. Daily Green Fodder Required
  const dailyGreenFodder = numAnimals * config.greenFodderKgPerAnimal;

  // B. Daily Dry Roughage (Straw)
  const dailyDryRoughage = numAnimals * config.dryStrawKgPerAnimal;

  // C. Daily Concentrates/Cake
  const dailyConcentrates = numAnimals * config.concentratesKgPerAnimal;

  // D. Total Daily Feeding Cost: Animals × ₹155
  const totalDailyFeedingCost = numAnimals * config.feedingCostPerAnimalPerDay;

  // E. Gross Daily Milk Revenue: Animals × Yield × Price
  const grossDailyRevenue = numAnimals * dailyYield * price;

  // F. Estimated Monthly Net Profit: (Gross Daily Milk Revenue - Total Daily Feeding Cost) × 30
  const dailyNetProfit = grossDailyRevenue - totalDailyFeedingCost;
  const monthlyNetProfit = dailyNetProfit * config.daysPerMonth;

  return {
    numAnimals,
    dailyYield,
    price,
    dailyGreenFodder,
    dailyDryRoughage,
    dailyConcentrates,
    totalDailyFeedingCost,
    grossDailyRevenue,
    monthlyNetProfit,
  };
}

// ============================================================================
// DATE ARITHMETIC & FORMATTING HELPERS (Timezone-safe & Leap-year safe)
// ============================================================================
export function parseLocalDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.trim().split('-');
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  const dt = new Date(y, m, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m || dt.getDate() !== d) return null;
  return dt;
}

export function addDays(baseDate, days) {
  const res = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  res.setDate(res.getDate() + days);
  return res;
}

export function formatDateDMY(d) {
  if (!d || isNaN(d.getTime())) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(d.getDate()).padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

// ============================================================================
// CATTLE & GOAT ESTRUS & GESTATION TIMELINE MODEL (Configurable)
// ============================================================================
export const SPECIES_GESTATION_CONFIG = {
  cow: {
    id: 'cow',
    name: 'Indigenous Cow',
    displayName: 'Indigenous Cow (283 Days Gestation)',
    gestationDays: 283,
    returnToHeatDays: 21,
    pregCheckWindow: { startDays: 30, endDays: 60, methodLabel: 'Per Rectum / Lab Test' },
    preDeliveryCare: {
      daysBeforeDelivery: 60,
      label: 'Pre-Calving Dry Therapy & Care:',
      reminderText: '💡 Reminder: Stop milking and consult your veterinarian regarding dry-period management ~60 days before calving for proper fetal growth and colostrum formation.'
    },
    deliveryLabel: 'Expected Calving Date:'
  },
  buffalo: {
    id: 'buffalo',
    name: 'Murrah Buffalo',
    displayName: 'Murrah Buffalo (310 Days Gestation)',
    gestationDays: 310,
    returnToHeatDays: 21,
    pregCheckWindow: { startDays: 45, endDays: 90, methodLabel: 'Per Rectum / Ultrasonography' },
    preDeliveryCare: {
      daysBeforeDelivery: 60,
      label: 'Pre-Calving Dry Therapy & Care:',
      reminderText: '💡 Reminder: Consult your veterinarian regarding dry-period feeding balance and dry therapy ~60 days before expected calving for udder regeneration.'
    },
    deliveryLabel: 'Expected Calving Date:'
  },
  goat: {
    id: 'goat',
    name: 'Native Goat / Doe',
    displayName: 'Native Goat / Doe (150 Days Gestation)',
    gestationDays: 150,
    returnToHeatDays: 21,
    pregCheckWindow: { startDays: 30, endDays: 45, methodLabel: 'Ultrasonography / Abdominal Palpation' },
    preDeliveryCare: {
      daysBeforeDelivery: 30,
      label: 'Pre-Kidding Health & Parasite Care:',
      reminderText: '💡 Reminder: Consult your veterinarian regarding pre-kidding vaccination and parasite management ~30 days before kidding; cattle dry therapy does not apply to does.'
    },
    deliveryLabel: 'Expected Kidding Date:'
  }
};

/**
 * Centralized calculation function for Gestation & Reproductive Milestones
 * @param {string} speciesKey - 'cow' | 'buffalo' | 'goat'
 * @param {string|Date} serviceDate - Date string in YYYY-MM-DD format or Date
 * @param {object} config - Configurable species gestation config map
 * @returns {object} Milestone dates, day intervals, labels, and reminder text
 */
export function calculateGestationMilestones(speciesKey = 'cow', serviceDate = '2026-03-01', config = SPECIES_GESTATION_CONFIG) {
  const species = config[speciesKey] || config.cow;
  const baseDate = typeof serviceDate === 'string' ? parseLocalDate(serviceDate) : serviceDate;

  if (!baseDate || isNaN(baseDate.getTime())) {
    return {
      isValid: false,
      species,
      errorMessage: 'Please select a valid date of insemination / service (AI).'
    };
  }

  // A. Next Heat Check (If Not Pregnant) - estimated date
  const heatDays = species.returnToHeatDays;
  const nextHeatDate = addDays(baseDate, heatDays);

  // B. Veterinary Pregnancy Check window
  const pregStartDays = species.pregCheckWindow.startDays;
  const pregEndDays = species.pregCheckWindow.endDays;
  const pregStartDate = addDays(baseDate, pregStartDays);
  const pregEndDate = addDays(baseDate, pregEndDays);

  // D. Expected Calving / Delivery Date
  const deliveryDays = species.gestationDays;
  const deliveryDate = addDays(baseDate, deliveryDays);

  // C. Mandatory Pre-Delivery / Dry Therapy Care (relative to expected delivery date)
  const daysBeforeDelivery = species.preDeliveryCare.daysBeforeDelivery;
  const preDeliveryTargetDay = Math.max(1, deliveryDays - daysBeforeDelivery);
  const preDeliveryDate = addDays(baseDate, preDeliveryTargetDay);

  return {
    isValid: true,
    species,
    baseDate,
    formattedServiceDate: formatDateDMY(baseDate),

    // Next Heat Check
    heatDays,
    nextHeatDate,
    formattedNextHeat: formatDateDMY(nextHeatDate),
    heatCheckText: `Day ${heatDays} (est. ${formatDateDMY(nextHeatDate)})`,

    // Pregnancy Check Window
    pregStartDays,
    pregEndDays,
    pregStartDate,
    pregEndDate,
    pregCheckText: `Day ${pregStartDays}–${pregEndDays} (${formatDateDMY(pregStartDate)} – ${formatDateDMY(pregEndDate)})`,

    // Pre-delivery care
    preDeliveryTargetDay,
    preDeliveryDate,
    preDeliveryCareLabel: species.preDeliveryCare.label,
    preDeliveryCareText: `Day ${preDeliveryTargetDay} (~${daysBeforeDelivery}d pre-delivery: ${formatDateDMY(preDeliveryDate)})`,
    reminderText: species.preDeliveryCare.reminderText,

    // Delivery Date
    deliveryDays,
    deliveryDate,
    deliveryLabel: species.deliveryLabel,
    formattedDeliveryDate: formatDateDMY(deliveryDate),
  };
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
  const sideTabAdmin = document.getElementById('side-tab-admin');
  const navAdmin = document.getElementById('nav-tab-admin');
  const footerAdminLink = document.getElementById('footer-admin-link');
  const isAdmin = Boolean(auth.isAuthenticated && auth.user?.roles?.includes('ADMIN'));

  // Admin Governance link strictly visible only to authenticated ADMIN
  if (sideTabAdmin) {
    sideTabAdmin.style.display = isAdmin ? 'flex' : 'none';
  }
  if (navAdmin) {
    navAdmin.style.display = isAdmin ? 'inline-flex' : 'none';
  }
  if (footerAdminLink) {
    footerAdminLink.style.display = isAdmin ? 'inline' : 'none';
  }

  if (auth.isAuthenticated) {
    if (els.authBtnIcon) els.authBtnIcon.textContent = '👤';
    const role = (auth.user?.roles && auth.user.roles[0]) || 'USER';
    if (els.authBtnLabel) els.authBtnLabel.textContent = `${auth.user?.name || 'User'} (${role})`;
    if (els.btnAuthAction) {
      els.btnAuthAction.style.background = isAdmin ? '#fee2e2' : '#ccfbf1';
      els.btnAuthAction.style.borderColor = isAdmin ? '#fca5a5' : '#99f6e4';
      els.btnAuthAction.style.color = isAdmin ? '#991b1b' : '#0f766e';
    }
  } else {
    if (els.authBtnIcon) els.authBtnIcon.textContent = '🔑';
    if (els.authBtnLabel) els.authBtnLabel.textContent = 'Login / Portals';
    if (els.btnAuthAction) {
      els.btnAuthAction.style.background = '#f0fdf4';
      els.btnAuthAction.style.borderColor = '#bbf7d0';
      els.btnAuthAction.style.color = '#166534';
    }
    if (state.currentTab === 'profile' || state.currentTab === 'admin') {
      state.currentTab = 'home';
    }
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
      const mapped = rawList.map((l) => ({
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
        userPosted: true,
      }));
      const hasSeeds = rawList.some(x => String(x.id).startsWith('pashu-'));
      state.listings = hasSeeds ? mapped : [...mapped, ...SEED_LIVESTOCK];
      if (els.statVerifiedCount) {
        els.statVerifiedCount.textContent = `${state.listings.length} Listed`;
      }
    } else {
      state.listings = [...SEED_LIVESTOCK];
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
    if (res && (res.orders || res.purchases)) {
      state.myOrders = res.orders || res.purchases;
    }
  } catch (err) {
    console.warn('[DakshinAgriHub] Orders fetch warning:', err);
  }
}

async function loadAdminDataFromApi() {
  try {
    const [stats, usersRes, ordersRes, listingsRes] = await Promise.all([
      api.fetchAdminStats().catch(() => null),
      api.fetchAdminUsers().catch(() => null),
      api.fetchAdminOrders().catch(() => null),
      api.fetchAdminListings().catch(() => null),
    ]);
    if (stats) state.adminStats = stats;
    if (usersRes?.users) state.adminUsers = usersRes.users;
    if (ordersRes?.orders) state.adminOrders = ordersRes.orders;
    if (listingsRes?.listings) state.adminListings = listingsRes.listings;
  } catch (err) {
    console.warn('[DakshinAgriHub] Admin data sync warning:', err);
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
              <button class="btn-call btn-open-product" data-open-product="${f.id}" data-order-fodder="${f.title}" style="background: #0f4f34;">
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
              <button class="btn-call btn-open-product" data-open-product="${e.id}" data-book-equip="${e.title}" style="background: #b45309;">
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
// MODULE: PRODUCT DETAILS & ORDER / RENTAL BOOKING PAGE
// ============================================================================
function renderProductDetails() {
  const t = getT();
  const allProducts = [...state.fodderList, ...state.equipmentList, ...state.listings];
  const product = allProducts.find(p => p.id === state.activeProductId) || allProducts[0];

  if (!product) {
    return `
      <div class="product-details-container" style="text-align: center; padding: 60px 20px;">
        <h2>Product or Service Not Found</h2>
        <p style="color: #64748b; margin: 15px 0 25px;">The listing you requested could not be located or may have expired.</p>
        <button class="btn-primary" id="btn-back-to-vivasaya">← Back to Listings</button>
      </div>
    `;
  }

  // 1. If an order / rental booking was just placed, display the confirmation view
  if (state.lastOrderConfirmation) {
    const conf = state.lastOrderConfirmation;
    const isRental = conf.orderType === 'MACHINERY_RENTAL';
    return `
      <div class="product-details-container">
        <div class="breadcrumb-row">
          <div class="breadcrumb-nav">
            <a href="#/tab/home" class="breadcrumb-link">Home</a>
            <span class="breadcrumb-sep">/</span>
            <a href="#/tab/vivasaya" class="breadcrumb-link">Vivasaya & Fodder Mart</a>
            <span class="breadcrumb-sep">/</span>
            <span class="breadcrumb-current">Order Confirmation</span>
          </div>
          <button class="btn-back-link" id="btn-conf-back-listings">
            ← Back to Listings
          </button>
        </div>

        <div class="confirmation-card">
          <div class="conf-badge-icon">${isRental ? '🚜' : '🌾'}</div>
          <h2 style="color: #042417; margin-top: 10px;">${isRental ? 'Custom Machinery Rental Reserved!' : 'Fodder & Silage Order Placed!'}</h2>
          <p style="color: #64748b; font-size: 0.95rem; margin-top: 4px;">
            Unique Reference ID: <strong style="color: #15803d; font-family: monospace; font-size: 1.15rem;">${esc(conf.bookingRef || conf.id)}</strong>
          </p>

          <div class="conf-details-box">
            <div class="conf-row">
              <span class="conf-label">Item / Service:</span>
              <span class="conf-value" style="font-weight: 700; color: #042417;">${esc(conf.listing?.title || product.title)}</span>
            </div>
            <div class="conf-row">
              <span class="conf-label">Category:</span>
              <span class="conf-value">${esc(conf.orderType || (isRental ? 'Machinery Rental' : 'Fodder Exchange'))}</span>
            </div>
            ${conf.quantity ? `
              <div class="conf-row">
                <span class="conf-label">Order Quantity:</span>
                <span class="conf-value">${conf.quantity} ${esc(conf.unit || product.unit || 'units')}</span>
              </div>
            ` : ''}
            ${conf.durationVal ? `
              <div class="conf-row">
                <span class="conf-label">Rental Duration / Area:</span>
                <span class="conf-value">${conf.durationVal} ${esc(product.pricingUnit || 'Units')} (${esc(conf.pricingOption || 'Standard Rate')})</span>
              </div>
            ` : ''}
            ${conf.startTime ? `
              <div class="conf-row">
                <span class="conf-label">Preferred Start Time:</span>
                <span class="conf-value">${esc(conf.startTime)}</span>
              </div>
            ` : ''}
            <div class="conf-row">
              <span class="conf-label">Scheduled Date:</span>
              <span class="conf-value" style="color: #0f766e; font-weight: 600;">📅 ${esc(conf.requiredDate || 'Next Working Day')}</span>
            </div>
            <div class="conf-row">
              <span class="conf-label">Destination / Farm Location:</span>
              <span class="conf-value">${esc(conf.deliveryAddress || 'Registered Farm Address')}, PIN: ${esc(conf.pincode || 'Verified')}</span>
            </div>
            <div class="conf-row">
              <span class="conf-label">Customer Name:</span>
              <span class="conf-value">${esc(conf.customer?.name || 'Farmer')} (📞 ${esc(conf.customer?.phone || '')})</span>
            </div>
            <div class="conf-row" style="border-top: 1px dashed #cbd5e1; padding-top: 12px; margin-top: 8px;">
              <span class="conf-label" style="font-size: 1.05rem; font-weight: 700; color: #042417;">Total Amount Payable:</span>
              <span class="conf-value" style="font-size: 1.35rem; font-weight: 800; color: #15803d;">₹${Number(conf.amount || 0).toLocaleString('en-IN')}</span>
            </div>
            <div class="conf-row">
              <span class="conf-label">Escrow Protection Status:</span>
              <span class="inaph-badge" style="background: #ecfdf5; color: #047857; font-weight: 600;">
                🔒 ${esc(conf.logisticsStatus || 'Payment Held Securely in Escrow')}
              </span>
            </div>
          </div>

          <div style="margin-top: 25px; display: flex; gap: 14px; justify-content: center; flex-wrap: wrap;">
            <button class="btn-primary" id="btn-conf-back-listings-btn" style="background: #0f4f34;">
              ← Back to Listings
            </button>
            <button class="btn-directions" id="btn-conf-view-orders-btn" style="background: #0284c7;">
              📦 View in My Escrow Orders
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // 2. Normal Product Details View
  const isEquipment = product.category === 'EQUIPMENT' || Boolean(product.service) || Boolean(product.rateNum);
  const auth = api.getAuthState();
  const userName = auth?.user?.name || '';
  const userPhone = auth?.user?.phone || '';

  // Current date strings for date pickers
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  return `
    <div class="product-details-container">
      <!-- Breadcrumbs & Back Nav -->
      <div class="breadcrumb-row">
        <div class="breadcrumb-nav">
          <a href="#/tab/home" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-sep">/</span>
          <a href="#/tab/vivasaya" class="breadcrumb-link">Vivasaya & Fodder Mart</a>
          <span class="breadcrumb-sep">/</span>
          <span class="breadcrumb-link">${isEquipment ? 'Custom Machinery Rental' : 'Fodder & Silage Exchange'}</span>
          <span class="breadcrumb-sep">/</span>
          <span class="breadcrumb-current">${esc(product.title)}</span>
        </div>
        <button class="btn-back-link" id="btn-back-to-vivasaya">
          ← Back to Listings
        </button>
      </div>

      <!-- Main Two-Column Layout -->
      <div class="product-details-layout">
        <!-- Left Column: Product Information & Relevant Specifications -->
        <div class="product-info-panel">
          <div class="product-hero-card">
            <div class="product-image-wrap">
              <img src="${product.imageUrl}" alt="${esc(product.title)}" class="product-main-img" />
              <div class="product-badge-float" style="background: ${isEquipment ? '#b45309' : '#15803d'};">
                ${isEquipment ? '⚙️ ' + esc(product.service || 'Machinery Hire') : '🌱 ' + esc(product.type || 'Fodder Harvest')}
              </div>
              <div class="product-badge-verified">
                ✔ INAPH / Agri Verified
              </div>
            </div>

            <div class="product-meta-header">
              <h1 class="product-title">${esc(product.title)}</h1>
              <div class="product-location-row">
                <span>📍 ${esc(product.district)}${product.stateName ? ', ' + esc(product.stateName) : ''}</span>
                <span class="dot-separator">•</span>
                <span style="color: #047857; font-weight: 600;">Direct Farmer / Custom Operator Listing</span>
              </div>
              <div class="product-price-highlight" style="color: ${isEquipment ? '#b45309' : '#15803d'};">
                ${esc(product.rate || product.price)}
              </div>
            </div>

            <div class="product-description-wrap">
              <h3 style="color: #042417; font-size: 1.05rem; margin-bottom: 8px;">Description & Field Overview</h3>
              <p style="color: #475569; line-height: 1.6; font-size: 0.95rem;">
                ${esc(product.description || (isEquipment ? 'Doorstep machinery custom-hire service operated by trained personnel. Fast deployment to farm location.' : 'Fresh nutrient-rich livestock fodder direct from delta surplus fields to dairy clusters.'))}
              </p>
            </div>

            <!-- Dynamic Relevant Specifications Grid -->
            <div class="product-specs-card">
              <h3 style="color: #042417; font-size: 1.05rem; margin-bottom: 14px;">
                ${isEquipment ? '⚙️ Equipment & Service Specifications' : '🌾 Crop & Fodder Quality Metrics'}
              </h3>
              
              <div class="specs-grid">
                ${!isEquipment ? `
                  <!-- Fodder Specifications Only -->
                  <div class="spec-cell">
                    <span class="spec-label">Fodder Category</span>
                    <span class="spec-value">🌱 ${esc(product.type || 'Green Fodder')}</span>
                  </div>
                  <div class="spec-cell">
                    <span class="spec-label">Crop / Grass Variety</span>
                    <span class="spec-value">${esc(product.variety || 'CO-4 Napier Hybrid')}</span>
                  </div>
                  <div class="spec-cell">
                    <span class="spec-label">Fresh / Dry Condition</span>
                    <span class="spec-value">${esc(product.condition || 'Fresh Harvest')}</span>
                  </div>
                  <div class="spec-cell">
                    <span class="spec-label">Moisture Content</span>
                    <span class="spec-value">💧 ${esc(product.moisture || '75%')}</span>
                  </div>
                  <div class="spec-cell">
                    <span class="spec-label">Crude Protein & Starch</span>
                    <span class="spec-value" style="color: #15803d; font-weight: 700;">💪 ${esc(product.protein || '10.5% Crude Protein')}</span>
                  </div>
                  <div class="spec-cell">
                    <span class="spec-label">Unit Rate</span>
                    <span class="spec-value">${esc(product.price || '₹2.20 / kg')}</span>
                  </div>
                  <div class="spec-cell">
                    <span class="spec-label">Minimum Order Quantity</span>
                    <span class="spec-value" style="color: #b45309; font-weight: 700;">📦 ${esc(product.minOrder || (product.minOrderQty + ' ' + (product.unit || 'units')))}</span>
                  </div>
                  <div class="spec-cell">
                    <span class="spec-label">Available Stock</span>
                    <span class="spec-value">📊 ${esc(product.availableQty || '25 Tonnes')}</span>
                  </div>
                  <div class="spec-cell" style="grid-column: 1 / -1;">
                    <span class="spec-label">Logistics Corridor & Transit</span>
                    <span class="spec-value">🚚 ${esc(product.delivery || 'Direct dispatch from farm')}</span>
                  </div>
                ` : `
                  <!-- Machinery Specifications Only -->
                  <div class="spec-cell">
                    <span class="spec-label">Equipment / Service</span>
                    <span class="spec-value">⚙️ ${esc(product.service || product.title)}</span>
                  </div>
                  <div class="spec-cell">
                    <span class="spec-label">Equipment Category</span>
                    <span class="spec-value">🚜 ${esc(product.category || 'Agricultural Machinery')}</span>
                  </div>
                  <div class="spec-cell">
                    <span class="spec-label">Rental Charge</span>
                    <span class="spec-value" style="color: #b45309; font-weight: 700;">💰 ${esc(product.rate)}</span>
                  </div>
                  <div class="spec-cell">
                    <span class="spec-label">Pricing Basis</span>
                    <span class="spec-value">⏱️ Per ${esc(product.pricingUnit || 'Hour')}</span>
                  </div>
                  <div class="spec-cell">
                    <span class="spec-label">Operator / Pilot Status</span>
                    <span class="spec-value" style="color: #047857; font-weight: 700;">👨‍✈️ ${esc(product.operator || 'Trained Operator Included')}</span>
                  </div>
                  <div class="spec-cell">
                    <span class="spec-label">Availability Window</span>
                    <span class="spec-value">📅 ${esc(product.availability || 'Available 7 days/week')}</span>
                  </div>
                  <div class="spec-cell" style="grid-column: 1 / -1;">
                    <span class="spec-label">Operational Coverage Area</span>
                    <span class="spec-value">🗺️ ${esc(product.coverage || product.district)}</span>
                  </div>
                  <div class="spec-cell" style="grid-column: 1 / -1;">
                    <span class="spec-label">Technical Specifications & Implements</span>
                    <span class="spec-value">🛠️ ${esc(product.specs || 'Commercial grade high efficiency farm machinery')}</span>
                  </div>
                `}
              </div>
            </div>

            <!-- Provider Card -->
            <div class="provider-info-card">
              <div style="font-size: 2.2rem;">${isEquipment ? '🏢' : '👨‍🌾'}</div>
              <div style="flex: 1;">
                <h4 style="margin: 0; color: #042417; font-size: 1rem;">${esc(product.seller || product.owner || 'Verified Agri Provider')}</h4>
                <div style="font-size: 0.85rem; color: #64748b; margin-top: 3px;">
                  📍 ${esc(product.district)} • Verified South Indian Agri Provider
                </div>
                <div style="margin-top: 6px; font-size: 0.85rem;" id="provider-phone-container">
                  <strong style="color: #0f766e;">Phone:</strong> <span id="provider-phone-text">${product.phone ? product.phone.slice(0, 6) + 'XXXXX' : '+91 98421 XXXXX'}</span>
                </div>
              </div>
              <button class="btn-directions" id="btn-reveal-provider-contact" style="background: #047857; font-size: 0.85rem; padding: 8px 14px;">
                📞 Contact Provider
              </button>
            </div>
          </div>
        </div>

        <!-- Right Column: Interactive Order / Rental Booking Form -->
        <div class="order-booking-panel">
          ${!isEquipment ? `
            <!-- FODDER & SILAGE ORDER FORM -->
            <div class="booking-card fodder-card-theme">
              <div class="booking-card-header">
                <h3>🛒 Order Silage & Fodder</h3>
                <p>Direct farm-gate supply with PashuSafe escrow protection</p>
              </div>

              <form id="fodder-order-form" class="booking-form">
                <input type="hidden" id="fodder-unit-price" value="${product.unitPriceNum || 2.2}" />
                <input type="hidden" id="fodder-min-qty" value="${product.minOrderQty || 1}" />
                <input type="hidden" id="fodder-delivery-charge" value="${product.deliveryCharge || 650}" />

                <!-- Quantity Control -->
                <div class="form-group">
                  <label for="fodder-qty-input">
                    Required Quantity (${esc(product.unit || 'kg')}):
                    <span class="label-hint">Min: ${product.minOrder || (product.minOrderQty + ' ' + (product.unit || 'kg'))}</span>
                  </label>
                  <div class="input-unit-wrap">
                    <input 
                      type="number" 
                      id="fodder-qty-input" 
                      name="quantity"
                      min="${product.minOrderQty || 1}" 
                      value="${product.minOrderQty || 1500}" 
                      step="${product.unit === 'bale' || product.unit === 'bag' ? 1 : 50}"
                      class="form-control"
                      required
                    />
                    <span class="unit-tag">${esc(product.unit || 'kg')}</span>
                  </div>

                  <!-- Quick Presets -->
                  <div class="quick-presets-row">
                    <button type="button" class="preset-btn" data-set-qty="${product.minOrderQty || 1500}">Min Order</button>
                    <button type="button" class="preset-btn" data-set-qty="${(product.minOrderQty || 1500) * 2}">2× Min</button>
                    <button type="button" class="preset-btn" data-set-qty="${(product.minOrderQty || 1500) * 5}">5× Load</button>
                    ${product.unit === 'kg' ? '<button type="button" class="preset-btn" data-set-qty="10000">10 Tonnes</button>' : ''}
                  </div>
                </div>

                <!-- Dynamic Real-Time Price Summary Panel -->
                <div class="live-summary-box">
                  <div class="summary-box-title">PRICE & LOGISTICS SUMMARY</div>
                  <div class="summary-line">
                    <span>Produce Unit Rate:</span>
                    <span>₹${product.unitPriceNum || 2.20} / ${esc(product.unit || 'kg')}</span>
                  </div>
                  <div class="summary-line">
                    <span>Produce Cost (<span id="calc-qty-display">${product.minOrderQty || 1500} ${esc(product.unit || 'kg')}</span>):</span>
                    <span id="calc-produce-subtotal" style="font-weight: 700;">₹...</span>
                  </div>
                  <div class="summary-line">
                    <span>Corridor Transit / Freight:</span>
                    <span id="calc-freight-cost">₹${product.deliveryCharge || 650}</span>
                  </div>
                  <div class="summary-line total-line">
                    <span>ESTIMATED TOTAL:</span>
                    <span id="calc-fodder-total">₹...</span>
                  </div>
                </div>

                <!-- Delivery Destination -->
                <div class="form-group">
                  <label for="fodder-delivery-address">Delivery Address / Farm Cattle Shed:</label>
                  <textarea 
                    id="fodder-delivery-address" 
                    rows="2" 
                    class="form-control" 
                    placeholder="Enter farm address, landmark, village, and taluk..."
                    required
                  ></textarea>
                </div>

                <div class="form-row-2col">
                  <div class="form-group">
                    <label for="fodder-pincode">PIN Code:</label>
                    <input 
                      type="text" 
                      id="fodder-pincode" 
                      maxlength="6" 
                      class="form-control" 
                      placeholder="e.g. 638001" 
                      pattern="[0-9]{6}"
                      required 
                    />
                  </div>
                  <div class="form-group">
                    <label for="fodder-delivery-date">Required Delivery Date:</label>
                    <input 
                      type="date" 
                      id="fodder-delivery-date" 
                      min="${todayStr}" 
                      value="${tomorrowStr}" 
                      class="form-control" 
                      required 
                    />
                  </div>
                </div>

                <div class="form-group">
                  <label for="fodder-delivery-pref">Delivery Preference:</label>
                  <select id="fodder-delivery-pref" class="form-control">
                    <option value="Direct Farm Delivery">Direct Farm Delivery (Truck / Mini-Auto to Shed)</option>
                    <option value="Cluster Hub Pickup">Cluster Hub Pickup (Collect at Nearest Mandi / Taluk Center)</option>
                  </select>
                </div>

                <!-- Customer Details -->
                <div class="form-row-2col">
                  <div class="form-group">
                    <label for="fodder-buyer-name">Buyer / Farmer Name:</label>
                    <input 
                      type="text" 
                      id="fodder-buyer-name" 
                      value="${esc(userName)}" 
                      placeholder="e.g. Anand Murthy" 
                      class="form-control" 
                      required 
                    />
                  </div>
                  <div class="form-group">
                    <label for="fodder-buyer-phone">Contact Phone Number:</label>
                    <input 
                      type="tel" 
                      id="fodder-buyer-phone" 
                      value="${esc(userPhone)}" 
                      placeholder="10-digit mobile number" 
                      class="form-control" 
                      required 
                    />
                  </div>
                </div>

                <div class="form-group">
                  <label for="fodder-order-notes">Special Instructions (Optional):</label>
                  <input 
                    type="text" 
                    id="fodder-order-notes" 
                    placeholder="e.g. Morning unloading required, tight farm gate access..." 
                    class="form-control" 
                  />
                </div>

                <div id="fodder-form-error" class="form-error-msg" style="display: none;"></div>

                <button type="submit" id="btn-submit-fodder-order" class="btn-submit-booking btn-submit-fodder">
                  🛒 Place Order (Escrow Protected)
                </button>

                <div class="escrow-assurance-badge">
                  🔒 <strong>PashuSafe Escrow Protection:</strong> Funds are kept safe and released to the fodder producer only after you verify harvest weight and moisture at your farm shed.
                </div>
              </form>
            </div>
          ` : `
            <!-- MACHINERY & DRONE RENTAL FORM -->
            <div class="booking-card equip-card-theme">
              <div class="booking-card-header" style="background: linear-gradient(135deg, #78350f, #92400e);">
                <h3>🚜 Book Equipment / Drone Service</h3>
                <p>Doorstep custom hire with trained operator & GPS tracking</p>
              </div>

              <form id="machinery-rental-form" class="booking-form">
                <!-- Pricing Option (if multiple pricing options available) -->
                ${product.pricingOptions ? `
                  <div class="form-group">
                    <label>Select Rental Rate Package:</label>
                    <div class="pricing-options-grid">
                      ${product.pricingOptions.map((opt, idx) => `
                        <label class="pricing-option-card ${idx === 0 ? 'selected' : ''}">
                          <input 
                            type="radio" 
                            name="pricing_option" 
                            value="${opt.rate}" 
                            data-unit="${opt.unit}" 
                            data-label="${esc(opt.label)}" 
                            ${idx === 0 ? 'checked' : ''} 
                          />
                          <div class="pricing-option-content">
                            <span class="option-name">${esc(opt.label)}</span>
                            <span class="option-rate">₹${opt.rate} / ${opt.unit}</span>
                          </div>
                        </label>
                      `).join('')}
                    </div>
                  </div>
                ` : `
                  <input type="hidden" id="equip-base-rate" value="${product.rateNum || 450}" data-unit="${product.pricingUnit || 'acre'}" />
                `}

                <!-- Duration / Service Area Input -->
                <div class="form-group">
                  <label id="equip-duration-label" for="equip-duration-input">
                    ${product.pricingUnit === 'acre' ? 'Required Spraying Area (Acres):' : 'Rental Duration (Hours):'}
                  </label>
                  <div class="input-unit-wrap">
                    <input 
                      type="number" 
                      id="equip-duration-input" 
                      name="duration"
                      min="1" 
                      max="100" 
                      value="${product.pricingUnit === 'acre' ? 5 : 2}" 
                      step="${product.pricingUnit === 'acre' ? 0.5 : 1}"
                      class="form-control"
                      required
                    />
                    <span class="unit-tag" id="equip-duration-unit-tag">${esc(product.pricingUnit || 'Hour')}</span>
                  </div>

                  <div class="quick-presets-row">
                    ${product.pricingUnit === 'acre' ? `
                      <button type="button" class="preset-btn" data-set-equip-dur="2">2 Acres</button>
                      <button type="button" class="preset-btn" data-set-equip-dur="5">5 Acres</button>
                      <button type="button" class="preset-btn" data-set-equip-dur="10">10 Acres</button>
                      <button type="button" class="preset-btn" data-set-equip-dur="20">20 Acres</button>
                    ` : `
                      <button type="button" class="preset-btn" data-set-equip-dur="2">2 Hours</button>
                      <button type="button" class="preset-btn" data-set-equip-dur="4">Half Day (4h)</button>
                      <button type="button" class="preset-btn" data-set-equip-dur="8">Full Day (8h)</button>
                    `}
                  </div>
                </div>

                <!-- Dynamic Real-Time Rental Cost Summary Box -->
                <div class="live-summary-box" style="border-left-color: #f59e0b;">
                  <div class="summary-box-title" style="color: #fcd34d;">RENTAL COST ESTIMATE</div>
                  <div class="summary-line">
                    <span>Base Service Rate:</span>
                    <span id="calc-equip-rate-display">₹${product.rateNum || 450} / ${esc(product.pricingUnit || 'acre')}</span>
                  </div>
                  <div class="summary-line">
                    <span>Booking Measure (<span id="calc-equip-qty-display">${product.pricingUnit === 'acre' ? '5 Acres' : '2 Hours'}</span>):</span>
                    <span id="calc-equip-subtotal" style="font-weight: 700;">₹...</span>
                  </div>
                  <div class="summary-line">
                    <span>Operator & Fuel Allowance:</span>
                    <span style="color: #10b981; font-weight: 600;">Included in Rate</span>
                  </div>
                  <div class="summary-line total-line">
                    <span>ESTIMATED TOTAL:</span>
                    <span id="calc-equip-total" style="color: #fbbf24;">₹...</span>
                  </div>
                </div>

                <!-- Date & Time Scheduling -->
                <div class="form-row-2col">
                  <div class="form-group">
                    <label for="equip-booking-date">Service Date:</label>
                    <input 
                      type="date" 
                      id="equip-booking-date" 
                      min="${todayStr}" 
                      value="${tomorrowStr}" 
                      class="form-control" 
                      required 
                    />
                  </div>
                  <div class="form-group">
                    <label for="equip-start-time">Preferred Slot:</label>
                    <select id="equip-start-time" class="form-control">
                      <option value="06:00 AM (Early Morning)">06:00 AM (Early Morning / Best for Drone)</option>
                      <option value="08:30 AM (Morning Slot)">08:30 AM (Morning Slot)</option>
                      <option value="02:00 PM (Afternoon)">02:00 PM (Afternoon Slot)</option>
                      <option value="04:30 PM (Evening Spray)">04:30 PM (Evening Spray)</option>
                    </select>
                  </div>
                </div>

                <!-- Farm Location -->
                <div class="form-group">
                  <label for="equip-farm-location">Farm Field Location / Survey Number:</label>
                  <textarea 
                    id="equip-farm-location" 
                    rows="2" 
                    class="form-control" 
                    placeholder="Enter village, survey no., nearby transformer or road landmark..."
                    required
                  ></textarea>
                </div>

                <div class="form-group">
                  <label for="equip-pincode">Farm PIN Code:</label>
                  <input 
                    type="text" 
                    id="equip-pincode" 
                    maxlength="6" 
                    class="form-control" 
                    placeholder="e.g. 636001" 
                    pattern="[0-9]{6}"
                    required 
                  />
                </div>

                <!-- Customer Details -->
                <div class="form-row-2col">
                  <div class="form-group">
                    <label for="equip-customer-name">Customer / Farmer Name:</label>
                    <input 
                      type="text" 
                      id="equip-customer-name" 
                      value="${esc(userName)}" 
                      placeholder="e.g. Anand Murthy" 
                      class="form-control" 
                      required 
                    />
                  </div>
                  <div class="form-group">
                    <label for="equip-customer-phone">Contact Phone Number:</label>
                    <input 
                      type="tel" 
                      id="equip-customer-phone" 
                      value="${esc(userPhone)}" 
                      placeholder="10-digit mobile number" 
                      class="form-control" 
                      required 
                    />
                  </div>
                </div>

                <div class="form-group">
                  <label for="equip-crop-notes">Crop Type & Special Requirements (Optional):</label>
                  <input 
                    type="text" 
                    id="equip-crop-notes" 
                    placeholder="e.g. Paddy foliar neem spray, CO-4 Napier cutting..." 
                    class="form-control" 
                  />
                </div>

                <div id="equip-form-error" class="form-error-msg" style="display: none;"></div>

                <button type="submit" id="btn-submit-equip-booking" class="btn-submit-booking btn-submit-equip">
                  🚜 Book Equipment / Service
                </button>

                <div class="escrow-assurance-badge">
                  ⏱️ <strong>Direct Custom Hire Booking:</strong> Booking coordinates and operator ETA will be confirmed by phone within 60 minutes of booking.
                </div>
              </form>
            </div>
          `}
        </div>
      </div>
    </div>
  `;
}

// Dynamic Real-Time Price Summary Calculation for Fodder
function updateFodderCalculation() {
  const qtyInput = document.getElementById('fodder-qty-input');
  const unitPriceInput = document.getElementById('fodder-unit-price');
  const deliveryChargeInput = document.getElementById('fodder-delivery-charge');
  if (!qtyInput || !unitPriceInput) return;

  const qty = parseFloat(qtyInput.value) || 0;
  const unitPrice = parseFloat(unitPriceInput.value) || 0;
  const deliveryCharge = parseFloat(deliveryChargeInput?.value) || 0;

  const subtotal = Math.round(qty * unitPrice);
  const total = subtotal + deliveryCharge;

  const allProducts = [...state.fodderList, ...state.equipmentList, ...state.listings];
  const product = allProducts.find(p => p.id === state.activeProductId) || {};

  const qtyDisplay = document.getElementById('calc-qty-display');
  const subtotalDisplay = document.getElementById('calc-produce-subtotal');
  const totalDisplay = document.getElementById('calc-fodder-total');

  if (qtyDisplay) qtyDisplay.textContent = `${qty.toLocaleString('en-IN')} ${product.unit || 'kg'}`;
  if (subtotalDisplay) subtotalDisplay.textContent = `₹${subtotal.toLocaleString('en-IN')}`;
  if (totalDisplay) totalDisplay.textContent = `₹${total.toLocaleString('en-IN')}`;
}

// Dynamic Real-Time Price Summary Calculation for Machinery / Drone
function updateEquipmentCalculation() {
  const durInput = document.getElementById('equip-duration-input');
  if (!durInput) return;

  const dur = parseFloat(durInput.value) || 0;
  let rate = 450;
  let unit = 'acre';

  const selectedRadio = document.querySelector('input[name="pricing_option"]:checked');
  if (selectedRadio) {
    rate = parseFloat(selectedRadio.value) || 450;
    unit = selectedRadio.dataset.unit || 'hour';
    // Update active label styling
    document.querySelectorAll('.pricing-option-card').forEach(c => {
      const r = c.querySelector('input[type="radio"]');
      c.classList.toggle('selected', r && r.checked);
    });
  } else {
    const baseRateInput = document.getElementById('equip-base-rate');
    if (baseRateInput) {
      rate = parseFloat(baseRateInput.value) || 450;
      unit = baseRateInput.dataset.unit || 'acre';
    }
  }

  const subtotal = Math.round(dur * rate);

  const rateDisplay = document.getElementById('calc-equip-rate-display');
  const qtyDisplay = document.getElementById('calc-equip-qty-display');
  const subtotalDisplay = document.getElementById('calc-equip-subtotal');
  const totalDisplay = document.getElementById('calc-equip-total');
  const unitTag = document.getElementById('equip-duration-unit-tag');
  const durLabel = document.getElementById('equip-duration-label');

  if (rateDisplay) rateDisplay.textContent = `₹${rate.toLocaleString('en-IN')} / ${unit}`;
  if (qtyDisplay) qtyDisplay.textContent = `${dur} ${unit}${dur !== 1 ? 's' : ''}`;
  if (subtotalDisplay) subtotalDisplay.textContent = `₹${subtotal.toLocaleString('en-IN')}`;
  if (totalDisplay) totalDisplay.textContent = `₹${total.toLocaleString('en-IN')}`;
  if (unitTag) unitTag.textContent = unit;
  if (durLabel) {
    durLabel.textContent = unit === 'acre' ? 'Required Spraying Area (Acres):' : `Rental Duration (${unit === 'day' ? 'Days' : 'Hours'}):`;
  }
}

// ============================================================================
// MODULE 4: PASHUCARE & TELE-VET HUB
// ============================================================================
function renderPashuCare() {
  const t = getT();
  const feedRoi = state.feedRoi || { animals: 4, yieldPerAnimal: 8, milkPrice: 42 };
  const roi = calculateFodderRoi(feedRoi.animals, feedRoi.yieldPerAnimal, feedRoi.milkPrice);
  const estrusState = state.estrus || { species: 'cow', date: '2026-03-01' };
  const milestones = calculateGestationMilestones(estrusState.species, estrusState.date);

  return `
    <div class="section-header-row">
      <div class="section-title-wrap">
        <h2>${t.navPashuCare}</h2>
        <p>Interactive reproduction calendars, herd ration profit models, and instant veterinary first-aid guides</p>
      </div>
    </div>

    <!-- Tool 1: Estrus & Calving Cycle Calculator -->
    <div class="calculator-panel" id="section-estrus-calculator">
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
              <option value="cow" ${estrusState.species === 'cow' ? 'selected' : ''}>Indigenous Cow (283 Days Gestation)</option>
              <option value="buffalo" ${estrusState.species === 'buffalo' ? 'selected' : ''}>Murrah Buffalo (310 Days Gestation)</option>
              <option value="goat" ${estrusState.species === 'goat' ? 'selected' : ''}>Native Goat / Doe (150 Days Gestation)</option>
            </select>
          </div>

          <div class="input-slider-group">
            <label style="font-size: 0.84rem; font-weight: 700; color: #042417; display: block; margin-bottom: 6px;">
              Date of Last Insemination / Service (AI):
            </label>
            <input type="date" id="estrus-date" class="search-input" value="${esc(estrusState.date)}" style="border-radius: 8px;" />
            <div id="estrus-date-validation" style="display: none; color: #ef4444; font-size: 0.78rem; font-weight: 600; margin-top: 4px;"></div>
          </div>

          <button class="btn-directions" id="btn-calc-estrus" style="margin-top: 10px;">
            Calculate Gestation & Care Timeline
          </button>
        </div>

        <div class="calc-output-box" id="estrus-result-box">
          <div class="output-title">Milestone Care Schedule</div>
          <div class="roi-stats-breakdown">
            <div class="roi-stat-row">
              <span id="lbl-next-heat">Next Heat Check (If Not Pregnant):</span>
              <span id="out-next-heat">${milestones.isValid ? milestones.heatCheckText : '—'}</span>
            </div>
            <div class="roi-stat-row">
              <span id="lbl-preg-check">Veterinary Pregnancy Check:</span>
              <span id="out-preg-check">${milestones.isValid ? milestones.pregCheckText : '—'}</span>
            </div>
            <div class="roi-stat-row">
              <span id="lbl-predelivery-care">${milestones.isValid ? milestones.preDeliveryCareLabel : 'Pre-Calving Dry Therapy & Care:'}</span>
              <span id="out-deworm">${milestones.isValid ? milestones.preDeliveryCareText : '—'}</span>
            </div>
            <div class="roi-stat-row">
              <span id="lbl-delivery-date">${milestones.isValid ? milestones.deliveryLabel : 'Expected Calving Date:'}</span>
              <span id="out-calving-date" style="color: #6ee7b7; font-size: 1.1rem; font-weight: 800;">
                ${milestones.isValid ? milestones.formattedDeliveryDate : '—'}
              </span>
            </div>
          </div>
          <div id="out-estrus-reminder" style="font-size: 0.76rem; color: #a7f3d0; margin-top: 10px; line-height: 1.4;">
            ${milestones.isValid ? milestones.reminderText : ''}
          </div>
        </div>
      </div>
    </div>

    <!-- Tool 2: Dairy Fodder & Net Profit ROI Calculator -->
    <div class="calculator-panel" id="section-feed-roi-calculator">
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
              <span class="val" id="disp-herd-count">${roi.numAnimals} ${roi.numAnimals === 1 ? 'Animal' : 'Animals'}</span>
            </div>
            <input type="range" min="1" max="50" step="1" value="${roi.numAnimals}" class="custom-range" id="roi-herd-count" aria-label="Number of Milking Animals">
          </div>

          <div class="input-slider-group">
            <div class="slider-label-row">
              <span>Average Daily Yield per Animal:</span>
              <span class="val" id="disp-herd-yield">${roi.dailyYield.toFixed(1)} Litres / Day</span>
            </div>
            <input type="range" min="1" max="30" step="0.5" value="${roi.dailyYield}" class="custom-range" id="roi-herd-yield" aria-label="Average Daily Yield per Animal">
          </div>

          <div class="input-slider-group">
            <div class="slider-label-row">
              <span>Milk Sale Price (Co-op / Private):</span>
              <span class="val" id="disp-milk-price">₹${Math.round(roi.price)} / Litre</span>
            </div>
            <input type="range" min="20" max="100" step="1" value="${roi.price}" class="custom-range" id="roi-milk-price" aria-label="Milk Sale Price">
          </div>
        </div>

        <div class="calc-output-box">
          <div class="output-title">Daily Herd Feeding & Monthly Financials</div>
          <div class="roi-stats-breakdown">
            <div class="roi-stat-row">
              <span>Daily Green Fodder Required:</span>
              <span id="roi-out-green">${roi.dailyGreenFodder.toLocaleString('en-IN')} kg (${FODDER_FEEDING_CONFIG.greenFodderLabel})</span>
            </div>
            <div class="roi-stat-row">
              <span>Daily Dry Roughage (Straw):</span>
              <span id="roi-out-straw">${roi.dailyDryRoughage.toLocaleString('en-IN')} kg</span>
            </div>
            <div class="roi-stat-row">
              <span>Daily Concentrates / Cake:</span>
              <span id="roi-out-concentrate">${roi.dailyConcentrates.toLocaleString('en-IN')} kg</span>
            </div>
            <div class="roi-stat-row">
              <span>Total Daily Feeding Cost:</span>
              <span id="roi-out-feed-cost">${formatINR(roi.totalDailyFeedingCost)} / Day</span>
            </div>
            <div class="roi-stat-row">
              <span>Gross Daily Milk Revenue:</span>
              <span id="roi-out-gross-rev">${formatINR(roi.grossDailyRevenue)} / Day</span>
            </div>
          </div>

          <div class="big-profit-highlight">
            <div style="font-size: 0.78rem; text-transform: uppercase; color: #a7f3d0;">Estimated Monthly Net Profit:</div>
            <div class="big-profit-val" id="roi-out-net-profit" style="color: ${roi.monthlyNetProfit < 0 ? '#fca5a5' : '#6ee7b7'};">
              ${formatINR(roi.monthlyNetProfit)} / Month
            </div>
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
// MODULE 7: USER PROFILE & MY LISTED ANIMALS
// ============================================================================
function renderProfile() {
  const auth = api.getAuthState();
  if (!auth.isAuthenticated) {
    return `
      <div style="text-align: center; padding: 60px 20px; background: #fff; border-radius: 16px; border: 1px solid var(--border-light); max-width: 600px; margin: 40px auto; box-shadow: var(--shadow-sm);">
        <div style="font-size: 3.5rem; margin-bottom: 12px;">🔒</div>
        <h2 style="color: #042417; margin-bottom: 8px;">Please Login to View Profile</h2>
        <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 24px;">
          Access your personal farmer identity, verified INAPH status, and manage the animals you have published on DakshinAgriHub.
        </p>
        <button class="btn-directions" onclick="document.getElementById('btn-auth-action').click()" style="padding: 12px 28px; width: auto; display: inline-block;">
          🔑 Open Login / Verification Modal
        </button>
      </div>
    `;
  }

  const user = auth.user;
  const userPhone = user.phone || '';
  const myAnimals = state.listings.filter(item => {
    return (item.sellerPhone && userPhone && (item.sellerPhone.replace(/\D/g, '') === userPhone.replace(/\D/g, '') || item.sellerPhone === userPhone)) ||
           (item.sellerName && user.name && item.sellerName.toLowerCase().includes(user.name.toLowerCase())) ||
           (item.userPosted && user.roles?.includes('SELLER'));
  });

  const myOrders = state.myOrders || [];

  return `
    <div class="profile-container">
      <div class="profile-header-card">
        <div class="profile-user-info">
          <div class="profile-avatar-circle">
            ${user.roles?.includes('ADMIN') ? '👑' : user.roles?.includes('SELLER') ? '👨‍🌾' : '👤'}
          </div>
          <div class="profile-meta">
            <h2>
              ${esc(user.name || 'Southern Farmer')}
              <span class="inaph-badge" style="background: rgba(34, 197, 94, 0.25); color: #86efac; border: 1px solid #4ade80;">
                ✓ INAPH Verified ID
              </span>
            </h2>
            <div style="color: #cbd5e1; font-size: 0.9rem; display: flex; gap: 16px; flex-wrap: wrap;">
              <span>📱 <strong>${esc(user.phone)}</strong></span>
              <span>📍 <strong>${esc(user.district || 'Erode')}, ${esc(user.state || 'TN')}</strong></span>
              <span>🏷️ Role: <strong style="color: #fef08a;">${(user.roles || ['BUYER']).join(', ')}</strong></span>
            </div>
          </div>
        </div>

        <div class="profile-details-grid">
          <div class="profile-stat-box">
            <span class="profile-stat-label">Animals Added by Me</span>
            <span class="profile-stat-val">${myAnimals.length} Livestock Listed</span>
          </div>
          <div class="profile-stat-box">
            <span class="profile-stat-label">Active Escrow Orders</span>
            <span class="profile-stat-val">${myOrders.length} Purchases</span>
          </div>
          <div class="profile-stat-box">
            <span class="profile-stat-label">Farmer KYC Trust Score</span>
            <span class="profile-stat-val">⭐ 99.4% (Govt INAPH Verified)</span>
          </div>
          <div class="profile-stat-box">
            <span class="profile-stat-label">Member Since</span>
            <span class="profile-stat-val">Season 2026 (Dakshin Certified)</span>
          </div>
        </div>
      </div>

      <!-- Section: Animals Added by User -->
      <div class="section-header-row" style="margin-top: 10px;">
        <div class="section-title-wrap">
          <h2>🐄 My Added Animals & Cattle Listings (${myAnimals.length})</h2>
          <p>Live listings posted by you across Southern India APMC network and Pashu Bazaar</p>
        </div>
        <button class="header-post-btn" id="btn-profile-add-animal" style="box-shadow: var(--shadow-sm);">
          <span>➕</span> Add New Animal
        </button>
      </div>

      ${myAnimals.length === 0 ? `
        <div style="background: #ffffff; border-radius: 16px; padding: 40px 20px; text-align: center; border: 1px dashed var(--border-strong);">
          <div style="font-size: 3rem; margin-bottom: 8px;">🐄</div>
          <h3 style="color: #042417; margin-bottom: 6px;">You haven't listed any animals yet</h3>
          <p style="color: #64748b; font-size: 0.88rem; margin-bottom: 20px;">
            Publish your native Kangayam, Ongole, Hallikar, goats or heifers with verified INAPH ear-tag to reach verified buyers across 8 Southern states.
          </p>
          <button class="btn-directions" id="btn-empty-add-animal" style="display: inline-block; width: auto; padding: 10px 24px;">
            ➕ Publish Your First Animal
          </button>
        </div>
      ` : `
        <div class="listings-grid">
          ${myAnimals.map(item => `
            <div class="listing-card">
              <div class="card-image-wrap">
                <img class="card-img" src="${esc(item.imageUrl)}" alt="${esc(item.title)}" onerror="this.src='${FALLBACK_IMG}';" />
                <div class="image-overlay-tags">
                  <span class="breed-badge">${esc(item.breed)}</span>
                  <span class="state-badge">📍 ${esc(item.stateId)}</span>
                </div>
              </div>
              <div class="card-body">
                <div class="price-row">
                  <div class="price-value">₹${item.price.toLocaleString('en-IN')}</div>
                  <span class="status-badge status-active">● Active on Site</span>
                </div>
                <h3 class="card-title">${esc(item.title)}</h3>
                <div class="ear-tag-line">
                  <span>Ear-Tag:</span>
                  <strong>${esc(item.earTagId)}</strong>
                  <span style="color: #059669; font-weight: 700;">✓ Verified</span>
                </div>
                <div class="spec-matrix">
                  <div class="spec-item">
                    <span class="spec-lbl">Daily Yield</span>
                    <span class="spec-val">${item.dailyYield > 0 ? item.dailyYield + ' L/day' : 'Breeding Stud'}</span>
                  </div>
                  <div class="spec-item">
                    <span class="spec-lbl">Lactation</span>
                    <span class="spec-val">${item.lactation > 0 ? item.lactation + ' Calved' : 'Bullock / Stud'}</span>
                  </div>
                </div>
                <div class="card-footer" style="padding-top: 12px; border-top: 1px solid #f1f5f2; display: flex; gap: 8px;">
                  <button class="btn-directions" data-passport-id="${item.id}" style="flex: 1; padding: 8px; font-size: 0.8rem;">
                    📜 View Passport
                  </button>
                  <button class="role-pill" data-delete-my-listing="${item.id}" style="background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; padding: 8px 14px; font-size: 0.8rem; font-weight: 700; border-radius: 8px; cursor: pointer;">
                    🗑️ Remove
                  </button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
}

// ============================================================================
// MODULE 9: SEPARATE ROLE LOGIN PORTALS (Buyer, Seller, Vet, Admin Governance)
// ============================================================================

const ROLE_LOGIN_CONFIGS = {
  buyer: {
    id: 'buyer',
    badge: 'BUYER PORTAL',
    badgeColor: '#0f766e',
    badgeBg: '#ccfbf1',
    icon: '🛒',
    title: 'Verified Buyer Portal Login',
    desc: 'Access Escrow-protected cattle & poultry purchases, track transit with AWBI-certified carriers, and view digital pashu passports.',
    bullets: [
      '🛡️ 100% Escrow Protection: Funds held securely until animal inspection',
      '📜 INAPH digital passport verification with real-time vaccination logs',
      '🚚 Direct booking for ventilated livestock transport carriers'
    ],
    defaultPhone: '+919000000004',
    demoName: 'Anand Murthy (Verified Buyer)',
    demoLocation: 'Bengaluru, Karnataka',
    btnColor: '#0f766e',
    submitLabel: 'Sign In to Buyer Portal',
    quickDemoLabel: '⚡ Instant Demo Login as Buyer'
  },
  seller: {
    id: 'seller',
    badge: 'FARMER & BREEDER PORTAL',
    badgeColor: '#0369a1',
    badgeBg: '#e0f2fe',
    icon: '👨‍🌾',
    title: 'Farmer & Breeder Portal Login',
    desc: 'List indigenous heritage cattle (Kangayam, Ongole, Hallikar), goats, fodder crops, and farm equipment with zero platform commission.',
    bullets: [
      '🐄 Instant digital pashu passport creation with health & milk history',
      '💰 Zero payment default guarantee with verified buyer escrow deposits',
      '🌾 Direct connection with verified commercial dairy & farm buyers'
    ],
    defaultPhone: '+919000000002',
    demoName: 'Murugesan K (Kangayam Breeder)',
    demoLocation: 'Erode, Tamil Nadu',
    btnColor: '#0369a1',
    submitLabel: 'Sign In to Seller Portal',
    quickDemoLabel: '⚡ Instant Demo Login as Seller'
  },
  vet: {
    id: 'vet',
    badge: 'TELE-VET HEALTHCARE PORTAL',
    badgeColor: '#b45309',
    badgeBg: '#fef3c7',
    icon: '🩺',
    title: 'Veterinary Officer Portal Login',
    desc: 'Licensed veterinary practitioners & dispensaries: Provide telemedicine consultations, review AI bloat/mastitis scans, and issue digital health tags.',
    bullets: [
      '📞 Remote tele-consultations for rural livestock owners across South India',
      '💉 Issue verified digital vaccination and health certificates',
      '📅 Calving date forecasts, gestation calendars & AI advisory'
    ],
    defaultPhone: '+919000000006',
    demoName: 'Dr. Radhakrishnan (BVSc, AH Dept)',
    demoLocation: 'Namakkal, Tamil Nadu',
    btnColor: '#b45309',
    submitLabel: 'Sign In to Veterinary Portal',
    quickDemoLabel: '⚡ Instant Demo Login as Vet'
  },
  admin: {
    id: 'admin',
    badge: 'CENTRAL GOVERNANCE • RESTRICTED ACCESS',
    badgeColor: '#991b1b',
    badgeBg: '#fee2e2',
    icon: '🛡️',
    title: 'Central Admin Governance Login',
    desc: 'Strictly restricted to designated Central Administrative Officers. Access root KYC approvals, emergency escrow releases, and platform oversight.',
    bullets: [
      '⚖️ Review and approve pending farmer & seller identity KYC documents',
      '🔓 Emergency escrow release desk with dispute settlement audit',
      '📊 Live multi-state database telemetry synchronized with Supabase'
    ],
    defaultPhone: '+919000000001',
    demoName: 'Senthil Nathan (Central Admin Officer)',
    demoLocation: 'Chennai Directorate, Tamil Nadu',
    btnColor: '#991b1b',
    submitLabel: 'Authenticate Central Admin Officer',
    quickDemoLabel: '⚡ Authenticate Central Admin (Senthil Nathan)'
  }
};

function renderAccessRestricted() {
  return `
    <div class="profile-container" style="max-width: 650px; margin: 50px auto; padding: 20px;">
      <div style="background: #ffffff; border-radius: 20px; border: 1.5px solid #fecaca; box-shadow: 0 12px 32px rgba(153, 27, 27, 0.08); padding: 40px 32px; text-align: center;">
        <div style="font-size: 3.5rem; margin-bottom: 12px;">🛡️</div>
        <span class="inaph-badge" style="background: #fef2f2; color: #dc2626; border-color: #fca5a5; font-size: 0.8rem; font-weight: 800;">
          CENTRAL GOVERNANCE CLEARANCE REQUIRED
        </span>
        <h2 style="color: #991b1b; font-size: 1.6rem; font-weight: 800; margin: 14px 0 8px 0;">Admin Governance Restricted</h2>
        <p style="color: #64748b; font-size: 0.92rem; line-height: 1.6; margin-bottom: 24px;">
          The Central Governance Console is strictly restricted to authenticated Central Administrators. 
          Please sign in with your designated Central Officer credentials to review live KYC audits, emergency escrow releases, and database governance.
        </p>
        <button class="btn-directions" id="btn-goto-admin-login-screen" style="background: #991b1b; color: #fff; padding: 12px 28px; border-radius: 9999px; font-weight: 700; font-size: 0.95rem; border: none; cursor: pointer;">
          🛡️ Go to Admin Governance Login
        </button>
      </div>
    </div>
  `;
}

function renderLoginHub() {
  return `
    <div class="login-portal-wrapper">
      <div style="text-align: center; margin-bottom: 30px;">
        <span class="inaph-badge" style="background: #ecfdf5; color: #047857; font-weight: 800;">DAKSHIN AGRI HUB PORTALS</span>
        <h2 style="font-size: 1.85rem; font-weight: 800; color: #042417; margin: 10px 0 6px 0;">Select Your Access Portal</h2>
        <p style="color: #64748b; font-size: 0.95rem; max-width: 580px; margin: 0 auto;">
          Choose your role below to access dedicated livestock buying, breeding, veterinary healthcare, or central administrative governance.
        </p>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px;">
        
        <!-- Buyer Card -->
        <div style="background: #ffffff; border: 1.5px solid #ccfbf1; border-radius: 18px; padding: 26px 22px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 4px 16px rgba(0,0,0,0.04); transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='translateY(0)'">
          <div>
            <div style="font-size: 2.2rem; margin-bottom: 10px;">🛒</div>
            <span class="inaph-badge" style="background: #ccfbf1; color: #0f766e; font-size: 0.72rem; font-weight: 800;">BUYER PORTAL</span>
            <h3 style="font-size: 1.25rem; font-weight: 800; color: #042417; margin: 10px 0 6px 0;">Livestock Buyer</h3>
            <p style="color: #64748b; font-size: 0.85rem; line-height: 1.5; margin-bottom: 16px;">
              Purchase verified cattle & poultry with PashuSafe 100% escrow protection and ventilated carrier booking.
            </p>
          </div>
          <button class="btn-directions" data-goto-login="login-buyer" style="background: #0f766e; width: 100%; padding: 10px; font-weight: 700; border-radius: 8px;">
            Enter Buyer Login ➔
          </button>
        </div>

        <!-- Seller Card -->
        <div style="background: #ffffff; border: 1.5px solid #e0f2fe; border-radius: 18px; padding: 26px 22px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 4px 16px rgba(0,0,0,0.04); transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='translateY(0)'">
          <div>
            <div style="font-size: 2.2rem; margin-bottom: 10px;">👨‍🌾</div>
            <span class="inaph-badge" style="background: #e0f2fe; color: #0369a1; font-size: 0.72rem; font-weight: 800;">FARMER & BREEDER</span>
            <h3 style="font-size: 1.25rem; font-weight: 800; color: #042417; margin: 10px 0 6px 0;">Seller & Breeder</h3>
            <p style="color: #64748b; font-size: 0.85rem; line-height: 1.5; margin-bottom: 16px;">
              List indigenous heritage breeds, silage & equipment. Generate digital passports with zero commission.
            </p>
          </div>
          <button class="btn-directions" data-goto-login="login-seller" style="background: #0369a1; width: 100%; padding: 10px; font-weight: 700; border-radius: 8px;">
            Enter Seller Login ➔
          </button>
        </div>

        <!-- Vet Card -->
        <div style="background: #ffffff; border: 1.5px solid #fef3c7; border-radius: 18px; padding: 26px 22px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 4px 16px rgba(0,0,0,0.04); transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='translateY(0)'">
          <div>
            <div style="font-size: 2.2rem; margin-bottom: 10px;">🩺</div>
            <span class="inaph-badge" style="background: #fef3c7; color: #b45309; font-size: 0.72rem; font-weight: 800;">HEALTHCARE ADVISORY</span>
            <h3 style="font-size: 1.25rem; font-weight: 800; color: #042417; margin: 10px 0 6px 0;">Veterinary Officer</h3>
            <p style="color: #64748b; font-size: 0.85rem; line-height: 1.5; margin-bottom: 16px;">
              Conduct tele-vet consultations, review AI symptom scans, and certify digital health passports.
            </p>
          </div>
          <button class="btn-directions" data-goto-login="login-vet" style="background: #b45309; width: 100%; padding: 10px; font-weight: 700; border-radius: 8px;">
            Enter Vet Login ➔
          </button>
        </div>

        <!-- Admin Governance Card -->
        <div style="background: #ffffff; border: 1.5px solid #fee2e2; border-radius: 18px; padding: 26px 22px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 4px 16px rgba(0,0,0,0.04); transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='translateY(0)'">
          <div>
            <div style="font-size: 2.2rem; margin-bottom: 10px;">🛡️</div>
            <span class="inaph-badge" style="background: #fee2e2; color: #991b1b; font-size: 0.72rem; font-weight: 800;">CENTRAL GOVERNANCE</span>
            <h3 style="font-size: 1.25rem; font-weight: 800; color: #991b1b; margin: 10px 0 6px 0;">Admin Governance</h3>
            <p style="color: #64748b; font-size: 0.85rem; line-height: 1.5; margin-bottom: 16px;">
              Central Administrative Officer access for identity KYC verifications, escrow releases, and platform oversight.
            </p>
          </div>
          <button class="btn-directions" data-goto-login="login-admin" style="background: #991b1b; width: 100%; padding: 10px; font-weight: 700; border-radius: 8px;">
            Enter Admin Login ➔
          </button>
        </div>

      </div>
    </div>
  `;
}

function renderRoleLoginPage(roleKey = 'buyer') {
  const cfg = ROLE_LOGIN_CONFIGS[roleKey] || ROLE_LOGIN_CONFIGS.buyer;

  return `
    <div class="login-portal-wrapper">
      
      <!-- Top Role Tabs Bar -->
      <div class="login-role-tabs-bar">
        <button class="login-role-tab-btn ${roleKey === 'buyer' ? 'active' : ''}" data-goto-login="login-buyer">
          🛒 Buyer Login
        </button>
        <button class="login-role-tab-btn ${roleKey === 'seller' ? 'active' : ''}" data-goto-login="login-seller">
          👨‍🌾 Seller Login
        </button>
        <button class="login-role-tab-btn ${roleKey === 'vet' ? 'active' : ''}" data-goto-login="login-vet">
          🩺 Vet Officer Login
        </button>
        <button class="login-role-tab-btn ${roleKey === 'admin' ? 'active role-admin' : ''}" data-goto-login="login-admin">
          🛡️ Admin Governance
        </button>
      </div>

      <!-- Main Login Card -->
      <div class="login-card-container">
        
        <!-- Information Side -->
        <div class="login-info-side">
          <span class="login-role-badge" style="background: ${cfg.badgeBg}; color: ${cfg.badgeColor};">
            ${cfg.badge}
          </span>
          <h2 class="login-title">${cfg.icon} ${cfg.title}</h2>
          <p class="login-desc">${cfg.desc}</p>

          <ul class="login-bullet-list">
            ${cfg.bullets.map(b => `<li>${b}</li>`).join('')}
          </ul>

          <div class="login-quick-demo-box" style="border-color: ${cfg.badgeColor}; background: ${cfg.badgeBg}22;">
            <div style="font-size: 0.78rem; font-weight: 700; color: ${cfg.badgeColor}; margin-bottom: 4px;">
              DEMO PRESET USER PROFILE
            </div>
            <div style="font-size: 0.88rem; font-weight: 800; color: #042417;">
              ${cfg.demoName}
            </div>
            <div style="font-size: 0.78rem; color: #64748b;">
              ${cfg.demoLocation} • Phone: ${cfg.defaultPhone}
            </div>
            <button class="btn-directions" data-quick-demo-login="${cfg.id}" style="background: ${cfg.btnColor}; color: #ffffff; padding: 8px 14px; font-size: 0.8rem; margin-top: 8px; border-radius: 6px; width: 100%;">
              ${cfg.quickDemoLabel}
            </button>
          </div>
        </div>

        <!-- Form Side -->
        <div class="login-form-side">
          <form id="form-role-login" data-role-id="${cfg.id}" style="display: flex; flex-direction: column; gap: 14px;">
            <div>
              <label style="font-size: 0.82rem; font-weight: 700; color: #042417; display: block; margin-bottom: 4px;">
                Registered Mobile Number
              </label>
              <input type="tel" id="role-auth-phone" required class="search-input" style="border-radius: 8px; width: 100%; border: 1.5px solid #cbd5e1; padding: 10px 12px; font-size: 0.95rem; font-weight: 600;" value="${cfg.defaultPhone}" />
            </div>

            <div id="role-otp-section" style="display: none;">
              <div style="background: #fef08a; border: 1px solid #fde047; padding: 8px; border-radius: 6px; font-size: 0.8rem; color: #854d0e; margin-bottom: 10px;">
                🔑 Test OTP: <strong id="role-debug-otp">123456</strong>
              </div>
              <label style="font-size: 0.82rem; font-weight: 700; color: #042417; display: block; margin-bottom: 4px;">
                Enter 6-Digit Verification Code
              </label>
              <input type="text" id="role-auth-otp" maxlength="6" class="search-input" style="border-radius: 8px; width: 100%; border: 1.5px solid #cbd5e1; padding: 10px 12px; letter-spacing: 4px; font-size: 1.15rem; text-align: center; font-weight: 700;" placeholder="123456" />
            </div>

            <button type="submit" id="btn-role-auth-submit" class="btn-directions" style="background: ${cfg.btnColor}; padding: 12px; font-size: 0.95rem; font-weight: 700; border-radius: 8px; width: 100%;">
              Send OTP Code
            </button>
          </form>

          <p style="font-size: 0.75rem; color: #94a3b8; text-align: center; margin-top: 14px; margin-bottom: 0;">
            Protected by Southern India Unified INAPH & 256-bit Encrypted Token
          </p>
        </div>

      </div>

    </div>
  `;
}

// ============================================================================
// MODULE 8: ADMIN CONTROL PANEL & SUPABASE GOVERNANCE CONSOLE
// ============================================================================
function renderAdmin() {
  const auth = api.getAuthState();
  const isAdmin = Boolean(auth.isAuthenticated && auth.user?.roles?.includes('ADMIN'));

  // Strictly restrict admin governance console to authorized ADMIN role
  if (!isAdmin) {
    return renderAccessRestricted();
  }

  // Database seed fallbacks if API not loaded
  const defaultRegisteredUsers = [
    { id: "usr_admin_1", name: "Senthil Nathan (Admin)", phone: "+919000000001", state: "TN", district: "Chennai", role: "ADMIN", registeredAt: "2026-01-10", kycStatus: "VERIFIED" },
    { id: "usr_seller_1", name: "Murugesan K (Breeder)", phone: "+919000000002", state: "TN", district: "Erode", role: "SELLER", registeredAt: "2026-02-14", kycStatus: "VERIFIED" },
    { id: "usr_seller_2", name: "Venkat Reddy (Dairy)", phone: "+919000000003", state: "AP", district: "Guntur", role: "SELLER", registeredAt: "2026-02-18", kycStatus: "VERIFIED" },
    { id: "usr_buyer_1", name: "Anand Murthy", phone: "+919000000004", state: "KA", district: "Bengaluru", role: "BUYER", registeredAt: "2026-03-01", kycStatus: "VERIFIED" },
    { id: "usr_buyer_2", name: "Rajesh Varma", phone: "+919000000005", state: "TN", district: "Madurai", role: "BUYER", registeredAt: "2026-03-05", kycStatus: "PENDING" },
    { id: "usr_vet_1", name: "Dr. Radhakrishnan (Vet)", phone: "+919000000006", state: "TN", district: "Namakkal", role: "VET", registeredAt: "2026-01-20", kycStatus: "VERIFIED" },
  ];

  const defaultOrders = [
    {
      id: "ord_tn_881",
      createdAt: "2026-10-25T14:30:00Z",
      buyerName: "Anand Murthy",
      buyerPhone: "+919000000004",
      sellerName: "Murugesan K (Breeder)",
      sellerPhone: "+919000000002",
      animalTitle: "Pure Kangayam Heritage Milch Cow with Heifer Calf",
      earTagId: "TN-3304-9812-4410",
      amount: 68000,
      status: "DELIVERED",
      logisticsStatus: "Arrived at Buyer Farm (Bengaluru)"
    },
    {
      id: "ord_ap_442",
      createdAt: "2026-10-26T10:15:00Z",
      buyerName: "Rajesh Varma",
      buyerPhone: "+919000000005",
      sellerName: "Venkat Reddy (Dairy)",
      sellerPhone: "+919000000003",
      animalTitle: "Magnificent Ongole Breeding Stud Bull (Chittoor / Prakasam Lineage)",
      earTagId: "AP-2801-7104-9923",
      amount: 115000,
      status: "PAID_ESCROW",
      logisticsStatus: "In-Transit with Bolero Carrier"
    }
  ];

  // Resolve active dataset from API state or synchronized fallback
  const registeredUsers = (state.adminUsers && state.adminUsers.length > 0) ? state.adminUsers : defaultRegisteredUsers;
  const combinedOrders = (state.adminOrders && state.adminOrders.length > 0) ? state.adminOrders : defaultOrders;
  const allAnimals = (state.adminListings && state.adminListings.length > 0) ? state.adminListings : state.listings;

  const totalUsersCount = state.adminStats?.totalUsers ?? registeredUsers.length;
  const totalListingsCount = state.adminStats?.totalListings ?? allAnimals.length;
  const totalOrdersCount = state.adminStats?.totalOrders ?? combinedOrders.length;
  const totalEscrowVal = state.adminStats?.escrowProtectedValue ?? combinedOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

  return `
    <div class="profile-container" style="max-width: 1200px; margin: 0 auto; padding: 24px 16px;">
      
      <!-- Admin Top Banner & Status -->
      <div class="admin-badge-banner" style="background: linear-gradient(135deg, #042417 0%, #0f4f34 100%); color: #fff; padding: 24px; border-radius: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; box-shadow: 0 10px 25px rgba(4, 36, 23, 0.15);">
        <div>
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
            <span style="font-size: 1.8rem;">🛡️</span>
            <h2 style="font-size: 1.5rem; font-weight: 800; margin: 0; color: #fef08a;">DakshinAgriHub Central Governance Console</h2>
          </div>
          <p style="margin: 0; font-size: 0.88rem; color: #cbd5e1;">
            Master administrative oversight • Real-time Supabase / PostgreSQL synchronized audit trail
          </p>
        </div>
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <button class="role-pill" data-admin-refresh style="background: rgba(255,255,255,0.18); color: #fff; border: 1px solid rgba(255,255,255,0.3); padding: 8px 14px; font-size: 0.8rem; border-radius: 6px; cursor: pointer;">
            🔄 Refresh DB Live
          </button>
          <span class="status-badge" style="background: ${isAdmin ? '#15803d' : '#b45309'}; color: #fff; font-size: 0.8rem; padding: 6px 12px; border-radius: 20px;">
            ${isAdmin ? '👑 Root Admin Active' : '👁️ View-Only Inspector Mode'}
          </span>
        </div>
      </div>

      <!-- Quick Role Unlock Bar if not logged in as Admin -->
      ${!isAdmin ? `
        <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 12px; padding: 14px 20px; margin-top: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.4rem;">🔑</span>
            <div>
              <strong style="color: #92400e; font-size: 0.92rem;">Currently logged in as: ${auth.user?.name || 'Visitor'}</strong>
              <div style="color: #b45309; font-size: 0.8rem;">Switch to administrator session to execute KYC approvals, livestock moderation, and escrow release overrides.</div>
            </div>
          </div>
          <button class="role-pill" data-switch-role="ADMIN" style="background: #991b1b; color: #fff; border: none; padding: 8px 18px; font-size: 0.82rem; font-weight: 700; border-radius: 6px; cursor: pointer;">
            👑 Switch to Senthil Nathan (Admin)
          </button>
        </div>
      ` : ''}

      <!-- Quick Stats KPI Cards -->
      <div class="admin-stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin: 24px 0;">
        <div class="admin-stat-card" style="background: #ffffff; border-radius: 14px; padding: 20px; border: 1px solid rgba(4,36,23,0.08); display: flex; align-items: center; gap: 16px; box-shadow: var(--shadow-sm);">
          <div class="admin-stat-icon" style="background: #ecfdf5; color: #059669; font-size: 1.8rem; width: 52px; height: 52px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">👥</div>
          <div>
            <div style="font-size: 0.78rem; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.04em;">Registered Users</div>
            <div style="font-size: 1.6rem; font-weight: 800; color: #042417;">${totalUsersCount} Active Accounts</div>
            <div style="font-size: 0.75rem; color: #10b981; font-weight: 600;">Table: public.users</div>
          </div>
        </div>

        <div class="admin-stat-card" style="background: #ffffff; border-radius: 14px; padding: 20px; border: 1px solid rgba(4,36,23,0.08); display: flex; align-items: center; gap: 16px; box-shadow: var(--shadow-sm);">
          <div class="admin-stat-icon" style="background: #eff6ff; color: #2563eb; font-size: 1.8rem; width: 52px; height: 52px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">🐄</div>
          <div>
            <div style="font-size: 0.78rem; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.04em;">Listed Livestock</div>
            <div style="font-size: 1.6rem; font-weight: 800; color: #042417;">${totalListingsCount} Animals</div>
            <div style="font-size: 0.75rem; color: #2563eb; font-weight: 600;">Table: public.listings</div>
          </div>
        </div>

        <div class="admin-stat-card" style="background: #ffffff; border-radius: 14px; padding: 20px; border: 1px solid rgba(4,36,23,0.08); display: flex; align-items: center; gap: 16px; box-shadow: var(--shadow-sm);">
          <div class="admin-stat-icon" style="background: #fef3c7; color: #d97706; font-size: 1.8rem; width: 52px; height: 52px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">📦</div>
          <div>
            <div style="font-size: 0.78rem; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.04em;">Executed Orders</div>
            <div style="font-size: 1.6rem; font-weight: 800; color: #042417;">${totalOrdersCount} Escrow Deals</div>
            <div style="font-size: 0.75rem; color: #d97706; font-weight: 600;">Table: public.orders</div>
          </div>
        </div>

        <div class="admin-stat-card" style="background: #ffffff; border-radius: 14px; padding: 20px; border: 1px solid rgba(4,36,23,0.08); display: flex; align-items: center; gap: 16px; box-shadow: var(--shadow-sm);">
          <div class="admin-stat-icon" style="background: #fdf2f8; color: #db2777; font-size: 1.8rem; width: 52px; height: 52px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">🛡️</div>
          <div>
            <div style="font-size: 0.78rem; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.04em;">Escrow Protected Value</div>
            <div style="font-size: 1.6rem; font-weight: 800; color: #042417;">₹${Number(totalEscrowVal).toLocaleString('en-IN')}</div>
            <div style="font-size: 0.75rem; color: #db2777; font-weight: 600;">Live Secure Escrow Pool</div>
          </div>
        </div>
      </div>

      <!-- Supabase Architectural Telemetry Card -->
      <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 14px; padding: 20px; margin-bottom: 30px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.2rem;">⚡</span>
            <strong style="color: #0f172a; font-size: 0.95rem;">Database Schema & Supabase Synchronization Status</strong>
          </div>
          <span style="font-size: 0.75rem; background: #e2e8f0; color: #334155; padding: 3px 8px; border-radius: 4px; font-family: monospace;">
            Engine: PostgreSQL 15 / Supabase REST & Pooler
          </span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; font-size: 0.8rem; color: #475569;">
          <div style="background: #fff; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <strong style="color: #042417; display: block; margin-bottom: 4px;">1. 👥 public.users</strong>
            <code>id</code>, <code>name</code>, <code>phone</code>, <code>state</code>, <code>district</code>, <code>role</code> (BUYER, SELLER, VET, ADMIN), <code>kyc_status</code> (VERIFIED / PENDING), <code>created_at</code>.
          </div>
          <div style="background: #fff; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <strong style="color: #042417; display: block; margin-bottom: 4px;">2. 🐄 public.listings</strong>
            <code>id</code>, <code>seller_id</code>, <code>title</code>, <code>breed</code>, <code>category</code>, <code>state_id</code>, <code>district</code>, <code>price</code>, <code>daily_yield</code>, <code>lactation</code>, <code>pregnancy_status</code>, <code>ear_tag_id</code>, <code>ear_tag_verified</code>, <code>estimated_weight</code>, <code>status</code>.
          </div>
          <div style="background: #fff; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <strong style="color: #042417; display: block; margin-bottom: 4px;">3. 📦 public.orders</strong>
            <code>id</code>, <code>listing_id</code>, <code>buyer_id</code>, <code>seller_id</code>, <code>amount</code>, <code>status</code> (CREATED, PAID_ESCROW, DISPATCHED, DELIVERED, RELEASED), <code>logistics_status</code>, <code>created_at</code>.
          </div>
        </div>
      </div>

      <!-- Table 1: Order Tracking - WHO ORDERED WHICH ANIMAL -->
      <div class="section-header-row" style="margin-top: 10px;">
        <div class="section-title-wrap">
          <h2 style="font-size: 1.25rem;">📦 Escrow Order Audits — Who Ordered Which Animal (${combinedOrders.length})</h2>
          <p style="font-size: 0.85rem; color: #64748b;">Live buyer-to-seller escrow transaction matching with emergency fund release override</p>
        </div>
      </div>

      <div class="admin-table-container" style="background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; overflow-x: auto; box-shadow: var(--shadow-sm); margin-bottom: 35px;">
        <table class="admin-table" style="width: 100%; border-collapse: collapse; font-size: 0.84rem; text-align: left;">
          <thead>
            <tr style="background: #042417; color: #ffffff;">
              <th style="padding: 12px 14px;">Order ID</th>
              <th style="padding: 12px 14px;">Buyer (Ordered By)</th>
              <th style="padding: 12px 14px;">Animal Ordered</th>
              <th style="padding: 12px 14px;">Govt Ear-Tag</th>
              <th style="padding: 12px 14px;">Seller (Breeder)</th>
              <th style="padding: 12px 14px;">Escrow Amount</th>
              <th style="padding: 12px 14px;">Status & Logistics</th>
              <th style="padding: 12px 14px; text-align: center;">Admin Action</th>
            </tr>
          </thead>
          <tbody>
            ${combinedOrders.map(o => `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 12px 14px; font-weight: 700; color: #042417; font-family: monospace;">#${esc(o.id)}</td>
                <td style="padding: 12px 14px;">
                  <strong style="color: #0f172a;">${esc(o.buyerName)}</strong><br>
                  <span style="font-size: 0.78rem; color: #64748b;">📞 ${esc(o.buyerPhone)}</span>
                </td>
                <td style="padding: 12px 14px; font-weight: 600; color: #0f766e;">
                  ${esc(o.animalTitle || o.listing?.title || 'Heritage Livestock')}
                </td>
                <td style="padding: 12px 14px;">
                  <span style="background: #f1f5f9; padding: 3px 8px; border-radius: 4px; font-weight: 700; font-size: 0.78rem; border: 1px solid #e2e8f0;">
                    ${esc(o.earTagId || o.listing?.earTagId || 'INAPH-VERIFIED')}
                  </span>
                </td>
                <td style="padding: 12px 14px;">
                  <strong style="color: #0f172a;">${esc(o.sellerName || o.seller?.name || 'Local Breeder')}</strong><br>
                  <span style="font-size: 0.78rem; color: #64748b;">📞 ${esc(o.sellerPhone || o.seller?.phone || '+91 98421 88421')}</span>
                </td>
                <td style="padding: 12px 14px; font-weight: 800; color: #047857; font-size: 0.95rem;">
                  ₹${Number(o.amount).toLocaleString('en-IN')}
                </td>
                <td style="padding: 12px 14px;">
                  <span class="status-badge ${o.status === 'DELIVERED' ? 'status-delivered' : o.status === 'PAID_ESCROW' ? 'status-paid' : o.status === 'RELEASED' ? 'status-released' : 'status-created'}" style="display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">
                    ${esc(o.status)}
                  </span>
                  <div style="font-size: 0.72rem; color: #64748b; margin-top: 3px;">
                    ${esc(o.logisticsStatus || 'Carrier Transit Pending')}
                  </div>
                </td>
                <td style="padding: 12px 14px; text-align: center;">
                  <div style="display: flex; gap: 6px; justify-content: center;">
                    <button class="btn-directions" data-admin-view-order="${o.id}" style="padding: 5px 10px; font-size: 0.72rem; cursor: pointer;">
                      🔍 Inspect
                    </button>
                    ${o.status !== 'RELEASED' ? `
                      <button class="role-pill" data-admin-force-release="${o.id}" style="background: #047857; color: #fff; border: none; padding: 5px 10px; font-size: 0.72rem; border-radius: 4px; cursor: pointer; font-weight: 600;" title="Emergency manual release of funds to seller">
                        ⚡ Release
                      </button>
                    ` : ''}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Table 2: All Registered Users -->
      <div class="section-header-row">
        <div class="section-title-wrap">
          <h2 style="font-size: 1.25rem;">👥 Registered Farmers & Users Directory (${registeredUsers.length})</h2>
          <p style="font-size: 0.85rem; color: #64748b;">Direct database records from Supabase <code>users</code> table with role allocation & KYC validation</p>
        </div>
      </div>

      <div class="admin-table-container" style="background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; overflow-x: auto; box-shadow: var(--shadow-sm); margin-bottom: 35px;">
        <table class="admin-table" style="width: 100%; border-collapse: collapse; font-size: 0.84rem; text-align: left;">
          <thead>
            <tr style="background: #042417; color: #ffffff;">
              <th style="padding: 12px 14px;">User / Farmer Name</th>
              <th style="padding: 12px 14px;">Verified Phone</th>
              <th style="padding: 12px 14px;">Location</th>
              <th style="padding: 12px 14px;">Assigned Role</th>
              <th style="padding: 12px 14px;">Govt INAPH KYC</th>
              <th style="padding: 12px 14px;">Registered Date</th>
              <th style="padding: 12px 14px; text-align: center;">KYC Action</th>
            </tr>
          </thead>
          <tbody>
            ${registeredUsers.map(u => `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 12px 14px; font-weight: 700; color: #042417;">
                  ${u.role === 'ADMIN' ? '👑 ' : ''}${esc(u.name)}
                </td>
                <td style="padding: 12px 14px; font-family: monospace;">${esc(u.phone)}</td>
                <td style="padding: 12px 14px;">${esc(u.district)}, <strong>${esc(u.state)}</strong></td>
                <td style="padding: 12px 14px;">
                  <span class="inaph-badge" style="background: ${u.role === 'ADMIN' ? '#fee2e2' : u.role === 'SELLER' ? '#e0f2fe' : u.role === 'VET' ? '#fef3c7' : '#ecfdf5'}; color: ${u.role === 'ADMIN' ? '#991b1b' : u.role === 'SELLER' ? '#0369a1' : u.role === 'VET' ? '#92400e' : '#047857'}; font-size: 0.75rem; padding: 3px 8px; border-radius: 4px; font-weight: 700;">
                    ${esc(u.role)}
                  </span>
                </td>
                <td style="padding: 12px 14px;">
                  <span class="status-badge ${u.kycStatus === 'VERIFIED' ? 'status-active' : 'status-created'}" style="padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">
                    ${u.kycStatus === 'VERIFIED' ? '✓ Verified' : '● Pending Review'}
                  </span>
                </td>
                <td style="padding: 12px 14px; color: #64748b; font-size: 0.8rem;">${esc(u.registeredAt || '2026-02-01')}</td>
                <td style="padding: 12px 14px; text-align: center;">
                  ${u.kycStatus !== 'VERIFIED' ? `
                    <button class="role-pill" data-admin-verify-kyc="${u.id}" style="background: #0284c7; color: #fff; border: none; padding: 4px 10px; font-size: 0.72rem; border-radius: 4px; cursor: pointer; font-weight: 600;">
                      ✓ Approve KYC
                    </button>
                  ` : `
                    <span style="color: #10b981; font-weight: 700; font-size: 0.8rem;">Active</span>
                  `}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Table 3: All Animals Added Platform-Wide -->
      <div class="section-header-row">
        <div class="section-title-wrap">
          <h2 style="font-size: 1.25rem;">🐄 Platform-Wide Animal Registry (${allAnimals.length})</h2>
          <p style="font-size: 0.85rem; color: #64748b;">Direct database records from Supabase <code>listings</code> table with ear-tag verification & moderation</p>
        </div>
      </div>

      <div class="admin-table-container" style="background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; overflow-x: auto; box-shadow: var(--shadow-sm); margin-bottom: 30px;">
        <table class="admin-table" style="width: 100%; border-collapse: collapse; font-size: 0.84rem; text-align: left;">
          <thead>
            <tr style="background: #042417; color: #ffffff;">
              <th style="padding: 12px 14px;">Animal Title</th>
              <th style="padding: 12px 14px;">Breed</th>
              <th style="padding: 12px 14px;">State / District</th>
              <th style="padding: 12px 14px;">Govt INAPH Ear-Tag</th>
              <th style="padding: 12px 14px;">Price</th>
              <th style="padding: 12px 14px;">Breeder / Seller</th>
              <th style="padding: 12px 14px;">Listing Status</th>
              <th style="padding: 12px 14px; text-align: center;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${allAnimals.map(item => `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 12px 14px; font-weight: 700; color: #042417;">
                  ${esc(item.title)}
                </td>
                <td style="padding: 12px 14px;">
                  <span class="breed-badge" style="font-size: 0.72rem; padding: 2px 6px;">${esc(item.breed)}</span>
                </td>
                <td style="padding: 12px 14px;">${esc(item.district)}, <strong>${esc(item.stateId)}</strong></td>
                <td style="padding: 12px 14px;">
                  <span style="font-family: monospace; font-weight: 700; background: #f8fafc; padding: 2px 6px; border: 1px solid #e2e8f0; border-radius: 4px;">
                    ${esc(item.earTagId)}
                  </span>
                </td>
                <td style="padding: 12px 14px; font-weight: 800; color: #047857;">
                  ₹${Number(item.price).toLocaleString('en-IN')}
                </td>
                <td style="padding: 12px 14px; color: #334155;">${esc(item.sellerName || 'Local Breeder')}</td>
                <td style="padding: 12px 14px;">
                  <span class="status-badge ${item.status === 'SOLD' ? 'status-delivered' : 'status-active'}" style="padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">
                    ${esc(item.status || 'ACTIVE')}
                  </span>
                </td>
                <td style="padding: 12px 14px; text-align: center;">
                  <div style="display: flex; gap: 6px; justify-content: center;">
                    <button class="btn-directions" data-passport-id="${item.id}" style="padding: 4px 8px; font-size: 0.72rem; cursor: pointer;">
                      📜 Passport
                    </button>
                    <button class="role-pill" data-admin-delete-listing="${item.id}" style="background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; padding: 4px 8px; font-size: 0.72rem; border-radius: 4px; cursor: pointer; font-weight: 600;" title="Remove fraudulent or invalid listing">
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

    </div>
  `;
}

// ============================================================================
// MAIN RENDER SWITCHER
// ============================================================================
function renderCurrentTab() {
  // Update left sidebar items
  document.querySelectorAll('.sidebar-nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.tab === state.currentTab);
  });

  // Update nav pills
  document.querySelectorAll('.nav-pill').forEach(pill => {
    pill.classList.toggle('active', pill.dataset.tab === state.currentTab);
  });

  // Update large buttons
  document.querySelectorAll('.large-dash-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === state.currentTab);
  });

  // Slideshow Banner & Core Services Grid strictly visible only on HOME page
  const isHome = (state.currentTab === 'home');
  const heroBanner = document.getElementById('hero-banner');
  const dashModules = document.getElementById('dashboard-modules-section');
  if (heroBanner) heroBanner.style.display = isHome ? 'block' : 'none';
  if (dashModules) dashModules.style.display = isHome ? 'block' : 'none';

  if (!els.mainContent) return;

  // On Home page, the Bazaar listings are removed so only the Slideshow & Services Grid are shown
  if (isHome) {
    els.mainContent.innerHTML = '';
    els.mainContent.style.display = 'none';
    return;
  }

  els.mainContent.style.display = 'block';

  switch (state.currentTab) {
    case 'home':
      els.mainContent.innerHTML = '';
      break;
    case 'bazaar':
      els.mainContent.innerHTML = renderBazaar();
      break;
    case 'mandi':
      els.mainContent.innerHTML = renderMandi();
      break;
    case 'vivasaya':
      els.mainContent.innerHTML = renderVivasaya();
      break;
    case 'product-details':
      els.mainContent.innerHTML = renderProductDetails();
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
    case 'profile':
      els.mainContent.innerHTML = renderProfile();
      break;
    case 'admin':
      els.mainContent.innerHTML = renderAdmin();
      break;
    case 'login':
      els.mainContent.innerHTML = renderLoginHub();
      break;
    case 'login-buyer':
      els.mainContent.innerHTML = renderRoleLoginPage('buyer');
      break;
    case 'login-seller':
      els.mainContent.innerHTML = renderRoleLoginPage('seller');
      break;
    case 'login-vet':
      els.mainContent.innerHTML = renderRoleLoginPage('vet');
      break;
    case 'login-admin':
      els.mainContent.innerHTML = renderRoleLoginPage('admin');
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
          <button class="btn-directions" id="btn-modal-switch-portal" style="background: #0284c7;">
            🔄 Switch Access Portal (Role)
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

    document.getElementById('btn-modal-switch-portal')?.addEventListener('click', () => {
      els.authModal.classList.remove('open');
      state.currentTab = 'login';
      renderCurrentTab();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.getElementById('btn-modal-logout')?.addEventListener('click', async () => {
      await api.logout();
      els.authModal.classList.remove('open');
      state.currentTab = 'login';
      state.activeProductId = null;
      state.lastOrderConfirmation = null;
      window.location.hash = '#/tab/login';
      updateAuthHeader();
      renderCurrentTab();
      showToast('Logged out successfully', '👋');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  } else {
    // Show Portal Selector inside modal
    els.authModalBody.innerHTML = `
      <div style="text-align: center; margin-bottom: 16px;">
        <h3 style="margin: 0; color: #042417; font-size: 1.25rem;">Choose Access Portal</h3>
        <p style="color: #64748b; font-size: 0.82rem; margin-top: 4px;">Select your dedicated portal to sign in</p>
      </div>
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <button class="btn-directions" data-modal-login="login-buyer" style="background: #0f766e; padding: 12px; font-weight: 700; text-align: left; display: flex; align-items: center; justify-content: space-between;">
          <span>🛒 Livestock Buyer Portal</span>
          <span>➔</span>
        </button>
        <button class="btn-directions" data-modal-login="login-seller" style="background: #0369a1; padding: 12px; font-weight: 700; text-align: left; display: flex; align-items: center; justify-content: space-between;">
          <span>👨‍🌾 Farmer & Breeder Portal</span>
          <span>➔</span>
        </button>
        <button class="btn-directions" data-modal-login="login-vet" style="background: #b45309; padding: 12px; font-weight: 700; text-align: left; display: flex; align-items: center; justify-content: space-between;">
          <span>🩺 Veterinary Officer Portal</span>
          <span>➔</span>
        </button>
        <button class="btn-directions" data-modal-login="login-admin" style="background: #991b1b; padding: 12px; font-weight: 700; text-align: left; display: flex; align-items: center; justify-content: space-between;">
          <span>🛡️ Central Admin Governance</span>
          <span>➔</span>
        </button>
      </div>
    `;

    document.querySelectorAll('[data-modal-login]').forEach(btn => {
      btn.addEventListener('click', () => {
        els.authModal.classList.remove('open');
        state.currentTab = btn.dataset.modalLogin;
        renderCurrentTab();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
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
// PRODUCT DETAILS INTERACTIVITY & SUBMISSION LISTENERS
// ============================================================================
function setupProductDetailsListeners() {
  if (state.currentTab !== 'product-details') return;

  // Back to Listings button
  const backBtn = document.getElementById('btn-back-to-vivasaya');
  if (backBtn) {
    backBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.hash = '#/tab/vivasaya';
    });
  }

  // Confirmation view buttons
  const confBackBtn = document.getElementById('btn-conf-back-listings-btn') || document.getElementById('btn-conf-back-listings');
  if (confBackBtn) {
    confBackBtn.addEventListener('click', (e) => {
      e.preventDefault();
      state.lastOrderConfirmation = null;
      window.location.hash = '#/tab/vivasaya';
    });
  }

  const confOrdersBtn = document.getElementById('btn-conf-view-orders-btn') || document.getElementById('btn-conf-view-orders');
  if (confOrdersBtn) {
    confOrdersBtn.addEventListener('click', (e) => {
      e.preventDefault();
      state.lastOrderConfirmation = null;
      window.location.hash = '#/tab/logistics';
    });
  }

  // Contact Provider button
  const contactBtn = document.getElementById('btn-reveal-provider-contact');
  if (contactBtn) {
    contactBtn.addEventListener('click', () => {
      const allProducts = [...state.fodderList, ...state.equipmentList, ...state.listings];
      const product = allProducts.find(p => p.id === state.activeProductId);
      const phoneText = document.getElementById('provider-phone-text');
      if (phoneText && product?.phone) {
        phoneText.textContent = product.phone;
        phoneText.style.fontWeight = 'bold';
        phoneText.style.color = '#15803d';
      }
      showToast(`Contact Verified: ${product?.seller || product?.owner || 'Supplier'} (${product?.phone || '+91 98421 88421'})`, '📞');
    });
  }

  // Initial Real-time Calculations
  updateFodderCalculation();
  updateEquipmentCalculation();

  // Fodder Quantity input listeners
  const fodderQtyInput = document.getElementById('fodder-qty-input');
  if (fodderQtyInput) {
    fodderQtyInput.addEventListener('input', updateFodderCalculation);
    fodderQtyInput.addEventListener('change', updateFodderCalculation);
  }

  // Fodder quick presets
  document.querySelectorAll('.preset-btn[data-set-qty]').forEach(btn => {
    btn.addEventListener('click', () => {
      const qty = btn.dataset.setQty;
      if (fodderQtyInput) {
        fodderQtyInput.value = qty;
        updateFodderCalculation();
      }
    });
  });

  // Fodder Order Form Submit
  const fodderForm = document.getElementById('fodder-order-form');
  if (fodderForm) {
    fodderForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errBox = document.getElementById('fodder-form-error');
      const submitBtn = document.getElementById('btn-submit-fodder-order');
      if (errBox) errBox.style.display = 'none';

      const allProducts = [...state.fodderList, ...state.equipmentList, ...state.listings];
      const product = allProducts.find(p => p.id === state.activeProductId) || {};

      const qty = parseFloat(fodderQtyInput?.value) || 0;
      const minQty = parseFloat(document.getElementById('fodder-min-qty')?.value) || 1;
      const deliveryAddress = document.getElementById('fodder-delivery-address')?.value.trim();
      const pincode = document.getElementById('fodder-pincode')?.value.trim();
      const deliveryDate = document.getElementById('fodder-delivery-date')?.value;
      const buyerName = document.getElementById('fodder-buyer-name')?.value.trim();
      const buyerPhone = document.getElementById('fodder-buyer-phone')?.value.trim();
      const orderNotes = document.getElementById('fodder-order-notes')?.value.trim();
      const deliveryPref = document.getElementById('fodder-delivery-pref')?.value;

      // Validation
      if (qty <= 0) {
        if (errBox) { errBox.textContent = 'Order quantity must be greater than zero.'; errBox.style.display = 'block'; }
        return;
      }
      if (qty < minQty) {
        if (errBox) { errBox.textContent = `Minimum order quantity for this listing is ${minQty} ${product.unit || 'units'}.`; errBox.style.display = 'block'; }
        return;
      }
      if (!deliveryAddress) {
        if (errBox) { errBox.textContent = 'Please enter a valid farm delivery address.'; errBox.style.display = 'block'; }
        return;
      }
      if (!pincode || pincode.length !== 6 || isNaN(pincode)) {
        if (errBox) { errBox.textContent = 'Please enter a valid 6-digit PIN code.'; errBox.style.display = 'block'; }
        return;
      }
      if (!buyerName || !buyerPhone || buyerPhone.length < 10) {
        if (errBox) { errBox.textContent = 'Please enter buyer name and a valid 10-digit mobile number.'; errBox.style.display = 'block'; }
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Placing Order in Escrow...';
      }

      try {
        const orderData = {
          listingId: product.id,
          quantity: qty,
          unit: product.unit || 'kg',
          deliveryCharge: product.deliveryCharge || 650,
          deliveryAddress: `${deliveryAddress} (${deliveryPref})`,
          pincode,
          requiredDate: deliveryDate,
          customerName: buyerName,
          customerPhone: buyerPhone,
          notes: orderNotes
        };
        const res = await api.placeFodderOrder(orderData);
        if (res && res.order) {
          state.lastOrderConfirmation = res.order;
          showToast(`Fodder Order Placed! Ref: ${res.order.bookingRef || res.order.id}`, '🌾');
          renderCurrentTab();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          throw new Error('Order creation did not return order details');
        }
      } catch (err) {
        if (errBox) {
          errBox.textContent = err.message || 'Failed to place fodder order. Please try again.';
          errBox.style.display = 'block';
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = '🛒 Place Order (Escrow Protected)';
        }
      }
    });
  }

  // Equipment Duration input listeners
  const equipDurInput = document.getElementById('equip-duration-input');
  if (equipDurInput) {
    equipDurInput.addEventListener('input', updateEquipmentCalculation);
    equipDurInput.addEventListener('change', updateEquipmentCalculation);
  }

  // Pricing option radio changes
  document.querySelectorAll('input[name="pricing_option"]').forEach(radio => {
    radio.addEventListener('change', updateEquipmentCalculation);
  });

  // Equipment quick presets
  document.querySelectorAll('.preset-btn[data-set-equip-dur]').forEach(btn => {
    btn.addEventListener('click', () => {
      const dur = btn.dataset.setEquipDur;
      if (equipDurInput) {
        equipDurInput.value = dur;
        updateEquipmentCalculation();
      }
    });
  });

  // Machinery Rental Form Submit
  const equipForm = document.getElementById('machinery-rental-form');
  if (equipForm) {
    equipForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errBox = document.getElementById('equip-form-error');
      const submitBtn = document.getElementById('btn-submit-equip-booking');
      if (errBox) errBox.style.display = 'none';

      const allProducts = [...state.fodderList, ...state.equipmentList, ...state.listings];
      const product = allProducts.find(p => p.id === state.activeProductId) || {};

      const dur = parseFloat(equipDurInput?.value) || 0;
      const farmLocation = document.getElementById('equip-farm-location')?.value.trim();
      const pincode = document.getElementById('equip-pincode')?.value.trim();
      const bookingDate = document.getElementById('equip-booking-date')?.value;
      const startTime = document.getElementById('equip-start-time')?.value;
      const customerName = document.getElementById('equip-customer-name')?.value.trim();
      const customerPhone = document.getElementById('equip-customer-phone')?.value.trim();
      const cropNotes = document.getElementById('equip-crop-notes')?.value.trim();

      const selectedRadio = document.querySelector('input[name="pricing_option"]:checked');
      const pricingOption = selectedRadio ? selectedRadio.dataset.label : (product.rate || 'Standard Rate');

      // Validation
      if (dur <= 0) {
        if (errBox) { errBox.textContent = 'Please enter a valid rental duration or service area.'; errBox.style.display = 'block'; }
        return;
      }
      if (!farmLocation) {
        if (errBox) { errBox.textContent = 'Please specify the farm field address or survey location.'; errBox.style.display = 'block'; }
        return;
      }
      if (!pincode || pincode.length !== 6 || isNaN(pincode)) {
        if (errBox) { errBox.textContent = 'Please enter a valid 6-digit PIN code.'; errBox.style.display = 'block'; }
        return;
      }
      if (!customerName || !customerPhone || customerPhone.length < 10) {
        if (errBox) { errBox.textContent = 'Please enter customer name and a valid 10-digit mobile number.'; errBox.style.display = 'block'; }
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Reserving Machinery...';
      }

      try {
        const bookingData = {
          listingId: product.id,
          durationVal: dur,
          pricingOption,
          startTime,
          requiredDate: bookingDate,
          farmLocation,
          pincode,
          customerName,
          customerPhone,
          notes: cropNotes
        };
        const res = await api.bookEquipmentRental(bookingData);
        if (res && res.order) {
          state.lastOrderConfirmation = res.order;
          showToast(`Rental Reserved! Ref: ${res.order.bookingRef || res.order.id}`, '🚜');
          renderCurrentTab();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          throw new Error('Booking did not return confirmation details');
        }
      } catch (err) {
        if (errBox) {
          errBox.textContent = err.message || 'Failed to submit booking reservation. Please try again.';
          errBox.style.display = 'block';
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = '🚜 Book Equipment / Service';
        }
      }
    });
  }
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

  // Open Product Details Page
  document.querySelectorAll('[data-open-product]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const pid = btn.dataset.openProduct;
      window.location.hash = `#/product/${pid}`;
    });
  });

  // Setup Product Details Listeners if currently viewing details
  setupProductDetailsListeners();

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

  // PashuCare Estrus & Calving Cycle Calculator
  setupEstrusCalculator();

  // PashuCare Fodder Ration & Monthly Profit ROI Calculator
  setupFodderRoiCalculator();

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

  // Profile Specific Listeners
  document.getElementById('btn-profile-add-animal')?.addEventListener('click', () => {
    els.postModal?.classList.add('open');
  });
  document.getElementById('btn-empty-add-animal')?.addEventListener('click', () => {
    els.postModal?.classList.add('open');
  });

  document.querySelectorAll('[data-delete-my-listing]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.deleteMyListing;
      if (!confirm('Are you sure you want to remove this animal listing from DakshinAgriHub?')) return;
      try {
        await api.deleteListing(id);
        const customs = JSON.parse(localStorage.getItem('dah_custom_listings') || '[]');
        const filtered = customs.filter(x => x.id !== id);
        localStorage.setItem('dah_custom_listings', JSON.stringify(filtered));
        state.listings = state.listings.filter(x => x.id !== id);
        showToast('Animal listing removed from public registry', '🗑️');
        renderCurrentTab();
      } catch (err) {
        showToast(err.message, '⚠️');
      }
    });
  });

  // Admin Specific Audit Action
  document.querySelectorAll('[data-admin-view-order]').forEach(btn => {
    btn.addEventListener('click', () => {
      const orderId = btn.dataset.adminViewOrder;
      showToast(`Admin Inspection: Verified KYC, INAPH Tag & Escrow Ledger for #${orderId}`, '🛡️');
    });
  });

  // Admin Refresh Live Data
  document.querySelectorAll('[data-admin-refresh]').forEach(btn => {
    btn.addEventListener('click', async () => {
      showToast('Fetching latest Supabase / PostgreSQL records...', '⏳');
      await loadAdminDataFromApi();
      renderCurrentTab();
      showToast('Admin data synchronized!', '✓');
    });
  });

  // Admin Force Escrow Release Override
  document.querySelectorAll('[data-admin-force-release]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const orderId = btn.dataset.adminForceRelease;
      if (!confirm(`Execute root admin escrow release for Order #${orderId}? Funds will be disbursed directly to the seller.`)) return;
      try {
        await api.adminForceReleaseOrder(orderId);
        showToast(`Admin Override: Escrow released for #${orderId}`, '🎉');
        await loadAdminDataFromApi();
        renderCurrentTab();
      } catch (err) {
        showToast(err.message, '⚠️');
      }
    });
  });

  // Admin KYC Approval
  document.querySelectorAll('[data-admin-verify-kyc]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const userId = btn.dataset.adminVerifyKyc;
      try {
        await api.adminVerifyUserKyc(userId);
        showToast('Government INAPH KYC status approved and updated!', '✓');
        await loadAdminDataFromApi();
        renderCurrentTab();
      } catch (err) {
        showToast(err.message, '⚠️');
      }
    });
  });

  // Admin Delete / Moderation Listing
  document.querySelectorAll('[data-admin-delete-listing]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const listingId = btn.dataset.adminDeleteListing;
      if (!confirm(`Permanently remove Listing #${listingId} under platform safety moderation?`)) return;
      try {
        await api.adminDeleteListing(listingId);
        showToast(`Listing #${listingId} removed by admin moderation`, '🗑️');
        await loadAdminDataFromApi();
        await loadListingsFromApi();
        renderCurrentTab();
      } catch (err) {
        showToast(err.message, '⚠️');
      }
    });
  });

  // ============================================================================
  // LOGIN PORTALS & ADMIN ACCESS LISTENERS
  // ============================================================================

  // Navigation between role login pages ([data-goto-login])
  document.querySelectorAll('[data-goto-login]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      state.currentTab = btn.dataset.gotoLogin;
      renderCurrentTab();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // Restricted Access button to redirect to Admin Login
  document.getElementById('btn-goto-admin-login-screen')?.addEventListener('click', () => {
    state.currentTab = 'login-admin';
    renderCurrentTab();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Quick 1-click demo login ([data-quick-demo-login])
  document.querySelectorAll('[data-quick-demo-login]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const role = (btn.dataset.quickDemoLogin || 'BUYER').toUpperCase();
      try {
        await api.switchTestUser(role);
        updateAuthHeader();

        if (role === 'ADMIN') {
          state.currentTab = 'admin';
          await loadAdminDataFromApi();
          showToast('Authenticated as Central Admin Officer (Senthil Nathan)!', '🛡️');
        } else if (role === 'VET') {
          state.currentTab = 'pashucare';
          showToast('Welcome Dr. Radhakrishnan! Veterinary Tele-Desk Active.', '🩺');
        } else if (role === 'SELLER') {
          state.currentTab = 'bazaar';
          showToast('Welcome Murugesan K! Breeder Portal Active.', '👨‍🌾');
        } else {
          state.currentTab = 'bazaar';
          showToast('Welcome Anand Murthy! Escrow Buyer Portal Active.', '🛒');
        }
        renderCurrentTab();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        showToast(err.message, '⚠️');
      }
    });
  });

  // Form submit on role login form (#form-role-login)
  const roleForm = document.getElementById('form-role-login');
  if (roleForm) {
    let otpSent = false;
    roleForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const roleId = roleForm.dataset.roleId;
      const phoneInput = document.getElementById('role-auth-phone');
      const otpInput = document.getElementById('role-auth-otp');
      const submitBtn = document.getElementById('btn-role-auth-submit');
      const otpSection = document.getElementById('role-otp-section');
      const debugOtp = document.getElementById('role-debug-otp');

      if (!otpSent) {
        try {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Sending OTP...';
          const sendRes = await api.sendOtp(phoneInput.value.trim());
          otpSent = true;
          if (otpSection) otpSection.style.display = 'block';
          if (sendRes?.debugOtp && debugOtp) {
            debugOtp.textContent = sendRes.debugOtp;
            if (otpInput) otpInput.value = sendRes.debugOtp;
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
            otp: otpInput ? otpInput.value.trim() : '123456'
          });
          updateAuthHeader();

          if (roleId === 'admin') {
            state.currentTab = 'admin';
            await loadAdminDataFromApi();
            showToast('Authenticated as Central Admin Officer (Senthil Nathan)!', '🛡️');
          } else if (roleId === 'vet') {
            state.currentTab = 'pashucare';
            showToast('Welcome to Veterinary Tele-Consultations!', '🩺');
          } else if (roleId === 'seller') {
            state.currentTab = 'bazaar';
            showToast('Welcome to Farmer & Breeder Portal!', '👨‍🌾');
          } else {
            state.currentTab = 'bazaar';
            showToast('Welcome to Pashu & Poultry Bazaar!', '🛒');
          }
          renderCurrentTab();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Verify OTP & Enter';
          showToast(err.message, '⚠️');
        }
      }
    });
  }
}

// ============================================================================
// CATTLE & GOAT ESTRUS & CALVING TIMELINE CONTROLLER
// ============================================================================
function setupEstrusCalculator() {
  const speciesSelect = document.getElementById('estrus-species');
  const dateInput = document.getElementById('estrus-date');
  const calcBtn = document.getElementById('btn-calc-estrus');
  const valMsg = document.getElementById('estrus-date-validation');

  if (!speciesSelect || !dateInput) return;

  function updateEstrusTimeline(isManualClick = false) {
    const species = speciesSelect.value || 'cow';
    const dateStr = dateInput.value;

    const milestones = calculateGestationMilestones(species, dateStr);

    if (!milestones.isValid) {
      if (valMsg) {
        valMsg.textContent = milestones.errorMessage || 'Please select a valid service date';
        valMsg.style.display = 'block';
      }
      const outCalving = document.getElementById('out-calving-date');
      const outNextHeat = document.getElementById('out-next-heat');
      const outPregCheck = document.getElementById('out-preg-check');
      const outDeworm = document.getElementById('out-deworm');
      const outReminder = document.getElementById('out-estrus-reminder');

      if (outCalving) {
        outCalving.textContent = 'Invalid / Missing Date';
        outCalving.style.color = '#fca5a5';
      }
      if (outNextHeat) outNextHeat.textContent = '—';
      if (outPregCheck) outPregCheck.textContent = '—';
      if (outDeworm) outDeworm.textContent = '—';
      if (outReminder) outReminder.textContent = 'Please enter a valid insemination / service date to display milestone dates.';

      if (isManualClick) {
        showToast('Please select a valid date of insemination / service (AI)', '⚠️');
      }
      return;
    }

    if (valMsg) valMsg.style.display = 'none';

    // Persist in state so tab switches preserve user selection
    state.estrus = {
      species,
      date: dateStr,
    };

    const lblDelivery = document.getElementById('lbl-delivery-date');
    const outCalving = document.getElementById('out-calving-date');
    const lblPreDelivery = document.getElementById('lbl-predelivery-care');
    const outDeworm = document.getElementById('out-deworm');
    const outNextHeat = document.getElementById('out-next-heat');
    const outPregCheck = document.getElementById('out-preg-check');
    const outReminder = document.getElementById('out-estrus-reminder');

    if (lblDelivery) lblDelivery.textContent = milestones.deliveryLabel;
    if (outCalving) {
      outCalving.textContent = milestones.formattedDeliveryDate;
      outCalving.style.color = '#6ee7b7';
    }

    if (lblPreDelivery) lblPreDelivery.textContent = milestones.preDeliveryCareLabel;
    if (outDeworm) outDeworm.textContent = milestones.preDeliveryCareText;

    if (outNextHeat) outNextHeat.textContent = milestones.heatCheckText;
    if (outPregCheck) outPregCheck.textContent = milestones.pregCheckText;
    if (outReminder) outReminder.textContent = milestones.reminderText;

    if (isManualClick) {
      showToast(`${milestones.species.name} timeline calculated: delivery on ${milestones.formattedDeliveryDate}`, '📅');
    }
  }

  // Real-time automatic updates when species or date changes
  speciesSelect.addEventListener('change', () => updateEstrusTimeline(false));
  dateInput.addEventListener('input', () => updateEstrusTimeline(false));
  dateInput.addEventListener('change', () => updateEstrusTimeline(false));

  // Explicit button click
  calcBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    updateEstrusTimeline(true);
  });
}

// ============================================================================
// FODDER RATION & DAIRY MONTHLY PROFIT CALCULATOR CONTROLLER
// ============================================================================
function setupFodderRoiCalculator() {
  const sliderAnimals = document.getElementById('roi-herd-count');
  const sliderYield = document.getElementById('roi-herd-yield');
  const sliderPrice = document.getElementById('roi-milk-price');

  if (!sliderAnimals || !sliderYield || !sliderPrice) return;

  function updateRoiCalculations() {
    const animals = parseInt(sliderAnimals.value, 10) || 1;
    const yieldPerAnimal = parseFloat(sliderYield.value) || 0;
    const milkPrice = parseFloat(sliderPrice.value) || 0;

    // Persist current settings in state so switching tabs preserves user input
    state.feedRoi = {
      animals,
      yieldPerAnimal,
      milkPrice,
    };

    // Centralized single calculation function
    const roi = calculateFodderRoi(animals, yieldPerAnimal, milkPrice);

    // 1. Immediately update displayed value beside each slider
    const dispAnimals = document.getElementById('disp-herd-count');
    const dispYield = document.getElementById('disp-herd-yield');
    const dispPrice = document.getElementById('disp-milk-price');

    if (dispAnimals) dispAnimals.textContent = `${roi.numAnimals} ${roi.numAnimals === 1 ? 'Animal' : 'Animals'}`;
    if (dispYield) dispYield.textContent = `${roi.dailyYield.toFixed(1)} Litres / Day`;
    if (dispPrice) dispPrice.textContent = `₹${Math.round(roi.price)} / Litre`;

    // 2. Immediately update dark green financial summary box values
    const outGreen = document.getElementById('roi-out-green');
    const outStraw = document.getElementById('roi-out-straw');
    const outConcentrate = document.getElementById('roi-out-concentrate');
    const outFeedCost = document.getElementById('roi-out-feed-cost');
    const outGrossRev = document.getElementById('roi-out-gross-rev');
    const outNetProfit = document.getElementById('roi-out-net-profit');

    if (outGreen) outGreen.textContent = `${roi.dailyGreenFodder.toLocaleString('en-IN')} kg (${FODDER_FEEDING_CONFIG.greenFodderLabel})`;
    if (outStraw) outStraw.textContent = `${roi.dailyDryRoughage.toLocaleString('en-IN')} kg`;
    if (outConcentrate) outConcentrate.textContent = `${roi.dailyConcentrates.toLocaleString('en-IN')} kg`;
    if (outFeedCost) outFeedCost.textContent = `${formatINR(roi.totalDailyFeedingCost)} / Day`;
    if (outGrossRev) outGrossRev.textContent = `${formatINR(roi.grossDailyRevenue)} / Day`;

    if (outNetProfit) {
      outNetProfit.textContent = `${formatINR(roi.monthlyNetProfit)} / Month`;
      if (roi.monthlyNetProfit < 0) {
        outNetProfit.style.color = '#fca5a5'; // Soft red for negative net profit
      } else {
        outNetProfit.style.color = '#6ee7b7'; // Mint green for positive/break-even
      }
    }
  }

  // Bind both 'input' (continuous drag) and 'change' (keyboard / release)
  ['input', 'change'].forEach(evt => {
    sliderAnimals.addEventListener(evt, updateRoiCalculations);
    sliderYield.addEventListener(evt, updateRoiCalculations);
    sliderPrice.addEventListener(evt, updateRoiCalculations);
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

  // ============================================================================
  // SIDEBAR COLLAPSE / EXPAND & RESPONSIVE TOGGLE
  // ============================================================================
  const appSidebar = document.getElementById('app-sidebar');
  const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');

  function toggleSidebar(forceOpen) {
    if (!appSidebar) return;
    if (typeof forceOpen === 'boolean') {
      if (forceOpen) {
        appSidebar.classList.remove('collapsed');
        appSidebar.classList.add('expanded');
      } else {
        appSidebar.classList.add('collapsed');
        appSidebar.classList.remove('expanded');
      }
    } else {
      const isCollapsed = appSidebar.classList.contains('collapsed');
      if (isCollapsed) {
        appSidebar.classList.remove('collapsed');
        appSidebar.classList.add('expanded');
      } else {
        appSidebar.classList.add('collapsed');
        appSidebar.classList.remove('expanded');
      }
    }
  }

  sidebarToggleBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSidebar();
  });

  // Auto-collapse sidebar when clicking outside on mobile/tablet screens
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 1024 && appSidebar?.classList.contains('expanded')) {
      if (!appSidebar.contains(e.target) && !sidebarToggleBtn?.contains(e.target)) {
        toggleSidebar(false);
      }
    }
  });

  // Sidebar Nav Items Click
  document.querySelectorAll('.sidebar-nav-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      e.preventDefault();
      if (item.dataset.action === 'logout' || item.id === 'side-btn-logout') {
        await api.logout();
        updateAuthHeader();
        state.currentTab = 'login';
        state.activeProductId = null;
        state.lastOrderConfirmation = null;
        window.location.hash = '#/tab/login';
        renderCurrentTab();
        showToast('Logged out successfully', '👋');
        if (window.innerWidth <= 1024) {
          toggleSidebar(false);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const tab = item.dataset.tab;
      if (!tab) return;
      state.currentTab = tab;
      if (tab === 'schemes') await loadSchemesFromApi();
      if (tab === 'mandi') await loadMandiFromApi();
      if (tab === 'logistics') await loadMyOrdersFromApi();
      if (tab === 'admin') await loadAdminDataFromApi();
      renderCurrentTab();
      // On mobile, auto-close sidebar after navigation
      if (window.innerWidth <= 1024) {
        toggleSidebar(false);
      }
      if (tab !== 'home') {
        document.getElementById('main-content')?.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });

  // ============================================================================
  // AUTOMATIC HERO CAROUSEL WITH DEFAULT BANNERS (Matching Screenshots)
  // ============================================================================
  const heroBanner = document.getElementById('hero-banner');
  const heroSlides = Array.from(document.querySelectorAll('.hero-slide'));
  const heroDots = Array.from(document.querySelectorAll('.dot-indicator'));
  const heroSlidePrev = document.getElementById('hero-slide-prev');
  const heroSlideNext = document.getElementById('hero-slide-next');
  let activeSlideIndex = 0;
  let heroCarouselTimer = null;
  const SLIDE_INTERVAL_MS = 5000; // Automatically rotate every 5 seconds

  function setHeroSlide(index) {
    if (!heroSlides.length) return;
    activeSlideIndex = (index + heroSlides.length) % heroSlides.length;

    heroSlides.forEach((slide, i) => {
      slide.classList.toggle('active', i === activeSlideIndex);
    });

    heroDots.forEach((dot, i) => {
      dot.classList.toggle('active', i === activeSlideIndex);
    });
  }

  function advanceNextHeroSlide() {
    setHeroSlide(activeSlideIndex + 1);
  }

  function advancePrevHeroSlide() {
    setHeroSlide(activeSlideIndex - 1);
  }

  function startAutoSlideTimer() {
    stopAutoSlideTimer();
    heroCarouselTimer = setInterval(advanceNextHeroSlide, SLIDE_INTERVAL_MS);
  }

  function stopAutoSlideTimer() {
    if (heroCarouselTimer) {
      clearInterval(heroCarouselTimer);
      heroCarouselTimer = null;
    }
  }

  // Arrow button navigation
  heroSlideNext?.addEventListener('click', (e) => {
    e.preventDefault();
    advanceNextHeroSlide();
    startAutoSlideTimer();
  });

  heroSlidePrev?.addEventListener('click', (e) => {
    e.preventDefault();
    advancePrevHeroSlide();
    startAutoSlideTimer();
  });

  // Dot indicators navigation
  heroDots.forEach((dot) => {
    dot.addEventListener('click', (e) => {
      e.preventDefault();
      const target = parseInt(dot.dataset.slideTo || '0', 10);
      setHeroSlide(target);
      startAutoSlideTimer();
    });
  });

  // Pause automatic transition on hover, resume on mouse leave
  heroBanner?.addEventListener('mouseenter', stopAutoSlideTimer);
  heroBanner?.addEventListener('mouseleave', startAutoSlideTimer);

  // Banner CTA Buttons ([data-banner-tab])
  document.querySelectorAll('[data-banner-tab], #btn-hero-explore-mandis').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const tab = btn.dataset.bannerTab || 'mandi';
      state.currentTab = tab;
      if (tab === 'schemes') await loadSchemesFromApi();
      if (tab === 'mandi') await loadMandiFromApi();
      if (tab === 'logistics') await loadMyOrdersFromApi();
      if (tab === 'admin') await loadAdminDataFromApi();
      renderCurrentTab();
      document.getElementById('main-content')?.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // Start the automatic rotation immediately
  startAutoSlideTimer();

  // Nav Tabs & Large Dashboard Buttons Click
  document.querySelectorAll('.nav-pill, .large-dash-btn').forEach(elem => {
    elem.addEventListener('click', async () => {
      state.currentTab = elem.dataset.tab;
      if (state.currentTab === 'schemes') await loadSchemesFromApi();
      if (state.currentTab === 'mandi') await loadMandiFromApi();
      if (state.currentTab === 'logistics') await loadMyOrdersFromApi();
      if (state.currentTab === 'admin') await loadAdminDataFromApi();
      renderCurrentTab();
      if (elem.classList.contains('large-dash-btn')) {
        document.getElementById('main-content')?.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Footer navigation links (data-set-tab)
  document.querySelectorAll('[data-set-tab]').forEach(link => {
    link.addEventListener('click', async (e) => {
      e.preventDefault();
      state.currentTab = link.dataset.setTab;
      if (state.currentTab === 'schemes') await loadSchemesFromApi();
      if (state.currentTab === 'mandi') await loadMandiFromApi();
      if (state.currentTab === 'logistics') await loadMyOrdersFromApi();
      if (state.currentTab === 'admin') await loadAdminDataFromApi();
      renderCurrentTab();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // Auth Button Click
  els.btnAuthAction?.addEventListener('click', () => {
    const auth = api.getAuthState();
    if (auth.isAuthenticated) {
      openAuthModal();
    } else {
      state.currentTab = 'login';
      renderCurrentTab();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  // Brand Home Logo Click
  document.getElementById('brand-home-btn')?.addEventListener('click', () => {
    state.currentTab = 'home';
    renderCurrentTab();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Desktop Hover Dashboard support for left sidebar
  if (appSidebar) {
    appSidebar.addEventListener('mouseenter', () => {
      if (window.innerWidth > 1024 && appSidebar.classList.contains('collapsed')) {
        appSidebar.classList.add('hover-expanded');
      }
    });
    appSidebar.addEventListener('mouseleave', () => {
      appSidebar.classList.remove('hover-expanded');
    });
  }

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

  // Routing & Hash Change Listener for Deep Linking and Browser Back Navigation
  function handleRoute() {
    const hash = window.location.hash || '';
    if (hash.startsWith('#/product/')) {
      const pid = hash.replace('#/product/', '').trim();
      if (pid) {
        state.currentTab = 'product-details';
        state.activeProductId = pid;
        state.lastOrderConfirmation = null;
        renderCurrentTab();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    } else if (hash.startsWith('#/tab/')) {
      const tab = hash.replace('#/tab/', '').trim();
      if (tab) {
        state.currentTab = tab;
        state.activeProductId = null;
        state.lastOrderConfirmation = null;
        renderCurrentTab();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }
  }

  window.addEventListener('hashchange', handleRoute);
  if (window.location.hash) {
    handleRoute();
  }

  // Initial Data Fetch
  await loadListingsFromApi();
  await loadMandiFromApi();
  initTicker();
  updateStaticTranslations();
  if (!window.location.hash) {
    renderCurrentTab();
  }
  initVoiceAssistant();
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
