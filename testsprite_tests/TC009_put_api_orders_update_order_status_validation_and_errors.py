import requests
import time

BASE_URL = "http://localhost:5173"
TIMEOUT = 30

def create_dummy_product():
    product_data = {
        "name": f"Test Product {int(time.time())}",
        "price": 10.0,
        "category": "Test Category",
        "description": "Test description"
    }
    response = requests.post(f"{BASE_URL}/api/products", json=product_data, timeout=TIMEOUT)
    response.raise_for_status()
    product = response.json()
    assert "id" in product, "Product create response missing 'id'"
    return product["id"]

def delete_product(product_id):
    requests.delete(f"{BASE_URL}/api/products/{product_id}", timeout=TIMEOUT)

def create_dummy_order():
    products_resp = requests.get(f"{BASE_URL}/api/products", timeout=TIMEOUT)
    products_resp.raise_for_status()
    products = products_resp.json()
    if not products:
        product_id = create_dummy_product()
        price = 10.0
    else:
        product_id = products[0]["id"]
        price = products[0].get("price", 10.0)
    quantity = 1
    item = {"product_id": product_id, "quantity": quantity}
    subtotal = price * quantity
    discount = 0.0
    total = subtotal - discount

    order_data = {
        "customer_name": "Test Customer",
        "table_number": "1",
        "order_type": "dine-in",
        "payment_method": "cash",
        "status": "pending",
        "subtotal": subtotal,
        "discount": discount,
        "total": total,
        "items": [item]
    }
    order_resp = requests.post(f"{BASE_URL}/api/orders", json=order_data, timeout=TIMEOUT)
    order_resp.raise_for_status()
    order = order_resp.json()
    assert "id" in order, "Order create response missing 'id'"
    return order["id"]

def delete_order(order_id):
    pass

def test_put_api_orders_update_order_status_validation_and_errors():
    valid_statuses = ["pending", "paid", "canceled"]
    invalid_status = "invalid_status_12345"
    non_existent_order_id = "00000000-0000-0000-0000-000000000000"

    order_id = None
    try:
        order_id = create_dummy_order()

        for status in valid_statuses:
            resp = requests.put(
                f"{BASE_URL}/api/orders/{order_id}/status",
                json={"status": status},
                timeout=TIMEOUT
            )
            assert resp.status_code == 200, f"Expected 200 for valid status '{status}', got {resp.status_code}"
            resp_json = resp.json()
            assert isinstance(resp_json, dict)
            assert resp_json.get("status") == status, f"Order status not updated correctly to '{status}'"

        resp = requests.put(
            f"{BASE_URL}/api/orders/{order_id}/status",
            json={"status": invalid_status},
            timeout=TIMEOUT
        )
        assert resp.status_code == 400, f"Expected 400 for invalid status, got {resp.status_code}"
        error_json = resp.json()
        assert ("error" in error_json) or ("message" in error_json) or isinstance(error_json, dict)

        resp = requests.put(
            f"{BASE_URL}/api/orders/{non_existent_order_id}/status",
            json={"status": valid_statuses[0]},
            timeout=TIMEOUT
        )
        assert resp.status_code == 404, f"Expected 404 for non-existent order id, got {resp.status_code}"

    finally:
        if order_id:
            delete_order(order_id)

test_put_api_orders_update_order_status_validation_and_errors()
