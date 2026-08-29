import os
import re
import urllib.parse
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

def sanitize_database_url(url: str) -> str:
    if not url:
        return "sqlite:///./onehealth.db"
    
    # Fix Heroku / legacy Supabase postgres:// URI scheme to postgresql://
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    
    # Safely handle special characters (e.g. '@') in passwords
    # Matches: postgresql://[user]:[password]@[host]:[port]/[db]
    m = re.match(r'^(postgresql(?:\+[a-z0-9_]+)?:\/\/)([^:]+):(.*)@([^@\/]+(?::\d+)?\/.*)$', url)
    if m:
        prefix, user, raw_pass, host_part = m.groups()
        # If password contains unencoded special characters
        if "@" in raw_pass or ":" in raw_pass or " " in raw_pass:
            encoded_pass = urllib.parse.quote_plus(raw_pass)
            url = f"{prefix}{user}:{encoded_pass}@{host_part}"
            
    return url

DATABASE_URL = sanitize_database_url(os.getenv("DATABASE_URL", "sqlite:///./onehealth.db"))

# Connect arguments & pooling configuration
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    engine = create_engine(DATABASE_URL, connect_args=connect_args, echo=False)
else:
    # PostgreSQL / Supabase connection pooling configuration
    engine = create_engine(
        DATABASE_URL,
        pool_size=10,
        max_overflow=20,
        pool_recycle=1800,
        pool_pre_ping=True,
        echo=False
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
