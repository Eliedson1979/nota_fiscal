import requests
import copy

BASE_URL = "http://localhost:5173"
HEADERS = {"Content-Type": "application/json"}
TIMEOUT = 30


def test_post_api_orders_submit_completed_order_success_and_validation():
    # Step 1: Get products to use valid items in order
    try:
        resp_products = requests.get(f"{BASE_URL}/api/products", timeout=TIMEOUT)
        assert resp_products.status_code == 200, f"Expected 200 from products, got {resp_products.status_code}"
        products = resp_products.json()
        assert isinstance(products, list) and len(products) > 0, "Products list is empty or invalid"

        # Pick one product to include as order item
        product = products[0]
        item_price = product.get("price")
        assert isinstance(item_price, (int, float)), "Product price is not a number"

        valid_order_payload = {
            "customer_name": "Test Customer",
            "table_number": "10",
            "order_type": "Dine-In",
            "payment_method": "Cash",
            "status": "Pendente",
            "subtotal": item_price,
            "discount": 0,
            "total": item_price,
            "items": [
                {
                    "product_id": product.get("id"),
                    "quantity": 1,
                    "price": item_price
                }
            ]
        }

        # Send valid completed order - expect 201 with id and message
        resp_valid = requests.post(f"{BASE_URL}/api/orders", json=valid_order_payload, headers=HEADERS, timeout=TIMEOUT)
        assert resp_valid.status_code == 201, f"Expected 201 on valid order, got {resp_valid.status_code}"
        data_valid = resp_valid.json()
        assert "id" in data_valid, "Response missing 'id' on valid order"
        assert "message" in data_valid, "Response missing 'message' on valid order"

        # Prepare invalid payloads to test validation errors on subtotal, total, and items

        # 1) invalid subtotal (less than sum of items)
        invalid_subtotal_payload = copy.deepcopy(valid_order_payload)
        invalid_subtotal_payload["subtotal"] = valid_order_payload["subtotal"] - 1  # less than item price sum

        # 2) invalid total (less than subtotal - discount)
        invalid_total_payload = copy.deepcopy(valid_order_payload)
        # total less than (subtotal - discount) = subtotal here as discount=0
        invalid_total_payload["total"] = valid_order_payload["subtotal"] - 1

        # 3) invalid items list (empty)
        invalid_items_payload = copy.deepcopy(valid_order_payload)
        invalid_items_payload["items"] = []

        # Function to test invalid payload and expect 400
        def assert_bad_request(payload, case_name):
            resp = requests.post(f"{BASE_URL}/api/orders", json=payload, headers=HEADERS, timeout=TIMEOUT)
            assert resp.status_code == 400, f"{case_name}: Expected 400, got {resp.status_code}"
            try:
                err_data = resp.json()
            except Exception:
                assert False, f"{case_name}: Response is not valid JSON for 400 error"
            assert isinstance(err_data, dict), f"{case_name}: Error response is not a dict"
            # It should contain validation error messages (generic check)
            assert any(key in err_data for key in ["error", "message", "errors"]), f"{case_name}: Missing validation error message"

        assert_bad_request(invalid_subtotal_payload, "Invalid Subtotal")
        assert_bad_request(invalid_total_payload, "Invalid Total")
        assert_bad_request(invalid_items_payload, "Invalid Items")

    except requests.RequestException as e:
        assert False, f"HTTP request failed: {e}"


test_post_api_orders_submit_completed_order_success_and_validation()
