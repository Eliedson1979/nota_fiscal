import requests
import uuid

BASE_URL = "http://localhost:5173"
TIMEOUT = 30

def test_patch_api_orders_update_order_status_alias_validation_and_errors():
    headers = {"Content-Type": "application/json"}

    # First, create a new order to use its ID for status update tests
    # We need a valid order payload according to POST /api/orders schema
    order_payload = {
        "customer_name": "Test Customer",
        "table_number": "1",
        "order_type": "DINE_IN",
        "payment_method": "CASH",
        "status": "pending",
        "subtotal": 10.0,
        "discount": 0.0,
        "total": 10.0,
        "items": []
    }

    order_id = None
    try:
        # Create order
        create_resp = requests.post(
            f"{BASE_URL}/api/orders",
            json=order_payload,
            headers=headers,
            timeout=TIMEOUT
        )
        assert create_resp.status_code == 201, f"Failed to create order, status: {create_resp.status_code}, body: {create_resp.text}"
        create_data = create_resp.json()
        assert "id" in create_data, "Response missing 'id' field"
        order_id = create_data["id"]

        # --- Test valid status update using PATCH (alias to PUT) ---
        valid_status_payload = {"status": "paid"}
        patch_valid_resp = requests.patch(
            f"{BASE_URL}/api/orders/{order_id}/status",
            json=valid_status_payload,
            headers=headers,
            timeout=TIMEOUT
        )
        assert patch_valid_resp.status_code == 200, f"Valid status update PATCH failed with status {patch_valid_resp.status_code}"
        updated_order = patch_valid_resp.json()
        assert "status" in updated_order, "Updated order missing 'status'"
        assert updated_order["status"].lower() == valid_status_payload["status"].lower(), f"Updated status '{updated_order['status']}' does not match expected '{valid_status_payload['status']}'"

        # --- Test invalid status update payload (expect 400) ---
        invalid_status_payload = {"status": "invalid_status_value"}
        patch_invalid_resp = requests.patch(
            f"{BASE_URL}/api/orders/{order_id}/status",
            json=invalid_status_payload,
            headers=headers,
            timeout=TIMEOUT
        )
        assert patch_invalid_resp.status_code == 400, f"Invalid status update PATCH did not return 400, got {patch_invalid_resp.status_code}"

        # --- Test patch status update on non-existent order ID (expect 404) ---
        non_existent_id = str(uuid.uuid4())
        patch_notfound_resp = requests.patch(
            f"{BASE_URL}/api/orders/{non_existent_id}/status",
            json=valid_status_payload,
            headers=headers,
            timeout=TIMEOUT
        )
        assert patch_notfound_resp.status_code == 404, f"PATCH on non-existent order ID did not return 404, got {patch_notfound_resp.status_code}"

    finally:
        # Cleanup: delete the created order if it was created
        if order_id:
            try:
                requests.delete(f"{BASE_URL}/api/orders/{order_id}", timeout=TIMEOUT)
            except Exception:
                pass

test_patch_api_orders_update_order_status_alias_validation_and_errors()