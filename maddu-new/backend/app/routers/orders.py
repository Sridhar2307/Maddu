import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.database import models, schemas

router = APIRouter(prefix="/orders", tags=["Orders & Escrow"])

@router.post("", status_code=201)
def create_order(payload: schemas.OrderCreate, db: Session = Depends(get_db)):
    listing = db.query(models.Listing).filter(models.Listing.id == payload.listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    order_type = (payload.order_type or "LIVESTOCK").upper()

    # If Livestock: verify exclusive reservation
    if order_type == "LIVESTOCK":
        existing_order = db.query(models.Order).filter(
            models.Order.listing_id == listing.id,
            models.Order.status.in_(["CREATED", "PAID_ESCROW", "DISPATCHED"])
        ).first()
        if existing_order:
            raise HTTPException(status_code=409, detail="Animal is already reserved under active escrow order")

    # Get buyer (default to Anand Murthy for dev)
    buyer = None
    if payload.customer_phone:
        buyer = db.query(models.User).filter(models.User.phone == payload.customer_phone).first()
    if not buyer:
        buyer = db.query(models.User).filter(models.User.role == "BUYER").first()
    if not buyer:
        buyer = models.User(name=payload.customer_name or "Anand Murthy", phone=payload.customer_phone or "+919000000004", role="BUYER", state="KA", district="Bengaluru")
        db.add(buyer)
        db.commit()
        db.refresh(buyer)

    # Compute amount and validate by category
    if order_type == "FODDER":
        qty = payload.quantity or 1.0
        if qty <= 0:
            raise HTTPException(status_code=400, detail="Order quantity must be greater than zero")
        if listing.min_order_qty and qty < listing.min_order_qty:
            raise HTTPException(status_code=400, detail=f"Minimum order quantity for this item is {listing.min_order_qty} {listing.unit or 'units'}")
        
        unit_price = listing.price
        delivery_charge = float(payload.delivery_charge or 0.0)
        total_amount = round((qty * unit_price) + delivery_charge, 2)
        booking_ref = f"ORD-FOD-{uuid.uuid4().hex[:6].upper()}"
        logistics_status = f"Awaiting Seller Dispatch ({payload.required_date or 'Next Working Day'})"

    elif order_type == "MACHINERY_RENTAL":
        dur = payload.duration_val or 1.0
        if dur <= 0:
            raise HTTPException(status_code=400, detail="Rental duration or service area must be greater than zero")
        
        # Calculate rate based on listing price
        rate = listing.price
        total_amount = round(dur * rate, 2)
        booking_ref = f"BKG-EQP-{uuid.uuid4().hex[:6].upper()}"
        logistics_status = f"Rental Reserved for {payload.required_date or 'Scheduled Date'} ({payload.start_time or 'Morning Slot'})"

    else:
        # Default Livestock Order
        total_amount = listing.price
        booking_ref = f"ORD-LIV-{uuid.uuid4().hex[:6].upper()}"
        logistics_status = "Awaiting Escrow Deposit"

    new_order = models.Order(
        listing_id=listing.id,
        buyer_id=buyer.id,
        seller_id=listing.seller_id,
        amount=total_amount,
        status="CREATED",
        logistics_status=logistics_status,
        order_type=order_type,
        quantity=payload.quantity,
        unit=payload.unit or listing.unit,
        unit_price=listing.price,
        delivery_charge=payload.delivery_charge or 0.0,
        delivery_address=payload.delivery_address,
        pincode=payload.pincode,
        required_date=payload.required_date,
        start_time=payload.start_time,
        duration_val=payload.duration_val,
        pricing_option=payload.pricing_option,
        customer_name=payload.customer_name or buyer.name,
        customer_phone=payload.customer_phone or buyer.phone,
        notes=payload.notes,
        booking_ref=booking_ref
    )
    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    return {
        "success": True,
        "order": {
            "id": new_order.id,
            "bookingRef": new_order.booking_ref,
            "orderType": new_order.order_type,
            "listingId": new_order.listing_id,
            "amount": new_order.amount,
            "quantity": new_order.quantity,
            "unit": new_order.unit,
            "deliveryAddress": new_order.delivery_address,
            "pincode": new_order.pincode,
            "requiredDate": new_order.required_date,
            "startTime": new_order.start_time,
            "durationVal": new_order.duration_val,
            "status": new_order.status,
            "logisticsStatus": new_order.logistics_status,
            "createdAt": new_order.created_at.isoformat(),
            "customer": {
                "name": new_order.customer_name,
                "phone": new_order.customer_phone,
            },
            "listing": {
                "id": listing.id,
                "title": listing.title,
                "category": listing.category,
                "price": listing.price,
                "imageUrl": listing.image_url
            },
            "seller": {
                "name": listing.seller.name if listing.seller else "Service Provider",
                "phone": listing.seller.phone if listing.seller else "+91 98421 88421"
            }
        }
    }

@router.get("/my-orders")
def get_my_orders(db: Session = Depends(get_db)):
    orders = db.query(models.Order).order_by(models.Order.created_at.desc()).all()
    results = []
    for o in orders:
        results.append({
            "id": o.id,
            "bookingRef": o.booking_ref or o.id,
            "orderType": o.order_type or "LIVESTOCK",
            "amount": o.amount,
            "quantity": o.quantity,
            "unit": o.unit,
            "deliveryAddress": o.delivery_address,
            "pincode": o.pincode,
            "requiredDate": o.required_date,
            "status": o.status,
            "logisticsStatus": o.logistics_status,
            "createdAt": o.created_at.isoformat(),
            "customer": {
                "name": o.customer_name or (o.buyer.name if o.buyer else "Customer"),
                "phone": o.customer_phone or (o.buyer.phone if o.buyer else "")
            },
            "listing": {
                "id": o.listing.id if o.listing else "",
                "title": o.listing.title if o.listing else "Agri Item",
                "category": o.listing.category if o.listing else "General",
                "breed": o.listing.breed if o.listing else "",
                "price": o.amount,
                "imageUrl": o.listing.image_url if o.listing else "",
                "earTagId": o.listing.ear_tag_id if o.listing else ""
            },
            "seller": {
                "name": o.seller.name if o.seller else "Provider",
                "phone": o.seller.phone if o.seller else "+91 98421 88421"
            }
        })
    return {"purchases": results, "orders": results, "sales": []}

@router.post("/{order_id}/mock-pay")
def mock_pay(order_id: str, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = "PAID_ESCROW"
    order.logistics_status = "Funds Held in Escrow • Awaiting Carrier Dispatch"
    db.commit()
    return {"success": True, "message": "Payment securely deposited in escrow"}

@router.post("/{order_id}/delivered")
def mark_delivered(order_id: str, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = "DELIVERED"
    order.logistics_status = "Animal Inspected & Delivered at Buyer Farm"
    db.commit()
    return {"success": True, "message": "Delivery confirmed"}

@router.post("/{order_id}/release")
def release_escrow(order_id: str, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = "RELEASED"
    order.logistics_status = "Escrow Funds Released Directly to Breeder"
    db.commit()
    return {"success": True, "message": "Escrow released"}
