import os
import glob

models_dir = r"d:\Rideal\Delivery\src\models"

# 1. Update simple Consumer references
consumer_models = ["Address.js", "Cart.js", "Wishlist.js", "Review.js", "PaymentMethod.js", "Payment.js"]
for model in consumer_models:
    filepath = os.path.join(models_dir, model)
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        content = content.replace("ref: 'User'", "ref: 'Consumer'")
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated {model} -> Consumer")

# 2. Update Vendor references
vendor_models = ["Restaurant.js"]
for model in vendor_models:
    filepath = os.path.join(models_dir, model)
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        content = content.replace("ref: 'User'", "ref: 'Vendor'")
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated {model} -> Vendor")

# 3. Update DeliveryPartner references
driver_models = ["Payout.js", "WithdrawalRequest.js"]
for model in driver_models:
    filepath = os.path.join(models_dir, model)
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        content = content.replace("ref: 'User'", "ref: 'DeliveryPartner'")
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated {model} -> DeliveryPartner")

# 4. Update Order.js
order_path = os.path.join(models_dir, "Order.js")
if os.path.exists(order_path):
    with open(order_path, "r", encoding="utf-8") as f:
        content = f.read()
    # The first one is user, second one is deliveryPartner
    # Let's be explicit
    content = content.replace("user: {\n      type: mongoose.Schema.Types.ObjectId,\n      ref: 'User',\n      required: true,\n    },", 
                              "user: {\n      type: mongoose.Schema.Types.ObjectId,\n      ref: 'Consumer',\n      required: true,\n    },")
    content = content.replace("deliveryPartner: {\n        type: mongoose.Schema.Types.ObjectId,\n        ref: 'User',\n      },",
                              "deliveryPartner: {\n        type: mongoose.Schema.Types.ObjectId,\n        ref: 'DeliveryPartner',\n      },")
    
    with open(order_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Updated Order.js -> Consumer, DeliveryPartner")

# 5. Polymorphic Models
poly_models = ["ActivityLog.js", "Ticket.js", "Notification.js", "WalletTransaction.js", "CmsPage.js"]
for model in poly_models:
    filepath = os.path.join(models_dir, model)
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Add userModel field for refPath if it doesn't exist
        if "userModel:" not in content:
            # We find the `user: { ... ref: 'User' }` and replace it
            content = content.replace("ref: 'User',", "refPath: 'userModel',")
            content = content.replace("user: {", "userModel: { type: String, required: true, enum: ['Consumer', 'Vendor', 'DeliveryPartner', 'Admin'] },\n    user: {")
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"Updated {model} -> Polymorphic")
