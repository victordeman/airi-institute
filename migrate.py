import asyncio
import os
import libsql_client
import logging
from app.seed_data import (
    PILLARS_DATA,
    ARCHITECTURE_LAYERS_DATA,
    REVENUE_STREAMS_DATA,
    PROJECTS_DATA,
    VISION_MISSIONS_DATA,
    CONTENT_MODEL_DATA,
    SERVICES_DATA
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Use Turso Database URL and Auth Token from environment variables
if os.getenv("TURSO_DATABASE_URL"):
    DATABASE_URL = os.getenv("TURSO_DATABASE_URL")
else:
    DATABASE_URL = "file:naira.db"

AUTH_TOKEN = os.getenv("TURSO_AUTH_TOKEN", "")

async def migrate():
    logger.info(f"Connecting to database at {DATABASE_URL}...")
    async with libsql_client.create_client(url=DATABASE_URL, auth_token=AUTH_TOKEN) as client:
        # Drop existing tables if they exist (for a fresh start in development)
        logger.info("Dropping existing tables for a clean migration...")
        tables = [
            "contact_submissions",
            "newsletter_subscribers",
            "pillars",
            "architecture_layers",
            "revenue_streams",
            "projects",
            "vision_missions",
            "content_model",
            "users",
            "services"
        ]
        for table in tables:
            await client.execute(f"DROP TABLE IF EXISTS {table}")

        # Re-create tables
        logger.info("Creating tables...")
        await client.execute("""
            CREATE TABLE IF NOT EXISTS contact_submissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT '',
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await client.execute("""
            CREATE TABLE IF NOT EXISTS newsletter_subscribers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await client.execute("""
            CREATE TABLE IF NOT EXISTS pillars (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                number TEXT NOT NULL,
                title TEXT NOT NULL,
                summary TEXT NOT NULL DEFAULT '',
                description TEXT NOT NULL,
                icon TEXT NOT NULL,
                color TEXT NOT NULL
            )
        """)
        await client.execute("""
            CREATE TABLE IF NOT EXISTS architecture_layers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                layer_number INTEGER NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                icon TEXT NOT NULL,
                color TEXT NOT NULL,
                tags TEXT NOT NULL DEFAULT '[]'
            )
        """)
        await client.execute("""
            CREATE TABLE IF NOT EXISTS revenue_streams (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                icon TEXT NOT NULL,
                color TEXT NOT NULL
            )
        """)

        # Modified projects table
        await client.execute("DROP TABLE IF EXISTS projects")
        await client.execute("""
            CREATE TABLE projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                slug TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL,
                summary TEXT NOT NULL,
                full_description TEXT NOT NULL,
                icon TEXT NOT NULL,
                category TEXT NOT NULL,
                status TEXT NOT NULL,
                project_group TEXT NOT NULL
            )
        """)

        await client.execute("""
            CREATE TABLE IF NOT EXISTS vision_missions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                slug TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL,
                summary TEXT NOT NULL,
                description TEXT NOT NULL,
                icon TEXT NOT NULL,
                color TEXT NOT NULL
            )
        """)

        await client.execute("""
            CREATE TABLE IF NOT EXISTS content_model (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                slug TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL,
                summary TEXT NOT NULL,
                description TEXT NOT NULL,
                icon TEXT NOT NULL,
                color TEXT NOT NULL
            )
        """)

        await client.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT,
                full_name TEXT,
                hashed_password TEXT NOT NULL,
                disabled BOOLEAN DEFAULT 0,
                role TEXT DEFAULT 'user'
            )
        """)

        await client.execute("""
            CREATE TABLE IF NOT EXISTS services (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                items TEXT NOT NULL,
                icon TEXT NOT NULL,
                color TEXT NOT NULL
            )
        """)

        # Seeding
        logger.info("Seeding users...")
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

        # Admin user
        admin_hashed = pwd_context.hash("admin123")
        await client.execute(
            "INSERT INTO users (username, email, full_name, hashed_password, role) VALUES (?, ?, ?, ?, ?)",
            ("admin", "admin@naira.institute", "NAIRA Admin", admin_hashed, "admin")
        )

        # Normal user
        user_hashed = pwd_context.hash("user123")
        await client.execute(
            "INSERT INTO users (username, email, full_name, hashed_password, role) VALUES (?, ?, ?, ?, ?)",
            ("testuser", "user@naira.institute", "Test User", user_hashed, "user")
        )

        logger.info("Seeding pillars...")
        await client.batch([
            ("INSERT INTO pillars (number, title, summary, description, icon, color) VALUES (?, ?, ?, ?, ?, ?)", p)
            for p in PILLARS_DATA
        ])

        logger.info("Seeding architecture layers...")
        await client.batch([
            ("INSERT INTO architecture_layers (layer_number, title, description, icon, color, tags) VALUES (?, ?, ?, ?, ?, ?)", l)
            for l in ARCHITECTURE_LAYERS_DATA
        ])

        logger.info("Seeding revenue streams...")
        await client.batch([
            ("INSERT INTO revenue_streams (title, description, icon, color) VALUES (?, ?, ?, ?)", r)
            for r in REVENUE_STREAMS_DATA
        ])

        logger.info("Seeding projects...")
        await client.batch([
            ("INSERT INTO projects (slug, title, summary, full_description, icon, category, status, project_group) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", p)
            for p in PROJECTS_DATA
        ])

        logger.info("Seeding vision missions...")
        await client.batch([
            ("INSERT INTO vision_missions (slug, title, summary, description, icon, color) VALUES (?, ?, ?, ?, ?, ?)", v)
            for v in VISION_MISSIONS_DATA
        ])

        logger.info("Seeding content model...")
        await client.batch([
            ("INSERT INTO content_model (slug, title, summary, description, icon, color) VALUES (?, ?, ?, ?, ?, ?)", c)
            for c in CONTENT_MODEL_DATA
        ])

        logger.info("Seeding services...")
        await client.batch([
            ("INSERT INTO services (title, items, icon, color) VALUES (?, ?, ?, ?)", s)
            for s in SERVICES_DATA
        ])

        logger.info("Migration and seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(migrate())
