import requests
import uuid

BASE_URL = "http://localhost:6030"

print("\n--- Testing Delivery Partner Auth APIs ---")
unique_id = str(uuid.uuid4())[:8]
email = f"driver_{unique_id}@example.com"

# 1. Signup
signup_payload = {
    "name": "John Rider",
    "email": email,
    "password": "password123",
    "phone": "8888888888",
    "vehicleType": "bike",
    "vehicleNumber": "AB-12-CD-3456",
    "licenseNumber": "DL123456789",
    "aadhaarNumber": "123456789012",
    "panNumber": "ABCDE1234F",
    "bankDetails": {
        "accountNumber": "123456789",
        "ifsc": "HDFC000123",
        "bankName": "HDFC"
    },
    "partnerDocuments": ["http://link-to-license.jpg"]
}

res = requests.post(f"{BASE_URL}/api/auth/signup/delivery-partner", json=signup_payload)
print(f"[POST] /api/auth/signup/delivery-partner -> Status: {res.status_code}")
print("Response:", res.text[:300])
