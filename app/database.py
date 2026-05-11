import os
import libsql_client
import logging
from app.seed_data import (
    PILLARS_DATA,
    ARCHITECTURE_LAYERS_DATA,
    REVENUE_STREAMS_DATA,
    PROJECTS_DATA,
    VISION_MISSIONS_DATA,
    CONTENT_MODEL_DATA
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Helper to convert libsql ResultSet to list of dicts
def to_dict_list(result_set: libsql_client.ResultSet):
    return [
        {col: row[i] for i, col in enumerate(result_set.columns)}
        for row in result_set.rows
    ]

# Use Turso Database URL and Auth Token from environment variables
if os.getenv("TURSO_DATABASE_URL"):
    DATABASE_URL = os.getenv("TURSO_DATABASE_URL")
elif os.getenv("VERCEL"):
    DATABASE_URL = "file:/tmp/naira.db"
else:
    DATABASE_URL = "file:naira.db"

AUTH_TOKEN = os.getenv("TURSO_AUTH_TOKEN", "")

async def get_db():
    client = libsql_client.create_client(url=DATABASE_URL, auth_token=AUTH_TOKEN)
    try:
        yield client
    finally:
        await client.close()

async def init_db():
    logger.info(f"Initializing database at {DATABASE_URL}...")
    try:
        async with libsql_client.create_client(url=DATABASE_URL, auth_token=AUTH_TOKEN) as client:
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
            await client.execute("""
                CREATE TABLE IF NOT EXISTS projects (
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

            # Seed users if empty
            cursor = await client.execute("SELECT COUNT(*) FROM users")
            count = cursor.rows[0][0]
            if count == 0:
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

            # Seed pillars if empty
            cursor = await client.execute("SELECT COUNT(*) FROM pillars")
            count = cursor.rows[0][0]
            if count == 0:
                logger.info("Seeding pillars...")
                await client.batch([
                    ("INSERT INTO pillars (number, title, summary, description, icon, color) VALUES (?, ?, ?, ?, ?, ?)", p)
                    for p in PILLARS_DATA
                ])

            # Seed architecture layers if empty
            cursor = await client.execute("SELECT COUNT(*) FROM architecture_layers")
            count = cursor.rows[0][0]
            if count == 0:
                logger.info("Seeding architecture layers...")
                await client.batch([
                    ("INSERT INTO architecture_layers (layer_number, title, description, icon, color, tags) VALUES (?, ?, ?, ?, ?, ?)", l)
                    for l in ARCHITECTURE_LAYERS_DATA
                ])

            # Seed revenue streams if empty
            cursor = await client.execute("SELECT COUNT(*) FROM revenue_streams")
            count = cursor.rows[0][0]
            if count == 0:
                logger.info("Seeding revenue streams...")
                await client.batch([
                    ("INSERT INTO revenue_streams (title, description, icon, color) VALUES (?, ?, ?, ?)", r)
                    for r in REVENUE_STREAMS_DATA
                ])

            # Seed projects if empty
            cursor = await client.execute("SELECT COUNT(*) FROM projects")
            count = cursor.rows[0][0]
            if count == 0:
                logger.info("Seeding projects...")
                await client.batch([
                    ("INSERT INTO projects (slug, title, summary, full_description, icon, category, status, project_group) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", p)
                    for p in PROJECTS_DATA
                ])

            # Seed vision missions if empty
            cursor = await client.execute("SELECT COUNT(*) FROM vision_missions")
            count = cursor.rows[0][0]
            if count == 0:
                logger.info("Seeding vision missions...")
                await client.batch([
                    ("INSERT INTO vision_missions (slug, title, summary, description, icon, color) VALUES (?, ?, ?, ?, ?, ?)", v)
                    for v in VISION_MISSIONS_DATA
                ])

            # Seed content model if empty
            cursor = await client.execute("SELECT COUNT(*) FROM content_model")
            count = cursor.rows[0][0]
            if count == 0:
                logger.info("Seeding content model...")
                await client.batch([
                    ("INSERT INTO content_model (slug, title, summary, description, icon, color) VALUES (?, ?, ?, ?, ?, ?)", c)
                    for c in CONTENT_MODEL_DATA
                ])
        logger.info("Database initialization successful.")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise e

async def get_all_naira_data():
    """
    Collects string representation of all key data for RAG.
    """
    data = []
    async with libsql_client.create_client(url=DATABASE_URL, auth_token=AUTH_TOKEN) as client:
        # Pillars
        pillars = await client.execute("SELECT title, description, summary FROM pillars")
        for p in pillars.rows:
            data.append(f"Strategic Pillar: {p[0]}. {p[1]} Summary: {p[2]}")

        # Vision/Mission
        vision = await client.execute("SELECT title, description, summary FROM vision_missions")
        for v in vision.rows:
            data.append(f"Vision/Mission: {v[0]}. {v[1]} Summary: {v[2]}")

        # Architecture
        arch = await client.execute("SELECT title, description, tags FROM architecture_layers")
        for a in arch.rows:
            data.append(f"Architecture Layer: {a[0]}. {a[1]} Technologies: {a[2]}")

        # Projects
        projects = await client.execute("SELECT title, summary, full_description, category, status FROM projects")
        for pr in projects.rows:
            data.append(f"Project: {pr[0]} ({pr[3]}). Summary: {pr[1]} Description: {pr[2]} Status: {pr[4]}")

        # Revenue
        revenue = await client.execute("SELECT title, description FROM revenue_streams")
        for r in revenue.rows:
            data.append(f"Revenue Stream: {r[0]}. {r[1]}")

        # Content Model
        content_model = await client.execute("SELECT title, summary, description FROM content_model")
        for cm in content_model.rows:
            data.append(f"Content Model: {cm[0]}. Summary: {cm[1]} Description: {cm[2]}")

    return data
