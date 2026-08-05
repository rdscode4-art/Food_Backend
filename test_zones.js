const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/food_delivery').then(async () => {
  const Zone = require('./src/models/Zone.js');
  const zones = await Zone.find();
  console.log('Zones:', zones);
  const Order = require('./src/models/Order.js');
  const orders = await Order.find().limit(1);
  console.log('Sample order deliveryAddress:', orders[0]?.deliveryAddress);
  process.exit();
});
