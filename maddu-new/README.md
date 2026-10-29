# 🌾 DakshinAgriHub — Frontend (maddu-new)

Southern India Integrated Agri-Livestock, Mandi & Tele-Vet Ecosystem frontend built with **Vanilla HTML, CSS, and Modern JavaScript (ES Modules)**.

Covering **5 Southern States** (*Tamil Nadu, Andhra Pradesh, Telangana, Karnataka, Kerala*) and **3 Union Territories** (*Puducherry, Andaman & Nicobar Islands, Lakshadweep*).

---

## 🚀 Quick Start

### Option 1: Run with Vite Dev Server (Recommended)
```bash
# From maddu-new directory (or from maddu-new/frontend)
npm install
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

> [!NOTE]
> Vite runs on port `3000` with an automatic proxy to `http://localhost:4000` for `/api` and `/uploads` requests once the backend server is launched.

### Option 2: Run with Any Local HTTP Server
Because this frontend uses standard native ES Modules, it can be served with any static web server:
```bash
npx serve .
# or
npx http-server -p 3000
```

---

## ✨ Features & Modules

1. **🌾 Multilingual & Vernacular Accessibility**:
   - 6 Supported Indic Languages: **English**, **தமிழ் (Tamil)**, **తెలుగు (Telugu)**, **ಕನ್ನಡ (Kannada)**, **മലയാളം (Malayalam)**, and **हिन्दी (Hindi)**.
   - Region selector across 8 Southern states and UTs (`TN`, `AP`, `TG`, `KA`, `KL`, `PY`, `AN`, `LD`).

2. **🐄 Pashu & Poultry Bazaar**:
   - Native indigenous breeds: *Kangayam, Ongole, Hallikar, Punganur, Umblachery, Vechur, Malabari Goat, Bannur Sheep, Nicobari Fowl*.
   - Filter by breed, state/UT, and real-time search query.
   - Verified INAPH Ear-Tag badges and anti-scraping masked phone numbers with audit log reveal.
   - Interactive Digital Pashu Passport viewer with QR code.

3. **⚖️ Shaeffer's Formula AI Weight & Price Estimator**:
   - Interactive heart girth (cm) and body length (cm) sliders.
   - Accurate live weight calculation: $\text{Weight (kg)} = \frac{\text{Girth}^2 \times \text{Length}}{10800}$.
   - Realistic Southern market price estimation with 1-click apply to the Post Listing form.

4. **📈 Southern Mandi Ticker & Livestock Shandies**:
   - Real APMC daily price rates with price alerts (SMS / WhatsApp).
   - Weekly livestock shandies directory (*Anthiyur, Pollachi, Kundadam, Madanapalle, Erragadda, etc.*) with GPS coordinates and market schedules.

5. **🌿 Fodder & Silage Corridor & Farm Machinery**:
   - High-yield green fodder corridors (*CO-4 Super Napier, Corn Silage, Sorghum Stover, Paddy Straw*).
   - Farm equipment rentals (*Mini-Balers, Chaff Cutters, Milking Machines*).

6. **🩺 Tele-Vet & Gestation Care (PashuCare)**:
   - First-aid emergency protocol guide for Bloat, Mastitis, Foot and Mouth Disease (FMD), Fever, and Calf Diarrhea.
   - 283-day cattle gestation and calving countdown calculator.
   - Tele-vet consultation booking modal.

7. **🛡️ PashuSafe Escrow & Animal Logistics**:
   - Escrow checkout flow (`CREATED` → `PAID_ESCROW` → `DISPATCHED` → `DELIVERED` → `RELEASED`).
   - Dynamic livestock freight calculator (Bolero pickup, 6-wheel truck, island container vessel).

8. **🏛️ Southern Government Subsidies**:
   - Direct directory for state and central animal husbandry schemes (National Livestock Mission, Rashtriya Gokul Mission, Free Milch Cow Scheme, YSR Cheyutha).
   - 1-click subsidy facilitation application.

9. **🎙️ Vayal Voice Dialect Assistant**:
   - Regional speech recognition with simulated dialect fallback.

10. **👥 1-Click Role Switcher**:
    - Instant testing as `Buyer` (+91 9000000004), `Seller` (+91 9000000002), `Vet` (+91 9000000006), or `Admin` (+91 9000000001).

---

## 📁 Project Structure

```
maddu-new/
├── index.html              # Main HTML entry file
├── package.json            # Scripts & Vite dev dependency
├── vite.config.js          # Port 3000 & API proxy configuration
├── README.md               # Documentation
├── frontend/               # Full frontend copy for modular monorepo setups
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
└── src/
    ├── index.css           # Modern design tokens, glassmorphism & responsive CSS
    ├── main.js             # Master controller, tabs, translation & state engine
    ├── api/
    │   └── client.js       # Resilient API client with JWT & offline mock fallback
    └── data/
        ├── regions.js      # States, UTs, native breeds & districts
        ├── translations.js # 6-language dictionary
        ├── mandis.js       # APMC rates & weekly shandies
        └── listings.js     # Seed livestock, fodder & equipment
```

---

## 🔌 API & Backend Preparation

`src/api/client.js` is already wired to standard `/api/v1` REST endpoints:
- `POST /api/v1/auth/otp/send` & `POST /api/v1/auth/otp/verify`
- `GET /api/v1/listings` & `POST /api/v1/listings`
- `POST /api/v1/listings/:id/contact`
- `POST /api/v1/orders` & `GET /api/v1/orders/my-orders`
- `POST /api/v1/freight/quote` & `POST /api/v1/truck-bookings`
- `GET /api/v1/mandi/rates` & `POST /api/v1/mandi/alerts`
- `GET /api/v1/health/symptoms/:key` & `POST /api/v1/vet-requests`
- `GET /api/v1/schemes` & `POST /api/v1/schemes/:id/apply`

When offline, `client.js` transparently responds with realistic local store data so the interface is 100% testable. As soon as the backend server is built and listening on port `4000`, the frontend automatically transitions to live server database interactions.
