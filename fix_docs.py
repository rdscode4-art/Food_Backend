import os

# 1. Fix Consumer Docs numbering
consumer_path = r"d:\Rideal\Delivery\docs\consumer-app-docs.md"
with open(consumer_path, "r", encoding="utf-8") as f:
    consumer_content = f.read()

# Fix numbering jumps
consumer_content = consumer_content.replace("### 10. Wallet", "### 9. Wallet")
consumer_content = consumer_content.replace("### 11. Coupons & Offers", "### 10. Coupons & Offers")
consumer_content = consumer_content.replace("### 12. Membership Plans (Loyalty) (`/api/membership`)", "### 11. Membership Plans (Loyalty) (`/api/membership`)")
consumer_content = consumer_content.replace("### 13. Customer Support Tickets (`/api/tickets`)", "### 12. Customer Support Tickets (`/api/tickets`)")
consumer_content = consumer_content.replace("### 14. Membership Plans (`/api/memberships`)", "### 13. Membership Plans (`/api/memberships`)")
consumer_content = consumer_content.replace("### 15. Zones (`/api/zones`)", "### 14. Zones (`/api/zones`)")

with open(consumer_path, "w", encoding="utf-8") as f:
    f.write(consumer_content)


# 2. Append Table Management to Restaurant Docs
restaurant_path = r"d:\Rideal\Delivery\docs\restaurant-partner-app-docs.md"
with open(restaurant_path, "r", encoding="utf-8") as f:
    rest_content = f.read()

table_section = """
### 9. Dine-In & Table Management

**Get All Tables for Restaurant**
```bash
curl -X GET http://localhost:5000/api/owner/<restaurantId>/tables \\
-H "Authorization: Bearer <TOKEN>"
```

**Create a New Table**
```bash
curl -X POST http://localhost:5000/api/owner/<restaurantId>/tables \\
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \\
-d '{"tableNumber": "T-01", "capacity": 4}'
```

**Generate QR Code for Table Ordering**
```bash
curl -X GET http://localhost:5000/api/owner/<restaurantId>/tables/<tableId>/qr \\
-H "Authorization: Bearer <TOKEN>"
```
"""

if "### 9. Dine-In & Table Management" not in rest_content:
    rest_content += table_section
    with open(restaurant_path, "w", encoding="utf-8") as f:
        f.write(rest_content)

print("Updated docs successfully")
