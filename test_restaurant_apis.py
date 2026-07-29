import requests
import json
import uuid

BASE_URL = "http://localhost:6030"

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
        print("Response:", res.text[:300])
        return res
    except Exception as e:
        print(f"[{method}] {path} -> FAILED: {str(e)}")
        return None

print("\n--- Testing Restaurant Owner Auth APIs ---")
unique_id = str(uuid.uuid4())[:8]
email = f"owner_{unique_id}@example.com"
password = "password123"

# 1. Signup
signup_payload = {
    "name": "Jane Owner",
    "email": email,
    "password": password,
    "phone": "7777777777",
    "businessName": "Jane Burger Shop",
    "role": "restaurant_owner" # just in case the generic signup needs role, though the docs say /signup/restaurant-owner
}
res_signup = test_endpoint("POST", "/api/auth/signup/restaurant-owner", payload=signup_payload)

# If it 404s, maybe the endpoint is actually /api/auth/signup ?
if res_signup and res_signup.status_code == 404:
    print("Trying generic signup instead...")
    res_signup = test_endpoint("POST", "/api/auth/signup", payload=signup_payload)

# 2. Login
login_payload = {
    "email": email,
    "password": password
}
res_login = test_endpoint("POST", "/api/auth/login", payload=login_payload)

token = None
if res_login and res_login.status_code == 200:
    data = res_login.json()
    token = data.get("token") or data.get("accessToken")
    
if not token:
    print("\nLogin did not return a token. (Could be waiting for OTP).")
    print("Skipping protected /owner routes as we cannot bypass OTP here without DB access.")
else:
    print("\n--- Testing Protected Owner APIs ---")
    test_endpoint("GET", "/api/owner/restaurants", token=token)
