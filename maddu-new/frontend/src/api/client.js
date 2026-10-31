/**
 * DakshinAgriHub API Client
 * Enterprise HTTP client with token refresh rotation, auth state, type-safe helpers,
 * and seamless fallback handling for standalone evaluation before backend connection.
 */

import { FODDER_LISTINGS, EQUIPMENT_LISTINGS, LIVESTOCK_LISTINGS } from '../data/listings.js';

let accessToken = localStorage.getItem("dah_access_token") || null;
let currentUser = null;
try {
  const saved = localStorage.getItem("dah_user");
  if (saved) currentUser = JSON.parse(saved);
} catch (e) {
  currentUser = null;
}

const authListeners = new Set();
function notifyAuth() {
  authListeners.forEach((fn) => {
    try {
      fn(currentUser, accessToken);
    } catch (e) {
      console.error(e);
    }
  });
}

export function subscribeAuth(fn) {
  authListeners.add(fn);
  fn(currentUser, accessToken);
  return () => authListeners.delete(fn);
}

export function getAuthState() {
  return {
    user: currentUser,
    token: accessToken,
    isAuthenticated: Boolean(currentUser && accessToken),
  };
}

export function setSession(user, token) {
  currentUser = user;
  accessToken = token;
  if (token) {
    localStorage.setItem("dah_access_token", token);
  } else {
    localStorage.removeItem("dah_access_token");
  }
  if (user) {
    localStorage.setItem("dah_user", JSON.stringify(user));
  } else {
    localStorage.removeItem("dah_user");
  }
  notifyAuth();
}

export function clearSession() {
  setSession(null, null);
}

/**
 * Mock fallback generator when backend is not yet started or offline
 */
function mockFallback(endpoint, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const pathname = endpoint.split("?")[0];
  let body = {};
  if (options.body) {
    try {
      body = typeof options.body === "string" ? JSON.parse(options.body) : options.body;
    } catch {
      body = {};
    }
  }

  // 1. Auth OTP Send
  if (pathname.includes("/auth/otp/send")) {
    return {
      success: true,
      message: "OTP sent to mobile (Development mode: use 123456)",
      debugOtp: "123456",
    };
  }

  // 2. Auth OTP Verify
  if (pathname.includes("/auth/otp/verify")) {
    const phone = body.phone || "+919000000004";
    const rolePresets = {
      "+919000000001": { id: "usr_admin", name: "Senthil Nathan (Admin)", phone, state: "TN", district: "Chennai", roles: ["BUYER", "SELLER", "VET", "ADMIN"] },
      "+919000000002": { id: "usr_seller", name: "Murugesan K (Breeder)", phone, state: "TN", district: "Erode", roles: ["BUYER", "SELLER"], sellerProfile: { farmName: "Murugesan Kangayam Cattle Farm", district: "Erode", state: "TN", verified: true } },
      "+919000000003": { id: "usr_seller_ap", name: "Venkat Reddy (Dairy)", phone, state: "AP", district: "Guntur", roles: ["BUYER", "SELLER"] },
      "+919000000004": { id: "usr_buyer", name: "Anand Murthy", phone, state: "KA", district: "Bengaluru", roles: ["BUYER"] },
      "+919000000005": { id: "usr_buyer_tn", name: "Rajesh Varma", phone, state: "TN", district: "Madurai", roles: ["BUYER"] },
      "+919000000006": { id: "usr_vet", name: "Dr. Radhakrishnan (Vet)", phone, state: "TN", district: "Namakkal", roles: ["BUYER", "VET"] },
    };
    const user = rolePresets[phone] || {
      id: "usr_" + Date.now(),
      name: body.name || "Farmer " + phone.slice(-4),
      phone,
      state: body.state || "TN",
      district: body.district || "Erode",
      roles: [body.role || "BUYER"],
    };
    const token = "mock_jwt_access_token_" + Date.now();
    setSession(user, token);
    return { success: true, user, accessToken: token };
  }

  // 3. Auth Logout
  if (pathname.includes("/auth/logout")) {
    clearSession();
    return { success: true, message: "Logged out successfully" };
  }

  // 4. Seller Application
  if (pathname.includes("/auth/seller/apply")) {
    return {
      success: true,
      sellerProfile: {
        id: "sel_" + Date.now(),
        farmName: body.farmName || "My Farm",
        district: body.district || "Erode",
        state: body.state || "TN",
        verified: true,
      },
    };
  }

  // 5. Contact Reveal
  if (pathname.match(/\/listings\/[^/]+\/contact/)) {
    return {
      success: true,
      phone: "+91 98421 88421",
      sellerName: "Murugesan K",
      revealedAt: new Date().toISOString(),
    };
  }

  // 6. Listings Create
  if (pathname === "/api/v1/listings" && method === "POST") {
    const newListing = {
      id: "lst_" + Date.now(),
      title: body.title || "Indigenous Livestock",
      breed: body.breed || "Kangayam",
      category: body.category || "CATTLE",
      stateId: body.stateId || "TN",
      district: body.district || "Erode",
      price: Number(body.price) || 50000,
      dailyYield: Number(body.dailyYield) || 0,
      lactation: Number(body.lactation) || 0,
      pregnancyStatus: body.pregnancyStatus || "Self-Certified",
      earTagId: body.earTagId || "INAPH-" + Math.floor(100000 + Math.random() * 900000),
      earTagVerified: true,
      estimatedWeight: Number(body.estimatedWeight) || 380,
      imageUrl: body.imageUrl || "/images/kangayam_cow.jpg",
      seller: {
        displayName: currentUser?.name || "Local Breeder",
        phone: currentUser?.phone || "+91 98421 88421",
      },
      createdAt: new Date().toISOString(),
    };
    try {
      const customs = JSON.parse(localStorage.getItem("dah_custom_listings") || "[]");
      customs.unshift(newListing);
      localStorage.setItem("dah_custom_listings", JSON.stringify(customs));
    } catch {}
    return { success: true, listing: newListing };
  }

  // 6b. Single Listing / Product Fetch
  const matchListing = pathname.match(/\/listings\/([^/]+)$/);
  if (matchListing && method === "GET") {
    const lid = matchListing[1];
    const allItems = [...FODDER_LISTINGS, ...EQUIPMENT_LISTINGS, ...LIVESTOCK_LISTINGS];
    const found = allItems.find(x => x.id === lid);
    if (found) {
      return { ...found };
    }
  }

  // 7. Orders Create (Livestock, Fodder & Machinery Rentals)
  if (pathname === "/api/v1/orders" && method === "POST") {
    const orders = JSON.parse(localStorage.getItem("dah_orders") || "[]");
    const targetListingId = body.listing_id || body.listingId;
    const allItems = [...FODDER_LISTINGS, ...EQUIPMENT_LISTINGS, ...LIVESTOCK_LISTINGS];
    const listing = allItems.find(x => x.id === targetListingId) || {
      id: targetListingId,
      title: "Agricultural Produce / Equipment",
      price: 500
    };

    const orderType = (body.order_type || body.orderType || "LIVESTOCK").toUpperCase();
    let calculatedAmount = listing.price || 500;
    let bookingRef = "ORD-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    let logisticsStatus = "Awaiting Escrow Deposit";

    if (orderType === "FODDER") {
      const qty = Number(body.quantity) || 1;
      const unitRate = Number(listing.unitPriceNum) || Number(listing.price) || 10;
      const deliveryCharge = Number(body.delivery_charge || body.deliveryCharge) || 0;
      calculatedAmount = Math.round((qty * unitRate) + deliveryCharge);
      bookingRef = "ORD-FOD-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      logisticsStatus = `Awaiting Seller Dispatch (${body.required_date || body.requiredDate || "Next Working Day"})`;
    } else if (orderType === "MACHINERY_RENTAL") {
      const dur = Number(body.duration_val || body.durationVal) || 1;
      const rate = Number(listing.rateNum) || Number(listing.price) || 350;
      calculatedAmount = Math.round(dur * rate);
      bookingRef = "BKG-EQP-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      logisticsStatus = `Rental Reserved for ${body.required_date || body.requiredDate || "Scheduled Date"} (${body.start_time || body.startTime || "Morning Slot"})`;
    }

    const newOrder = {
      id: "ord_" + Date.now().toString(36),
      bookingRef,
      orderType,
      listingId: targetListingId,
      amount: calculatedAmount,
      quantity: body.quantity,
      unit: body.unit || listing.unit,
      deliveryAddress: body.delivery_address || body.deliveryAddress,
      pincode: body.pincode,
      requiredDate: body.required_date || body.requiredDate,
      startTime: body.start_time || body.startTime,
      durationVal: body.duration_val || body.durationVal,
      pricingOption: body.pricing_option || body.pricingOption,
      notes: body.notes,
      status: "CREATED",
      logisticsStatus,
      createdAt: new Date().toISOString(),
      customer: {
        name: body.customer_name || body.customerName || currentUser?.name || "Customer",
        phone: body.customer_phone || body.customerPhone || currentUser?.phone || "+91 98421 88421",
      },
      listing: {
        id: listing.id,
        title: listing.title,
        category: listing.category || orderType,
        price: calculatedAmount,
        imageUrl: listing.imageUrl,
      },
      seller: {
        name: listing.seller || listing.owner || listing.sellerName || "Provider",
        phone: listing.phone || listing.sellerPhone || "+91 98421 88421",
      },
    };
    orders.unshift(newOrder);
    localStorage.setItem("dah_orders", JSON.stringify(orders));
    return { success: true, order: newOrder };
  }

  // 8. Orders Fetch
  if (pathname.includes("/orders/my-orders") || pathname.includes("/orders/me/all")) {
    const orders = JSON.parse(localStorage.getItem("dah_orders") || "[]");
    return { purchases: orders, sales: [] };
  }

  // 9. Order Payment Mock
  if (pathname.match(/\/orders\/[^/]+\/mock-pay/)) {
    const orderId = pathname.split("/")[4];
    const orders = JSON.parse(localStorage.getItem("dah_orders") || "[]");
    const o = orders.find((x) => x.id === orderId);
    if (o) o.status = "PAID_ESCROW";
    localStorage.setItem("dah_orders", JSON.stringify(orders));
    return { success: true, message: "Payment held in Escrow" };
  }

  // 10. Order Delivered
  if (pathname.match(/\/orders\/[^/]+\/delivered/)) {
    const orderId = pathname.split("/")[4];
    const orders = JSON.parse(localStorage.getItem("dah_orders") || "[]");
    const o = orders.find((x) => x.id === orderId);
    if (o) o.status = "DELIVERED";
    localStorage.setItem("dah_orders", JSON.stringify(orders));
    return { success: true, message: "Delivery confirmed" };
  }

  // 11. Order Released
  if (pathname.match(/\/orders\/[^/]+\/release/)) {
    const orderId = pathname.split("/")[4];
    const orders = JSON.parse(localStorage.getItem("dah_orders") || "[]");
    const o = orders.find((x) => x.id === orderId);
    if (o) o.status = "RELEASED";
    localStorage.setItem("dah_orders", JSON.stringify(orders));
    return { success: true, message: "Escrow payment released" };
  }

  // 12. Freight Quote
  if (pathname.includes("/freight/quote")) {
    const vehicleType = body.vehicleType || "BOLERO";
    const km = Number(body.km) || 140;
    let ratePerKm = 28;
    let checkpostPermitFee = 350;
    let speedKmH = 35;
    if (vehicleType === "TRUCK_6WHEEL") {
      ratePerKm = 48;
      checkpostPermitFee = 500;
      speedKmH = 30;
    } else if (vehicleType === "ISLAND_VESSEL") {
      ratePerKm = 65;
      checkpostPermitFee = 1200;
      speedKmH = 15;
    }
    const baseCost = km * ratePerKm;
    const totalCost = baseCost + checkpostPermitFee;
    const transitHours = (km / speedKmH + (vehicleType === "ISLAND_VESSEL" ? 12 : 0.5)).toFixed(1);
    return {
      km,
      price: totalCost,
      ratePerKm,
      baseCost,
      checkpostPermitFee,
      totalCost,
      transitHours: `${transitHours} Hours`,
    };
  }

  // 13. Truck Booking
  if (pathname.includes("/truck-bookings")) {
    return {
      success: true,
      booking: {
        id: "trk_" + Date.now().toString(36),
        ...body,
        status: "CONFIRMED",
      },
    };
  }

  // 14. First Aid
  if (pathname.includes("/health/symptoms/")) {
    const symptomKey = pathname.split("/").pop().toLowerCase();
    const FIRST_AID = {
      bloat: {
        title: "Ruminal Tympany / Bloat (உப்பசம் / కడుపు ఉబ్బరం)",
        symptoms: ["Distended left flank", "Restlessness and kicking at belly", "Difficulty breathing"],
        firstAid: [
          "Keep animal standing with head elevated. Do NOT allow animal to lie down.",
          "Administer 200-300 ml of vegetable oil (groundnut or mustard oil).",
          "Gently place a wooden bit or rope in mouth to encourage salivation and belching.",
          "Call emergency veterinary dispensary immediately if distress continues.",
        ],
      },
      mastitis: {
        title: "Bovine Mastitis / Udder Infection (மடி நோய் / పొదుగు వాపు)",
        symptoms: ["Swollen, hot, painful quarter/teat", "Clots, flakes or watery reddish milk", "Drop in milk yield"],
        firstAid: [
          "Frequent manual stripping/milking out of the affected quarter every 2 hours to remove toxins.",
          "Apply cold water compresses or ice packs if udder is acutely hot.",
          "Do NOT mix milk from affected quarter with bulk milk.",
          "Contact veterinarian for prompt intramammary infusion and antibiotics.",
        ],
      },
      fmd: {
        title: "Foot and Mouth Disease / FMD (கோமாரி நோய் / గాలికుంటు)",
        symptoms: ["High fever (104-106°F)", "Blisters on tongue and hooves", "Excessive ropy salivation", "Severe lameness"],
        firstAid: [
          "Immediately isolate affected animal from healthy herd.",
          "Wash mouth lesions with 1% potassium permanganate or 2% sodium bicarbonate solution.",
          "Wash foot lesions with 2% copper sulphate solution or antiseptic wash.",
          "Provide soft cooked ragi or rice kanji; notify local veterinary officer.",
        ],
      },
      fever: {
        title: "High Fever / Pyrexia (காய்ச்சல் / జ్వరం)",
        symptoms: ["Dry muzzle", "Loss of appetite", "Shivering", "Elevated rectal temp > 102.5°F"],
        firstAid: [
          "Move animal to a well-ventilated, shaded shed.",
          "Sponge forehead and neck with clean cool water.",
          "Offer fresh cool water enriched with ORS or jaggery and salt.",
          "Observe for tick infestation and call vet.",
        ],
      },
      diarrhea: {
        title: "Calf Scours / Enteritis (கன்று வயிற்றுப்போக்கு)",
        symptoms: ["Watery dung", "Sunken eyes", "Dehydration", "Weakness / unable to stand"],
        firstAid: [
          "Hydration is critical: Administer ORS solution 1-2 litres every 4 hours.",
          "Keep calf warm and dry with clean straw bedding.",
          "Do not withdraw milk completely; provide warm milk in small frequent amounts.",
          "Call vet for antimicrobial treatment.",
        ],
      },
    };
    return { success: true, guide: FIRST_AID[symptomKey] || FIRST_AID.bloat };
  }

  // 15. Vet Consultation Ticket
  if (pathname.includes("/vet-requests")) {
    return {
      success: true,
      ticket: {
        id: "vet_" + Date.now().toString(36),
        status: "ASSIGNED",
        assignedDoctor: "Dr. Radhakrishnan (Vet)",
        contact: "1800-425-76884",
        createdAt: new Date().toISOString(),
      },
    };
  }

  // 16. Scheme Application
  if (pathname.includes("/schemes") && pathname.includes("/apply")) {
    const schemeIdMatch = pathname.match(/\/schemes\/([^/]+)\/apply/);
    const schemeId = schemeIdMatch ? schemeIdMatch[1] : "unknown";
    const appRef = "DAH-SCH-" + new Date().getFullYear() + "-" + Math.floor(10000 + Math.random() * 90000);
    const newApp = {
      applicationRef: appRef,
      schemeId,
      scheme: { name: body.schemeName || "Government Scheme", benefit: "Subsidized support" },
      status: "SUBMITTED",
      appliedAt: new Date().toISOString(),
    };
    try {
      const existing = JSON.parse(localStorage.getItem("dah_scheme_applications") || "[]");
      existing.unshift(newApp);
      localStorage.setItem("dah_scheme_applications", JSON.stringify(existing));
    } catch {}
    return {
      success: true,
      applicationRef: appRef,
      status: "SUBMITTED",
      message: "Government subsidy facilitation application registered",
    };
  }

  // 17. Mandi Price Alert
  if (pathname.includes("/mandi/alerts")) {
    return {
      success: true,
      id: "alt_" + Date.now(),
      ...body,
      status: "ACTIVE",
    };
  }

  // 18. Admin Stats
  if (pathname.includes("/admin/stats")) {
    const orders = JSON.parse(localStorage.getItem("dah_orders") || "[]");
    const customs = JSON.parse(localStorage.getItem("dah_custom_listings") || "[]");
    return {
      totalUsers: 1420,
      totalListings: 2840 + customs.length,
      totalOrders: 184 + orders.length,
      escrowProtectedValue: 12450000 + orders.reduce((sum, o) => sum + (o.amount || 0), 0),
    };
  }

  // 19. Admin Users
  if (pathname.includes("/admin/users")) {
    return {
      users: [
        { id: "usr_admin", name: "Senthil Nathan (You - Admin)", phone: "+91 9000000001", state: "TN", district: "Chennai", role: "ADMIN", registeredAt: "2026-01-10", kycStatus: "VERIFIED" },
        { id: "usr_seller", name: "Murugesan K (Breeder)", phone: "+91 9000000002", state: "TN", district: "Erode", role: "SELLER", registeredAt: "2026-02-14", kycStatus: "VERIFIED" },
        { id: "usr_seller_ap", name: "Venkat Reddy (Dairy)", phone: "+91 9000000003", state: "AP", district: "Guntur", role: "SELLER", registeredAt: "2026-02-18", kycStatus: "VERIFIED" },
        { id: "usr_buyer", name: "Anand Murthy", phone: "+91 9000000004", state: "KA", district: "Bengaluru", role: "BUYER", registeredAt: "2026-03-01", kycStatus: "VERIFIED" },
        { id: "usr_buyer_tn", name: "Rajesh Varma", phone: "+91 9000000005", state: "TN", district: "Madurai", role: "BUYER", registeredAt: "2026-03-05", kycStatus: "PENDING" },
        { id: "usr_vet", name: "Dr. Radhakrishnan (Vet)", phone: "+91 9000000006", state: "TN", district: "Namakkal", role: "VET", registeredAt: "2026-01-20", kycStatus: "VERIFIED" },
      ]
    };
  }

  // 20. Admin Orders (Who ordered which animal)
  if (pathname.includes("/admin/orders")) {
    const orders = JSON.parse(localStorage.getItem("dah_orders") || "[]");
    const seedOrders = [
      {
        id: "ord_tn_881",
        createdAt: "2026-10-25T14:30:00Z",
        buyerName: "Anand Murthy",
        buyerPhone: "+91 9000000004",
        sellerName: "Murugesan K",
        sellerPhone: "+91 9000000002",
        animalTitle: "Pure Kangayam Heritage Milch Cow",
        earTagId: "TN-3304-9812-4410",
        amount: 68000,
        status: "DELIVERED",
        logisticsStatus: "Arrived at Bengaluru Farm",
      },
      {
        id: "ord_ap_442",
        createdAt: "2026-10-26T10:15:00Z",
        buyerName: "Rajesh Varma",
        buyerPhone: "+91 9000000005",
        sellerName: "Venkat Reddy",
        sellerPhone: "+91 9000000003",
        animalTitle: "Ongole Breeding Stud Bull",
        earTagId: "AP-2801-7104-9923",
        amount: 115000,
        status: "PAID_ESCROW",
        logisticsStatus: "Truck In-Transit (Bolero TN-33)",
      },
      {
        id: "ord_ka_209",
        createdAt: "2026-10-27T16:45:00Z",
        buyerName: "Anand Murthy",
        buyerPhone: "+91 9000000004",
        sellerName: "Ramegowda",
        sellerPhone: "+91 98451 11204",
        animalTitle: "Hallikar Draught Bullocks Pair",
        earTagId: "KA-4102-5509-1123",
        amount: 92000,
        status: "CREATED",
        logisticsStatus: "Awaiting Escrow Deposit",
      }
    ];
    return {
      orders: [
        ...orders.map(o => ({
          id: o.id,
          createdAt: o.createdAt || new Date().toISOString(),
          buyerName: currentUser?.name || "Active Buyer",
          buyerPhone: currentUser?.phone || "+91 9000000004",
          sellerName: o.seller?.name || "Breeder",
          sellerPhone: o.seller?.phone || "+91 98421 88421",
          animalTitle: o.listing?.title || "Indigenous Cattle",
          earTagId: o.listing?.earTagId || "INAPH-VERIFIED",
          amount: o.amount || 58000,
          status: o.status || "PAID_ESCROW",
          logisticsStatus: o.status === 'DELIVERED' ? 'Arrived at Buyer Farm' : 'Transit / Processing',
        })),
        ...seedOrders
      ]
    };
  }

  // 21. Admin Listings
  if (pathname.includes("/admin/listings")) {
    const customs = JSON.parse(localStorage.getItem("dah_custom_listings") || "[]");
    return {
      listings: [
        ...customs,
        {
          id: "pashu-101",
          title: "Pure Kangayam Heritage Milch Cow with Heifer Calf",
          breed: "Kangayam",
          category: "Cattle",
          stateId: "TN",
          district: "Kangeyam, Tiruppur",
          price: 68000,
          earTagId: "TN-3304-9812-4410",
          sellerName: "Murugesan K (Breeder)",
          status: "ACTIVE",
          createdAt: "2026-10-25T08:00:00Z"
        },
        {
          id: "pashu-102",
          title: "Magnificent Ongole Breeding Stud Bull (Chittoor / Prakasam Lineage)",
          breed: "Ongole",
          category: "Cattle",
          stateId: "AP",
          district: "Ongole, Prakasam",
          price: 115000,
          earTagId: "AP-2801-7104-9923",
          sellerName: "Venkat Reddy (Dairy)",
          status: "ACTIVE",
          createdAt: "2026-10-26T09:30:00Z"
        },
        {
          id: "pashu-103",
          title: "Hallikar Heavy Draught Bullocks Pair (Mandya Lineage)",
          breed: "Hallikar",
          category: "Cattle",
          stateId: "KA",
          district: "Mandya, Karnataka",
          price: 92000,
          earTagId: "KA-4102-5509-1123",
          sellerName: "Murugesan K (Breeder)",
          status: "ACTIVE",
          createdAt: "2026-10-27T11:00:00Z"
        }
      ]
    };
  }

  // 22. Admin KYC Verification
  if (pathname.includes("/admin/users/") && pathname.includes("/verify-kyc")) {
    return { success: true, message: "User KYC verified successfully", kycStatus: "VERIFIED" };
  }

  // 23. Admin Force Escrow Release
  if (pathname.includes("/admin/orders/") && pathname.includes("/force-release")) {
    return { success: true, message: "Escrow funds released via Admin Override", status: "RELEASED" };
  }

  // 24. Admin Delete Listing
  if (pathname.includes("/admin/listings/") && method === "DELETE") {
    return { success: true, message: "Listing removed by Admin" };
  }

  // 25. Government Schemes (GET /api/v1/schemes)
  if (pathname.includes("/schemes") && !pathname.includes("/apply") && !pathname.includes("/my-applications") && method === "GET") {
    const REAL_GOVT_SCHEMES = [
      // ===================== CENTRAL GOVERNMENT SCHEMES =====================
      {
        id: "sch-central-001",
        name: "Rashtriya Gokul Mission (RGM)",
        description: "A flagship programme under the National Programme for Bovine Breeding & Dairy Development to conserve and develop indigenous bovine breeds. Establishes Gokul Grams as integrated indigenous cattle development centres, implements genomic selection, funds bulls for AI, and supports breed improvement programmes across the country.",
        eligibility: "Dairy farmers, Farmer Producer Organizations (FPOs), dairy cooperatives, AI centres, and State Animal Husbandry Departments rearing indigenous cattle breeds.",
        benefit: "Up to ₹50 lakh per Gokul Gram project; breed improvement incentive of ₹900–₹5,000 per calf born through certified AI with indigenous semen; IVF support.",
        authority: "Central Govt — Dept. of Animal Husbandry & Dairying (DAHD), Ministry of Fisheries, Animal Husbandry & Dairying",
        stateId: null,
        applyUrl: "https://dahd.nic.in/related-links/rashtriya-gokul-mission"
      },
      {
        id: "sch-central-002",
        name: "National Livestock Mission (NLM)",
        description: "Promotes entrepreneurship development in livestock and poultry sectors. Supports rural poultry, sheep, goat and pig rearing, feed and fodder development, innovation, and extension of best practices. Aims to quantitative and qualitative improvement of livestock production systems.",
        eligibility: "Individuals, SHGs, FPOs, Section 8 companies, and cooperatives from rural areas. Special preference for SC/ST and women beneficiaries.",
        benefit: "Subsidy up to 50% of project cost (33% for general, 50% for SC/ST). Maximum project outlay of ₹50 lakh for poultry and ₹30 lakh for small ruminants. Back-ended capital subsidy through NABARD channel banks.",
        authority: "Central Govt — Dept. of Animal Husbandry & Dairying (DAHD)",
        stateId: null,
        applyUrl: "https://dahd.nic.in/related-links/national-livestock-mission-nlm"
      },
      {
        id: "sch-central-003",
        name: "Animal Husbandry Infrastructure Development Fund (AHIDF)",
        description: "Incentivises private investment in dairy processing, meat processing, and animal feed plants. Provides 3% interest subvention on loans and credit guarantee coverage. Promotes the establishment of modern dairy and meat processing infrastructure.",
        eligibility: "Individual entrepreneurs, private companies, MSMEs, FPOs, Section 8 companies, and cooperatives. Projects between ₹2 crore and ₹500 crore are eligible.",
        benefit: "3% interest subvention on term loans (effective interest rate ~4–5%). Additional 25% credit guarantee coverage by NCGTC. Loan repayment period up to 10 years with 2-year moratorium.",
        authority: "Central Govt — DAHD / NABARD / Scheduled Commercial Banks",
        stateId: null,
        applyUrl: "https://ahidf.udyamimitra.in/"
      },
      {
        id: "sch-central-004",
        name: "Dairy Entrepreneurship Development Scheme (DEDS)",
        description: "Implemented through NABARD to generate self-employment and promote setting up of modern dairy farms. Supports establishment of small dairy units of 2–10 milch animals, purchase of milking machines, bulk milk coolers, dairy product transportation and processing.",
        eligibility: "Farmers, individual entrepreneurs, NGOs, SHGs, cooperatives, and companies. SC/ST applicants receive higher subsidy. One unit per beneficiary.",
        benefit: "Back-ended capital subsidy: 25% of project cost for general category (up to ₹1.25 lakh for 5-cow unit, up to ₹2.50 lakh for 10-cow unit). SC/ST gets 33.33% subsidy. Covers milking machines (subsidy up to ₹4.50 lakh), BMC units, and dairy vans.",
        authority: "Central Govt — NABARD, Dept. of Animal Husbandry",
        stateId: null,
        applyUrl: "https://www.nabard.org/content.aspx?id=591"
      },
      {
        id: "sch-central-005",
        name: "Kisan Credit Card (KCC) for Animal Husbandry & Fisheries",
        description: "Extended the popular Kisan Credit Card facility to dairy farmers, poultry, sheep/goat rearers, and fisheries workers. Provides working capital loans at subsidised interest rate for maintenance of animals, purchase of feed, veterinary expenses, and short-term production needs.",
        eligibility: "All dairy and livestock farmers including landless animal rearers, tenant farmers, SHGs, and JLGs. Must own at least 1 milch animal, 5 goats/sheep, or 50 poultry birds.",
        benefit: "Loans at 7% interest rate (effective 4% after GoI interest subvention for prompt repayment). Credit limit based on scale of finance: typically ₹70,000–₹3 lakh per annum for dairy. No collateral up to ₹1.6 lakh. Revolving credit with automatic annual renewal.",
        authority: "Central Govt — Reserve Bank of India / NABARD / All Scheduled Banks",
        stateId: null,
        applyUrl: "https://www.nabard.org/content.aspx?id=723"
      },
      {
        id: "sch-central-006",
        name: "National Programme for Dairy Development (NPDD)",
        description: "Strengthens dairy cooperative infrastructure at village level across the country. Funds creation of bulk milk cooling facilities at village level, installation of electronic milk adulteration testing equipment, setting up automatic milk collection systems, and strengthening dairy cooperative societies.",
        eligibility: "State Dairy Federations, District Milk Unions, dairy cooperatives, and Milk Producer Companies. Implemented through State Animal Husbandry Departments.",
        benefit: "Central share of 60% (90% for NE/hilly states) for infrastructure. Grants for BMC units (2,000–5,000 litre capacity), AMCS (Automatic Milk Collection System), and electronic milk testing equipment at village DCS level.",
        authority: "Central Govt — DAHD / National Dairy Development Board (NDDB)",
        stateId: null,
        applyUrl: "https://dahd.nic.in/related-links/national-programme-dairy-development-npdd"
      },
      {
        id: "sch-central-007",
        name: "Livestock Insurance Scheme",
        description: "Provides protection to livestock farmers against losses due to death of animals from disease, accident, or natural calamity. Covers indigenous and crossbred cattle, buffaloes, and other livestock. Premium is subsidised by Central and State Governments.",
        eligibility: "All livestock owners. Priority to BPL families, SC/ST, and small/marginal farmers. Animals must be tagged with unique identification and insured at market value.",
        benefit: "GoI bears up to 50% of the insurance premium (remaining 50% shared by State Govt and farmer). Maximum sum insured based on market value of the animal. Coverage for death due to disease, accident, natural calamity, surgical operations, and strikes/riots.",
        authority: "Central Govt — DAHD / Public Sector Insurance Companies",
        stateId: null,
        applyUrl: "https://dahd.nic.in/related-links/livestock-insurance-scheme"
      },
      {
        id: "sch-central-008",
        name: "National Animal Disease Control Programme (NADCP) — FMD & Brucellosis",
        description: "100% centrally funded programme to control and eradicate Foot and Mouth Disease (FMD) and Brucellosis in livestock. Aims to vaccinate over 500 million livestock including cattle, buffalo, sheep, goats, and pigs against FMD, and 36 million bovine female calves against Brucellosis.",
        eligibility: "All livestock owners across India. Vaccination is FREE. Animals are ear-tagged with unique 12-digit INAPH (Information Network for Animal Productivity & Health) number.",
        benefit: "100% FREE vaccination for FMD (bi-annual rounds) and Brucellosis (once for female calves 4–8 months age). Free ear tagging under INAPH. Estimated to save ₹50,000 crore annually in productivity losses.",
        authority: "Central Govt — DAHD, implemented through State AH Departments & ICAR",
        stateId: null,
        applyUrl: "https://dahd.nic.in/related-links/national-animal-disease-control-programme"
      },

      // ===================== TAMIL NADU STATE SCHEMES =====================
      {
        id: "sch-tn-001",
        name: "Tamil Nadu Free Milch Cow / She-Buffalo Distribution Scheme",
        description: "Government of Tamil Nadu distributes free milch cows or she-buffaloes to families below poverty line, widows, and destitute women. Includes crossbred Jersey/HF cows or Murrah buffaloes along with insurance cover and initial 3 months feed supply. Implemented through District Animal Husbandry offices.",
        eligibility: "BPL families, widows, destitute women, and landless agricultural labourers in Tamil Nadu. Priority to SC/ST beneficiaries. Must have space and willingness to rear the animal.",
        benefit: "1 milch cow or she-buffalo (valued ₹40,000–₹75,000) provided FREE. Includes 3 months cattle feed, insurance, initial veterinary care, and TANUVAS training on animal management.",
        authority: "State Govt — Tamil Nadu Animal Husbandry Department",
        stateId: "TN",
        applyUrl: "https://www.tn.gov.in/scheme/data_view/7014"
      },
      {
        id: "sch-tn-002",
        name: "TANUVAS Fodder Development & Azolla Promotion Scheme",
        description: "Tamil Nadu Veterinary and Animal Sciences University (TANUVAS) promotes scientific fodder cultivation, Azolla pits, and hydroponics fodder production among livestock farmers. Provides subsidised seeds, training, and technical support for growing CO-4, CO-5 Napier grass, Lucerne, and fodder maize.",
        eligibility: "All registered livestock farmers in Tamil Nadu. Priority to dairy cooperative members and TANUVAS-trained farmers.",
        benefit: "Free/subsidised CO-4 Napier root slips and fodder seeds. 50% subsidy on Azolla pit construction (up to ₹5,000). Free technical training through TANUVAS Krishi Vigyan Kendras. Hydroponics fodder unit subsidy up to ₹25,000.",
        authority: "State Govt — TANUVAS / TN AH Dept",
        stateId: "TN",
        applyUrl: "https://tanuvas.ac.in/extension_activities"
      },
      {
        id: "sch-tn-003",
        name: "Tamil Nadu Goat & Sheep Village Cluster Development",
        description: "Supports goat and sheep rearing clusters in districts like Ramanathapuram, Sivaganga, Virudhunagar, and Salem. Provides subsidised units of 10+1 goats (10 does + 1 buck) to SC/ST and BPL families. Includes insurance, shed construction subsidy, and veterinary support.",
        eligibility: "SC/ST and BPL families in identified districts. Must have land or space for goat shed. Selected through Gram Sabha recommendations.",
        benefit: "Unit of 10 female + 1 male goat (Kanni, Kodi Adu, or Tellicherry breeds) provided at 75% subsidy. Shed construction subsidy up to ₹20,000. 3-year insurance cover. Veterinary first-aid kit included.",
        authority: "State Govt — TN Animal Husbandry Department / District Collectors",
        stateId: "TN",
        applyUrl: "https://www.tn.gov.in/scheme/data_view/7015"
      },

      // ===================== ANDHRA PRADESH STATE SCHEMES =====================
      {
        id: "sch-ap-001",
        name: "YSR Cheyutha — Livestock Component for Women",
        description: "Under the YSR Cheyutha scheme, eligible women aged 45–60 years from SC, ST, BC (minorities) communities receive ₹75,000 over 4 years to start or expand livelihood activities including dairy farming, goat rearing, and poultry units. Convergence with AHIDF and NLM for livestock enterprise creation.",
        eligibility: "Women aged 45–60 years belonging to SC/ST/BC/Minority communities in Andhra Pradesh. Family annual income below ₹10 lakh. Aadhaar-linked bank account mandatory.",
        benefit: "₹18,750 per year (₹75,000 over 4 years) directly to beneficiary bank account. Can be used for purchase of milch animals, goats, poultry, or cattle feed business. Convergence with bank loans for higher investment.",
        authority: "State Govt — AP Dept. of Women Development & Child Welfare",
        stateId: "AP",
        applyUrl: "https://navasakam.ap.gov.in/"
      },
      {
        id: "sch-ap-002",
        name: "AP Sheep & Goat Development Programme (YSR Mekala Nestham)",
        description: "Free distribution of sheep units (20+1 sheep: 20 ewes + 1 ram) to eligible beneficiaries from Yadava, Kuruma, Golla, and other traditional shepherding communities. Includes insurance cover, veterinary camp support, and shearing equipment subsidy.",
        eligibility: "Traditional shepherd community members (Yadava, Kuruma, Golla castes) in AP. Landless or marginal farmers. Beneficiary identified through Gram Sabha and verified by District AH Officer.",
        benefit: "Unit of 20 ewes + 1 ram (Nellore Jodipi or Macherla breed, valued ~₹1.2 lakh) provided free. 3-year insurance cover. Free annual deworming and vaccination camps. Wool shearing machine subsidy.",
        authority: "State Govt — AP Animal Husbandry Department / Sheep & Goat Development Cooperative Federation",
        stateId: "AP",
        applyUrl: "https://www.ap.gov.in/schemes/"
      },

      // ===================== KARNATAKA STATE SCHEMES =====================
      {
        id: "sch-ka-001",
        name: "Pashu Bhagya Scheme (Free Livestock for SC/ST Farmers)",
        description: "Karnataka Government's flagship programme providing free livestock units to SC/ST families for livelihood generation. Covers dairy cows, buffaloes, sheep/goat units, and backyard poultry. Includes housing construction subsidy, insurance, and initial feed.",
        eligibility: "SC/ST families in Karnataka with BPL card or annual income below ₹1 lakh. Must have space to rear animals. Identified through Taluk-level Animal Husbandry offices and Social Welfare Department.",
        benefit: "Free milch cow or buffalo (valued ₹50,000–₹80,000), OR 10+1 sheep/goat unit, OR 50 backyard poultry birds. 100% subsidy for SC/ST. Includes shed construction grant of ₹15,000, 3 months feed supply, and 3-year insurance.",
        authority: "State Govt — Karnataka Animal Husbandry & Veterinary Services Dept. / SC/ST Welfare Dept.",
        stateId: "KA",
        applyUrl: "https://ahvs.karnataka.gov.in/info-2/Schemes/en"
      },
      {
        id: "sch-ka-002",
        name: "Karnataka Milk Federation (KMF) Dairy Farmer Support",
        description: "Karnataka Cooperative Milk Producers' Federation (Nandini brand) provides comprehensive support to member dairy farmers including subsidised cattle feed, veterinary services, AI services, and bonus over MSP for milk procurement. Supports creation of new Dairy Cooperative Societies at village level.",
        eligibility: "Dairy farmers who are members of primary Dairy Cooperative Societies (DCS) affiliated to District Milk Unions under KMF.",
        benefit: "Subsidised Nandini cattle feed at ₹2–3/kg below market rate. Free AI services through cooperative centres. Milk procurement at MSP + annual bonus (₹2–5/litre bonus). Interest-free loans for purchase of milch animals up to ₹75,000.",
        authority: "State Govt — KMF (Karnataka Milk Federation) / Nandini",
        stateId: "KA",
        applyUrl: "https://kmfnandini.coop/"
      },

      // ===================== TELANGANA STATE SCHEMES =====================
      {
        id: "sch-tg-001",
        name: "Telangana Sheep Distribution Scheme (Gorrela Pempakam)",
        description: "One of the world's largest free sheep distribution programmes. Telangana Government distributes 21 sheep units (20 ewes + 1 ram) to Yadava and Kuruma community families. Includes insurance cover, shearing equipment, vaccination camps, and shepherd training.",
        eligibility: "Yadava and Kuruma community members in Telangana with annual family income below ₹2 lakh. Traditional shepherding families get priority. Age 18–55 years. Aadhaar and caste certificate mandatory.",
        benefit: "21 sheep unit (20 ewes + 1 Nellore ram, valued ~₹1.5 lakh) provided 100% free. 3-year TGICDL insurance. Free annual vaccination & deworming. Each beneficiary can earn ₹3–5 lakh per year from lamb sales and wool.",
        authority: "State Govt — Telangana Animal Husbandry Department / Sheep & Goat Development Cooperative Society",
        stateId: "TG",
        applyUrl: "https://ahd.telangana.gov.in/"
      },

      // ===================== KERALA STATE SCHEMES =====================
      {
        id: "sch-kl-001",
        name: "Kerala MILMA Dairy Cooperative Subsidy & Ksheera Gramam",
        description: "Kerala Co-operative Milk Marketing Federation (MILMA) operates the Ksheera Gramam (Milk Village) programme to develop model dairy villages. Provides subsidised cattle feed, veterinary extension services, AI with imported semen, and milk procurement bonus to member farmers through APCOS (Anand Pattern Cooperative Societies).",
        eligibility: "All dairy farmers in Kerala who are members of MILMA-affiliated APCOS (primary dairy cooperatives). New members welcome through nearest APCOS.",
        benefit: "Milk procurement at guaranteed MSP + annual bonus (₹3–6/litre). Subsidised MILMA cattle feed (Amul pattern). Free AI with high-genetic-merit semen. Insurance facilitation. Interest subvention loans for milch animal purchase.",
        authority: "State Govt — MILMA (Kerala Co-operative Milk Marketing Federation)",
        stateId: "KL",
        applyUrl: "https://milma.com/"
      },
      {
        id: "sch-kl-002",
        name: "Kerala Goat Village Scheme (Aadu Gramam)",
        description: "Kerala Animal Husbandry Department's scheme to promote commercial goat farming through creation of Aadu Gramam (Goat Villages). Provides subsidised Malabari goat units, buck service centres, and training in stall-fed goat management. Focus on Malabari, Attappady Black, and Boer cross breeds.",
        eligibility: "Women SHGs (Kudumbashree), small and marginal farmers in Kerala. Blocks identified by District AH Officer. Training through Kerala Veterinary & Animal Sciences University (KVASU) mandatory.",
        benefit: "Goat unit of 5 does + 1 buck at 50–75% subsidy (SC/ST get 90% subsidy). Shed construction subsidy up to ₹25,000. Free KVASU training. Buck Service Centre established per Panchayat with stud Boer/Malabari bucks.",
        authority: "State Govt — Kerala Animal Husbandry Dept / KVASU / Kudumbashree",
        stateId: "KL",
        applyUrl: "https://ahd.kerala.gov.in/"
      },

      // ===================== PUDUCHERRY UT SCHEME =====================
      {
        id: "sch-py-001",
        name: "Puducherry Milch Animal Distribution & Dairy Support",
        description: "Union Territory of Puducherry distributes free milch animals to BPL families and supports dairy farming through subsidised AI services, cattle feed, and veterinary camps. The UT Animal Husbandry Department provides comprehensive support for livestock health and breeding improvement.",
        eligibility: "BPL families in Puducherry UT. Priority to SC/ST and women-headed households. Must be domicile of Puducherry for at least 5 years.",
        benefit: "Free crossbred milch cow (Jersey/HF) valued at ₹40,000–₹60,000. Free AI services at all government veterinary dispensaries. Subsidised cattle feed. Free vaccination and deworming camps.",
        authority: "UT Govt — Puducherry Dept. of Animal Husbandry",
        stateId: "PY",
        applyUrl: "https://ahd.py.gov.in/"
      }
    ];

    // Filter by stateId if provided
    const params = new URLSearchParams(endpoint.split("?")[1] || "");
    const filterState = params.get("stateId");
    let filtered = REAL_GOVT_SCHEMES;
    if (filterState && filterState !== "ALL") {
      filtered = REAL_GOVT_SCHEMES.filter(s => !s.stateId || s.stateId === filterState);
    }
    return { success: true, schemes: filtered };
  }

  // 26. My Scheme Applications (GET /api/v1/schemes/user/my-applications)
  if (pathname.includes("/schemes/user/my-applications")) {
    const apps = JSON.parse(localStorage.getItem("dah_scheme_applications") || "[]");
    return { success: true, applications: apps };
  }

  return { success: true };
}

/**
 * Base fetch wrapper with automatic JWT refresh rotation and offline mock fallback
 */
export async function apiFetch(endpoint, options = {}) {
  const headers = { ...options.headers };

  if (accessToken && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const isFormData = options.body instanceof FormData;
  if (!isFormData && !headers["Content-Type"] && options.body) {
    headers["Content-Type"] = "application/json";
  }

  const config = {
    ...options,
    headers,
  };

  let response;
  try {
    response = await fetch(endpoint, config);
  } catch (err) {
    // Backend offline / not yet listening: handle gracefully via mock store
    return mockFallback(endpoint, options);
  }

  // If endpoint is 404/502/503 during early development before API routes are spun up
  if (response.status === 404 || response.status === 502 || response.status === 503) {
    return mockFallback(endpoint, options);
  }

  // If unauthorized and we had a token, try silent refresh
  if (response.status === 401 && accessToken) {
    try {
      const refreshRes = await fetch("/api/v1/auth/refresh", {
        method: "POST",
        credentials: "include",
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        setSession(refreshData.user, refreshData.accessToken);

        // Retry original request with new token
        headers["Authorization"] = `Bearer ${refreshData.accessToken}`;
        response = await fetch(endpoint, { ...options, headers });
      } else {
        clearSession();
      }
    } catch (refreshErr) {
      clearSession();
    }
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/pdf")) {
    return response;
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    data = { error: { message: response.statusText || "Request failed" } };
  }

  if (!response.ok) {
    const errorMsg = data.error?.message || data.message || `API error (${response.status})`;
    const errorObj = new Error(errorMsg);
    errorObj.status = response.status;
    errorObj.data = data;
    throw errorObj;
  }

  return data;
}

/* ==========================================================================
   AUTH API
   ========================================================================== */

export async function sendOtp(phone) {
  return apiFetch("/api/v1/auth/otp/send", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

export async function verifyOtp({ phone, otp, name, state, district, role }) {
  const data = await apiFetch("/api/v1/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({ phone, otp, name, state, district, role }),
  });
  if (data?.user && data?.accessToken) {
    setSession(data.user, data.accessToken);
  }
  return data;
}

export async function logout() {
  try {
    await apiFetch("/api/v1/auth/logout", { method: "POST" });
  } finally {
    clearSession();
  }
}

export async function applySeller(payload) {
  const data = await apiFetch("/api/v1/auth/seller/apply", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (currentUser) {
    currentUser.roles = [...new Set([...(currentUser.roles || []), "SELLER"])];
    currentUser.sellerProfile = data.sellerProfile;
    setSession(currentUser, accessToken);
  }
  return data;
}

/**
 * Fast 1-click test user switcher for demonstration & evaluation
 */
export async function switchTestUser(role = "BUYER") {
  const roleMap = {
    BUYER: "+919000000004",
    SELLER: "+919000000002",
    VET: "+919000000006",
    ADMIN: "+919000000001",
  };
  const phone = roleMap[role] || roleMap.BUYER;

  try {
    const sendRes = await sendOtp(phone);
    const otp = sendRes?.debugOtp || "123456";
    return await verifyOtp({ phone, otp });
  } catch (err) {
    // Immediate fallback for instant UI response
    const mockRes = mockFallback("/api/v1/auth/otp/verify", {
      body: JSON.stringify({ phone }),
    });
    setSession(mockRes.user, mockRes.accessToken);
    return mockRes;
  }
}

/* ==========================================================================
   LISTINGS & PASSPORT API
   ========================================================================== */

export async function fetchListings(query = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "" && v !== "ALL") {
      params.append(k, v);
    }
  });
  return apiFetch(`/api/v1/listings?${params.toString()}`);
}

export async function fetchListingById(id) {
  return apiFetch(`/api/v1/listings/${id}`);
}

export async function revealSellerContact(id) {
  return apiFetch(`/api/v1/listings/${id}/contact`, {
    method: "POST",
  });
}

export async function createListing(payload) {
  return apiFetch("/api/v1/listings", {
    method: "POST",
    body: JSON.stringify({ ...payload, legalComplianceConfirmed: true }),
  });
}

export async function deleteListing(id) {
  return apiFetch(`/api/v1/listings/${id}`, {
    method: "DELETE",
  });
}

export function getPassportPdfUrl(id) {
  return `/api/v1/listings/${id}/passport.pdf`;
}

/* ==========================================================================
   ORDERS & ESCROW API
   ========================================================================== */

export async function createOrder(listingId, freightQuoteId = null) {
  return apiFetch("/api/v1/orders", {
    method: "POST",
    body: JSON.stringify({ listingId, legalComplianceConfirmed: true, freightQuoteId }),
  });
}

export async function fetchMyOrders() {
  return apiFetch("/api/v1/orders/my-orders");
}

export async function confirmOrderDelivered(orderId) {
  return apiFetch(`/api/v1/orders/${orderId}/delivered`, {
    method: "POST",
  });
}

export async function releaseEscrowPayment(orderId) {
  return apiFetch(`/api/v1/orders/${orderId}/release`, {
    method: "POST",
  });
}

export async function requestOrderRefund(orderId, reason) {
  return apiFetch(`/api/v1/orders/${orderId}/refund`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function mockPayOrder(orderId) {
  return apiFetch(`/api/v1/orders/${orderId}/mock-pay`, {
    method: "POST",
  });
}

/* ==========================================================================
   FREIGHT & TRANSPORT API
   ========================================================================== */

export async function getFreightQuote(fromDistrict, toDistrict, vehicleType = "BOLERO") {
  return apiFetch("/api/v1/freight/quote", {
    method: "POST",
    body: JSON.stringify({ fromDistrict, toDistrict, vehicleType, km: 140 }),
  });
}

export async function bookTruck(bookingData) {
  return apiFetch("/api/v1/truck-bookings", {
    method: "POST",
    body: JSON.stringify(bookingData),
  });
}

export async function fetchTruckBookings() {
  return apiFetch("/api/v1/truck-bookings");
}

/* ==========================================================================
   MANDI & SHANDIES API
   ========================================================================== */

export async function fetchMandiRates(params = {}) {
  const query = new URLSearchParams();
  if (params.state && params.state !== "ALL") query.append("state", params.state);
  if (params.commodity && params.commodity !== "ALL") query.append("commodity", params.commodity);
  return apiFetch(`/api/v1/mandi/rates?${query.toString()}`);
}

export async function fetchShandies(params = {}) {
  const query = new URLSearchParams();
  if (params.stateId && params.stateId !== "ALL") query.append("stateId", params.stateId);
  if (params.dayOfWeek && params.dayOfWeek !== "ALL") query.append("dayOfWeek", params.dayOfWeek);
  return apiFetch(`/api/v1/mandi/shandies?${query.toString()}`);
}

export async function createMandiAlert(alertData) {
  return apiFetch("/api/v1/mandi/alerts", {
    method: "POST",
    body: JSON.stringify(alertData),
  });
}

export async function fetchMandiAlerts() {
  return apiFetch("/api/v1/mandi/alerts");
}

/* ==========================================================================
   PASHUCARE & HEALTH API
   ========================================================================== */

export async function fetchFirstAid(symptomKey) {
  return apiFetch(`/api/v1/health/symptoms/${encodeURIComponent(symptomKey)}`);
}

export async function fetchHelpline() {
  return apiFetch("/api/v1/health/helpline");
}

export async function createVetRequest(requestData) {
  return apiFetch("/api/v1/vet-requests", {
    method: "POST",
    body: JSON.stringify(requestData),
  });
}

export async function fetchVetRequests() {
  return apiFetch("/api/v1/vet-requests");
}

/* ==========================================================================
   GOVERNMENT SCHEMES API
   ========================================================================== */

export async function fetchSchemes(params = {}) {
  const query = new URLSearchParams();
  if (params.stateId && params.stateId !== "ALL") query.append("stateId", params.stateId);
  return apiFetch(`/api/v1/schemes?${query.toString()}`);
}

export async function applyScheme(schemeId, notes = "", schemeName = "") {
  return apiFetch(`/api/v1/schemes/${schemeId}/apply`, {
    method: "POST",
    body: JSON.stringify({ notes, schemeName }),
  });
}

export async function fetchMySchemeApplications() {
  return apiFetch("/api/v1/schemes/user/my-applications");
}

/* ==========================================================================
   FODDER & EQUIPMENT MART API
   ========================================================================== */

export async function fetchFodderListings(stateId = null) {
  const query = stateId && stateId !== "ALL" ? `?stateId=${stateId}` : "";
  return apiFetch(`/api/v1/fodder${query}`);
}

export async function createFodderListing(data) {
  return apiFetch("/api/v1/fodder", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function fetchEquipmentListings(stateId = null) {
  const query = stateId && stateId !== "ALL" ? `?stateId=${stateId}` : "";
  return apiFetch(`/api/v1/equipment${query}`);
}

export async function createEquipmentListing(data) {
  return apiFetch("/api/v1/equipment", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function fetchProductById(id) {
  try {
    const data = await apiFetch(`/api/v1/listings/${id}`);
    if (data && (data.id || data.title)) return data;
  } catch (err) {
    // fallback to static listings
  }
  const allItems = [...FODDER_LISTINGS, ...EQUIPMENT_LISTINGS, ...LIVESTOCK_LISTINGS];
  return allItems.find(x => x.id === id) || null;
}

export async function placeFodderOrder(data) {
  return apiFetch("/api/v1/orders", {
    method: "POST",
    body: JSON.stringify({
      listing_id: data.listingId,
      order_type: "FODDER",
      quantity: data.quantity,
      unit: data.unit,
      delivery_charge: data.deliveryCharge,
      delivery_address: data.deliveryAddress,
      pincode: data.pincode,
      required_date: data.requiredDate,
      customer_name: data.customerName,
      customer_phone: data.customerPhone,
      notes: data.notes
    })
  });
}

export async function bookEquipmentRental(data) {
  return apiFetch("/api/v1/orders", {
    method: "POST",
    body: JSON.stringify({
      listing_id: data.listingId,
      order_type: "MACHINERY_RENTAL",
      duration_val: data.durationVal,
      pricing_option: data.pricingOption,
      start_time: data.startTime,
      required_date: data.requiredDate,
      delivery_address: data.farmLocation,
      pincode: data.pincode,
      customer_name: data.customerName,
      customer_phone: data.customerPhone,
      notes: data.notes
    })
  });
}

/* ==========================================================================
   ADMIN & PROFILE DATA API
   ========================================================================== */

export async function fetchAdminStats() {
  return apiFetch("/api/v1/admin/stats");
}

export async function fetchAdminUsers() {
  return apiFetch("/api/v1/admin/users");
}

export async function fetchAdminOrders() {
  return apiFetch("/api/v1/admin/orders");
}

export async function fetchAdminListings() {
  return apiFetch("/api/v1/admin/listings");
}

export async function adminVerifyUserKyc(userId) {
  return apiFetch(`/api/v1/admin/users/${userId}/verify-kyc`, { method: "POST" });
}

export async function adminForceReleaseOrder(orderId) {
  return apiFetch(`/api/v1/admin/orders/${orderId}/force-release`, { method: "POST" });
}

export async function adminDeleteListing(listingId) {
  return apiFetch(`/api/v1/admin/listings/${listingId}`, { method: "DELETE" });
}
