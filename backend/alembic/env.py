import sys
import os
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool, create_engine
from alembic import context
from dotenv import load_dotenv

# ───────────────────────────────────────────────
# 1️⃣ Add backend to sys.path
# ───────────────────────────────────────────────
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# ───────────────────────────────────────────────
# 2️⃣ Load environment variables
# ───────────────────────────────────────────────
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(env_path)

# ───────────────────────────────────────────────
# 3️⃣ Import your models & Base
# ───────────────────────────────────────────────
from app.db.database import Base
from app.db import models

# ───────────────────────────────────────────────
# 4️⃣ Get database URL from .env
# ───────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL")

# ───────────────────────────────────────────────
# 5️⃣ Configure Alembic
# ───────────────────────────────────────────────
config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

if not DATABASE_URL:
    raise ValueError("❌ DATABASE_URL not found in .env")

config.set_main_option("sqlalchemy.url", DATABASE_URL.replace("%", "%%"))

target_metadata = Base.metadata

# ───────────────────────────────────────────────
# 6️⃣ Migration functions (same as default)
# ───────────────────────────────────────────────
def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    connectable = create_engine(DATABASE_URL, poolclass=pool.NullPool)

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
