import requests
import json
import time

BASE_URL = "http://localhost:6030"

print("Waiting for server to fully boot...")
time.sleep(3)

def test_endpoint(method, path, payload=None, token=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
        
    try:
        if method.upper() == "GET":
            res = requests.get(url, headers=headers)
        elif method.upper() == "POST":
            res = requests.post(url, headers=headers, json=payload)
        print(f"[{method}] {path} -> Status: {res.status_code}")
        print("Response:", res.text[:200])
        return res
    except Exception as e:
        print(f"[{method}] {path} -> FAILED: {str(e)}")
        return None

print("\n--- Testing Public APIs ---")
test_endpoint("GET", "/api/static/app-config")
test_endpoint("GET", "/api/restaurants/categories")
test_endpoint("GET", "/api/restaurants/featured")

print("\n--- Testing Auth APIs ---")
email = "testrunner1@example.com"
password = "password123"

# Signup
signup_payload = {
    "name": "Test Runner",
    "email": email,
    "password": password,
    "phone": "1234567890"
}
test_endpoint("POST", "/api/auth/signup", payload=signup_payload)

# Login
login_payload = {
    "email": email,
    "password": password
}
res = test_endpoint("POST", "/api/auth/login", payload=login_payload)

token = None
if res and res.status_code == 200:
    data = res.json()
    token = data.get("token") or data.get("accessToken")
    print("\n--- Testing Authenticated APIs ---")
    if token:
        test_endpoint("GET", "/api/user/profile", token=token)
        test_endpoint("GET", "/api/user/addresses", token=token)
        test_endpoint("GET", "/api/cart", token=token)
    else:
        print("No token received from login.")
else:
    print("Login failed, skipping authenticated tests.")

