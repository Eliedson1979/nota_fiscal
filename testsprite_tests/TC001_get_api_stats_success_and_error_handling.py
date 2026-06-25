import requests

BASE_URL = "http://localhost:5173"
TIMEOUT = 30

def test_get_api_stats_success_and_error_handling():
    url = f"{BASE_URL}/api/stats"
    headers = {
        "Accept": "application/json"
    }

    # Test success case (200)
    response = None
    try:
        response = requests.get(url, headers=headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected status 200, got {response.status_code}"
        data = response.json()
        # Expected keys in response
        expected_keys = {
            "todaySales",
            "todayOrdersCount",
            "pendingOrdersCount",
            "completedOrdersCount",
            "topProducts"
        }
        # Check all expected keys are present
        assert expected_keys.issubset(data.keys()), f"Response JSON missing keys: {expected_keys - set(data.keys())}"

        # Validate data types roughly
        assert isinstance(data["todaySales"], (int, float)), "todaySales should be a number"
        assert isinstance(data["todayOrdersCount"], int), "todayOrdersCount should be an integer"
        assert isinstance(data["pendingOrdersCount"], int), "pendingOrdersCount should be an integer"
        assert isinstance(data["completedOrdersCount"], int), "completedOrdersCount should be an integer"
        assert isinstance(data["topProducts"], list), "topProducts should be a list"
        # Optionally check each top product has minimal expected structure
        for product in data["topProducts"]:
            assert isinstance(product, dict), "Each top product should be a dict"
            # Minimal check for product keys like name and sales count if available
            # Since not specified exactly, skip deep validation here

    except requests.RequestException as e:
        assert False, f"GET /api/stats request failed with exception: {e}"

    # Test error case (simulate 500 server error)
    # Since we cannot force server error from client, we simulate by requesting an invalid path that triggers 500,
    # But not specified in PRD how to force 500. 
    # Alternative: We attempt GET /api/stats and if status code 500 occurs, we test error handling.
    # Here we simulate a call expecting 500 handling by direct call to endpoint and check if 500 handled gracefully.
    # Since server may not provide a way to force 500, we just illustrate the check for 500 if it happens.

    try:
        # Request again but allow any status so no exception on bad HTTP status
        response = requests.get(url, headers=headers, timeout=TIMEOUT)
        if response.status_code == 500:
            # On 500 error, response body is an error message string (per schema)
            error_text = response.text.strip()
            assert len(error_text) > 0, "500 error response should contain error message text"
        else:
            # If not 500, pass this test since no server error occurred
            assert response.status_code == 200, f"Expected 200 or 500, got {response.status_code}"
    except requests.RequestException as e:
        assert False, f"GET /api/stats request failed with exception: {e}"

test_get_api_stats_success_and_error_handling()