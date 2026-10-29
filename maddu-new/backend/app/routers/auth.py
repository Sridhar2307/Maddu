from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.database import models, schemas

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/otp/send")
def send_otp(req: schemas.SendOtpRequest):
    # In development, return debug OTP
    return {
        "success": True,
        "message": f"OTP successfully dispatched to {req.phone}",
        "debugOtp": "123456"
    }

@router.post("/otp/verify")
def verify_otp(req: schemas.VerifyOtpRequest, db: Session = Depends(get_db)):
    # Standard dev check: accept any OTP ending with 123456 or match
    if req.otp not in ["123456", "000000"]:
        raise HTTPException(status_code=400, detail="Invalid OTP entered")

    # Find or create user
    user = db.query(models.User).filter(models.User.phone == req.phone).first()
    if not user:
        # Determine defaults
        role = req.role or "BUYER"
        if req.phone == "+919000000001":
            role = "ADMIN"
            name = "Senthil Nathan (Admin)"
        elif req.phone == "+919000000002":
            role = "SELLER"
            name = "Murugesan K (Breeder)"
        else:
            name = req.name or f"Farmer {req.phone[-4:]}"

        user = models.User(
            name=name,
            phone=req.phone,
            state=req.state or "TN",
            district=req.district or "Erode",
            role=role,
            kyc_status="VERIFIED"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = f"jwt_access_token_{user.id}_{user.role}"
    
    return {
        "success": True,
        "user": {
            "id": user.id,
            "name": user.name,
            "phone": user.phone,
            "state": user.state,
            "district": user.district,
            "roles": [user.role],
            "kycStatus": user.kyc_status
        },
        "accessToken": token
    }
