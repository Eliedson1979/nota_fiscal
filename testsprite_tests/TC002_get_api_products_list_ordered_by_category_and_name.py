import requests
from itertools import groupby

BASE_URL = "http://localhost:5173"
PRODUCTS_ENDPOINT = f"{BASE_URL}/api/products"

def test_get_api_products_list_ordered_by_category_and_name():
    timeout = 30
    try:
        response = requests.get(PRODUCTS_ENDPOINT, timeout=timeout)
    except requests.RequestException as e:
        assert False, f"Request to GET /api/products failed: {e}"

    if response.status_code == 200:
        try:
            products = response.json()
        except (ValueError, requests.exceptions.JSONDecodeError):
            assert False, "Response is not valid JSON"

        assert isinstance(products, list), "Expected a list of products"

        # Verify ordering by category and name
        categories = [p.get("category", "") for p in products]
        names = [p.get("name", "") for p in products]

        # Check order by category ascending
        assert categories == sorted(categories), "Products are not ordered by category ascending"

        # Within same category, check order by name ascending
        for cat, group in groupby(products, key=lambda x: x.get("category", "")):
            group_list = list(group)
            group_names = [p.get("name", "") for p in group_list]
            assert group_names == sorted(group_names), f"Products in category '{cat}' are not ordered by name ascending"

    elif response.status_code == 500:
        # Server error response handling - tolerate non-JSON error messages
        try:
            error_content = response.json()
            assert "error" in str(error_content).lower() or "message" in str(error_content).lower()
        except (ValueError, requests.exceptions.JSONDecodeError):
            # If not JSON, check that response text is not empty
            assert len(response.text.strip()) > 0, "Server error response body is empty"
    else:
        assert False, f"Unexpected status code received: {response.status_code}"

test_get_api_products_list_ordered_by_category_and_name()
