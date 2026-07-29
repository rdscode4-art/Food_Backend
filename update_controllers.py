import os
import glob

controllers_dir = r"d:\Rideal\Delivery\src\controllers"

# Controllers that exclusively deal with Consumers
consumer_controllers = ["user.controller.js", "membership.controller.js"]
for ctrl in consumer_controllers:
    filepath = os.path.join(controllers_dir, ctrl)
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        content = content.replace("const User = require('../models/User');", "const Consumer = require('../models/Consumer');")
        content = content.replace("User.", "Consumer.")
        content = content.replace("User(", "Consumer(")
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated {ctrl} to use Consumer")

# Controllers that deal with Vendors
vendor_controllers = ["restaurant.controller.js"]
for ctrl in vendor_controllers:
    filepath = os.path.join(controllers_dir, ctrl)
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        content = content.replace("const User = require('../models/User');", "const Vendor = require('../models/Vendor');")
        content = content.replace("User.", "Vendor.")
        content = content.replace("User(", "Vendor(")
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated {ctrl} to use Vendor")

# Controllers that deal with DeliveryPartners
partner_controllers = ["partner.controller.js"]
for ctrl in partner_controllers:
    filepath = os.path.join(controllers_dir, ctrl)
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        content = content.replace("const User = require('../models/User');", "const DeliveryPartner = require('../models/DeliveryPartner');")
        content = content.replace("User.", "DeliveryPartner.")
        content = content.replace("User(", "DeliveryPartner(")
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated {ctrl} to use DeliveryPartner")

# Admin Controller - Requires all models to get counts
admin_ctrl_path = os.path.join(controllers_dir, "admin.controller.js")
if os.path.exists(admin_ctrl_path):
    with open(admin_ctrl_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    replacements = "const Consumer = require('../models/Consumer');\nconst Vendor = require('../models/Vendor');\nconst DeliveryPartner = require('../models/DeliveryPartner');"
    content = content.replace("const User = require('../models/User');", replacements)
    
    # Replace countDocuments
    content = content.replace("const totalCustomers = await User.countDocuments({ role: 'customer' });", "const totalCustomers = await Consumer.countDocuments();")
    content = content.replace("const totalVendors = await User.countDocuments({ role: 'restaurant_owner' });", "const totalVendors = await Vendor.countDocuments();")
    content = content.replace("const totalDrivers = await User.countDocuments({ role: 'delivery_partner' });", "const totalDrivers = await DeliveryPartner.countDocuments();")
    
    # Replace driver fetching
    content = content.replace("User.find({ role: 'delivery_partner'", "DeliveryPartner.find({ ")
    content = content.replace("User.find({ role: 'customer'", "Consumer.find({ ")
    content = content.replace("User.find({ role: 'restaurant_owner'", "Vendor.find({ ")
    
    # findById updates (assuming it's fetching drivers or customers, we'll replace broadly for the APIs)
    # The block customer API:
    content = content.replace("const customer = await User.findOne({ _id: customerId, role: 'customer' });", "const customer = await Consumer.findById(customerId);")
    content = content.replace("const driver = await User.findOne({ _id: driverId, role: 'delivery_partner' });", "const driver = await DeliveryPartner.findById(driverId);")
    content = content.replace("const vendor = await User.findOne({ _id: vendorId, role: 'restaurant_owner' });", "const vendor = await Vendor.findById(vendorId);")
    
    with open(admin_ctrl_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Updated admin.controller.js to use distinct models")

# Order controller - Needs to populate user (now Consumer) and deliveryPartner
order_ctrl_path = os.path.join(controllers_dir, "order.controller.js")
if os.path.exists(order_ctrl_path):
    with open(order_ctrl_path, "r", encoding="utf-8") as f:
        content = f.read()
    # Replace the manual User require inside auto-assign or places
    content = content.replace("const User = require('../models/User');", "const DeliveryPartner = require('../models/DeliveryPartner');")
    content = content.replace("User.findById", "DeliveryPartner.findById")
    with open(order_ctrl_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Updated order.controller.js")

# Wallet controller
wallet_ctrl_path = os.path.join(controllers_dir, "wallet.controller.js")
if os.path.exists(wallet_ctrl_path):
    with open(wallet_ctrl_path, "r", encoding="utf-8") as f:
        content = f.read()
    # In wallet, req.user is already populated with the correct model by auth.middleware.js.
    # We just need to make sure we don't call User.findById
    content = content.replace("const User = require('../models/User');", "const Consumer = require('../models/Consumer');\nconst Vendor = require('../models/Vendor');\nconst DeliveryPartner = require('../models/DeliveryPartner');")
    
    # We can just rely on req.user.save() because it is a full mongoose document attached in middleware
    with open(wallet_ctrl_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Updated wallet.controller.js")
