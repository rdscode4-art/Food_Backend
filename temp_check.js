
const mongoose = require("mongoose");
mongoose.connect("mongodb://127.0.0.1:27017/rideal").then(async () => {
  const Order = require("./src/models/Order");
  const count = await Order.countDocuments();
  const delivered = await Order.countDocuments({ status: "delivered" });
  const withPickedUp = await Order.countDocuments({ pickedUpAt: { $exists: true } });
  const withDeliveredAt = await Order.countDocuments({ deliveredAt: { $exists: true } });
  console.log({ count, delivered, withPickedUp, withDeliveredAt });
  process.exit(0);
}).catch(console.error);

