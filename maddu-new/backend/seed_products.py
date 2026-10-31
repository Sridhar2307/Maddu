import sys
sys.path.insert(0, 'maddu-new/backend')
from app.database.connection import SessionLocal
from app.database import models

db = SessionLocal()

items_to_seed = [
    models.Listing(
        id="fodder-201",
        seller_id="usr_seller_1",
        title="CO-4 / Super Napier Green Grass Fresh Harvest",
        breed="CO-4 Napier Hybrid",
        category="FODDER",
        state_id="TN",
        district="Thanjavur Delta",
        price=2.20,
        unit="kg",
        rate_unit="₹2.20 / kg",
        min_order="1.5 Tonnes (1500 kg)",
        min_order_qty=1500.0,
        available_qty="25 Tonnes",
        moisture="75%",
        protein="10.5% Crude Protein",
        image_url="/images/napier_grass.jpg",
        delivery_info="Truck delivery across TN, Puducherry & Chittoor within 24h",
        description="Fresh harvested CO-4 Napier grass cut at 45 days for optimal protein and palatability."
    ),
    models.Listing(
        id="fodder-202",
        seller_id="usr_seller_2",
        title="Mechanized Baled Dry Paddy Straw (High Density Bales)",
        breed="BPT 5204 Straw",
        category="FODDER",
        state_id="AP",
        district="West Godavari (Eluru)",
        price=180.0,
        unit="bale",
        rate_unit="₹180 / 25kg Bale (₹7.20 / kg)",
        min_order="150 Bales (Mini Truck load)",
        min_order_qty=150.0,
        available_qty="2,000 Bales",
        moisture="12% (Rain Protected)",
        protein="4.2% Crude Protein",
        image_url="/images/paddy_straw_bales.jpg",
        delivery_info="Direct transit to drought-hit Rayalaseema & North Karnataka",
        description="Tight machine-compressed paddy straw bales with low silica and high dry matter retention."
    ),
    models.Listing(
        id="fodder-203",
        seller_id="usr_seller_1",
        title="Fermented Sweet Corn Silage in 50kg Hermetic Bags",
        breed="Sweet Corn Silage",
        category="FODDER",
        state_id="KA",
        district="Mandya / Hassan",
        price=340.0,
        unit="bag",
        rate_unit="₹340 / 50kg Bag (₹6.80 / kg)",
        min_order="20 Bags (1 Tonne)",
        min_order_qty=20.0,
        available_qty="400 Bags (20 Tonnes)",
        moisture="65%",
        protein="9.2% CP + High Starch",
        image_url="/images/corn_silage.jpg",
        delivery_info="Ships anywhere in KA, KL, and TN",
        description="High-energy anaerobic fermented corn silage with cob grains included for improved milk fat."
    ),
    models.Listing(
        id="fodder-204",
        seller_id="usr_seller_1",
        title="Solvent-Extracted Expeller Groundnut Cake (Kadalai Punnakku)",
        breed="Groundnut Expeller",
        category="FODDER",
        state_id="TN",
        district="Pollachi, Coimbatore",
        price=38.0,
        unit="kg",
        rate_unit="₹38 / kg (₹1,900 / 50kg bag)",
        min_order="250 kg (5 Bags)",
        min_order_qty=250.0,
        available_qty="10 Tonnes",
        moisture="8%",
        protein="42% High Bypass Protein",
        image_url="/images/groundnut_cake.jpg",
        delivery_info="Daily supply to Kerala dairy co-operatives and Kongu farms",
        description="Expeller processed peanut cake rich in amino acids and bypass protein for lactating animals."
    ),
    models.Listing(
        id="equip-301",
        seller_id="usr_seller_1",
        title="16-Litre Hexacopter Agricultural Spraying Drone with Pilot",
        breed="Hexacopter Spray Drone",
        category="EQUIPMENT",
        state_id="TN",
        district="Salem / Erode / Coimbatore",
        price=450.0,
        unit="acre",
        rate_unit="₹450 / Acre (Includes GPS mapping & battery charge)",
        available_qty="7 Days / Week",
        specs="16-Litre chemical tank, 4 misting atomizers, 4m spray swath, dual RTK positioning",
        operator_info="Certified Drone Pilot & Field Assistant Included",
        service_coverage="Salem, Erode, Coimbatore, Namakkal (50km radius)",
        image_url="/images/spraying_drone.jpg",
        description="Commercial-grade agricultural drone with DGCA-certified pilot for precision foliar spraying."
    ),
    models.Listing(
        id="equip-302",
        seller_id="usr_seller_1",
        title="Heavy Duty 3HP Electric Grass & Straw Chaff Cutter (Custom Hire)",
        breed="Electric Chaff Cutter",
        category="EQUIPMENT",
        state_id="KA",
        district="Bengaluru Rural / Kolar",
        price=350.0,
        unit="hour",
        rate_unit="₹350 / Hour or ₹1,800 / Full Day",
        available_qty="Same Day Mini-Auto Delivery",
        specs="3HP Crompton single-phase motor, 3 reverse-action manganese blades, 800-1000 kg/hr output",
        operator_info="Operator & Technician Available on Request",
        service_coverage="Kolar, Hoskote, Malur, Devanahalli",
        image_url="/images/chaff_cutter.jpg",
        description="Portable electric chaff cutter delivered to your cattle shed. Cuts Napier, maize, and sorghum stems to 1.5 cm."
    ),
    models.Listing(
        id="equip-303",
        seller_id="usr_seller_2",
        title="45 HP Mahindra 4WD Tractor with 42-Blade Rotavator & MB Plough",
        breed="Mahindra 4WD Tractor",
        category="EQUIPMENT",
        state_id="AP",
        district="Guntur / Vijayawada",
        price=950.0,
        unit="hour",
        rate_unit="₹950 / Hour (With Diesel & Operator)",
        available_qty="Book by Pincode Radius",
        specs="45 HP DI Engine, 4WD High Traction, Shaktiman 42-blade heavy rotavator, hydraulic MB plough",
        operator_info="Skilled Driver & Diesel Fuel Included",
        service_coverage="Guntur, Amaravati, Tenali, Mangalagiri, Vijayawada",
        image_url="/images/mahindra_tractor.jpg",
        description="Heavy-duty 4WD tractor with skilled driver and diesel included. Ideal for wet puddle land and deep summer plowing."
    ),
    models.Listing(
        id="equip-304",
        seller_id="usr_seller_1",
        title="Kubota DC-68G High-Performance Combine Harvester (Paddy & Millets)",
        breed="Combine Harvester",
        category="EQUIPMENT",
        state_id="TN",
        district="Thanjavur / Tiruvarur",
        price=1800.0,
        unit="hour",
        rate_unit="₹1,800 / Hour or ₹2,400 / Acre",
        available_qty="Delta Harvest Season Slots",
        specs="68HP Diesel Engine, Rubber Crawlers for marshy delta soils, 2.0m cutter bar width",
        operator_info="Experienced Operator Included with Field Support",
        service_coverage="Thanjavur, Tiruvarur, Nagapattinam, Mayiladuthurai",
        image_url="/images/combine_harvester.jpg",
        description="Rubber-tracked combine harvester specialized for harvesting wet delta paddy without sinking."
    )
]

for item in items_to_seed:
    existing = db.query(models.Listing).filter(models.Listing.id == item.id).first()
    if not existing:
        db.add(item)
        print(f"Added listing {item.id}: {item.title}")
    else:
        # update specs
        existing.category = item.category
        existing.price = item.price
        existing.unit = item.unit
        existing.rate_unit = item.rate_unit
        existing.min_order = item.min_order
        existing.min_order_qty = item.min_order_qty
        existing.available_qty = item.available_qty
        existing.moisture = item.moisture
        existing.protein = item.protein
        existing.specs = item.specs
        existing.operator_info = item.operator_info
        existing.service_coverage = item.service_coverage
        existing.delivery_info = item.delivery_info
        existing.description = item.description
        print(f"Updated listing {item.id}: {item.title}")

db.commit()
db.close()
print("Listings seeding successfully completed!")

