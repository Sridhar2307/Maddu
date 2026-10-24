# 🌾 DakshinAgriHub — Full-Stack Monorepo

**Southern India Integrated Agri-Livestock, Mandi & Tele-Vet Ecosystem**  
Covering **5 Southern States** (*Tamil Nadu, Andhra Pradesh, Telangana, Karnataka, Kerala*) and **3 Union Territories** (*Puducherry, Andaman & Nicobar Islands, Lakshadweep*).

---

## 🏗️ Monorepo Architecture

```
maddu-web/
├── apps/
│   ├── api/                    # Express + TypeScript + Prisma ORM Backend (Port 4000)
│   │   ├── prisma/             # 18 Prisma models, migrations, & comprehensive seed data
│   │   ├── src/
│   │   │   ├── routes/         # auth, listings, orders, mart, mandi, pashucare, schemes
│   │   │   ├── services/       # otp, tokens, storage, escrow, passport (pdfkit + qrcode)
│   │   │   ├── middleware/     # auth, rbac, rate-limit, errorHandler
│   │   │   └── server.ts
│   │   └── tests/              # 35 automated Vitest + Supertest integration tests
│   └── web/                    # Vite + Vanilla JS Frontend (Port 3000 with API proxy)
│       ├── src/
│       │   ├── api/client.js   # JWT auto-refresh rotation, auth store & API bindings
│       │   ├── data/           # regions, translations (6 languages: en, ta, te, kn, ml, hi)
│       │   ├── index.css       # Responsive touch-friendly design tokens & aesthetic UI
│       │   └── main.js         # Reactive tabs, modals, and real backend actions
│       ├── index.html
│       └── vite.config.js
├── packages/
│   └── shared/                 # Shared Zod validation schemas & TypeScript contracts
├── docker-compose.yml          # Production Docker setup (Postgres 16 + API + Web)
├── .env.example                # Documented configuration variables
└── package.json                # Workspace root with concurrently scripts
```

---

## ⚡ Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Build Shared Schemas & Generate Database
```bash
npm run --workspace=@dakshin/shared build
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
```

### 3. Run Backend & Frontend Concurrently
```bash
npm run dev
```
- **Web App**: [http://localhost:3000](http://localhost:3000)
- **API Server**: [http://localhost:4000](http://localhost:4000)
- **API Health**: [http://localhost:4000/api/v1/health](http://localhost:4000/api/v1/health)

---

## 🧪 Automated Test Suite

Run the full end-to-end integration test suite (**35 tests passing**):
```bash
npm test
```

### Test Coverage Highlights:
- **`auth.test.ts` (9 tests)**: Health check, phone OTP send & bcrypt verification, JWT access + rotated httpOnly refresh cookie, 1-click seller application upgrade, secure logout.
- **`listings.test.ts` (8 tests)**: Public phone number masking, BUYER 403 forbidden protection on post, SELLER 201 creation, IDOR update/delete protections, unmasked contact reveal with rate-limiting and audit logging.
- **`orders.test.ts` (9 tests)**: Concurrency guard (**409 Conflict** on duplicate animal order), Razorpay test order creation, webhook signature verification, complete escrow lifecycle (`CREATED` → `PAYMENT_HELD` → `DISPATCHED` → `DELIVERED` → `RELEASED`), and server freight calculation.
- **`modules.test.ts` (9 tests)**: Agmarknet APMC rates caching with staleness indicator, weekly livestock shandies, real price alerts, first-aid symptom reference with medical disclaimer, emergency helpline dispatch, subsidy application facilitation (`DAH-SCH-YYYY-XXXXX`), and **real digital passport PDF generation (`%PDF-`) with QR code**.

---

## 👥 Seeded Test User Accounts

For immediate evaluation, the top bar includes a **1-click Role Switcher** (`Test As: [Buyer] [Seller] [Vet] [Admin]`):

| Role | Name | Phone | Location | Permissions |
|---|---|---|---|---|
| **ADMIN** | Senthil Nathan (Admin) | `+919000000001` | Chennai, TN | Full platform audit, dispute resolution, vet/seller approvals |
| **SELLER** | Murugesan K (Breeder) | `+919000000002` | Erode, TN | Post & manage Kangayam cattle, view buyer orders |
| **SELLER** | Venkat Reddy (Dairy) | `+919000000003` | Guntur, AP | Post Ongole cattle, manage listings |
| **BUYER** | Anand Murthy | `+919000000004` | Bengaluru, KA | Browse, contact sellers, buy with escrow, book trucks |
| **BUYER** | Rajesh Varma | `+919000000005` | Madurai, TN | Browse, reserve livestock, apply for subsidies |
| **VET** | Dr. Radhakrishnan (Vet) | `+919000000006` | Namakkal, TN | Answer tele-vet consultation tickets, verify passports |

*Note: In development and test mode, OTP is logged to console and prefilled via `debugOtp`.*

---

## 🔒 Security & Privacy Implementation

1. **Anti-Scraping Phone Masking**: Public endpoints return masked phone numbers (`+91 98421XXXXX`). Clicking **"Contact"** calls `POST /api/v1/listings/:id/contact`, which checks authentication, enforces a rate limit (20 reveals/day), logs an audit trail, and reveals the unmasked number.
2. **Concurrency / Double-Selling Guard**: When an order is placed, Prisma checks if any pending or held order exists for that animal. If so, it returns `409 ANIMAL_ALREADY_RESERVED`.
3. **IDOR Protection**: Sellers can only update or delete listings they own.
4. **Watermarked Digital Passports**: Generated via `pdfkit` and `qrcode` at `GET /api/v1/listings/:id/passport.pdf`. Displays a prominent watermark: **"SELF-DECLARED"** unless ear-tag verified by an Admin/Vet.
5. **Medical Disclaimer**: Veterinary symptom guides include a mandatory disclaimer: *"Informational only - consult a registered veterinarian. DakshinAgriHub does not diagnose medical conditions."*

---

## 🌐 Multi-Language & Multi-State Support

Full UI and data parity across **6 Languages** and **8 Southern Regions**:
- **Languages**: English (`en`), தமிழ் (`ta`), తెలుగు (`te`), ಕನ್ನಡ (`kn`), മലയാളം (`ml`), हिन्दी (`hi`)
- **States & UTs**: Tamil Nadu (`TN`), Andhra Pradesh (`AP`), Telangana (`TG`), Karnataka (`KA`), Kerala (`KL`), Puducherry (`PY`), Andaman & Nicobar Islands (`AN`), Lakshadweep (`LD`).
