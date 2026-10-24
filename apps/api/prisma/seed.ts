import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding DakshinAgriHub database...");

  // Clear existing records in proper relational order
  await prisma.review.deleteMany();
  await prisma.orderEvent.deleteMany();
  await prisma.truckBooking.deleteMany();
  await prisma.order.deleteMany();
  await prisma.enquiry.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.vaccination.deleteMany();
  await prisma.listingImage.deleteMany();
  await prisma.report.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.fodderListing.deleteMany();
  await prisma.equipmentListing.deleteMany();
  await prisma.mandiAlert.deleteMany();
  await prisma.schemeApplication.deleteMany();
  await prisma.scheme.deleteMany();
  await prisma.shandy.deleteMany();
  await prisma.mandiRate.deleteMany();
  await prisma.vetRequest.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.otpCode.deleteMany();
  await prisma.sellerProfile.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create Core Test Users
  const admin = await prisma.user.create({
    data: {
      phone: "+919000000001",
      name: "Dakshin Admin Officer",
      roles: "ADMIN,BUYER,SELLER",
      state: "TN",
      district: "Chennai",
      language: "en",
    },
  });

  const seller1 = await prisma.user.create({
    data: {
      phone: "+919000000002",
      name: "Senthil Kumar (Kangayam Farm)",
      roles: "BUYER,SELLER",
      state: "TN",
      district: "Tiruppur",
      language: "ta",
      sellerProfile: {
        create: {
          displayName: "Senthil Kumar (Kangayam Heritage Farm)",
          village: "Kangeyam",
          district: "Tiruppur",
          stateId: "TN",
          status: "APPROVED",
          verifiedAt: new Date(),
        },
      },
    },
  });

  const seller2 = await prisma.user.create({
    data: {
      phone: "+919000000003",
      name: "Venkateswara Rao",
      roles: "BUYER,SELLER",
      state: "AP",
      district: "Prakasam",
      language: "te",
      sellerProfile: {
        create: {
          displayName: "Ongole Pedigree Stud Breeders",
          village: "Ongole",
          district: "Prakasam",
          stateId: "AP",
          status: "APPROVED",
          verifiedAt: new Date(),
        },
      },
    },
  });

  const buyer1 = await prisma.user.create({
    data: {
      phone: "+919000000004",
      name: "Anand Murthy",
      roles: "BUYER",
      state: "KA",
      district: "Mysuru",
      language: "kn",
    },
  });

  const buyer2 = await prisma.user.create({
    data: {
      phone: "+919000000005",
      name: "K. Ramanathan",
      roles: "BUYER",
      state: "TN",
      district: "Thanjavur",
      language: "ta",
    },
  });

  const vet = await prisma.user.create({
    data: {
      phone: "+919000000006",
      name: "Dr. K. Sudhakar MVSc",
      roles: "VET,BUYER",
      state: "TN",
      district: "Coimbatore",
      language: "ta",
    },
  });

  console.log("✅ Created 6 test users (Admin, 2 Approved Sellers, 2 Buyers, 1 Vet)");

  // 2. Create 9 Verified Livestock Listings
  const listingsData = [
    {
      sellerId: seller1.id,
      title: "Pure Kangayam Heritage Milch Cow with Heifer Calf",
      breed: "Kangayam",
      category: "CATTLE",
      stateId: "TN",
      district: "Kangeyam, Tiruppur",
      price: 68000,
      dailyYield: 7.5,
      lactation: 2,
      pregnancyStatus: "Artificial Insemination done (45 days)",
      earTagId: "TN-3304-9812-4410",
      earTagVerified: true,
      ageMonths: 44,
      estimatedWeight: 360,
      heartGirthCm: 168,
      bodyLengthCm: 138,
      diet: "Grazing in Kangayam Korangadu grassland + 3kg CO-4 Super Napier",
      description: "Authentic indigenous Kangayam cow known for high A2 milk quality and drought resilience.",
      imageUrl: "https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&w=800&q=80",
      vaccinations: [
        { name: "Foot & Mouth Disease (FMD)", date: "15 Jan 2026", certifiedBy: "TNAU Vet Asst" },
        { name: "Black Quarter (BQ)", date: "02 Feb 2026", certifiedBy: "Govt Vet Hospital" },
      ],
    },
    {
      sellerId: seller2.id,
      title: "Magnificent Ongole Breeding Stud Bull (Chittoor / Prakasam Lineage)",
      breed: "Ongole",
      category: "CATTLE",
      stateId: "AP",
      district: "Ongole, Prakasam",
      price: 115000,
      dailyYield: 0,
      lactation: 0,
      pregnancyStatus: "N/A (Breeding Bull)",
      earTagId: "AP-2801-7104-9923",
      earTagVerified: true,
      ageMonths: 36,
      estimatedWeight: 520,
      heartGirthCm: 194,
      bodyLengthCm: 152,
      diet: "Maize stover, sorghum stover, subabul fodder, mineral mixture 50g daily",
      description: "Exceptional Ongole pedigree stud bull. Ideal for cross-breeding resistance.",
      imageUrl: "https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&w=800&q=80",
      vaccinations: [{ name: "FMD Quadrivalent", date: "20 Jan 2026", certifiedBy: "AP AH Dept" }],
    },
    {
      sellerId: seller1.id,
      title: "Hallikar Majestic Working Bull Pair (Trained for Plough & Cart)",
      breed: "Hallikar",
      category: "CATTLE",
      stateId: "KA",
      district: "Hassan / Mandya",
      price: 145000,
      dailyYield: 0,
      lactation: 0,
      pregnancyStatus: "N/A (Draft Pair)",
      earTagId: "KA-4903-8821-1205",
      earTagVerified: true,
      ageMonths: 48,
      estimatedWeight: 840,
      heartGirthCm: 182,
      bodyLengthCm: 145,
      diet: "Ragi straw, sugarcane tops, green lucerne, horsegram concentrate",
      description: "Pair of trained Hallikar bullocks with backward-curved horns and energetic trot.",
      imageUrl: "https://images.unsplash.com/photo-1596733430284-f7437764b1a9?auto=format&fit=crop&w=800&q=80",
      vaccinations: [{ name: "FMD Booster", date: "10 Feb 2026", certifiedBy: "KA AH Dept" }],
    },
    {
      sellerId: seller2.id,
      title: "Registered Miniature Punganur Cow (A2 High Fat Milk)",
      breed: "Punganur",
      category: "CATTLE",
      stateId: "AP",
      district: "Punganur, Chittoor",
      price: 180000,
      dailyYield: 4.0,
      lactation: 1,
      pregnancyStatus: "Not Pregnant",
      earTagId: "AP-8823-1194-0012",
      earTagVerified: true,
      ageMonths: 32,
      estimatedWeight: 165,
      heartGirthCm: 122,
      bodyLengthCm: 98,
      diet: "Fresh cut green grass, groundnut haulms, jaggery water with mineral salt",
      description: "Rare certified Punganur dwarf cow. Height is under 90 cm at withers.",
      imageUrl: "https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=800&q=80",
      vaccinations: [{ name: "FMD & BQ Combined", date: "08 Jan 2026", certifiedBy: "SVVU Tirupati" }],
    },
    {
      sellerId: seller1.id,
      title: "Pure Vechur Ultra-Compact Milch Cow (Kerala KVASU Lineage)",
      breed: "Vechur",
      category: "CATTLE",
      stateId: "KL",
      district: "Thrissur / Kottayam",
      price: 85000,
      dailyYield: 3.5,
      lactation: 2,
      pregnancyStatus: "Confirmed 3 Months Inseminated",
      earTagId: "KL-1209-6634-7711",
      earTagVerified: true,
      ageMonths: 38,
      estimatedWeight: 140,
      heartGirthCm: 116,
      bodyLengthCm: 92,
      diet: "Guinea grass, rice congee with coconut cake, azolla 500g",
      description: "World's smallest cattle breed. Highly resistant to tick-borne fever.",
      imageUrl: "https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&w=800&q=80",
      vaccinations: [{ name: "FMD Raksha Bio", date: "22 Jan 2026", certifiedBy: "KVASU Mannuthy" }],
    },
    {
      sellerId: seller1.id,
      title: "Malabari (Tellicherry) Twin-Kidding Dairy Goat with Kids",
      breed: "Malabari Goat",
      category: "GOAT",
      stateId: "KL",
      district: "Kozhikode / Palakkad",
      price: 24000,
      dailyYield: 2.2,
      lactation: 3,
      pregnancyStatus: "Delivered 2 Female Kids 3 weeks ago",
      earTagId: "KL-7721-4402-9988",
      earTagVerified: true,
      ageMonths: 28,
      estimatedWeight: 38,
      heartGirthCm: 68,
      bodyLengthCm: 64,
      diet: "Jackfruit leaves, Subabul (Leucaena), wheat bran and salt lick",
      description: "High prolifacy Malabari doe with two healthy female kids included.",
      imageUrl: "https://images.unsplash.com/photo-1524024973431-2ad916746881?auto=format&fit=crop&w=800&q=80",
      vaccinations: [{ name: "PPR Lifelong Active", date: "05 Nov 2025", certifiedBy: "KL AH Dept" }],
    },
    {
      sellerId: seller2.id,
      title: "High-Yield Grade Murrah Dairy Buffalo (14 Litres Capacity)",
      breed: "Murrah Cross",
      category: "BUFFALO",
      stateId: "TG",
      district: "Karimnagar / Warangal",
      price: 92000,
      dailyYield: 14.0,
      lactation: 2,
      pregnancyStatus: "Fresh Calver (22 days)",
      earTagId: "TG-5520-1928-3341",
      earTagVerified: true,
      ageMonths: 52,
      estimatedWeight: 490,
      heartGirthCm: 188,
      bodyLengthCm: 148,
      diet: "Green maize stover 25kg, dry paddy straw 6kg, cotton seed concentrate 4kg",
      description: "Jet-black Murrah buffalo with curled horns. Consistent 14L/day morning+evening milking.",
      imageUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80",
      vaccinations: [{ name: "HS & BQ Combined", date: "12 Dec 2025", certifiedBy: "TG Dairy Dept" }],
    },
    {
      sellerId: seller1.id,
      title: "Certified Nicobari Indigenous Backyard Poultry Flock (12 Birds)",
      breed: "Nicobari Fowl",
      category: "POULTRY",
      stateId: "AN",
      district: "South Andaman (Port Blair)",
      price: 10800,
      dailyYield: 0,
      lactation: 0,
      pregnancyStatus: "High Egg Layer Batch",
      earTagId: "AN-9901-2041-6677",
      earTagVerified: true,
      ageMonths: 7,
      estimatedWeight: 1.8,
      diet: "Island coconut meat scraps, crushed maize and kitchen green waste",
      description: "Endemic to Nicobar Islands, bred for extreme disease resistance against coastal dampness.",
      imageUrl: "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=800&q=80",
      vaccinations: [{ name: "Ranikhet (RDV F1 & LaSota)", date: "02 Jan 2026", certifiedBy: "ICAR-CIARI Port Blair" }],
    },
    {
      sellerId: seller1.id,
      title: "Lakshadweep Coastal Raised-Slat Island Goat Pair",
      breed: "Island Dwarf Cross",
      category: "GOAT",
      stateId: "LD",
      district: "Kavaratti Island",
      price: 21000,
      dailyYield: 1.5,
      lactation: 1,
      pregnancyStatus: "Pregnant (60 days)",
      earTagId: "LD-6632-1109-8832",
      earTagVerified: true,
      ageMonths: 20,
      estimatedWeight: 24,
      diet: "Coconut fronds, dried grass bundles imported via Kochi port",
      description: "Specially adapted to island climate and saline air. Slat-reared with zero foot-rot.",
      imageUrl: "https://images.unsplash.com/photo-1524024973431-2ad916746881?auto=format&fit=crop&w=800&q=80",
      vaccinations: [{ name: "PPR Island Immunization", date: "10 Dec 2025", certifiedBy: "LD AH Dept" }],
    },
  ];

  for (const item of listingsData) {
    const { vaccinations, imageUrl, ...listingPayload } = item;
    const created = await prisma.listing.create({
      data: {
        ...listingPayload,
        images: {
          create: [{ url: imageUrl, order: 0 }],
        },
        vaccinations: {
          create: vaccinations,
        },
      },
    });
  }
  console.log(`✅ Seeded ${listingsData.length} livestock listings with images and vaccinations`);

  // 3. Create Fodder Listings
  await prisma.fodderListing.createMany({
    data: [
      {
        sellerId: seller1.id,
        title: "CO-4 / Super Napier Green Grass Fresh Harvest",
        type: "Green Fodder",
        stateId: "TN",
        district: "Thanjavur Delta",
        pricePerUnit: "₹2.20 / kg",
        unit: "kg",
        moisture: "75%",
        crudeProtein: "10.5%",
        minOrder: "1.5 Tonnes (1500 kg)",
        deliveryTerms: "Truck delivery across TN, Puducherry & Chittoor within 24h",
        imageUrl: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80",
      },
      {
        sellerId: seller2.id,
        title: "Mechanized Baled Dry Paddy Straw (High Density Bales)",
        type: "Dry Roughage",
        stateId: "AP",
        district: "West Godavari (Eluru)",
        pricePerUnit: "₹180 / 25kg Bale (₹7.20 / kg)",
        unit: "bale",
        moisture: "12%",
        crudeProtein: "4.2%",
        minOrder: "150 Bales",
        deliveryTerms: "Direct transit to drought-hit Rayalaseema & North Karnataka",
        imageUrl: "https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=800&q=80",
      },
    ],
  });

  // 4. Create Equipment Listings
  await prisma.equipmentListing.createMany({
    data: [
      {
        sellerId: seller1.id,
        title: "16-Litre Hexacopter Agricultural Spraying Drone with Pilot",
        serviceType: "Drone Spraying for Fodder / Paddy / Coconut",
        stateId: "TN",
        district: "Salem / Erode / Coimbatore",
        ratePerHour: "₹450 / Acre",
        ratePerDay: "₹4,000 / Day",
        availability: "7 days a week",
        imageUrl: "https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=800&q=80",
      },
      {
        sellerId: seller2.id,
        title: "45 HP Mahindra 4WD Tractor with 42-Blade Rotavator & MB Plough",
        serviceType: "Land Prep & Plowing",
        stateId: "AP",
        district: "Guntur / Vijayawada",
        ratePerHour: "₹950 / Hour",
        ratePerDay: "₹7,500 / Day",
        availability: "Same-day booking",
        imageUrl: "https://images.unsplash.com/photo-1530267981375-f0de937f5f13?auto=format&fit=crop&w=800&q=80",
      },
    ],
  });

  // 5. Create 12 Weekly Shandies
  await prisma.shandy.createMany({
    data: [
      {
        id: "anthiyur",
        name: "Anthiyur Horse & Cattle Sandhai",
        state: "Tamil Nadu",
        stateId: "TN",
        district: "Erode",
        dayOfWeek: "Wednesday (Weekly)",
        timings: "05:00 AM - 02:00 PM",
        capacity: "8,000+ Cattle & Horses",
        primaryBreeds: "Kangayam Bull & Cow, Bargur Cattle, Mecheri Sheep",
        entryFee: "₹40 per adult cow / bull",
        highlight: "Asia's famous historical livestock shandy. Renowned for pure Kangayam draft bullocks and milking cows.",
        lat: 11.5833,
        lng: 77.5833,
      },
      {
        id: "pollachi",
        name: "Pollachi Cattle & Goat Sandhai",
        state: "Tamil Nadu",
        stateId: "TN",
        district: "Coimbatore",
        dayOfWeek: "Tuesday & Thursday",
        timings: "04:30 AM - 01:00 PM",
        capacity: "6,500+ Animals",
        primaryBreeds: "Kangayam, Crossbred HF & Jersey, Kanni Goats",
        entryFee: "₹35 per animal",
        highlight: "Crucial border hub connecting Tamil Nadu and Kerala (Palakkad corridor). Heavy trade for milch cattle.",
        lat: 10.6609,
        lng: 77.0048,
      },
      {
        id: "chintamani",
        name: "Chintamani Cattle Shandy",
        state: "Karnataka",
        stateId: "KA",
        district: "Chikkaballapur",
        dayOfWeek: "Sunday (Weekly)",
        timings: "06:00 AM - 03:00 PM",
        capacity: "5,000+ Hallikar & HF Cattle",
        primaryBreeds: "Hallikar Draft Cattle, Amritmahal, Bannur Sheep",
        entryFee: "₹50 per cattle unit",
        highlight: "Primary hub for Hallikar heritage cattle lovers and high-yield HF crossbred dairy cows.",
        lat: 13.4,
        lng: 78.0667,
      },
      {
        id: "madanapalle",
        name: "Madanapalle Cattle Market",
        state: "Andhra Pradesh",
        stateId: "AP",
        district: "Annamayya / Chittoor",
        dayOfWeek: "Sunday (Weekly)",
        timings: "06:00 AM - 02:00 PM",
        capacity: "6,000+ Animals",
        primaryBreeds: "Punganur Miniature, Ongole Cattle, Nellore Sheep",
        entryFee: "₹40 per cattle unit",
        highlight: "Close to Punganur ancestral belt. Buyers from TN, Karnataka, and AP gather here weekly.",
        lat: 13.55,
        lng: 78.5,
      },
      {
        id: "erragadda",
        name: "Erragadda Weekly Pashu Shandy",
        state: "Telangana",
        stateId: "TG",
        district: "Hyderabad",
        dayOfWeek: "Thursday (Weekly)",
        timings: "05:30 AM - 01:30 PM",
        capacity: "4,500+ Goats, Buffaloes & Poultry",
        primaryBreeds: "Murrah Buffaloes, Deoni Cattle, Mahabubnagar Goats",
        entryFee: "₹25 per goat / ₹60 per buffalo",
        highlight: "Urban crossroads market with rapid cash liquidity and veterinary inspection desk.",
        lat: 17.4578,
        lng: 78.4326,
      },
      {
        id: "vaniyankulam",
        name: "Vaniyamkulam Historic Shandy",
        state: "Kerala",
        stateId: "KL",
        district: "Palakkad",
        dayOfWeek: "Thursday (Weekly)",
        timings: "05:00 AM - 02:30 PM",
        capacity: "7,000+ Cattle & Buffaloes",
        primaryBreeds: "Vechur Cross, Malabari Goat, Tamil Nadu Transit Dairy Stock",
        entryFee: "₹50 per cattle unit",
        highlight: "Kerala's largest cattle trade center. Strictly regulated animal health checkpoint by Kerala AH Dept.",
        lat: 10.7833,
        lng: 76.3167,
      },
    ],
  });

  // 6. Create Mandi Rates
  await prisma.mandiRate.createMany({
    data: [
      {
        market: "Erode Wholesale Mandi",
        state: "Tamil Nadu",
        commodity: "Turmeric (Finger Quality)",
        minPrice: "₹13,800",
        maxPrice: "₹14,500",
        modalPrice: "₹14,250",
        arrivalDate: "Today",
      },
      {
        market: "Guntur Mirchi Yard",
        state: "Andhra Pradesh",
        commodity: "Teja Dry Red Chilli",
        minPrice: "₹18,500",
        maxPrice: "₹20,500",
        modalPrice: "₹19,800",
        arrivalDate: "Today",
      },
      {
        market: "Kolar APMC Mandi",
        state: "Karnataka",
        commodity: "Hybrid Tomatoes",
        minPrice: "₹28",
        maxPrice: "₹36",
        modalPrice: "₹32",
        unit: "kg",
        arrivalDate: "Today",
      },
      {
        market: "Thrissur District Agro Mandi",
        state: "Kerala",
        commodity: "Nendran Banana (Raw)",
        minPrice: "₹42",
        maxPrice: "₹50",
        modalPrice: "₹46",
        unit: "kg",
        arrivalDate: "Today",
      },
    ],
  });

  // 7. Create Government Schemes
  await prisma.scheme.createMany({
    data: [
      {
        name: "National Livestock Mission (NLM)",
        authority: "Central",
        description: "50% capital subsidy up to ₹50 Lakhs for commercial goat, sheep, and fodder entrepreneurship.",
        eligibility: "Farmers, SHGs, JLGs, FPOs and individual entrepreneurs with minimum land holding.",
        benefit: "Up to ₹50 Lakhs direct capital subsidy released in two installments.",
        applyUrl: "https://nlm.udyamimitra.in/",
      },
      {
        name: "Tamil Nadu Free Milch Cow & Goat Distribution Scheme",
        authority: "State",
        stateId: "TN",
        description: "100% state sponsored 4 female goats/sheep for rural women under poverty line.",
        eligibility: "Landless agricultural women labourers with family income below ₹72,000/year.",
        benefit: "4 healthy female goats/sheep provided completely free with 1-year health insurance.",
        applyUrl: "https://ahd.tn.gov.in/",
      },
      {
        name: "Karnataka Pashu Bhagya Scheme",
        authority: "State",
        stateId: "KA",
        description: "33% subsidy (up to 50% for SC/ST) on bank loan to establish dairy unit of 2 cows.",
        eligibility: "Small and marginal farmers of Karnataka holding Aadhaar and bank account.",
        benefit: "Direct subsidy credited to bank loan account with interest subvention.",
        applyUrl: "https://ahvs.karnataka.gov.in/",
      },
      {
        name: "Andhra Pradesh YSR Cheyutha & Pashu Kranthi",
        authority: "State",
        stateId: "AP",
        description: "Financial support of ₹75,000 for SC/ST/BC women to procure cows, buffaloes, or goats.",
        eligibility: "Women aged 45-60 years belonging to SC/ST/BC/Minority communities.",
        benefit: "₹18,750 per year for 4 years directly into beneficiary bank account.",
        applyUrl: "https://navasakam.ap.gov.in/",
      },
    ],
  });

  console.log("🌾 Database successfully seeded with authentic Southern India data!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
