from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.database import models, schemas

router = APIRouter(prefix="/admin", tags=["Admin Dashboard"])

@router.get("/stats")
def get_admin_stats(db: Session = Depends(get_db)):
    total_users = db.query(models.User).count()
    total_listings = db.query(models.Listing).count()
    total_orders = db.query(models.Order).count()
    orders = db.query(models.Order).all()
    escrow_val = sum(o.amount for o in orders)
    
    return {
        "totalUsers": total_users,
        "totalListings": total_listings,
        "totalOrders": total_orders,
        "escrowProtectedValue": escrow_val
    }

@router.get("/users")
def get_admin_users(db: Session = Depends(get_db)):
    users = db.query(models.User).order_by(models.User.created_at.desc()).all()
    return {
        "users": [
            {
                "id": u.id,
                "name": u.name,
                "phone": u.phone,
                "state": u.state,
                "district": u.district,
                "role": u.role,
                "kycStatus": u.kyc_status,
                "registeredAt": u.created_at.strftime("%Y-%m-%d")
            }
            for u in users
        ]
    }

@router.get("/orders")
def get_admin_orders(db: Session = Depends(get_db)):
    orders = db.query(models.Order).order_by(models.Order.created_at.desc()).all()
    results = []
    for o in orders:
        results.append({
            "id": o.id,
            "createdAt": o.created_at.isoformat(),
            "buyerName": o.buyer.name if o.buyer else "Buyer",
            "buyerPhone": o.buyer.phone if o.buyer else "+91 9000000004",
            "sellerName": o.seller.name if o.seller else "Seller",
            "sellerPhone": o.seller.phone if o.seller else "+91 9000000002",
            "animalTitle": o.listing.title if o.listing else "Livestock",
            "earTagId": o.listing.ear_tag_id if o.listing else "INAPH-VERIFIED",
            "amount": o.amount,
            "status": o.status,
            "logisticsStatus": o.logistics_status
        })
    return {"orders": results}

@router.get("/listings")
def get_admin_listings(db: Session = Depends(get_db)):
    listings = db.query(models.Listing).order_by(models.Listing.created_at.desc()).all()
    return {
        "listings": [
            {
                "id": l.id,
                "title": l.title,
                "breed": l.breed,
                "category": l.category,
                "stateId": l.state_id,
                "district": l.district,
                "price": l.price,
                "earTagId": l.ear_tag_id,
                "sellerName": l.seller.name if l.seller else "Breeder",
                "status": l.status,
                "createdAt": l.created_at.isoformat()
            }
            for l in listings
        ]
    }

@router.post("/users/{user_id}/verify-kyc")
def verify_user_kyc(user_id: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.kyc_status = "VERIFIED"
    db.commit()
    return {"success": True, "message": f"User {user.name} KYC verified successfully", "kycStatus": "VERIFIED"}

@router.post("/orders/{order_id}/force-release")
def admin_force_release_escrow(order_id: str, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = "RELEASED"
    order.logistics_status = "Admin Override: Escrow Released to Seller"
    db.commit()
    return {"success": True, "message": f"Order #{order_id} funds released via Admin Override", "status": "RELEASED"}

@router.delete("/listings/{listing_id}")
def admin_delete_listing(listing_id: str, db: Session = Depends(get_db)):
    listing = db.query(models.Listing).filter(models.Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    db.delete(listing)
    db.commit()
    return {"success": True, "message": f"Listing #{listing_id} removed by Admin"}
