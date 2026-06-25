import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_put_api_products_update_existing_product_success_and_errors():
    headers = {"Content-Type": "application/json"}
    created_product_id = None

    # Step 1: Create a new product to update
    create_payload = {
        "name": "Test Product TC004",
        "price": 10.50,
        "category": "Test Category",
        "description": "Test description for product TC004"
    }
    try:
        resp_create = requests.post(f"{BASE_URL}/api/products", json=create_payload, headers=headers, timeout=TIMEOUT)
        assert resp_create.status_code == 201, f"Failed to create product for test setup: {resp_create.text}"
        product = resp_create.json()
        created_product_id = product.get("id")
        assert created_product_id is not None, "Created product ID missing in response"

        # Step 2: Successful update with valid data
        update_payload_valid = {
            "name": "Updated Product TC004",
            "price": 15.75,
            "category": "Updated Category",
            "description": "Updated description"
        }
        resp_update_valid = requests.put(
            f"{BASE_URL}/api/products/{created_product_id}",
            json=update_payload_valid,
            headers=headers,
            timeout=TIMEOUT
        )
        assert resp_update_valid.status_code == 200, f"Expected 200 OK on valid update but got {resp_update_valid.status_code}: {resp_update_valid.text}"
        updated_product = resp_update_valid.json()
        assert updated_product.get("name") == update_payload_valid["name"], "Product name not updated correctly"
        assert updated_product.get("price") == update_payload_valid["price"], "Product price not updated correctly"
        assert updated_product.get("category") == update_payload_valid["category"], "Product category not updated correctly"
        assert updated_product.get("description") == update_payload_valid["description"], "Product description not updated correctly"

        # Step 3: Attempt update with invalid data (missing required 'price' field, for example)
        update_payload_invalid = {
            "name": "",  # invalid: empty name
            # price omitted to simulate invalid data
            "category": "Invalid Category",
            "description": "Invalid description"
        }
        resp_update_invalid = requests.put(
            f"{BASE_URL}/api/products/{created_product_id}",
            json=update_payload_invalid,
            headers=headers,
            timeout=TIMEOUT
        )
        assert resp_update_invalid.status_code == 400, f"Expected 400 validation error for invalid update but got {resp_update_invalid.status_code}: {resp_update_invalid.text}"

        # Step 4: Attempt update with non-existent product ID
        non_existent_id = "00000000-0000-0000-0000-000000000000"
        update_payload_nonexistent = {
            "name": "Nonexistent Product",
            "price": 20.00,
            "category": "No Category",
            "description": "Trying to update non-existent product"
        }
        resp_update_nonexistent = requests.put(
            f"{BASE_URL}/api/products/{non_existent_id}",
            json=update_payload_nonexistent,
            headers=headers,
            timeout=TIMEOUT
        )
        assert resp_update_nonexistent.status_code == 404, f"Expected 404 not found for non-existent product but got {resp_update_nonexistent.status_code}: {resp_update_nonexistent.text}"

    finally:
        # Cleanup - delete created product if it exists
        if created_product_id:
            try:
                resp_delete = requests.delete(f"{BASE_URL}/api/products/{created_product_id}", timeout=TIMEOUT)
                # We do not assert here, just try to clean up
            except Exception:
                pass

test_put_api_products_update_existing_product_success_and_errors()
