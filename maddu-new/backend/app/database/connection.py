import os
import re
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

# Absolute path for local SQLite fallback in the backend folder
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LOCAL_DB_PATH = os.path.join(BACKEND_DIR, "dakshin.db").replace("\\", "/")

# 1. Clean up URL (handle postgres:// vs postgresql:// and remove literal brackets around password)
db_url = settings.DATABASE_URL.strip()
while db_url.startswith("DATABASE_URL="):
    db_url = db_url.replace("DATABASE_URL=", "", 1).strip()

if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# Strip literal brackets if user copied [YOUR-PASSWORD] with brackets:
# e.g. postgresql://user:[pass]@host -> postgresql://user:pass@host
db_url = re.sub(r':\[([^]]+)\]@', r':\1@', db_url)

connect_args = {}
if "sqlite" in db_url:
    connect_args = {"check_same_thread": False}

# Try connecting; fallback gracefully to local SQLite (dakshin.db) if remote host is unreachable or misconfigured
try:
    engine = create_engine(db_url, connect_args=connect_args)
    # Quick probe check
    with engine.connect() as conn:
        pass
    print("[INFO] Successfully connected to database: " + (db_url.split('@')[-1] if '@' in db_url else 'local'))
except Exception as e:
    print("[WARNING] Could not connect to remote DATABASE_URL (" + str(e).split("\n")[0] + ")")
    print("[INFO] Falling back to local SQLite database (dakshin.db) so server remains active.")
    db_url = f"sqlite:///{LOCAL_DB_PATH}"
    connect_args = {"check_same_thread": False}
    engine = create_engine(db_url, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
