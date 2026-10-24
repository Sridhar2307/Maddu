export const REGIONS = {
  ALL: {
    id: "ALL",
    name: "All Southern States & UTs",
    localName: "அனைத்து தென் மாநிலங்கள் / అన్ని దక్షిణ రాష్ట్రాలు",
    short: "South Zone",
    capital: "Regional Hubs",
    primaryLang: "en",
    nativeBreeds: ["Kangayam", "Ongole", "Hallikar", "Punganur", "Umblachery", "Vechur", "Malabari Goat", "Bannur Sheep", "Nicobari Fowl"],
    subsidies: [
      { name: "National Livestock Mission (NLM)", desc: "50% capital subsidy up to ₹50 Lakhs for commercial goat, sheep, and fodder entrepreneurship.", tag: "Central" },
      { name: "Rashtriya Gokul Mission", desc: "Subsidized sex-sorted semen doses and indigenous breed genetic multiplication centers.", tag: "Central" }
    ]
  },
  TN: {
    id: "TN",
    name: "Tamil Nadu",
    localName: "தமிழ்நாடு",
    short: "TN",
    capital: "Chennai",
    primaryLang: "ta",
    hubs: ["Coimbatore", "Erode", "Madurai", "Thanjavur", "Salem", "Tirupur"],
    nativeBreeds: ["Kangayam", "Bargur", "Umblachery", "Pulikulam", "Alambadi", "Mecheri Sheep", "Kanni Goat", "Salem Black Goat"],
    fodderTypes: ["CO-4 Super Napier", "Paddy Straw", "Corn Silage", "Groundnut Cake"],
    shandies: ["Anthiyur Sandhai (Wednesday)", "Pollachi Sandhai (Tuesday)", "Kundadam Sandhai (Saturday)", "Manapparai Sandhai (Wednesday)"],
    subsidies: [
      { name: "Free Milch Cow & Goat Distribution Scheme", desc: "100% state sponsored 4 female goats/sheep for rural women under poverty line.", tag: "TN Animal Husbandry" },
      { name: "Paddy Straw Silage & Chaff Cutter Subsidy", desc: "Up to 50% subsidy on mechanized chaff cutters and mini-balers through Uzhavan App.", tag: "TN Agriculture" },
      { name: "Kalaignar All Village Integrated Agri Development", desc: "Micro-irrigation, solar pump set assistance, and fallow land conversion grant.", tag: "TN State Scheme" }
    ]
  },
  AP: {
    id: "AP",
    name: "Andhra Pradesh",
    localName: "ఆంధ్రప్రదేశ్",
    short: "AP",
    capital: "Amaravati",
    primaryLang: "te",
    hubs: ["Vijayawada", "Guntur", "Visakhapatnam", "Tirupati", "Chittoor", "Ongole"],
    nativeBreeds: ["Ongole", "Punganur", "Nellore Sheep (Jodipi)", "Aseel Country Fowl"],
    fodderTypes: ["Sorghum Stover", "Maize Silage", "Super Napier", "Cottonseed Cake"],
    shandies: ["Madanapalle Livestock Shandy (Sunday)", "Chittoor Cattle Fair (Friday)", "Nandyal Market (Tuesday)"],
    subsidies: [
      { name: "YSR Cheyutha & Pashu Kranthi", desc: "Financial support of ₹75,000 in four phases for SC/ST/BC women to procure cows, buffaloes, or goats.", tag: "AP Welfare" },
      { name: "Punganur Breed Conservation Project", desc: "Special grant for maintaining registered Punganur miniature cattle nucleus herds.", tag: "AP Bio-Diversity" },
      { name: "Rythu Bharosa Kendra (RBK) Livestock Kit", desc: "Doorstep artificial insemination and mineral mixture distribution at 60% concession.", tag: "AP Agri" }
    ]
  },
  TG: {
    id: "TG",
    name: "Telangana",
    localName: "తెలంగాణ",
    short: "TG",
    capital: "Hyderabad",
    primaryLang: "te",
    hubs: ["Hyderabad", "Warangal", "Karimnagar", "Nizamabad", "Mahbubnagar", "Khammam"],
    nativeBreeds: ["Deoni", "Poda Thurpu", "Mahabubnagar Goat", "Nellore Brown Sheep"],
    fodderTypes: ["Hybrid Napier", "Redgram Husk", "Maize Silage", "Groundnut Haulms"],
    shandies: ["Erragadda Weekly Market (Thursday)", "Gajwel Livestock Market (Tuesday)", "Nalgonda Pashu Mandi (Monday)"],
    subsidies: [
      { name: "Special Sheep Distribution Scheme (SDD)", desc: "75% government subsidy on unit of 20+1 sheep for shepherd communities.", tag: "TG Animal Husbandry" },
      { name: "Vijaya Dairy Incentive", desc: "Direct benefit transfer incentive of ₹4 per liter for milk poured to government co-operatives.", tag: "TG Dairy" },
      { name: "Rythu Bandhu & Crop Diversification", desc: "Investment support of ₹10,000 per acre per year for fodder & millets.", tag: "TG Agriculture" }
    ]
  },
  KA: {
    id: "KA",
    name: "Karnataka",
    localName: "ಕರ್ನಾಟಕ",
    short: "KA",
    capital: "Bengaluru",
    primaryLang: "kn",
    hubs: ["Bengaluru", "Mysuru", "Mandya", "Kolar", "Hassan", "Belagavi", "Tumakuru"],
    nativeBreeds: ["Hallikar", "Amritmahal", "Krishna Valley", "Deoni", "Bannur Sheep", "Osmanabadi Cross Goat"],
    fodderTypes: ["Ragi Straw", "Maize Silage", "Lucerne", "Sugarcane Tops"],
    shandies: ["Chintamani Weekly Cattle Shandy (Sunday)", "T. Narasipura Sandhai (Thursday)", "Bailhongal Shandy (Monday)"],
    subsidies: [
      { name: "Pashu Bhagya Scheme", desc: "33% subsidy (up to 50% for SC/ST) on bank loan to establish dairy unit of 2 cows or 10 sheep/goats.", tag: "KA Animal Husbandry" },
      { name: "Ksheera Dhare Incentive", desc: "Direct subsidy of ₹5 per liter of milk supplied to KMF / Nandini milk unions.", tag: "KA KMF" },
      { name: "Krishi Yantra Dhare", desc: "Custom hire service centers for cheap farm machinery and fodder chaff cutters.", tag: "KA Agri" }
    ]
  },
  KL: {
    id: "KL",
    name: "Kerala",
    localName: "കേരളം",
    short: "KL",
    capital: "Thiruvananthapuram",
    primaryLang: "ml",
    hubs: ["Thrissur", "Palakkad", "Kozhikode", "Ernakulam", "Kollam", "Kottayam"],
    nativeBreeds: ["Vechur", "Kasaragod Dwarf", "Vadakara Dwarf", "Malabari (Tellicherry) Goat", "Attappady Black Goat"],
    fodderTypes: ["Hybrid Green Grass", "Concentrate Feed Pellets", "Silage Bags", "Spent Brewery Grain"],
    shandies: ["Vaniyamkulam Cattle Market (Thursday)", "Kuzhalmannam Shandy (Tuesday)", "Manjeri Shandy (Saturday)"],
    subsidies: [
      { name: "Ksheerasree Dairy Farmer Pension", desc: "Pension and health insurance program for traditional dairy farmers above 60 years.", tag: "KL Dairy Development" },
      { name: "Vechur Conservation Incentive", desc: "Direct calf rearing subsidy for preserving endangered micro-cattle breeds.", tag: "KL KVASU" },
      { name: "LAPTOP & AIMS Doorstep Tele-Vet", desc: "Subsidized mobile tele-veterinary clinic at farmer doorsteps across panchayats.", tag: "KL Govt" }
    ]
  },
  PY: {
    id: "PY",
    name: "Puducherry",
    localName: "புதுச்சேரி / పాండిచ్చేరి / മാഹി",
    short: "PY",
    capital: "Puducherry",
    primaryLang: "ta",
    hubs: ["Puducherry", "Karaikal", "Mahe", "Yanam"],
    nativeBreeds: ["Crossbred Jersey", "Kangayam Cross", "Kanni Goat", "Country Chicken"],
    fodderTypes: ["Paddy Straw", "Green Napier", "Rice Bran", "Coconut Oil Cake"],
    shandies: ["Madagadipet Weekly Market (Tuesday)", "Villianur Shandy (Sunday)"],
    subsidies: [
      { name: "Puducherry Perunthalaivar Kamarajar Dairy Scheme", desc: "75% subsidy for single milch animal purchase for landless agricultural labourers.", tag: "PY Dept of AH" },
      { name: "Fodder Minikit Free Distribution", desc: "Certified grass root slips and fodder seeds provided free of cost per acre.", tag: "PY Agri" }
    ]
  },
  AN: {
    id: "AN",
    name: "Andaman & Nicobar Islands",
    localName: "அந்தமான் & நிக்கோபார் / अండమాన్ & నికోబార్ / अंडमान व निकोबार",
    short: "A & N",
    capital: "Port Blair",
    primaryLang: "en",
    hubs: ["Port Blair", "Car Nicobar", "Diglipur", "Havelock", "Campbell Bay"],
    nativeBreeds: ["Nicobari Fowl (High Disease Resistance)", "Teressa Goat", "Andaman Local Buffalo"],
    fodderTypes: ["Coconut Copra Cake", "Tapioca Silage", "Mainland Imported Feed Pellets"],
    shandies: ["Junglighat Agricultural Market (Daily)", "Diglipur Island Mandi (Sunday)"],
    subsidies: [
      { name: "Island Livestock Development & Sea Freight Subsidy", desc: "50% sea-freight freight reimbursement on cattle feed transported by ship from Chennai/Vizag ports.", tag: "A&N Administration" },
      { name: "Nicobari Indigenous Poultry Multiplication Scheme", desc: "Free 20-bird backyard poultry starter kits with cage and starter mash.", tag: "ICAR-CIARI" },
      { name: "Organic Coconut & Spices Island Premium Grant", desc: "Zero chemical pesticide island organic export certification and buyback assistance.", tag: "A&N Agri" }
    ]
  },
  LD: {
    id: "LD",
    name: "Lakshadweep",
    localName: "ലക്ഷദ്വീപ് / இலட்சத்தீவுகள் / लक्षद्वीप",
    short: "LD",
    capital: "Kavaratti",
    primaryLang: "ml",
    hubs: ["Kavaratti", "Agatti", "Andrott", "Minicoy", "Amini"],
    nativeBreeds: ["Malabari Island Cross Goat", "Local Dwarf Poultry", "Dwarf Milch Cow"],
    fodderTypes: ["Concentrate Mineral Blocks", "Imported Dry Fodder Pellets (via Kochi)", "Copra Meal"],
    shandies: ["Kavaratti Jetty Market (Daily)", "Andrott Island Cooperative Mart (Wednesday)"],
    subsidies: [
      { name: "Inter-Island Vessel Fodder Transport Shield", desc: "100% subsidized sea shipping on livestock green silage bundles from Kochi harbor to Lakshadweep islands.", tag: "LD Animal Husbandry" },
      { name: "Backyard Island Dairy & Goat Unit Scheme", desc: "Unit subsidy of ₹35,000 for installing raised slat-floor goat houses to withstand monsoon moisture.", tag: "LD Rural Dev" },
      { name: "Virgin Coconut Oil & Copra Direct MSP", desc: "Guaranteed minimum support price of ₹120/kg for certified organic sun-dried island copra.", tag: "LD Agri Co-op" }
    ]
  }
};
