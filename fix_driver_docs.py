import os

driver_path = r"d:\Rideal\Delivery\docs\delivery-partner-app-docs.md"
with open(driver_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Remove the incorrectly appended "Driver Wallet & Withdrawal" from the admin block
bad_block = """### 4. Driver Wallet & Withdrawal

**Request Earnings Withdrawal**
```bash
curl -X POST http://localhost:5000/api/driver/wallet/withdraw \\
-H "Authorization: Bearer <TOKEN>" \\
-H "Content-Type: application/json" \\
-d '{"amount": 500, "bankDetailsId": "bank_12345"}'
```"""
if bad_block in content:
    content = content.replace(bad_block, "")

# 2. Append new missing features (Trips, Ratings, Support)
missing_features = """
### 5. Trips & Ratings

**Get Completed Trip History**
```bash
curl -X GET http://localhost:5000/api/partner/orders/history \\
-H "Authorization: Bearer <TOKEN>"
```

**Get Driver Performance (Ratings & Reviews)**
```bash
curl -X GET http://localhost:5000/api/partner/ratings \\
-H "Authorization: Bearer <TOKEN>"
```

### 6. Driver Support (Complaints)

**Raise a Support Ticket**
```bash
curl -X POST http://localhost:5000/api/tickets \\
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \\
-d '{"subject": "Payment Delay", "description": "My last withdrawal is stuck.", "type": "driver"}'
```
"""

# Find the start of the Admin Configuration section to inject the missing features right before it
admin_section = "## Admin Configuration APIs (For Admins Only)"
if admin_section in content and "### 5. Trips & Ratings" not in content:
    content = content.replace(admin_section, missing_features + "\n---\n\n" + admin_section)

with open(driver_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated delivery-partner-app-docs.md")
