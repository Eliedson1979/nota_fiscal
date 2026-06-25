import requests

BASE_URL = "http://localhost:5173"
HEADERS = {"Content-Type": "application/json"}
TIMEOUT = 30

def test_post_api_products_create_new_product_validation_and_success():
    valid_product = {
        "name": "Test Product Valid",
        "price": 19.99,
        "category": "Test Category",
        "description": "A valid test product description"
    }
    invalid_products = [
        {},  # completely empty
        {"name": "Only name"},  # missing price, category, description
        {"name": "No price", "category": "Test", "description": "Desc"},  # missing price
        {"name": "No category", "price": 10, "description": "Desc"},  # missing category
        {"name": "No description", "price": 10, "category": "Sample"}  # missing description
    ]

    product_id = None
    try:
        # Test successful creation with valid product data
        response = requests.post(
            f"{BASE_URL}/api/products",
            json=valid_product,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert response.status_code == 201, f"Expected 201, got {response.status_code}"
        created_product = response.json()
        # Confirm returned product fields match sent data, plus an id field (string or int)
        assert "id" in created_product, "Response product missing 'id'"
        assert created_product["name"] == valid_product["name"]
        assert float(created_product["price"]) == float(valid_product["price"])
        assert created_product["category"] == valid_product["category"]
        assert created_product["description"] == valid_product["description"]

        product_id = created_product["id"]

        # Test validation errors for invalid or incomplete data
        for invalid_body in invalid_products:
            resp = requests.post(
                f"{BASE_URL}/api/products",
                json=invalid_body,
                headers=HEADERS,
                timeout=TIMEOUT
            )
            assert resp.status_code == 400, f"Expected 400 for invalid body {invalid_body}, got {resp.status_code}"

    finally:
        # Clean up: delete the created product if any
        if product_id is not None:
            try:
                del_resp = requests.delete(
                    f"{BASE_URL}/api/products/{product_id}",
                    headers=HEADERS,
                    timeout=TIMEOUT
                )
                assert del_resp.status_code == 200, f"Expected 200 on delete, got {del_resp.status_code}"
            except Exception:
                pass

test_post_api_products_create_new_product_validation_and_success()