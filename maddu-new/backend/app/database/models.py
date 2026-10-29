import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database.connection import Base

def generate_id(prefix="id"):
    return f"{prefix}_{uuid.uuid4().hex[:12]}"

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: generate_id("usr"))
    name = Column(String, nullable=False, default="Southern Farmer")
    phone = Column(String, unique=True, index=True, nullable=False)
    state = Column(String, default="TN")
    district = Column(String, default="Erode")
    role = Column(String, default="BUYER")  # BUYER, SELLER, VET, ADMIN
    kyc_status = Column(String, default="VERIFIED")  # PENDING, VERIFIED
    created_at = Column(DateTime, default=datetime.utcnow)

    listings = relationship("Listing", back_populates="seller")
    orders_as_buyer = relationship("Order", foreign_keys="[Order.buyer_id]", back_populates="buyer")
    orders_as_seller = relationship("Order", foreign_keys="[Order.seller_id]", back_populates="seller")


class Listing(Base):
    __tablename__ = "listings"

    id = Column(String, primary_key=True, default=lambda: generate_id("lst"))
    seller_id = Column(String, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    breed = Column(String, nullable=True, default="Standard")  # Kangayam, Ongole, or Fodder/Equip variety
    category = Column(String, default="CATTLE")  # CATTLE, FODDER, EQUIPMENT
    state_id = Column(String, nullable=False, default="TN")
    district = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    daily_yield = Column(Float, default=0.0)
    lactation = Column(Integer, default=0)
    pregnancy_status = Column(String, default="Normal")
    ear_tag_id = Column(String, nullable=True, default="N/A")
    ear_tag_verified = Column(Boolean, default=True)
    estimated_weight = Column(Integer, default=350)
    image_url = Column(Text, default="https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&w=800&q=80")
    status = Column(String, default="ACTIVE")  # ACTIVE, SOLD, PAUSED

    # Extended specifications for Fodder and Machinery Rental
    description = Column(Text, nullable=True)
    unit = Column(String, nullable=True)  # kg, bale, bag, hour, acre, day
    rate_unit = Column(String, nullable=True)  # "₹2.20 / kg", "₹450 / Acre"
    min_order = Column(String, nullable=True)
    min_order_qty = Column(Float, nullable=True)
    available_qty = Column(String, nullable=True)
    moisture = Column(String, nullable=True)
    protein = Column(String, nullable=True)
    specs = Column(Text, nullable=True)
    operator_info = Column(String, nullable=True)
    service_coverage = Column(String, nullable=True)
    delivery_info = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    seller = relationship("User", back_populates="listings")
    orders = relationship("Order", back_populates="listing")


class Order(Base):
    __tablename__ = "orders"

    id = Column(String, primary_key=True, default=lambda: generate_id("ord"))
    listing_id = Column(String, ForeignKey("listings.id"), nullable=False)
    buyer_id = Column(String, ForeignKey("users.id"), nullable=False)
    seller_id = Column(String, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(String, default="CREATED")  # CREATED, PAID_ESCROW, DISPATCHED, DELIVERED, RELEASED
    logistics_status = Column(String, default="Awaiting Escrow Deposit")

    # Extended fields for Fodder Orders and Machinery Rentals
    order_type = Column(String, default="LIVESTOCK")  # LIVESTOCK, FODDER, MACHINERY_RENTAL
    quantity = Column(Float, nullable=True)
    unit = Column(String, nullable=True)
    unit_price = Column(Float, nullable=True)
    delivery_charge = Column(Float, default=0.0)
    delivery_address = Column(Text, nullable=True)
    pincode = Column(String, nullable=True)
    required_date = Column(String, nullable=True)
    start_time = Column(String, nullable=True)
    duration_val = Column(Float, nullable=True)
    pricing_option = Column(String, nullable=True)
    customer_name = Column(String, nullable=True)
    customer_phone = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    booking_ref = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    listing = relationship("Listing", back_populates="orders")
    buyer = relationship("User", foreign_keys=[buyer_id], back_populates="orders_as_buyer")
    seller = relationship("User", foreign_keys=[seller_id], back_populates="orders_as_seller")
