# 🌾 DakshinAgriHub (மத்து / ಮದ್ದು / మద్దు / മദ്ദു)

> **Southern India Integrated Agri-Livestock, Mandi Radar, Fodder Exchange & PashuSafe Escrow Ecosystem**  
> *Empowering farmers, dairy breeders, agro-entrepreneurs, and veterinarians across 5 Southern States and 3 Union Territories.*

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%200.110+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Vite](https://img.shields.io/badge/Frontend-Vite%206.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%20%7C%20SQLite-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Indic Languages](https://img.shields.io/badge/Languages-6%20Vernacular%20Indic-FF9933?style=for-the-badge)](#-multilingual--indic-vernacular-accessibility)
[![NDLM](https://img.shields.io/badge/Standards-NDLM%20%26%20INAPH%20Aligned-138808?style=for-the-badge)](https://inaph.nddb.coop/)

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Geographic Coverage](#-geographic-coverage)
- [Key Features & Modules](#-key-features--modules)
  - [1. PashuSafe Escrow & Live Transit Logistics Desk](#1-pashusafe-escrow--live-transit-logistics-desk)
  - [2. Pashu & Poultry Heritage Bazaar](#2-pashu--poultry-heritage-bazaar)
  - [3. Schaeffer's Formula AI Weight & Price Estimator](#3-schaeffers-formula-ai-weight--price-estimator)
  - [4. Fodder, Silage Corridor & Feed Exchange](#4-fodder-silage-corridor--feed-exchange)
  - [5. Agricultural Drone & Custom Machinery Rental Board](#5-agricultural-drone--custom-machinery-rental-board)
  - [6. PashuCare Tele-Vet, Emergency First-Aid & Estrus Tracker](#6-pashucare-tele-vet-emergency-first-aid--estrus-tracker)
  - [7. Southern Live Mandi & Shandy Radar](#7-southern-live-mandi--shandy-radar)
  - [8. Real Government Subsidies & Schemes Directory](#8-real-government-subsidies--schemes-directory)
  - [9. Multilingual Indic Accessibility & Vayal Voice](#9-multilingual-indic-accessibility--vayal-voice)
  - [10. Role-Based Access Control (RBAC) & Dedicated Portals](#10-role-based-access-control-rbac--dedicated-portals)
- [Technology Stack & Architecture](#-technology-stack--architecture)
- [Project Directory Structure](#-project-directory-structure)
- [Installation & Quick Start](#-installation--quick-start)
  - [Prerequisites](#prerequisites)
  - [1. Clone & Setup](#1-clone--setup)
  - [2. Backend Setup (FastAPI)](#2-backend-setup-fastapi)
  - [3. Frontend Setup (Vite)](#3-frontend-setup-vite)
- [Demo Accounts & Test Credentials](#-demo-accounts--test-credentials)
- [REST API Reference](#-rest-api-reference)
- [License & Acknowledgements](#-license--acknowledgements)

---

## 🌟 Overview

**DakshinAgriHub** is a next-generation agri-fintech and livestock trading platform tailored for Southern India's rural ecosystem. Historically, livestock farmers have faced high middleman commissions (8–15%), lack of health verification, fraudulent payments, and unmonitored animal transit distress.

DakshinAgriHub solves these systemic bottlenecks through:
1. **PashuSafe Escrow Protection**: Funds remain locked in an escrow bank vault until the animal arrives and passes ear-tag and clinical inspection.
2. **Animal Welfare Logistics**: GPS-monitored, climate-regulated Bolero pickups with non-slip flooring and hydration stops.
3. **Digital Pashu Passport**: Verified INAPH Ear-Tags, vaccination records, and breeding history embedded in a downloadable PDF passport with dynamic QR verification.
4. **Tele-Vet Telemedicine**: Virtual consultations with certified veterinarians, vital sign telemetry HUD, and digital prescriptions.
5. **Direct Agricultural Mandi & Machinery**: Peer-to-peer exchange of high-protein fodder, silage, expeller cakes, and custom farm machinery/drone rentals.

---

## 🗺️ Geographic Coverage

DakshinAgriHub is fully localized for Southern India, encompassing **5 States** and **3 Union Territories**:

- 🌴 **Tamil Nadu (TN)**: Cauvery Delta, Kongu Belt (Kangeyam, Pollachi, Erode, Tiruppur)
- 🌾 **Andhra Pradesh (AP)**: Coastal Andhra & Rayalaseema (Ongole, Chittoor, Prakasam, Guntur)
- 🚜 **Telangana (TG)**: North & South Telangana (Warangal, Karimnagar, Ranga Reddy)
- ☕ **Karnataka (KA)**: Old Mysuru & Malnad (Mandya, Hassan, Kolar, Bengaluru Rural)
- 🥥 **Kerala (KL)**: High Ranges & Coastal plains (Palakkad, Thrissur, Wayanad)
- 🌊 **Puducherry (PY)**: Puducherry, Karaikal, Mahe, Yanam
- 🏝️ **Andaman & Nicobar Islands (AN)**: Port Blair, South Andaman, Car Nicobar
- ⛵ **Lakshadweep (LD)**: Kavaratti, Agatti, Minicoy

---

## 🚀 Key Features & Modules

### 1. PashuSafe Escrow & Live Transit Logistics Desk
- **4-Stage Protected Trade Pipeline**:
  1. `PashuSafe Pay`: Buyer locks funds securely into the escrow vault (Admin-governed lock mechanism).
  2. `Live Welfare Transit`: Real-time GPS tracking, vehicle telemetry (temperature, ventilation fans, driver details: *K. Senthilvel, Bolero TN-38-BZ-4419*).
  3. `Ear-Tag & Health Check`: Physical verification of INAPH ear-tag with interactive clinical health checklist (temperature, rumination, gait, eye discharge, hoof condition).
  4. `Instant Fund Release`: Admin-authorized direct escrow release to the breeder with automated payment voucher and credit receipt.
- **Interactive Multi-Step Desk**: Farmers and buyers can click through all 4 pipeline stages right on the page to view transit telemetry, launch the scanner, or view fund disbursement logs.
- **Animal Health Passport Viewer & PDF Generator**: Generates comprehensive digital certificates with animal lineage, lactations, vaccination history, and unique tamper-evident verification QR code.

### 2. Pashu & Poultry Heritage Bazaar
- Curated marketplace featuring authentic indigenous livestock breeds:
  - **Kangayam Cow**: High A2 butterfat heritage milch breed of Tamil Nadu.
  - **Ongole Breeding Bull**: Majestic white zebu breed of Prakasam, AP.
  - **Hallikar Working Bullocks**: Resilient draft cattle pair trained for plough & cart.
  - **Punganur Miniature Cow**: Certified ultra-compact A2 dwarf cow under 90 cm.
  - **Vechur Cow**: World's smallest indigenous cattle breed from Kerala KVASU lineage.
  - **Malabari (Tellicherry) Goat**: Prolific twin-kidding dairy goat with kids.
  - **Grade Murrah Dairy Buffalo**: High-capacity 14L/day black water buffalo cow.
  - **Nicobari Indigenous Poultry**: Hardy, disease-resistant island layer flock.
  - **Lakshadweep Island Goats**: Raised-slat coastal dairy goat pair.
- **Anti-Scraping Protection**: Farmer phone numbers are masked by default. Clicking *"Contact"* reveals contact info with rate limiting and automated audit tracking.

### 3. Schaeffer's Formula AI Weight & Price Estimator
- Eliminates guesswork for rural farmers without weighbridges.
- Uses Shaeffer's verified veterinary formula:
  $$\text{Live Body Weight (kg)} = \frac{\text{Heart Girth (cm)}^2 \times \text{Body Length (cm)}}{10,800}$$
- Interactive sliders dynamically calculate estimated weight and fair market price range.
- 1-Click transfer of calculated metrics directly into the *"Post New Animal"* listing form.

### 4. Fodder, Silage Corridor & Feed Exchange
- Direct bulk supply contracts from farmer producer organizations (FPOs):
  - **CO-4 / Super Napier Green Grass**: 10.5% Crude Protein, fresh harvest cut at 45 days.
  - **Fermented Sweet Corn Silage**: Anaerobic 50kg hermetic bags with whole crushed sweet corn cobs (pH 3.8).
  - **Mechanized Dry Paddy Straw Bales**: High-density rain-protected bales.
  - **Expeller Groundnut Cake (*Kadalai Punnakku*)**: 42% bypass protein concentrate for lactating dairy cows.
- Doorstep truck transit corridors across interstate routes.

### 5. Agricultural Drone & Custom Machinery Rental Board
- Affordable custom-hire equipment for smallholders by pincode radius:
  - **16-Litre Hexacopter Spraying Drone**: DGCA-certified pilot included for foliar micronutrients & neem spraying.
  - **Heavy Duty 3HP Electric Chaff Cutter**: Doorstep delivery with 800–1000 kg/hr cutting capacity.
  - **45 HP Mahindra 4WD Tractor**: Equipped with 42-blade rotavator & MB plough with skilled operator and diesel fuel included.
  - **Kubota DC-68G Combine Harvester**: High-flotation rubber crawlers for paddy delta soils.

### 6. PashuCare Tele-Vet, Emergency First-Aid & Estrus Tracker
- **Field-Verified First-Aid Protocols**: Instant university-standard veterinary clinical guidance from TANUVAS / SVVU / KVASU for:
  - *Ruminal Tympany / Bloat (உப்பசம்)*
  - *Mastitis / Udder Infection (மடி நோய்)*
  - *Foot & Mouth Disease (FMD) Blisters*
  - *Tick Pyrexia & High Fever*
  - *Calf Scours / Enteritis*
- **Tele-Vet Appointment Booking**:
  - Buyers and sellers can schedule veterinary appointments by selecting their animal, clinical issue, and preferred time slot.
  - Booked consultations appear instantly in the **Veterinary Doctor Portal** consultation queue.
  - **In-App 1080p Tele-Vet Video Suite**: Simulates a live video consultation with doctor inset (PIP), vital sign telemetric overlay (Heart Rate: 72 bpm, Temp: 38.6°C, Resp: 24/min), audio/video toggle controls, and digital Rx prescription generation.
- **283-Day Cattle & Goat Estrus & Calving Timeline**: Interactive AI timeline tracking artificial insemination (AI) date, pregnancy confirmation (45 days), dry-off period, and estimated calving window.

### 7. Southern Live Mandi & Shandy Radar
- Daily market arrival rates across prominent southern livestock shandies:
  - *Anthiyur Cow & Horse Shandy (TN)*
  - *Pollachi Cattle & Coconut Shandy (TN)*
  - *Kundadam Goat & Sheep Market (TN)*
  - *Madanapalle Cattle Market (AP)*
  - *Erragadda Rythu Mandi (Hyderabad, TG)*
- Instant price alerts via SMS / WhatsApp simulation.

### 8. Real Government Subsidies & Schemes Directory
- Comprehensive, verified database of actual central and state government livestock programs:
  1. **National Livestock Mission (NLM)**: Up to 50% capital subsidy (up to ₹50 Lakhs) for poultry, sheep, goat, and fodder entrepreneurship.
  2. **Rashtriya Gokul Mission (RGM)**: Breed multiplication farms & indigenous breed conservation.
  3. **Animal Husbandry Infrastructure Development Fund (AHIDF)**: 3% interest subvention for dairy and meat processing units.
  4. **Kisan Credit Card (KCC) for Animal Husbandry**: Concessional working capital loans up to ₹2 Lakhs at 4% effective interest.
  5. **Tamil Nadu Free Milch Cow Scheme**: 100% free milch cows distributed to rural women-headed households.
  6. **Andhra Pradesh YSR Cheyutha & Cattle Scheme**: ₹18,750 annual financial grant with 50% dairy cattle subsidy.
  7. **Karnataka Pashu Bhagya Scheme**: 33%–50% subsidy for sheep, goat, pig, and dairy units.
  8. **Kerala KVASU Dairy Farm Support**: Subsidised disease insurance, high-tech dairy machinery, and green fodder slips.
  9. **Puducherry Milch Animal Distribution**: Free crossbred cows and free AI services for BPL families.
- Direct links to official government application portals (`dahd.nic.in`, `tn.gov.in`, `ap.gov.in`, `ahvs.karnataka.gov.in`, etc.).

### 9. Multilingual Indic Accessibility & Vayal Voice
- Full vernacular support across **6 languages**:
  - English
  - தமிழ் (Tamil)
  - తెలుగు (Telugu)
  - ಕನ್ನಡ (Kannada)
  - മലയാളം (Malayalam)
  - हिन्दी (Hindi)
- **Vayal Voice Dialect Assistant**: Speech recognition with simulated regional dialect processing for rural farmers.

### 10. Role-Based Access Control (RBAC) & Dedicated Portals
- **Buyer Portal** (*Anand Murthy*): Search animals, Schaeffer weight calculator, Escrow purchase, book Vet appointments, view live transit bolero tracking, download Pashu Passport.
- **Seller / Breeder Portal** (*Murugesan K*): Post new livestock with 360° video, manage listings, view incoming buyer escrow deposits, order fodder/equipment, book Tele-Vet.
- **Veterinary Doctor Portal** (*Dr. Radhakrishnan, BVSc*): Dedicated appointment queue, conduct 1080p live tele-vet consultations, certify INAPH ear-tags, issue digital health clearances and Rx prescriptions.
- **Platform Admin Portal** (*Senthil Nathan*): Authorize and execute **PashuSafe Pay** funds locking, monitor all platform transactions, oversee logistics carriers, and trigger **Instant Fund Releases** directly to breeders.
- **Instant Role Switcher**: Dedicated floating header widget allowing instantaneous 1-click toggling between Buyer, Seller, Vet, and Admin modes for seamless testing.

---

## 🛠️ Technology Stack & Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DakshinAgriHub Platform                         │
├───────────────────────────────────┬────────────────────────────────────┤
│         Frontend (Port 3000)       │        Backend (Port 8001)         │
├───────────────────────────────────┼────────────────────────────────────┤
│ • Modern Vanilla ES Modules (JS)  │ • FastAPI (Python 3.10+)           │
│ • Vite 6.0 Fast Build Tool        │ • Uvicorn ASGI Server              │
│ • Custom Glassmorphism UI & Tokens│ • SQLAlchemy 2.0 ORM               │
│ • Canvas QR Code & PDF Generator  │ • PostgreSQL (Supabase) / SQLite   │
│ • Offline Mock Engine Fallback    │ • JWT Token Refresh Rotation       │
│ • Responsive Indic Localization   │ • OpenAPI / Swagger UI Specs       │
└───────────────────────────────────┴────────────────────────────────────┘
```

---

## 📁 Project Directory Structure

```
Maddu-main1/
├── README.md                           # Main GitHub documentation
└── maddu-new/
    ├── index.html                      # Single Page Application entry
    ├── package.json                    # Frontend dependencies & npm scripts
    ├── vite.config.js                  # Vite configuration & proxy routes
    ├── README.md                       # Project frontend & backend guide
    ├── public/
    │   └── images/                     # Curated authentic high-res images
    │       ├── kangayam_cow.jpg        # Authentic Kangayam cow & calf
    │       ├── ongole_bull.jpg         # Authentic Ongole stud bull
    │       ├── hallikar_bulls.jpg      # Authentic Hallikar draft bullocks
    │       ├── punganur_cow.jpg        # Authentic Punganur dwarf cow
    │       ├── vechur_cow.jpg          # Authentic Kerala Vechur cow
    │       ├── malabari_goat.jpg       # Authentic Malabari goat & kids
    │       ├── murrah_buffalo.jpg      # Authentic Murrah dairy buffalo
    │       ├── island_goat.jpg         # Authentic Indian dairy goats
    │       ├── nicobari_poultry.jpg    # Authentic backyard poultry flock
    │       ├── napier_grass.jpg        # Fresh green CO-4 Napier grass
    │       ├── corn_silage.jpg         # Fermented maize silage
    │       ├── paddy_straw_bales.jpg   # Machine-baled paddy straw
    │       ├── groundnut_cake.jpg      # Kadalai Punnakku peanut oil cake
    │       ├── chaff_cutter.jpg        # 3HP Electric Chaff Cutter
    │       ├── spraying_drone.jpg      # 16L Hexacopter Spray Drone
    │       ├── mahindra_tractor.jpg    # 45HP 4WD Mahindra Tractor
    │       └── combine_harvester.jpg   # Kubota combine harvester
    ├── src/
    │   ├── index.css                   # Responsive design tokens & styles
    │   ├── main.js                     # Master application controller & state
    │   ├── api/
    │   │   └── client.js               # API client with token refresh & mock store
    │   └── data/
    │       ├── listings.js             # Seed livestock, fodder & equipment data
    │       ├── mandis.js               # APMC rates & weekly shandies directory
    │       ├── regions.js              # 8 Southern states/UTs & breed mappings
    │       └── translations.js         # 6 Indic languages translation dictionary
    └── backend/
        ├── run.py                      # FastAPI server runner
        ├── requirements.txt            # Python dependencies
        ├── .env                        # Environment configuration
        ├── dakshin.db                  # Local SQLite database
        ├── seed_products.py            # Database product seeder
        └── app/
            ├── main.py                 # FastAPI application factory & CORS
            ├── config.py               # Pydantic environment settings
            ├── seed.py                 # Initial user & livestock seeder
            ├── database/
            │   ├── connection.py       # Engine & session management
            │   ├── models.py           # SQLAlchemy database models
            │   └── schemas.py          # Pydantic request/response schemas
            └── routers/
                ├── admin.py            # Admin moderation & user management
                ├── auth.py             # OTP & JWT authentication
                ├── listings.py         # Livestock, fodder & machinery endpoints
                └── orders.py           # Escrow payments & logistics endpoints
```

---

## ⚡ Installation & Quick Start

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Python**: v3.10 or higher
- **Git**

---

### 1. Clone & Setup

```bash
git clone https://github.com/Ramakrishna218/maddu.git
cd maddu/maddu-new
```

---

### 2. Backend Setup (FastAPI)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   # Windows PowerShell
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # Linux / macOS
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run database seed (optional, creates initial admin, seller, buyer & listings):
   ```bash
   python -m app.seed
   python seed_products.py
   ```
5. Start the FastAPI server:
   ```bash
   python run.py
   ```
   Backend will start at: **`http://127.0.0.1:8001`**  
   Interactive API Docs: **`http://127.0.0.1:8001/docs`**

---

### 3. Frontend Setup (Vite)

In a separate terminal window, from `maddu-new/`:

```bash
cd maddu-new
npm install
npm run dev
```

Open your browser at: **`http://localhost:3000`**

To produce an optimized production build:
```bash
npm run build
```

---

## 🔑 Demo Accounts & Test Credentials

The platform features an instant **1-Click Role Switcher** in the top navigation bar. You can also log in directly using mobile OTP verification (in development mode, OTP is fixed to `123456`):

| Role | Name | Phone Number | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | Senthil Nathan | `+91 90000 00001` | Lock Funds in Escrow, Release Funds to Breeder, Delete Listings, Full Platform Audit |
| **Seller / Breeder** | Murugesan K | `+91 90000 00002` | Post Livestock, Manage Farm Listings, View Deposits, Book Vet Appointments |
| **Buyer** | Anand Murthy | `+91 90000 00004` | Browse Bazaar, Escrow Purchase, Track Bolero, Scan Health Tag, Book Vet |
| **Veterinarian** | Dr. Radhakrishnan | `+91 90000 00006` | View Consultation Queue, Conduct 1080p Tele-Vet Calls, Issue Rx Prescriptions |

---

## 📡 REST API Reference

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/v1/auth/otp/send` | Request 6-digit mobile OTP | No |
| `POST` | `/api/v1/auth/otp/verify` | Verify OTP and issue JWT access token | No |
| `POST` | `/api/v1/auth/refresh` | Rotate expired JWT access token | Yes |
| `GET` | `/api/v1/listings` | Fetch livestock, fodder & machinery listings | No |
| `POST` | `/api/v1/listings` | Create a new listing | Yes (Seller/Admin) |
| `GET` | `/api/v1/listings/{id}` | Retrieve listing by ID | No |
| `POST` | `/api/v1/listings/{id}/contact` | Reveal seller contact with audit record | No |
| `POST` | `/api/v1/orders` | Create an Escrow order for animal or fodder | Yes (Buyer) |
| `GET` | `/api/v1/orders/my-orders` | Fetch user purchase & sales orders | Yes |
| `POST` | `/api/v1/orders/{id}/mock-pay` | Lock funds into escrow vault | Yes (Admin) |
| `POST` | `/api/v1/orders/{id}/release-escrow` | Release funds to breeder | Yes (Admin Only) |
| `GET` | `/api/v1/mandi/rates` | Fetch daily APMC mandi rates | No |
| `GET` | `/api/v1/mandi/shandies` | List weekly southern livestock shandies | No |
| `GET` | `/api/v1/schemes` | List real government livestock schemes | No |
| `POST` | `/api/v1/schemes/{id}/apply` | Submit facilitation application | Yes |
| `GET` | `/api/v1/admin/listings` | Admin view of all platform listings | Yes (Admin Only) |

---

## 📜 License & Acknowledgements

- **License**: MIT License — open for academic, agricultural, and commercial extension.
- **Standards Alignment**:
  - Aligned with the **National Digital Livestock Mission (NDLM)**.
  - Formatted to support **INAPH (Information Network for Animal Productivity & Health)** ear-tag protocols.
  - Weight estimations conform to **Shaeffer's Formula** validated by veterinary universities (TANUVAS, KVASU, SVVU).

---

<div align="center">
  <sub>Built with ❤️ for Southern India's Dairy Farmers & Rural Agriculture Community</sub>
</div>
