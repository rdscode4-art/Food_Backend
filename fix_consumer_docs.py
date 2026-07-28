import os

filepath = r"d:\Rideal\Delivery\docs\consumer-app-docs.md"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

broken_section = """**Checkout (Creates placed order & clears cart)**
*(Note: The response will include a `deliveryOtp` and `qrCodeString`. The user must present one of these to the delivery partner upon arrival to complete the delivery.)*
```bash

**Get Order Detail**"""

fixed_section = """**Checkout (Creates placed order & clears cart)**
*(Note: The response will include a `deliveryOtp` and `qrCodeString`. The user must present one of these to the delivery partner upon arrival to complete the delivery.)*
```bash
curl -X POST http://localhost:5000/api/order/checkout \\
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \\
-d '{
  "deliveryAddress": {
    "label": "Home",
    "street": "123 Main St",
    "city": "Mumbai",
    "zip": "400001",
    "location": {
      "type": "Point",
      "coordinates": [72.8777, 19.0760]
    }
  },
  "paymentMethod": "card",
  "deliveryInstructions": "Leave at the door",
  "isScheduled": false,
  "orderType": "delivery",
  "tableId": null,
  "couponCode": "FESTIVAL50"
}'
```

**Get Order History**
```bash
curl -X GET http://localhost:5000/api/order \\
-H "Authorization: Bearer <TOKEN>"
```

**Get Order Detail**"""

if broken_section in content:
    content = content.replace(broken_section, fixed_section)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print("Fixed consumer-app-docs.md")
else:
    print("Could not find broken section")
