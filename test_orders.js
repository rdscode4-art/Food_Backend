const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/food_delivery').then(async () => {
  const Order = require('./src/models/Order.js');
  const count = await Order.countDocuments();
  console.log('Total orders:', count);
  if(count > 0) {
    const orders = await Order.find().limit(1);
    console.log('Sample deliveryAddress:', orders[0].deliveryAddress);
  }
  process.exit();
});
