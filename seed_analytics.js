
const mongoose = require("mongoose");
mongoose.connect("mongodb://127.0.0.1:27017/rideal").then(async () => {
  const Order = require("./src/models/Order");

  const consumerId = new mongoose.Types.ObjectId();
  const restaurantId = new mongoose.Types.ObjectId();
  const driverId = new mongoose.Types.ObjectId();
  
  // Generate 20 random orders over the last 7 days
  const orders = [];
  for (let i = 0; i < 20; i++) {
    const d = new Date();
    d.setDate(d.getDate() - Math.floor(Math.random() * 7));
    const pickedUp = new Date(d.getTime() - Math.floor(Math.random() * 30 + 10) * 60000); // 10-40 mins before
    const placed = new Date(pickedUp.getTime() - Math.floor(Math.random() * 15 + 5) * 60000); // 5-20 mins before
    
    orders.push({
      user: consumerId,
      restaurant: restaurantId,
      totalAmount: Math.floor(Math.random() * 1000) + 200,
      status: "delivered",
      createdAt: placed,
      placedAt: placed,
      pickedUpAt: pickedUp,
      deliveredAt: d,
      deliveryAddress: {
        city: "mumbai",
        location: {
          type: "Point",
          coordinates: [72.84 + Math.random()*0.05, 19.05 + Math.random()*0.05]
        }
      },
      deliveryPartner: {
        user: driverId
      }
    });
  }

  await Order.insertMany(orders);
  console.log("Seeded 20 orders");
  process.exit(0);
}).catch(console.error);

