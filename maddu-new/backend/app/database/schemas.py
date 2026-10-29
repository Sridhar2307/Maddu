from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

# User Schemas
class UserBase(BaseModel):
    name: str
    phone: str
    state: str = "TN"
    district: str = "Erode"
    role: str = "BUYER"

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: str
    kyc_status: str
    created_at: datetime

    class Config:
        from_attributes = True

# Auth Schemas
class SendOtpRequest(BaseModel):
    phone: str

class VerifyOtpRequest(BaseModel):
    phone: str
    otp: str
    name: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    role: Optional[str] = None

# Listing Schemas
class ListingBase(BaseModel):
    title: str
    breed: Optional[str] = "Standard"
    category: str = "CATTLE"
    state_id: str = "TN"
    district: str
    price: float
    daily_yield: float = 0.0
    lactation: int = 0
    pregnancy_status: str = "Normal"
    ear_tag_id: Optional[str] = "N/A"
    estimated_weight: int = 350
    image_url: Optional[str] = None
    description: Optional[str] = None
    unit: Optional[str] = None
    rate_unit: Optional[str] = None
    min_order: Optional[str] = None
    min_order_qty: Optional[float] = None
    available_qty: Optional[str] = None
    moisture: Optional[str] = None
    protein: Optional[str] = None
    specs: Optional[str] = None
    operator_info: Optional[str] = None
    service_coverage: Optional[str] = None
    delivery_info: Optional[str] = None

class ListingCreate(ListingBase):
    seller_id: Optional[str] = None

class ListingResponse(ListingBase):
    id: str
    seller_id: str
    ear_tag_verified: bool
    status: str
    created_at: datetime
    seller_name: Optional[str] = None
    seller_phone: Optional[str] = None

    class Config:
        from_attributes = True

# Order Schemas
class OrderCreate(BaseModel):
    listing_id: str
    order_type: Optional[str] = "LIVESTOCK"  # LIVESTOCK, FODDER, MACHINERY_RENTAL
    quantity: Optional[float] = None
    unit: Optional[str] = None
    unit_price: Optional[float] = None
    delivery_charge: Optional[float] = 0.0
    delivery_address: Optional[str] = None
    pincode: Optional[str] = None
    required_date: Optional[str] = None
    start_time: Optional[str] = None
    duration_val: Optional[float] = None
    pricing_option: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    notes: Optional[str] = None

class OrderResponse(BaseModel):
    id: str
    listing_id: str
    buyer_id: str
    seller_id: str
    amount: float
    status: str
    logistics_status: str
    order_type: Optional[str] = "LIVESTOCK"
    booking_ref: Optional[str] = None
    created_at: datetime
    buyer_name: Optional[str] = None
    buyer_phone: Optional[str] = None
    seller_name: Optional[str] = None
    seller_phone: Optional[str] = None
    animal_title: Optional[str] = None
    ear_tag_id: Optional[str] = None

    class Config:
        from_attributes = True

# Admin Stats
class AdminStatsResponse(BaseModel):
    total_users: int
    total_listings: int
    total_orders: int
    escrow_protected_value: float
