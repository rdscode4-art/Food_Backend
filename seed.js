const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const User = require('./src/models/User');
const Category = require('./src/models/Category');
const Restaurant = require('./src/models/Restaurant');
const MenuItem = require('./src/models/MenuItem');
const env = require('./src/config/env');

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const seedDatabase = async () => {
  try {
    await mongoose.connect(env.mongoUri);
    console.log('Connected to MongoDB for seeding...');

    // Clear existing data (optional but good for clean start)
    await User.deleteMany();
    await Category.deleteMany();
    await Restaurant.deleteMany();
    await MenuItem.deleteMany();
    console.log('Cleared existing data.');

    const defaultPassword = await hashPassword('password123');

    // 1. Admin
    const admin = await User.create({
      name: 'Super Admin',
      email: 'admin@fastfood.com',
      password: defaultPassword,
      role: 'admin',
      isVerified: true,
      isApproved: true,
    });
    console.log('Admin user created.');

    // 2. Categories
    const categories = await Category.insertMany([
      { name: 'Burgers', icon: 'https://example.com/icons/burger.png', restaurantCount: 1 },
      { name: 'Pizza', icon: 'https://example.com/icons/pizza.png', restaurantCount: 1 },
      { name: 'Healthy', icon: 'https://example.com/icons/healthy.png', restaurantCount: 0 },
    ]);
    console.log('Categories created.');

    // 3. Restaurant Owners and Restaurants
    const owner1 = await User.create({
      name: 'John BurgerOwner',
      email: 'john@burgerking.com',
      password: defaultPassword,
      role: 'restaurant_owner',
      isVerified: true,
      isApproved: true,
      businessName: 'Burger King',
    });

    const restaurant1 = await Restaurant.create({
      owner: owner1._id,
      name: 'Burger King',
      coverImage: 'https://example.com/images/bk-cover.jpg',
      logo: 'https://example.com/images/bk-logo.png',
      cuisine: ['American', 'Fast Food'],
      categories: [categories[0]._id],
      rating: 4.5,
      reviewCount: 120,
      deliveryTime: 25,
      deliveryFee: 40,
      minOrder: 150,
      address: '123 Main St, Tech Park',
      location: { type: 'Point', coordinates: [77.61, 12.93] }, // near Koramangala, Bangalore
      isApproved: true,
      isActive: true,
    });

    const owner2 = await User.create({
      name: 'Mario PizzaOwner',
      email: 'mario@pizzahut.com',
      password: defaultPassword,
      role: 'restaurant_owner',
      isVerified: true,
      isApproved: true,
      businessName: 'Pizza Hut',
    });

    const restaurant2 = await Restaurant.create({
      owner: owner2._id,
      name: 'Pizza Hut',
      coverImage: 'https://example.com/images/ph-cover.jpg',
      logo: 'https://example.com/images/ph-logo.png',
      cuisine: ['Italian', 'Fast Food'],
      categories: [categories[1]._id],
      rating: 4.2,
      reviewCount: 85,
      deliveryTime: 35,
      deliveryFee: 50,
      minOrder: 250,
      address: '456 MG Road',
      location: { type: 'Point', coordinates: [77.62, 12.94] },
      isApproved: true,
      isActive: true,
    });
    console.log('Restaurants created.');

    // 4. Menu Items
    await MenuItem.insertMany([
      {
        restaurant: restaurant1._id,
        name: 'Whopper',
        description: 'Signature flame-grilled beef burger',
        price: 199,
        category: 'Burgers',
        addons: [{ name: 'Cheese', price: 20 }, { name: 'Bacon', price: 50 }],
        isAvailable: true,
      },
      {
        restaurant: restaurant1._id,
        name: 'French Fries',
        description: 'Crispy salted fries',
        price: 99,
        category: 'Sides',
        addons: [{ name: 'Peri Peri', price: 15 }],
        isAvailable: true,
      },
      {
        restaurant: restaurant2._id,
        name: 'Margherita Pizza',
        description: 'Classic cheese and tomato pizza',
        price: 299,
        category: 'Pizzas',
        addons: [{ name: 'Extra Cheese', price: 40 }],
        isAvailable: true,
      },
    ]);
    console.log('Menu items created.');

    // 5. Delivery Partners
    await User.create([
      {
        name: 'Raju Partner',
        email: 'raju@delivery.com',
        password: defaultPassword,
        role: 'delivery_partner',
        isVerified: true,
        isApproved: true,
        isOnline: true,
        vehicleType: 'bike',
        vehicleNumber: 'KA-01-AB-1234',
        currentLocation: { type: 'Point', coordinates: [77.615, 12.935] },
      },
      {
        name: 'Sham Partner',
        email: 'sham@delivery.com',
        password: defaultPassword,
        role: 'delivery_partner',
        isVerified: true,
        isApproved: true,
        isOnline: true,
        vehicleType: 'scooter',
        vehicleNumber: 'KA-05-XY-9876',
        currentLocation: { type: 'Point', coordinates: [77.625, 12.945] },
      },
    ]);
    console.log('Delivery partners created.');

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedDatabase();
