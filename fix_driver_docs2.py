import os

driver_path = r"d:\Rideal\Delivery\docs\delivery-partner-app-docs.md"
with open(driver_path, "r", encoding="utf-8") as f:
    content = f.read()

profile_and_notifications = """
### 7. Profile & Notifications

**Get Driver Profile**
```bash
curl -X GET http://localhost:5000/api/partner/profile \\
-H "Authorization: Bearer <TOKEN>"
```

**Update Profile (Vehicle Info)**
```bash
curl -X PUT http://localhost:5000/api/partner/profile \\
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \\
-d '{"vehicleNumber": "MH-12-PQ-9999"}'
```

**Get Notifications**
```bash
curl -X GET http://localhost:5000/api/notifications \\
-H "Authorization: Bearer <TOKEN>"
```
"""

admin_section = "## Admin Configuration APIs (For Admins Only)"
if admin_section in content and "### 7. Profile & Notifications" not in content:
    content = content.replace(admin_section, profile_and_notifications + "\n---\n\n" + admin_section)

# Fix reject job payload to include reason
reject_broken = """**Reject a Job (Triggers Auto-Reassign)**
```bash
curl -X PUT http://localhost:5000/api/partner/orders/<orderId>/reject \\
-H "Authorization: Bearer <TOKEN>"
```"""

reject_fixed = """**Reject a Job (Triggers Auto-Reassign)**
```bash
curl -X PUT http://localhost:5000/api/partner/orders/<orderId>/reject \\
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \\
-d '{"reason": "Vehicle Breakdown"}'
```"""

content = content.replace(reject_broken, reject_fixed)

with open(driver_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated delivery-partner-app-docs.md with profile, notifications, and reject reason.")
