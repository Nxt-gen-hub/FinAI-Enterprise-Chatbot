"""
DROPS and recreates all tables, then seeds with transaction data.

Run from financial-ai-backend folder:
    python seed_data.py
"""

import asyncio
import asyncpg
from datetime import datetime

CONN = "postgresql://postgres:postgres123@localhost:5432/finai_db"

TRANSACTIONS = [
    ("TX001", 125000, "CRITICAL", "Wire Transfer - Offshore Account"),
    ("TX002",   9800, "HIGH",     "Cash Deposit - Branch A"),
    ("TX003",  54200, "MEDIUM",   "Corporate Payment - Vendor"),
    ("TX004",  78000, "HIGH",     "International Transfer - EU"),
    ("TX005",  12300, "LOW",      "Supplier Invoice Payment"),
    ("TX006",  29700, "CRITICAL", "Structured Cash Deposits x3"),
    ("TX007",  95000, "HIGH",     "Real Estate Payment"),
    ("TX008",  67500, "CRITICAL", "Cryptocurrency Exchange"),
    ("TX009",  45000, "LOW",      "Regular Payroll"),
    ("TX010",   8500, "LOW",      "Vendor Payment - Software"),
    ("TX011",   4900, "MEDIUM",   "Cash Withdrawal - ATM"),
    ("TX012", 210000, "CRITICAL", "Large Wire - Tax Haven"),
    ("TX013",  15000, "LOW",      "Insurance Premium"),
    ("TX014",  88000, "HIGH",     "Consulting Fee - Offshore"),
    ("TX015",  52000, "MEDIUM",   "Trade Finance Payment"),
]


async def seed():
    conn = await asyncpg.connect(CONN)
    print("Connected to PostgreSQL...")

    # ── DROP all tables cleanly ───────────────────────────────────────────────
    await conn.execute("""
        DROP TABLE IF EXISTS chat_messages CASCADE;
        DROP TABLE IF EXISTS chat_sessions CASCADE;
        DROP TABLE IF EXISTS audit_logs CASCADE;
        DROP TABLE IF EXISTS transactions CASCADE;
    """)
    print("Dropped old tables.")

    # ── CREATE transactions — matches SQLAlchemy Transaction model ────────────
    await conn.execute("""
        CREATE TABLE transactions (
            id          VARCHAR PRIMARY KEY,
            amount      FLOAT NOT NULL,
            risk_level  VARCHAR NOT NULL,
            description VARCHAR NOT NULL,
            created_at  TIMESTAMP DEFAULT NOW()
        )
    """)

    # ── CREATE audit_logs — matches SQLAlchemy AuditLog model ────────────────
    await conn.execute("""
        CREATE TABLE audit_logs (
            id        SERIAL PRIMARY KEY,
            "user"    VARCHAR,
            action    VARCHAR,
            detail    TEXT,
            timestamp TIMESTAMP DEFAULT NOW()
        )
    """)

    # ── CREATE chat_sessions — matches SQLAlchemy ChatSession model ───────────
    await conn.execute("""
        CREATE TABLE chat_sessions (
            id         SERIAL PRIMARY KEY,
            "user"     VARCHAR NOT NULL,
            title      VARCHAR DEFAULT 'New Conversation',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    """)

    # ── CREATE chat_messages — matches SQLAlchemy ChatMessage model ───────────
    await conn.execute("""
        CREATE TABLE chat_messages (
            id            SERIAL PRIMARY KEY,
            session_id    INTEGER NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
            role          VARCHAR NOT NULL,
            content       TEXT NOT NULL,
            response_type VARCHAR DEFAULT 'text',
            timestamp     TIMESTAMP DEFAULT NOW()
        )
    """)
    print("Created all tables.")

    # ── SEED transactions ─────────────────────────────────────────────────────
    now = datetime.utcnow()
    for tx_id, amount, risk_level, description in TRANSACTIONS:
        await conn.execute("""
            INSERT INTO transactions (id, amount, risk_level, description, created_at)
            VALUES ($1, $2, $3, $4, $5)
        """, tx_id, amount, risk_level, description, now)

    count = await conn.fetchval("SELECT COUNT(*) FROM transactions")
    print(f"Seeded {count} transactions.")

    # ── Verify ────────────────────────────────────────────────────────────────
    rows = await conn.fetch("SELECT id, amount, risk_level FROM transactions ORDER BY id")
    print("\n── Transactions in DB ──────────────────────────────")
    for r in rows:
        print(f"  {r['id']}  ${r['amount']:>10,.0f}  {r['risk_level']}")

    print("\n✅ Database seeded successfully! All tables ready.")
    await conn.close()


asyncio.run(seed())
