import os
import tempfile
import unittest

_db_file = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_db_file.close()

os.environ["DATABASE_URL"] = f"sqlite:///{_db_file.name}"
os.environ["SECRET_KEY"] = "test-secret"
os.environ["ENVIRONMENT"] = "test"

from fastapi.testclient import TestClient

from backend import models
from backend.database import engine
from backend.main import app


class ApiTests(unittest.TestCase):
    def setUp(self):
        models.Base.metadata.drop_all(bind=engine)
        models.Base.metadata.create_all(bind=engine)
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()

    def auth_headers(self, email="alex@example.com"):
        password = "password123"
        self.client.post(
            "/auth/register",
            json={"email": email, "name": "Alex User", "password": password},
        )
        response = self.client.post(
            "/auth/login",
            data={"username": email, "password": password},
        )
        self.assertEqual(response.status_code, 200, response.text)
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    def test_users_post_is_not_available(self):
        response = self.client.post(
            "/users/",
            json={"email": "open@example.com", "name": "Open User"},
        )

        self.assertEqual(response.status_code, 405)

    def test_receipt_scan_requires_auth(self):
        response = self.client.post(
            "/receipts/scan",
            files={"file": ("receipt.png", b"image", "image/png")},
        )

        self.assertEqual(response.status_code, 401)

    def test_receipt_scan_rejects_unsupported_file_type(self):
        headers = self.auth_headers()

        response = self.client.post(
            "/receipts/scan",
            headers=headers,
            files={"file": ("receipt.txt", b"text", "text/plain")},
        )

        self.assertEqual(response.status_code, 415)

    def test_expense_rejects_negative_amounts(self):
        headers = self.auth_headers()

        response = self.client.post(
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

        self.assertEqual(response.status_code, 422)

    def test_groups_list_includes_members(self):
        headers = self.auth_headers()
        create_response = self.client.post(
            "/groups/",
            headers=headers,
            json={"name": "Trip"},
        )
        self.assertEqual(create_response.status_code, 200, create_response.text)

        response = self.client.get("/groups/", headers=headers)

        self.assertEqual(response.status_code, 200, response.text)
        groups = response.json()
        self.assertEqual(len(groups), 1)
        self.assertEqual(groups[0]["name"], "Trip")
        self.assertEqual(groups[0]["members"][0]["email"], "alex@example.com")

    def test_group_expense_rebuilds_non_simplified_balances(self):
        headers = self.auth_headers()
        self.client.post(
            "/auth/register",
            json={"email": "blair@example.com", "name": "Blair User", "password": "password123"},
        )
        self.client.post(
            "/auth/register",
            json={"email": "casey@example.com", "name": "Casey User", "password": "password123"},
        )
        group_response = self.client.post(
            "/groups/",
            headers=headers,
            json={"name": "Dinner"},
        )
        self.assertEqual(group_response.status_code, 200, group_response.text)
        group_id = group_response.json()["id"]

        add_member_response = self.client.post(
            f"/groups/{group_id}/members/2",
            headers=headers,
        )
        self.assertEqual(add_member_response.status_code, 200, add_member_response.text)

        non_member_response = self.client.post(
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
        self.assertEqual(non_member_response.status_code, 400, non_member_response.text)

        response = self.client.post(
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

        self.assertEqual(response.status_code, 200, response.text)

        expenses_response = self.client.get("/users/1/expenses", headers=headers)
        self.assertEqual(expenses_response.status_code, 200, expenses_response.text)
        expenses = expenses_response.json()
        self.assertEqual(len(expenses), 1)
        self.assertEqual(len(expenses[0]["participants"]), 2)

        balances_response = self.client.get("/balances/1", headers=headers)
        self.assertEqual(balances_response.status_code, 200, balances_response.text)
        balances = balances_response.json()
        self.assertEqual(len(balances), 1)
        self.assertEqual(balances[0]["amount"], 10)

        overpayment_response = self.client.post(
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
        self.assertEqual(overpayment_response.status_code, 400, overpayment_response.text)

        wrong_direction_response = self.client.post(
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
        self.assertEqual(wrong_direction_response.status_code, 400, wrong_direction_response.text)

        global_overpayment_response = self.client.post(
            "/settlements/",
            headers=headers,
            json={
                "payer_id": 2,
                "payee_id": 1,
                "amount": 11,
                "currency": "USD",
            },
        )
        self.assertEqual(global_overpayment_response.status_code, 400, global_overpayment_response.text)

        settlement_response = self.client.post(
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
        self.assertEqual(settlement_response.status_code, 200, settlement_response.text)

        balances_response = self.client.get("/balances/1", headers=headers)
        self.assertEqual(balances_response.status_code, 200, balances_response.text)
        balances = balances_response.json()
        self.assertEqual(len(balances), 1)
        self.assertEqual(balances[0]["amount"], 7)

        user_settlements_response = self.client.get("/users/1/settlements", headers=headers)
        self.assertEqual(user_settlements_response.status_code, 200, user_settlements_response.text)
        user_settlements = user_settlements_response.json()
        self.assertEqual(len(user_settlements), 1)
        self.assertEqual(user_settlements[0]["payer_id"], 2)
        self.assertEqual(user_settlements[0]["payee_id"], 1)

        group_settlements_response = self.client.get(f"/groups/{group_id}/settlements", headers=headers)
        self.assertEqual(group_settlements_response.status_code, 200, group_settlements_response.text)
        group_settlements = group_settlements_response.json()
        self.assertEqual(len(group_settlements), 1)
        self.assertEqual(group_settlements[0]["amount"], 3)

        simplify_response = self.client.put(
            f"/groups/{group_id}/simplify?enable=true",
            headers=headers,
        )
        self.assertEqual(simplify_response.status_code, 200, simplify_response.text)

        group_balances_response = self.client.get(
            f"/groups/{group_id}/balances",
            headers=headers,
        )
        self.assertEqual(group_balances_response.status_code, 200, group_balances_response.text)
        group_balances = group_balances_response.json()
        self.assertEqual(len(group_balances), 1)
        self.assertEqual(group_balances[0]["amount"], 7)


def tearDownModule():
    try:
        os.unlink(_db_file.name)
    except FileNotFoundError:
        pass
