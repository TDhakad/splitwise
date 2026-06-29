import argparse
import asyncio
import os
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

VALID_STATUSES = {"ACCEPTED", "PENDING"}


@dataclass(frozen=True)
class FriendAddResult:
    email: str
    friendship_id: int | None
    status: str
    action: str


async def add_friends_by_email(
    db: AsyncSession,
    user_email: str,
    friend_emails: list[str],
    status: str = "ACCEPTED",
) -> list[FriendAddResult]:
    from backend import models

    status = status.upper()
    if status not in VALID_STATUSES:
        raise ValueError(f"status must be one of: {', '.join(sorted(VALID_STATUSES))}")

    if not friend_emails:
        raise ValueError("at least one friend email is required")

    if len(set(friend_emails)) != len(friend_emails):
        raise ValueError("friend emails must be unique")

    if any(email.lower() == user_email.lower() for email in friend_emails):
        raise ValueError("cannot add the source user as a friend")

    emails_to_find = [user_email, *friend_emails]
    users_result = await db.execute(select(models.User).where(models.User.email.in_(emails_to_find)))
    users_by_email = {user.email: user for user in users_result.scalars().all()}

    missing_emails = [email for email in emails_to_find if email not in users_by_email]
    if missing_emails:
        raise ValueError(f"user email(s) not found: {', '.join(missing_emails)}")

    source_user = users_by_email[user_email]
    results: list[FriendAddResult] = []

    for friend_email in friend_emails:
        friend_user = users_by_email[friend_email]
        existing_result = await db.execute(
            select(models.Friendship).where(
                or_(
                    and_(
                        models.Friendship.requester_id == source_user.id,
                        models.Friendship.addressee_id == friend_user.id,
                    ),
                    and_(
                        models.Friendship.requester_id == friend_user.id,
                        models.Friendship.addressee_id == source_user.id,
                    ),
                )
            )
        )
        existing = existing_result.scalars().first()

        if existing and existing.status in {"ACCEPTED", "PENDING"}:
            results.append(
                FriendAddResult(
                    email=friend_email,
                    friendship_id=existing.id,
                    status=existing.status,
                    action="unchanged",
                )
            )
            continue

        if existing and existing.status in {"REJECTED", "REMOVED"}:
            existing.requester_id = source_user.id
            existing.addressee_id = friend_user.id
            existing.status = status
            existing.updated_at = datetime.now(timezone.utc)
            results.append(
                FriendAddResult(
                    email=friend_email,
                    friendship_id=existing.id,
                    status=status,
                    action="reactivated",
                )
            )
            continue

        friendship = models.Friendship(
            requester_id=source_user.id,
            addressee_id=friend_user.id,
            status=status,
        )
        db.add(friendship)
        await db.flush()
        results.append(
            FriendAddResult(
                email=friend_email,
                friendship_id=friendship.id,
                status=status,
                action="created",
            )
        )

    await db.commit()
    return results


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Add one or more friends for an existing user by email.")
    parser.add_argument("--user-email", required=True, help="Existing user email that will own/request the friendships.")
    parser.add_argument(
        "--friend-emails",
        nargs="+",
        required=True,
        metavar="FRIEND_EMAIL",
        help="One or more existing user emails to add as friends.",
    )
    parser.add_argument(
        "--status",
        choices=sorted(VALID_STATUSES),
        default="ACCEPTED",
        help="Friendship status to create or reactivate. Defaults to ACCEPTED.",
    )
    parser.add_argument(
        "--database-url",
        help="Override DATABASE_URL for local or cloud Postgres. Defaults to .env/environment DATABASE_URL.",
    )
    return parser.parse_args()


async def run_cli() -> int:
    args = parse_args()
    if args.database_url:
        os.environ["DATABASE_URL"] = args.database_url

    from backend.database import SessionLocal

    async with SessionLocal() as db:
        try:
            results = await add_friends_by_email(
                db,
                user_email=args.user_email,
                friend_emails=list(args.friend_emails),
                status=args.status,
            )
        except Exception:
            await db.rollback()
            raise

    for result in results:
        print(
            f"{result.action}: {result.email} "
            f"(friendship_id={result.friendship_id}, status={result.status})"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(run_cli()))
