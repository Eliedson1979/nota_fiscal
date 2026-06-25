import requests

BASE_URL = "http://localhost:3000"
ORDERS_ENDPOINT = "/api/orders"
TIMEOUT = 30

def test_get_api_orders_list_ordered_by_creation_date():
    url = BASE_URL + ORDERS_ENDPOINT
    try:
        response = requests.get(url, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200 but got {response.status_code}"
        try:
            orders = response.json()
        except Exception:
            assert False, "Response is not valid JSON"
        assert isinstance(orders, list), "Response is not a list"
        # Check if the list is ordered by creation date descending
        # We'll try to compare 'createdAt' or 'creation_date' fields if present
        # Because schema not explicit, test on presence and descending order assumption
        if orders:
            keys = orders[0].keys()
            date_keys = [k for k in keys if "created" in k.lower() or "date" in k.lower()]
            assert date_keys, "No creation date field found in order objects"
            date_key = date_keys[0]
            dates = []
            for ord in orders:
                val = ord.get(date_key)
                assert val is not None, f"Order missing {date_key}"
                dates.append(val)
            # Check descending order (ISO dates or timestamps assumed)
            assert dates == sorted(dates, reverse=True), "Orders are not ordered by creation date descending"
    except requests.RequestException as e:
        assert False, f"Request failed with exception: {e}"

test_get_api_orders_list_ordered_by_creation_date()
