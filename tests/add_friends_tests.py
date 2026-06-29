import pytest
import pytest_asyncio
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from backend import models
from scripts.add_friends import add_friends_by_email

test_engine = create_async_engine("sqlite+aiosqlite:///:memory:")
TestSessionLocal = async_sessionmaker(bind=test_engine, expire_on_commit=False, autoflush=False)


@pytest_asyncio.fixture(autouse=True)
async def reset_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.drop_all)
        await conn.run_sync(models.Base.metadata.create_all)
    yield


async def create_users(db, *emails: str) -> None:
    db.add_all([models.User(email=email, name=email.split("@")[0]) for email in emails])
    await db.commit()


async def friendship_count(db) -> int:
    result = await db.execute(select(func.count()).select_from(models.Friendship))
    return result.scalar_one()


@pytest.mark.asyncio
async def test_add_friends_creates_one_accepted_friendship():
    async with TestSessionLocal() as db:
        await create_users(db, "owner@example.com", "one@example.com")

        results = await add_friends_by_email(
            db,
            "owner@example.com",
            ["one@example.com"],
        )

        assert [result.action for result in results] == ["created"]
        assert [result.status for result in results] == ["ACCEPTED"]
        assert await friendship_count(db) == 1


@pytest.mark.asyncio
async def test_add_friends_creates_multiple_accepted_friendships():
    async with TestSessionLocal() as db:
        await create_users(db, "owner@example.com", "one@example.com", "two@example.com")

        results = await add_friends_by_email(
            db,
            "owner@example.com",
            ["one@example.com", "two@example.com"],
        )

        assert [result.action for result in results] == ["created", "created"]
        assert [result.status for result in results] == ["ACCEPTED", "ACCEPTED"]
        assert await friendship_count(db) == 2


@pytest.mark.asyncio
async def test_add_friends_detects_existing_reverse_friendship_without_duplicate():
    async with TestSessionLocal() as db:
        await create_users(db, "owner@example.com", "one@example.com", "two@example.com")
        owner = (await db.execute(select(models.User).where(models.User.email == "owner@example.com"))).scalar_one()
        one = (await db.execute(select(models.User).where(models.User.email == "one@example.com"))).scalar_one()
        db.add(models.Friendship(requester_id=one.id, addressee_id=owner.id, status="ACCEPTED"))
        await db.commit()

        results = await add_friends_by_email(
            db,
            "owner@example.com",
            ["one@example.com", "two@example.com"],
        )

        assert [(result.email, result.action) for result in results] == [
            ("one@example.com", "unchanged"),
            ("two@example.com", "created"),
        ]
        assert await friendship_count(db) == 2


@pytest.mark.asyncio
async def test_add_friends_reactivates_rejected_or_removed_friendship():
    async with TestSessionLocal() as db:
        await create_users(db, "owner@example.com", "one@example.com", "two@example.com")
        owner = (await db.execute(select(models.User).where(models.User.email == "owner@example.com"))).scalar_one()
        one = (await db.execute(select(models.User).where(models.User.email == "one@example.com"))).scalar_one()
        two = (await db.execute(select(models.User).where(models.User.email == "two@example.com"))).scalar_one()
        db.add_all(
            [
                models.Friendship(requester_id=one.id, addressee_id=owner.id, status="REJECTED"),
                models.Friendship(requester_id=two.id, addressee_id=owner.id, status="REMOVED"),
            ]
        )
        await db.commit()

        results = await add_friends_by_email(
            db,
            "owner@example.com",
            ["one@example.com", "two@example.com"],
            status="PENDING",
        )

        assert [result.action for result in results] == ["reactivated", "reactivated"]
        assert [result.status for result in results] == ["PENDING", "PENDING"]
        friendships = (await db.execute(select(models.Friendship))).scalars().all()
        assert {(friendship.requester_id, friendship.addressee_id, friendship.status) for friendship in friendships} == {
            (owner.id, one.id, "PENDING"),
            (owner.id, two.id, "PENDING"),
        }


@pytest.mark.asyncio
async def test_add_friends_missing_email_fails_before_commit():
    async with TestSessionLocal() as db:
        await create_users(db, "owner@example.com", "one@example.com")

        with pytest.raises(ValueError, match="user email\\(s\\) not found: missing@example.com"):
            await add_friends_by_email(
                db,
                "owner@example.com",
                ["one@example.com", "missing@example.com"],
            )

        assert await friendship_count(db) == 0


@pytest.mark.asyncio
async def test_add_friends_requires_at_least_one_friend_email():
    async with TestSessionLocal() as db:
        await create_users(db, "owner@example.com")

        with pytest.raises(ValueError, match="at least one friend email is required"):
            await add_friends_by_email(db, "owner@example.com", [])

        assert await friendship_count(db) == 0


@pytest.mark.asyncio
async def test_add_friends_rejects_self_friendship():
    async with TestSessionLocal() as db:
        await create_users(db, "owner@example.com", "two@example.com")

        with pytest.raises(ValueError, match="cannot add the source user as a friend"):
            await add_friends_by_email(
                db,
                "owner@example.com",
                ["owner@example.com", "two@example.com"],
            )

        assert await friendship_count(db) == 0
