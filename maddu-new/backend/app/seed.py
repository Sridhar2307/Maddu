from app.database.connection import SessionLocal, engine, Base
from app.database import models

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Check if users already seeded
    if db.query(models.User).count() > 0:
        print("Database already has records. Skipping seed.")
        db.close()
        return

    print("Seeding initial users and livestock into database...")

    # 1. Seed Users
    users = [
        models.User(id="usr_admin_1", name="Senthil Nathan (Admin)", phone="+919000000001", state="TN", district="Chennai", role="ADMIN", kyc_status="VERIFIED"),
        models.User(id="usr_seller_1", name="Murugesan K (Breeder)", phone="+919000000002", state="TN", district="Erode", role="SELLER", kyc_status="VERIFIED"),
        models.User(id="usr_seller_2", name="Venkat Reddy (Dairy)", phone="+919000000003", state="AP", district="Guntur", role="SELLER", kyc_status="VERIFIED"),
        models.User(id="usr_buyer_1", name="Anand Murthy", phone="+919000000004", state="KA", district="Bengaluru", role="BUYER", kyc_status="VERIFIED"),
        models.User(id="usr_buyer_2", name="Rajesh Varma", phone="+919000000005", state="TN", district="Madurai", role="BUYER", kyc_status="PENDING"),
        models.User(id="usr_vet_1", name="Dr. Radhakrishnan (Vet)", phone="+919000000006", state="TN", district="Namakkal", role="VET", kyc_status="VERIFIED"),
    ]
    for u in users:
        db.add(u)
    db.commit()

    # 2. Seed Animal Listings
    listings = [
        models.Listing(
            id="pashu-101",
            seller_id="usr_seller_1",
            title="Pure Kangayam Heritage Milch Cow with Heifer Calf",
            breed="Kangayam",
            category="Cattle",
            state_id="TN",
            district="Kangeyam, Tiruppur",
            price=68000,
            daily_yield=7.5,
            lactation=2,
            pregnancy_status="Artificial Insemination done (45 days)",
            ear_tag_id="TN-3304-9812-4410",
            ear_tag_verified=True,
            estimated_weight=360,
            image_url="https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&w=800&q=80"
        ),
        models.Listing(
            id="pashu-102",
            seller_id="usr_seller_2",
            title="Magnificent Ongole Breeding Stud Bull (Chittoor / Prakasam Lineage)",
            breed="Ongole",
            category="Cattle",
            state_id="AP",
            district="Ongole, Prakasam",
            price=115000,
            daily_yield=0,
            lactation=0,
            pregnancy_status="N/A (Breeding Bull)",
            ear_tag_id="AP-2801-7104-9923",
            ear_tag_verified=True,
            estimated_weight=520,
            image_url="https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&w=800&q=80"
        ),
        models.Listing(
            id="pashu-103",
            seller_id="usr_seller_1",
            title="Hallikar Heavy Draught Bullocks Pair (Mandya Lineage)",
            breed="Hallikar",
            category="Cattle",
            state_id="KA",
            district="Mandya, Karnataka",
            price=92000,
            daily_yield=0,
            lactation=0,
            pregnancy_status="Draught Working Pair",
            ear_tag_id="KA-4102-5509-1123",
            ear_tag_verified=True,
            estimated_weight=440,
            image_url="https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&w=800&q=80"
        )
    ]
    for l in listings:
        db.add(l)
    db.commit()

    # 3. Seed Orders (Who ordered which animal)
    orders = [
        models.Order(
            id="ord_tn_881",
            listing_id="pashu-101",
            buyer_id="usr_buyer_1",
            seller_id="usr_seller_1",
            amount=68000,
            status="DELIVERED",
            logistics_status="Arrived at Buyer Farm (Bengaluru)"
        ),
        models.Order(
            id="ord_ap_442",
            listing_id="pashu-102",
            buyer_id="usr_buyer_2",
            seller_id="usr_seller_2",
            amount=115000,
            status="PAID_ESCROW",
            logistics_status="In-Transit with Bolero Carrier"
        )
    ]
    for o in orders:
        db.add(o)
    db.commit()

    print("Database seeding completed successfully!")
    db.close()

if __name__ == "__main__":
    seed()
