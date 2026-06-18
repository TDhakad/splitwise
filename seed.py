from backend.database import SessionLocal, engine
from backend import models
import datetime
import json

# Ensure tables are created
models.Base.metadata.create_all(bind=engine)

db = SessionLocal()

def add_seeded_expense(group_id, created_by, description, total_amount, payer_id, owes_dict, category="Entertainment / Drinks", has_receipt=False):
    # 1. Create the Expense
    expense = models.Expense(
        group_id=group_id,
        created_by=created_by,
        description=description,
        total_amount=total_amount,
        currency="USD",
        category=category,
        has_receipt=has_receipt,
        date=datetime.datetime.utcnow()
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)

    # 2. Create Participants
    participants_list = []
    for uid, owe_amt in owes_dict.items():
        paid_amt = total_amount if uid == payer_id else 0.0
        p = models.ExpenseParticipant(
            expense_id=expense.id,
            user_id=uid,
            amount_paid=paid_amt,
            amount_owed=owe_amt
        )
        db.add(p)
        participants_list.append(p)
    db.commit()

    # 3. Update Balances
    nets = {}
    for uid, owe_amt in owes_dict.items():
        paid_amt = total_amount if uid == payer_id else 0.0
        nets[uid] = paid_amt - owe_amt

    creditors = {u: amt for u, amt in nets.items() if amt > 0.01}
    debtors = {u: -amt for u, amt in nets.items() if amt < -0.01}

    for d_id, d_amt in debtors.items():
        for c_id, c_amt in list(creditors.items()):
            if d_amt <= 0.01:
                break
            if c_amt <= 0.01:
                continue
            settle_amount = min(d_amt, c_amt)
            d_amt -= settle_amount
            creditors[c_id] -= settle_amount

            existing = db.query(models.Balance).filter(
                models.Balance.from_user_id == d_id,
                models.Balance.to_user_id == c_id,
                models.Balance.group_id == group_id
            ).first()
            if existing:
                existing.amount += settle_amount
            else:
                existing = models.Balance(
                    group_id=group_id,
                    from_user_id=d_id,
                    to_user_id=c_id,
                    amount=settle_amount
                )
                db.add(existing)
            db.flush()

            rev = db.query(models.Balance).filter(
                models.Balance.from_user_id == c_id,
                models.Balance.to_user_id == d_id,
                models.Balance.group_id == group_id
            ).first()
            if rev:
                if rev.amount > existing.amount:
                    rev.amount -= existing.amount
                    db.delete(existing)
                elif rev.amount < existing.amount:
                    existing.amount -= rev.amount
                    db.delete(rev)
                else:
                    db.delete(existing)
                    db.delete(rev)
    db.commit()

    # 4. Write Audit Log
    log = models.AuditLog(
        user_id=created_by,
        action="CREATE",
        target_type="Expense",
        target_id=expense.id,
        changes=json.dumps({
            "description": description,
            "total_amount": total_amount,
            "category": category,
            "has_receipt": has_receipt
        })
    )
    db.add(log)
    db.commit()

def seed_data():
    # Create Users
    users = [
        models.User(email="alice@example.com", name="Alice"),
        models.User(email="bob@example.com", name="Bob"),
        models.User(email="charlie@example.com", name="Charlie"),
        models.User(email="demo@example.com", name="Demo User")
    ]
    db.add_all(users)
    db.commit()

    # Create Groups
    groups = [
        models.Group(name="Berlin Trip", description="Weekend trip to Berlin", created_by=4),
        models.Group(name="Apartment", description="Shared flat expenses", created_by=4)
    ]
    db.add_all(groups)
    db.commit()

    # Add Members to Groups
    # Berlin Trip: Alice, Bob, Demo (IDs 1, 2, 4)
    members_berlin = [
        models.GroupMember(group_id=1, user_id=1),
        models.GroupMember(group_id=1, user_id=2),
        models.GroupMember(group_id=1, user_id=4)
    ]
    # Apartment: Bob, Charlie, Demo (IDs 2, 3, 4)
    members_apt = [
        models.GroupMember(group_id=2, user_id=2),
        models.GroupMember(group_id=2, user_id=3),
        models.GroupMember(group_id=2, user_id=4)
    ]
    db.add_all(members_berlin)
    db.add_all(members_apt)
    db.commit()

    # Seed Berlin Trip Expenses
    # Alice (1), Bob (2), Demo (4)
    add_seeded_expense(
        group_id=1,
        created_by=4,
        description="Berlin Airbnb booking",
        total_amount=180.00,
        payer_id=4,
        owes_dict={1: 60.00, 2: 60.00, 4: 60.00},
        category="Travel",
        has_receipt=True
    )
    add_seeded_expense(
        group_id=1,
        created_by=1,
        description="Dinner at Schnitzel Palace",
        total_amount=90.00,
        payer_id=1,
        owes_dict={1: 30.00, 2: 30.00, 4: 30.00},
        category="Dining Out",
        has_receipt=False
    )
    add_seeded_expense(
        group_id=1,
        created_by=2,
        description="Drinks at Berlin Club",
        total_amount=45.00,
        payer_id=2,
        owes_dict={1: 15.00, 2: 15.00, 4: 15.00},
        category="Entertainment / Drinks",
        has_receipt=False
    )

    # Seed Apartment Expenses
    # Bob (2), Charlie (3), Demo (4)
    add_seeded_expense(
        group_id=2,
        created_by=4,
        description="Monthly Groceries",
        total_amount=120.00,
        payer_id=4,
        owes_dict={2: 40.00, 3: 40.00, 4: 40.00},
        category="Groceries",
        has_receipt=True
    )
    add_seeded_expense(
        group_id=2,
        created_by=3,
        description="Broadband Internet Router",
        total_amount=60.00,
        payer_id=3,
        owes_dict={2: 20.00, 3: 20.00, 4: 20.00},
        category="Groceries",
        has_receipt=False
    )

    # Seed an individual/friend expense
    # Alice (1) and Demo (4) - no group
    add_seeded_expense(
        group_id=None,
        created_by=1,
        description="Taxi ride back home",
        total_amount=30.00,
        payer_id=1,
        owes_dict={1: 15.00, 4: 15.00},
        category="Travel",
        has_receipt=False
    )

    print("Database seeded successfully with users, groups, group members, expenses, and balances!")
    print("User IDs: Alice=1, Bob=2, Charlie=3, Demo=4")
    print("Group IDs: Berlin Trip=1, Apartment=2")

if __name__ == "__main__":
    seed_data()
