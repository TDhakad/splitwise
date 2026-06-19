import asyncio
import datetime
import json

from backend import models
from backend.database import SessionLocal, create_database_tables
from backend.services import rebuild_balances


async def add_seeded_expense(
    db,
    group_id,
    created_by,
    description,
    total_amount,
    payer_id,
    owes_dict,
    category="Entertainment / Drinks",
    has_receipt=False,
):
    expense = models.Expense(
        group_id=group_id,
        created_by=created_by,
        description=description,
        total_amount=total_amount,
        currency="USD",
        category=category,
        has_receipt=has_receipt,
        date=datetime.datetime.utcnow(),
    )
    db.add(expense)
    await db.flush()

    db.add_all(
        [
            models.ExpenseParticipant(
                expense_id=expense.id,
                user_id=user_id,
                amount_paid=total_amount if user_id == payer_id else 0.0,
                amount_owed=owed_amount,
            )
            for user_id, owed_amount in owes_dict.items()
        ]
    )
    await rebuild_balances(db, group_id)

    db.add(
        models.AuditLog(
            user_id=created_by,
            action="CREATE",
            target_type="Expense",
            target_id=expense.id,
            changes=json.dumps(
                {
                    "description": description,
                    "total_amount": total_amount,
                    "category": category,
                    "has_receipt": has_receipt,
                }
            ),
        )
    )
    await db.commit()


async def seed_data():
    await create_database_tables()
    async with SessionLocal() as db:
        users = [
            models.User(email="alice@example.com", name="Alice"),
            models.User(email="bob@example.com", name="Bob"),
            models.User(email="charlie@example.com", name="Charlie"),
            models.User(email="demo@example.com", name="Demo User"),
        ]
        db.add_all(users)
        await db.commit()

        groups = [
            models.Group(name="Berlin Trip", description="Weekend trip to Berlin", created_by=4),
            models.Group(name="Apartment", description="Shared flat expenses", created_by=4),
        ]
        db.add_all(groups)
        await db.commit()

        db.add_all(
            [
                models.GroupMember(group_id=1, user_id=1),
                models.GroupMember(group_id=1, user_id=2),
                models.GroupMember(group_id=1, user_id=4),
                models.GroupMember(group_id=2, user_id=2),
                models.GroupMember(group_id=2, user_id=3),
                models.GroupMember(group_id=2, user_id=4),
            ]
        )
        await db.commit()

        await add_seeded_expense(
            db,
            group_id=1,
            created_by=4,
            description="Berlin Airbnb booking",
            total_amount=180.00,
            payer_id=4,
            owes_dict={1: 60.00, 2: 60.00, 4: 60.00},
            category="Travel",
            has_receipt=True,
        )
        await add_seeded_expense(
            db,
            group_id=1,
            created_by=1,
            description="Dinner at Schnitzel Palace",
            total_amount=90.00,
            payer_id=1,
            owes_dict={1: 30.00, 2: 30.00, 4: 30.00},
            category="Dining Out",
        )
        await add_seeded_expense(
            db,
            group_id=1,
            created_by=2,
            description="Drinks at Berlin Club",
            total_amount=45.00,
            payer_id=2,
            owes_dict={1: 15.00, 2: 15.00, 4: 15.00},
        )
        await add_seeded_expense(
            db,
            group_id=2,
            created_by=4,
            description="Monthly Groceries",
            total_amount=120.00,
            payer_id=4,
            owes_dict={2: 40.00, 3: 40.00, 4: 40.00},
            category="Groceries",
            has_receipt=True,
        )
        await add_seeded_expense(
            db,
            group_id=2,
            created_by=3,
            description="Broadband Internet Router",
            total_amount=60.00,
            payer_id=3,
            owes_dict={2: 20.00, 3: 20.00, 4: 20.00},
            category="Groceries",
        )
        await add_seeded_expense(
            db,
            group_id=None,
            created_by=1,
            description="Taxi ride back home",
            total_amount=30.00,
            payer_id=1,
            owes_dict={1: 15.00, 4: 15.00},
            category="Travel",
        )

    print("Database seeded successfully with users, groups, group members, expenses, and balances!")
    print("User IDs: Alice=1, Bob=2, Charlie=3, Demo=4")
    print("Group IDs: Berlin Trip=1, Apartment=2")


if __name__ == "__main__":
    asyncio.run(seed_data())
