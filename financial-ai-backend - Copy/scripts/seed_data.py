import asyncio
import random
import uuid
from app.database import SessionLocal, engine, Base
from app.database import Transaction # Ensure Transaction is also in app/models or imported from database

async def seed_data():
    # 1. Initialize Tables (Fulfills your 'Design Schema' task)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 2. Add Data (Fulfills your 'Create Sample Dataset' task)
    async with SessionLocal() as session:
        print("🚀 Seeding 100 enterprise transactions...")
        for _ in range(100):
            new_tx = Transaction(
                id=uuid.uuid4(),
                amount=round(random.uniform(50, 10000), 2),
                merchant=random.choice(["Global Bank", "NxtGen AI", "Amazon", "FinCorp", "Starbucks"]),
                category=random.choice(["Wire Transfer", "UPI", "Corporate", "Travel"]),
                risk_score=round(random.uniform(10.0, 95.0), 2), # Using 0-100 scale based on your code
                user_id="analyst_john", # Standard test user for Parvaty to log in with
                description="Sample transaction for Day 2 testing"
            )
            session.add(new_tx)
        
        await session.commit()
        print("✅ Seeding complete! 100 transactions added.")

if __name__ == "__main__":
    asyncio.run(seed_data())