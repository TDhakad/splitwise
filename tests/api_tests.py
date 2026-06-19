import os
import tempfile
from datetime import datetime, timezone

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from jose import jwt

_db_file = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_db_file.close()

os.environ["DATABASE_URL"] = f"sqlite:///{_db_file.name}"
os.environ["SECRET_KEY"] = "test-secret"
os.environ["ENVIRONMENT"] = "test"

from backend import models
from backend.config import settings
from backend.database import engine
from backend.main import app
from backend.routers import expenses as expenses_router


@pytest_asyncio.fixture(autouse=True)
async def reset_db():
    async with engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.drop_all)
        await conn.run_sync(models.Base.metadata.create_all)
    yield


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as test_client:
        yield test_client


async def auth_headers(client: AsyncClient, email: str = "alex@example.com") -> dict[str, str]:
    password = "password123"
    await client.post(
        "/auth/register",
        json={"email": email, "name": "Alex User", "password": password},
    )
    response = await client.post(
        "/auth/login",
        data={"username": email, "password": password},
    )
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_users_post_is_not_available(client: AsyncClient):
    response = await client.post(
        "/users/",
        json={"email": "open@example.com", "name": "Open User"},
    )

    assert response.status_code == 405


@pytest.mark.asyncio
async def test_receipt_scan_requires_auth(client: AsyncClient):
    response = await client.post(
        "/receipts/scan",
        files={"file": ("receipt.png", b"image", "image/png")},
    )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_receipt_scan_rejects_unsupported_file_type(client: AsyncClient):
    headers = await auth_headers(client)

    response = await client.post(
        "/receipts/scan",
        headers=headers,
        files={"file": ("receipt.txt", b"text", "text/plain")},
    )

    assert response.status_code == 415


@pytest.mark.asyncio
async def test_expense_rejects_negative_amounts(client: AsyncClient):
    headers = await auth_headers(client)

    response = await client.post(
        "/expenses/",
        headers=headers,
        json={
            "description": "Bad split",
            "total_amount": 10,
            "currency": "USD",
            "participants": [
                {"user_id": 1, "amount_paid": -1, "amount_owed": 10}
            ],
        },
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_expense_create_and_update_accept_timezone_aware_dates(client: AsyncClient):
    headers = await auth_headers(client)

    create_response = await client.post(
        "/expenses/",
        headers=headers,
        json={
            "description": "Hotel",
            "total_amount": 100,
            "currency": "USD",
            "date": "2026-06-18T00:00:00Z",
            "category": "Accommodation",
            "participants": [
                {"user_id": 1, "amount_paid": 100, "amount_owed": 100},
            ],
        },
    )
    assert create_response.status_code == 200, create_response.text

    expense_id = create_response.json()["id"]
    update_response = await client.put(
        f"/expenses/{expense_id}",
        headers=headers,
        json={
            "description": "Hotel updated",
            "total_amount": 100,
            "currency": "USD",
            "date": "2026-06-19T00:00:00Z",
            "category": "Accommodation",
            "participants": [
                {"user_id": 1, "amount_paid": 100, "amount_owed": 100},
            ],
        },
    )
    assert update_response.status_code == 200, update_response.text
    assert update_response.json()["category"] == "Accommodation"
    assert update_response.json()["date"].startswith("2026-06-19T00:00:00")


@pytest.mark.asyncio
async def test_groups_list_includes_members(client: AsyncClient):
    headers = await auth_headers(client)
    create_response = await client.post(
        "/groups/",
        headers=headers,
        json={"name": "Trip"},
    )
    assert create_response.status_code == 200, create_response.text

    response = await client.get("/groups/", headers=headers)

    assert response.status_code == 200, response.text
    groups = response.json()
    assert len(groups) == 1
    assert groups[0]["name"] == "Trip"
    assert groups[0]["members"][0]["email"] == "alex@example.com"


@pytest.mark.asyncio
async def test_group_expense_rebuilds_non_simplified_balances(client: AsyncClient):
    headers = await auth_headers(client)
    await client.post(
        "/auth/register",
        json={"email": "blair@example.com", "name": "Blair User", "password": "password123"},
    )
    await client.post(
        "/auth/register",
        json={"email": "casey@example.com", "name": "Casey User", "password": "password123"},
    )
    group_response = await client.post(
        "/groups/",
        headers=headers,
        json={"name": "Dinner"},
    )
    assert group_response.status_code == 200, group_response.text
    group_id = group_response.json()["id"]

    add_member_response = await client.post(
        f"/groups/{group_id}/members/2",
        headers=headers,
    )
    assert add_member_response.status_code == 200, add_member_response.text

    non_member_response = await client.post(
        "/expenses/",
        headers=headers,
        json={
            "group_id": group_id,
            "description": "Invalid member",
            "total_amount": 20,
            "currency": "USD",
            "participants": [
                {"user_id": 1, "amount_paid": 20, "amount_owed": 10},
                {"user_id": 3, "amount_paid": 0, "amount_owed": 10},
            ],
        },
    )
    assert non_member_response.status_code == 400, non_member_response.text

    response = await client.post(
        "/expenses/",
        headers=headers,
        json={
            "group_id": group_id,
            "description": "Pizza",
            "total_amount": 20,
            "currency": "USD",
            "participants": [
                {"user_id": 1, "amount_paid": 20, "amount_owed": 10},
                {"user_id": 2, "amount_paid": 0, "amount_owed": 10},
            ],
        },
    )
    assert response.status_code == 200, response.text

    expenses_response = await client.get("/users/1/expenses", headers=headers)
    assert expenses_response.status_code == 200, expenses_response.text
    expenses = expenses_response.json()
    assert len(expenses) == 1
    assert len(expenses[0]["participants"]) == 2

    balances_response = await client.get("/balances/1", headers=headers)
    assert balances_response.status_code == 200, balances_response.text
    balances = balances_response.json()
    assert len(balances) == 1
    assert balances[0]["amount"] == 10

    overpayment_response = await client.post(
        "/settlements/",
        headers=headers,
        json={
            "group_id": group_id,
            "payer_id": 2,
            "payee_id": 1,
            "amount": 11,
            "currency": "USD",
        },
    )
    assert overpayment_response.status_code == 400, overpayment_response.text

    wrong_direction_response = await client.post(
        "/settlements/",
        headers=headers,
        json={
            "group_id": group_id,
            "payer_id": 1,
            "payee_id": 2,
            "amount": 3,
            "currency": "USD",
        },
    )
    assert wrong_direction_response.status_code == 400, wrong_direction_response.text

    global_overpayment_response = await client.post(
        "/settlements/",
        headers=headers,
        json={
            "payer_id": 2,
            "payee_id": 1,
            "amount": 11,
            "currency": "USD",
        },
    )
    assert global_overpayment_response.status_code == 400, global_overpayment_response.text

    settlement_response = await client.post(
        "/settlements/",
        headers=headers,
        json={
            "group_id": group_id,
            "payer_id": 2,
            "payee_id": 1,
            "amount": 3,
            "currency": "USD",
        },
    )
    assert settlement_response.status_code == 200, settlement_response.text

    balances_response = await client.get("/balances/1", headers=headers)
    assert balances_response.status_code == 200, balances_response.text
    balances = balances_response.json()
    assert len(balances) == 1
    assert balances[0]["amount"] == 7

    user_settlements_response = await client.get("/users/1/settlements", headers=headers)
    assert user_settlements_response.status_code == 200, user_settlements_response.text
    user_settlements = user_settlements_response.json()
    assert len(user_settlements) == 1
    assert user_settlements[0]["payer_id"] == 2
    assert user_settlements[0]["payee_id"] == 1

    group_settlements_response = await client.get(f"/groups/{group_id}/settlements", headers=headers)
    assert group_settlements_response.status_code == 200, group_settlements_response.text
    group_settlements = group_settlements_response.json()
    assert len(group_settlements) == 1
    assert group_settlements[0]["amount"] == 3

    simplify_response = await client.put(
        f"/groups/{group_id}/simplify?enable=true",
        headers=headers,
    )
    assert simplify_response.status_code == 200, simplify_response.text

    group_balances_response = await client.get(
        f"/groups/{group_id}/balances",
        headers=headers,
    )
    assert group_balances_response.status_code == 200, group_balances_response.text
    group_balances = group_balances_response.json()
    assert len(group_balances) == 1
    assert group_balances[0]["amount"] == 7


@pytest.mark.asyncio
async def test_delete_group_expense_removes_it_and_rebuilds_balances(client: AsyncClient):
    headers = await auth_headers(client)
    await client.post(
        "/auth/register",
        json={"email": "blair@example.com", "name": "Blair User", "password": "password123"},
    )
    group_response = await client.post("/groups/", headers=headers, json={"name": "Trip"})
    assert group_response.status_code == 200, group_response.text
    group_id = group_response.json()["id"]
    add_member_response = await client.post(f"/groups/{group_id}/members/2", headers=headers)
    assert add_member_response.status_code == 200, add_member_response.text

    first_expense_response = await client.post(
        "/expenses/",
        headers=headers,
        json={
            "group_id": group_id,
            "description": "Hotel",
            "total_amount": 100,
            "currency": "USD",
            "participants": [
                {"user_id": 1, "amount_paid": 100, "amount_owed": 50},
                {"user_id": 2, "amount_paid": 0, "amount_owed": 50},
            ],
        },
    )
    assert first_expense_response.status_code == 200, first_expense_response.text
    second_expense_response = await client.post(
        "/expenses/",
        headers=headers,
        json={
            "group_id": group_id,
            "description": "Taxi",
            "total_amount": 40,
            "currency": "USD",
            "participants": [
                {"user_id": 1, "amount_paid": 40, "amount_owed": 20},
                {"user_id": 2, "amount_paid": 0, "amount_owed": 20},
            ],
        },
    )
    assert second_expense_response.status_code == 200, second_expense_response.text

    delete_response = await client.delete(
        f"/expenses/{first_expense_response.json()['id']}",
        headers=headers,
    )
    assert delete_response.status_code == 204, delete_response.text

    expenses_response = await client.get("/users/1/expenses", headers=headers)
    assert expenses_response.status_code == 200, expenses_response.text
    expenses = expenses_response.json()
    assert [expense["description"] for expense in expenses] == ["Taxi"]

    balances_response = await client.get("/balances/1", headers=headers)
    assert balances_response.status_code == 200, balances_response.text
    balances = balances_response.json()
    assert len(balances) == 1
    assert balances[0]["amount"] == 20


@pytest.mark.asyncio
async def test_delete_expense_rejects_unrelated_user(client: AsyncClient):
    alex_headers = await auth_headers(client)
    blair_headers = await auth_headers(client, "blair@example.com")

    expense_response = await client.post(
        "/expenses/",
        headers=alex_headers,
        json={
            "description": "Personal",
            "total_amount": 12,
            "currency": "USD",
            "participants": [
                {"user_id": 1, "amount_paid": 12, "amount_owed": 12},
            ],
        },
    )
    assert expense_response.status_code == 200, expense_response.text

    delete_response = await client.delete(
        f"/expenses/{expense_response.json()['id']}",
        headers=blair_headers,
    )
    assert delete_response.status_code == 403

    expenses_response = await client.get("/users/1/expenses", headers=alex_headers)
    assert expenses_response.status_code == 200, expenses_response.text
    assert len(expenses_response.json()) == 1


@pytest.mark.asyncio
async def test_plan_cannot_track_group_user_cannot_access(client: AsyncClient):
    alex_headers = await auth_headers(client)
    blair_headers = await auth_headers(client, "blair@example.com")

    group_response = await client.post("/groups/", headers=blair_headers, json={"name": "Private"})
    assert group_response.status_code == 200, group_response.text

    plan_response = await client.post(
        "/api/v1/preplanning/plans",
        headers=alex_headers,
        json={
            "name": "Trip",
            "start_date": "2026-06-01T00:00:00Z",
            "end_date": "2026-06-30T00:00:00Z",
            "total_budget": 10000,
            "status": "active",
            "type": "trip",
        },
    )
    assert plan_response.status_code == 201, plan_response.text

    response = await client.put(
        f"/api/v1/preplanning/plans/{plan_response.json()['id']}/groups",
        headers=alex_headers,
        json=[group_response.json()["id"]],
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_token_expiry_uses_configured_expiry(client: AsyncClient):
    await client.post(
        "/auth/register",
        json={"email": "alex@example.com", "name": "Alex User", "password": "password123"},
    )
    response = await client.post(
        "/auth/login",
        data={"username": "alex@example.com", "password": "password123"},
    )
    assert response.status_code == 200, response.text

    token = response.json()["access_token"]
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    expires_at = datetime.fromtimestamp(payload["exp"], timezone.utc)
    issued_window = expires_at - datetime.now(timezone.utc)

    assert issued_window.total_seconds() > (settings.ACCESS_TOKEN_EXPIRE_MINUTES - 1) * 60


@pytest.mark.asyncio
async def test_user_expenses_limit_is_bounded(client: AsyncClient):
    headers = await auth_headers(client)

    for index in range(2):
        response = await client.post(
            "/expenses/",
            headers=headers,
            json={
                "description": f"Coffee {index}",
                "total_amount": 5,
                "currency": "USD",
                "participants": [
                    {"user_id": 1, "amount_paid": 5, "amount_owed": 5},
                ],
            },
        )
        assert response.status_code == 200, response.text

    response = await client.get("/users/1/expenses?limit=1", headers=headers)
    assert response.status_code == 200, response.text
    assert len(response.json()) == 1

    too_large_response = await client.get("/users/1/expenses?limit=101", headers=headers)
    assert too_large_response.status_code == 422


@pytest.mark.asyncio
async def test_failed_balance_rebuild_does_not_commit_partial_expense(monkeypatch):
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await auth_headers(client)

        async def fail_rebuild(_db, _group_id):
            raise RuntimeError("forced rebuild failure")

        monkeypatch.setattr(expenses_router, "rebuild_balances", fail_rebuild)

        response = await client.post(
            "/expenses/",
            headers=headers,
            json={
                "description": "Rollback check",
                "total_amount": 5,
                "currency": "USD",
                "participants": [
                    {"user_id": 1, "amount_paid": 5, "amount_owed": 5},
                ],
            },
        )
        assert response.status_code == 500

        expenses_response = await client.get("/users/1/expenses", headers=headers)
        assert expenses_response.status_code == 200, expenses_response.text
        assert expenses_response.json() == []


def teardown_module():
    try:
        os.unlink(_db_file.name)
    except FileNotFoundError:
        pass
