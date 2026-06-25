import requests

BASE_URL = "http://localhost:3000"
HEADERS = {"Content-Type": "application/json"}
TIMEOUT = 30


def test_delete_api_products_remove_product_by_id():
    # Create a new product to delete
    product_payload = {
        "name": "Test Product Delete",
        "price": 9.99,
        "category": "Test Category",
        "description": "Product to test delete endpoint"
    }
    product_id = None
    try:
        # Create product
        resp_create = requests.post(
            f"{BASE_URL}/api/products",
            json=product_payload,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert resp_create.status_code == 201, f"Product creation failed: {resp_create.text}"
        product = resp_create.json()
        product_id = product.get("id") if isinstance(product, dict) else None
        assert product_id is not None, "Created product ID is missing"

        # Delete the created product
        resp_delete = requests.delete(
            f"{BASE_URL}/api/products/{product_id}",
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert resp_delete.status_code == 200, f"Product deletion failed: {resp_delete.text}"

        # Verify product is removed from the list
        resp_list = requests.get(
            f"{BASE_URL}/api/products",
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert resp_list.status_code == 200, f"Failed fetching products list: {resp_list.text}"
        products = resp_list.json()
        ids = [p.get("id") for p in products if isinstance(p, dict)]
        assert product_id not in ids, "Deleted product still exists in the product list"

    except requests.RequestException as e:
        assert False, f"HTTP request failed: {e}"
    finally:
        # Cleanup: attempt to delete product if it wasn't deleted
        if product_id is not None:
            try:
                requests.delete(
                    f"{BASE_URL}/api/products/{product_id}",
                    headers=HEADERS,
                    timeout=TIMEOUT
                )
            except requests.RequestException:
                pass


test_delete_api_products_remove_product_by_id()
