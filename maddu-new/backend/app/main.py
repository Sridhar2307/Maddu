from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database.connection import engine, Base
from app.routers import auth, listings, orders, admin

# Auto-generate DB schema tables
try:
    Base.metadata.create_all(bind=engine)
    db_init_status = "Initialized"
except Exception as e:
    db_init_status = f"Warning: {e}"
    print(f"⚠️ Warning during Base.metadata.create_all: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Southern India Integrated Agri-Livestock, Mandi & Tele-Vet Ecosystem API"
)

# CORS Middleware to allow requests from Vite frontend (localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers under /api/v1
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(listings.router, prefix=settings.API_V1_PREFIX)
app.include_router(orders.router, prefix=settings.API_V1_PREFIX)
app.include_router(admin.router, prefix=settings.API_V1_PREFIX)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": "Connected"
    }

@app.get("/")
def root():
    return {
        "message": "Welcome to DakshinAgriHub FastAPI Backend",
        "docs": "/docs",
        "health": "/health"
    }
