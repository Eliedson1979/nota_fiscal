import requests
import uuid

BASE_URL = "http://localhost:3000"
TIMEOUT = 30


def test_get_api_orders_by_id_with_items_and_not_found_handling():
    headers = {"Content-Type": "application/json"}

    # Step 1: Create a new order to ensure a valid order ID for testing
    # Fetch products to add to order items
    products_resp = requests.get(f"{BASE_URL}/api/products", timeout=TIMEOUT)
    assert products_resp.status_code == 200, f"Failed to get products list: {products_resp.text}"
    products = products_resp.json()
    assert isinstance(products, list) and len(products) > 0, "No products available to create order items"

    first_product = products[0]

    order_payload = {
        "customer_name": "Test Customer " + str(uuid.uuid4()),
        "table_number": "42",
        "order_type": "dine-in",
        "payment_method": "cash",
        "status": "pending",
        "subtotal": first_product.get("price", 10),
        "discount": 0,
        "total": first_product.get("price", 10),
        "items": [
            {
                "product_id": first_product.get("id"),
                "name": first_product.get("name", "Test Product"),
                "quantity": 1,
                "price": first_product.get("price", 10),
                "total": first_product.get("price", 10),
            }
        ],
    }

    created_order_id = None

    try:
        # Create order
        create_resp = requests.post(f"{BASE_URL}/api/orders", json=order_payload, headers=headers, timeout=TIMEOUT)
        assert create_resp.status_code == 201, f"Failed to create order: {create_resp.text}"
        create_resp_json = create_resp.json()
        created_order_id = create_resp_json.get("id")
        assert created_order_id is not None, "Created order ID is missing"

        # Step 2: Retrieve the order by ID (valid case)
        get_resp = requests.get(f"{BASE_URL}/api/orders/{created_order_id}", headers=headers, timeout=TIMEOUT)
        assert get_resp.status_code == 200, f"Failed to get order by ID: {get_resp.text}"
        order_detail = get_resp.json()
        assert isinstance(order_detail, dict), "Order detail response is not a dict"
        # Validate order contains expected keys
        expected_keys = {"id", "customer_name", "table_number", "order_type", "payment_method", "status", "subtotal", "discount", "total", "items"}
        assert expected_keys.issubset(order_detail.keys()), f"Order detail missing keys, got: {order_detail.keys()}"
        # Validate items list exists and is not empty
        items = order_detail.get("items")
        assert isinstance(items, list) and len(items) > 0, "Order items list is missing or empty"

        # Step 3: Attempt to get an order with an invalid/non-existing ID (not found case)
        invalid_order_id = "non-existent-id-1234567890"
        not_found_resp = requests.get(f"{BASE_URL}/api/orders/{invalid_order_id}", headers=headers, timeout=TIMEOUT)
        assert not_found_resp.status_code == 404, f"Expected 404 not found for invalid order ID, got {not_found_resp.status_code}"

    finally:
        # Cleanup: Delete the created order if possible to keep test environment clean
        if created_order_id:
            # There is no DELETE /api/orders/:id endpoint explicitly documented
            # Commonly orders can't be deleted, so attempt to set status canceled if needed or ignore
            # Here, do a best effort to delete via API (if not implemented, ignore)
            try:
                # Try deleting if implemented
                delete_resp = requests.delete(f"{BASE_URL}/api/orders/{created_order_id}", headers=headers, timeout=TIMEOUT)
                if delete_resp.status_code not in (200, 204, 404):
                    pass  # ignore any other status codes
            except Exception:
                pass


test_get_api_orders_by_id_with_items_and_not_found_handling()