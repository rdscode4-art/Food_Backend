
const mongoose = require("mongoose");
mongoose.connect("mongodb://127.0.0.1:27017/rideal").then(async () => {
  const Order = require("./src/models/Order");
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const orderMatch = { createdAt: { $gte: thirtyDaysAgo } };
  
  const driverPerfData = await Order.aggregate([
      { $match: { ...orderMatch, status: "delivered", deliveredAt: { $exists: true, $type: "date" }, pickedUpAt: { $exists: true, $type: "date" }, createdAt: { $type: "date" } } },
      { $project: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          driver: "$deliveryPartner.user",
          deliveryTimeMs: { $subtract: ["$deliveredAt", "$pickedUpAt"] }
        }
      },
      { $group: { 
          _id: { date: "$date", driver: "$driver" }, 
          avgDriverTime: { $avg: "$deliveryTimeMs" } 
        } 
      },
      { $group: {
          _id: "$_id.date",
          activeDrivers: { $sum: 1 },
          avgDeliveryTimeMs: { $avg: "$avgDriverTime" }
        }
      },
      { $sort: { _id: 1 } }
    ]);
  console.log("Success! Data Length:", driverPerfData.length);
  process.exit(0);
}).catch(console.error);

