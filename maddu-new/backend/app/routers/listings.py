from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.database import models, schemas

router = APIRouter(prefix="/listings", tags=["Listings"])

@router.get("")
def get_listings(
    state_id: Optional[str] = Query(None, alias="stateId"),
    breed: Optional[str] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Listing).filter(models.Listing.status == "ACTIVE")
    
    if isinstance(state_id, str) and state_id and state_id != "ALL":
        query = query.filter(models.Listing.state_id == state_id)
    if isinstance(breed, str) and breed and breed != "ALL":
        query = query.filter(models.Listing.breed == breed)
    if isinstance(q, str) and q:
        query = query.filter(models.Listing.title.ilike(f"%{q}%"))

    items = query.order_by(models.Listing.created_at.desc()).all()
    
    result = []
    for item in items:
        seller_name = item.seller.name if item.seller else "Breeder"
        seller_phone = item.seller.phone if item.seller else "+91 98421XXXXX"
        # Mask phone for public browsing
        masked_phone = f"{seller_phone[:6]}XXXXX" if len(seller_phone) >= 10 else seller_phone
        
        result.append({
            "id": item.id,
            "title": item.title,
            "breed": item.breed,
            "category": item.category,
            "stateId": item.state_id,
            "district": item.district,
            "price": item.price,
            "dailyYield": item.daily_yield,
            "lactation": item.lactation,
            "pregnancyStatus": item.pregnancy_status,
            "earTagId": item.ear_tag_id,
            "earTagVerified": item.ear_tag_verified,
            "estimatedWeight": item.estimated_weight,
            "imageUrl": item.image_url,
            "status": item.status,
            "description": item.description,
            "unit": item.unit,
            "rateUnit": item.rate_unit,
            "minOrder": item.min_order,
            "minOrderQty": item.min_order_qty,
            "availableQty": item.available_qty,
            "moisture": item.moisture,
            "protein": item.protein,
            "specs": item.specs,
            "operatorInfo": item.operator_info,
            "serviceCoverage": item.service_coverage,
            "deliveryInfo": item.delivery_info,
            "seller": {
                "name": seller_name,
                "phone": masked_phone,
            }
        })
    return {"items": result, "total": len(result)}

@router.get("/{listing_id}")
def get_listing_by_id(listing_id: str, db: Session = Depends(get_db)):
    item = db.query(models.Listing).filter(models.Listing.id == listing_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Listing or product not found")
    
    seller_name = item.seller.name if item.seller else "Agri-Provider"
    seller_phone = item.seller.phone if item.seller else "+91 98421XXXXX"
    masked_phone = f"{seller_phone[:6]}XXXXX" if len(seller_phone) >= 10 else seller_phone

    return {
        "id": item.id,
        "title": item.title,
        "breed": item.breed,
        "category": item.category,
        "stateId": item.state_id,
        "district": item.district,
        "price": item.price,
        "dailyYield": item.daily_yield,
        "lactation": item.lactation,
        "pregnancyStatus": item.pregnancy_status,
        "earTagId": item.ear_tag_id,
        "earTagVerified": item.ear_tag_verified,
        "estimatedWeight": item.estimated_weight,
        "imageUrl": item.image_url,
        "status": item.status,
        "description": item.description,
        "unit": item.unit,
        "rateUnit": item.rate_unit,
        "minOrder": item.min_order,
        "minOrderQty": item.min_order_qty,
        "availableQty": item.available_qty,
        "moisture": item.moisture,
        "protein": item.protein,
        "specs": item.specs,
        "operatorInfo": item.operator_info,
        "serviceCoverage": item.service_coverage,
        "deliveryInfo": item.delivery_info,
        "seller": {
            "name": seller_name,
            "phone": masked_phone,
            "district": item.seller.district if item.seller else item.district,
            "state": item.seller.state if item.seller else item.state_id
        }
    }

@router.post("", status_code=201)
def create_listing(payload: schemas.ListingCreate, db: Session = Depends(get_db)):
    # Fallback to demo seller if seller_id not provided
    seller_id = payload.seller_id
    if not seller_id:
        seller = db.query(models.User).filter(models.User.role == "SELLER").first()
        if not seller:
            seller = models.User(name="Murugesan K (Breeder)", phone="+919000000002", role="SELLER", state="TN", district="Erode")
            db.add(seller)
            db.commit()
            db.refresh(seller)
        seller_id = seller.id

    new_listing = models.Listing(
        seller_id=seller_id,
        title=payload.title,
        breed=payload.breed,
        category=payload.category,
        state_id=payload.state_id,
        district=payload.district,
        price=payload.price,
        daily_yield=payload.daily_yield,
        lactation=payload.lactation,
        pregnancy_status=payload.pregnancy_status,
        ear_tag_id=payload.ear_tag_id,
        estimated_weight=payload.estimated_weight,
        image_url=payload.image_url or "/images/kangayam_cow.jpg"
    )
    db.add(new_listing)
    db.commit()
    db.refresh(new_listing)
    return {"success": True, "listing": new_listing}

@router.post("/{listing_id}/contact")
def reveal_contact(listing_id: str, db: Session = Depends(get_db)):
    listing = db.query(models.Listing).filter(models.Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    seller = listing.seller
    return {
        "success": True,
        "seller": {
            "displayName": seller.name if seller else "Murugesan K",
            "phone": seller.phone if seller else "+91 98421 88421",
            "district": seller.district if seller else "Erode",
            "state": seller.state if seller else "Tamil Nadu",
            "verificationStatus": "INAPH-VERIFIED"
        }
    }

@router.delete("/{listing_id}")
def delete_listing(listing_id: str, db: Session = Depends(get_db)):
    listing = db.query(models.Listing).filter(models.Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    db.delete(listing)
    db.commit()
    return {"success": True, "message": "Listing deleted successfully"}
