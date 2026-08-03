const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

// Load environment variables if needed
dotenv.config();

const Admin = require('./src/models/Admin');
const Vendor = require('./src/models/Vendor');
const DeliveryPartner = require('./src/models/DeliveryPartner');
const Consumer = require('./src/models/Consumer');
const Restaurant = require('./src/models/Restaurant');
const MenuItem = require('./src/models/MenuItem');
const Order = require('./src/models/Order');
const Cart = require('./src/models/Cart');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/rideal_delivery');
    console.log('MongoDB Connected');
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

const seedData = async () => {
  await connectDB();

  console.log('Clearing existing data...');
  await Admin.deleteMany({});
  await Vendor.deleteMany({});
  await DeliveryPartner.deleteMany({});
  await Consumer.deleteMany({});
  await Restaurant.deleteMany({});
  await MenuItem.deleteMany({});
  await Order.deleteMany({});
  await Cart.deleteMany({});

  const passwordHash = await bcrypt.hash('password123', 10);

  console.log('Seeding Users...');
  
  const admin = await Admin.create({
    name: 'Super Admin',
    email: 'admin@rideal.com',
    password: passwordHash,
    isVerified: true
  });

  const vendor = await Vendor.create({
    name: 'Test Vendor',
    email: 'vendor@rideal.com',
    password: passwordHash,
    phone: '9876543210',
    fssai: 'FSSAI12345',
    gst: 'GSTIN12345',
    aadhaar: '123412341234',
    bankDetails: {
      accountNumber: '00012345678',
      ifsc: 'HDFC0001',
      bankName: 'HDFC Bank'
    },
    isVerified: true,
    isApproved: true
  });

  const driver = await DeliveryPartner.create({
    name: 'Test Driver',
    email: 'driver@rideal.com',
    password: passwordHash,
    phone: '8765432109',
    vehicleDetails: {
      type: 'bike',
      number: 'DL-01-AB-1234',
      drivingLicense: 'DL123456789'
    },
    isVerified: true,
    isApproved: true,
    isOnline: true,
    currentLocation: {
      type: 'Point',
      coordinates: [77.1025, 28.7041] // Delhi
    }
  });

  const customer = await Consumer.create({
    name: 'Test Customer',
    email: 'customer@rideal.com',
    password: passwordHash,
    phone: '7654321098',
    isVerified: true,
    addresses: [
      {
        type: 'Home',
        street: '123 Test Street',
        city: 'New Delhi',
        state: 'Delhi',
        zipCode: '110001',
        location: {
          type: 'Point',
          coordinates: [77.1000, 28.7000]
        }
      }
    ]
  });

  console.log('Seeding Restaurants...');
  
  const res1 = await Restaurant.create({
    owner: vendor._id,
    name: 'Burger King - Connaught Place',
    address: 'Inner Circle, CP, New Delhi',
    location: {
      type: 'Point',
      coordinates: [77.2185, 28.6328]
    },
    status: 'Open',
    deliveryRadius: 10,
    minOrderValue: 150,
    deliveryFee: 40,
    isApproved: true,
    rating: 4.5,
    cuisine: ['Fast Food', 'Burgers']
  });

  const res2 = await Restaurant.create({
    owner: vendor._id,
    name: 'Pizza Hut - Closed Demo',
    address: 'South Ex, New Delhi',
    location: {
      type: 'Point',
      coordinates: [77.2200, 28.5700]
    },
    status: 'Closed',
    deliveryRadius: 5,
    minOrderValue: 200,
    deliveryFee: 50,
    isApproved: true,
    rating: 4.0,
    cuisine: ['Pizza', 'Italian']
  });

  console.log('Seeding Menu Items...');
  
  const item1 = await MenuItem.create({
    restaurant: res1._id,
    name: 'Whopper Burger',
    description: 'Classic flame-grilled beef burger',
    price: 199,
    type: 'non-veg',
    category: 'Burgers',
    isAvailable: true,
    stockCount: 100,
    image: 'https://example.com/whopper.jpg'
  });

  const item2 = await MenuItem.create({
    restaurant: res1._id,
    name: 'Medium French Fries',
    description: 'Crispy salted fries',
    price: 99,
    type: 'veg',
    category: 'Sides',
    isAvailable: false, // UI test for out of stock
    image: 'https://example.com/fries.jpg'
  });

  const item3 = await MenuItem.create({
    restaurant: res2._id,
    name: 'Margherita Pizza',
    description: 'Classic cheese pizza',
    price: 299,
    type: 'veg',
    category: 'Pizza',
    isAvailable: true,
    stockCount: 50,
    image: 'https://example.com/pizza.jpg'
  });

  console.log('Seeding Orders (Various States)...');

  const createOrder = async (status, addDriver = false) => {
    const orderData = {
      user: customer._id,
      restaurant: res1._id,
      items: [
        {
          menuItem: item1._id,
          name: item1.name,
          quantity: 2,
          price: item1.price,
          totalItemPrice: item1.price * 2
        }
      ],
      totalAmount: 398 + 40, // Items + Delivery
      status: status,
      deliveryAddress: {
        label: 'Home',
        street: '123 Test Street',
        city: 'New Delhi',
        zip: '110001',
        location: { type: 'Point', coordinates: [77.1000, 28.7000] }
      },
      paymentMethod: 'upi',
      paymentStatus: status === 'placed' ? 'pending' : 'success'
    };

    if (addDriver) {
      orderData.deliveryPartner = {
        user: driver._id,
        name: driver.name,
        phone: driver.phone,
        currentLocation: driver.currentLocation
      };
    }

    return await Order.create(orderData);
  };

  // Create an order in every possible state
  await createOrder('placed'); 
  await createOrder('accepted');
  await createOrder('preparing');
  await createOrder('ready_for_pickup'); 
  await createOrder('assigned', true); 
  await createOrder('picked_up', true); 
  await createOrder('out_for_delivery', true); 
  await createOrder('delivered', true); 
  await createOrder('cancelled'); 

  console.log('====================================');
  console.log('✅ Seeding Complete!');
  console.log('Test Accounts (Password: password123)');
  console.log(`Admin: ${admin.email}`);
  console.log(`Vendor: ${vendor.email}`);
  console.log(`Driver: ${driver.email}`);
  console.log(`Customer: ${customer.email}`);
  console.log('====================================');

  process.exit();
};

seedData();
