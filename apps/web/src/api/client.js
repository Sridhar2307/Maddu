/**
 * DakshinAgriHub API Client
 * Enterprise HTTP client with token refresh rotation, auth state, and type-safe helpers.
 */

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
 * Base fetch wrapper with automatic JWT refresh rotation
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

  let response = await fetch(endpoint, config);

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
  setSession(data.user, data.accessToken);
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

  const sendRes = await sendOtp(phone);
  const otp = sendRes.debugOtp || "123456";
  return verifyOtp({ phone, otp });
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
    body: JSON.stringify({ fromDistrict, toDistrict, vehicleType }),
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

export async function applyScheme(schemeId, notes = "") {
  return apiFetch(`/api/v1/schemes/${schemeId}/apply`, {
    method: "POST",
    body: JSON.stringify({ notes }),
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
