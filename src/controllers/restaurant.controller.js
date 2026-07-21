const Restaurant = require('../models/Restaurant');
const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');
const { successResponse, errorResponse } = require('../utils/apiResponse');

exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    return successResponse(res, 'Categories fetched successfully', categories);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getRestaurants = async (req, res) => {
  try {
    const { lat, lng, radius = 5000, category } = req.query; // radius in meters

    const query = { isApproved: true, isActive: true };

    if (category) {
      query.categories = category;
    }

    if (lat && lng) {
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: parseInt(radius),
        },
      };
    }

    const restaurants = await Restaurant.find(query)
      .populate('categories', 'name icon')
      .sort({ rating: -1 });

    return successResponse(res, 'Restaurants fetched successfully', restaurants);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getFeaturedRestaurants = async (req, res) => {
  try {
    const restaurants = await Restaurant.find({ isApproved: true, isActive: true })
      .populate('categories', 'name icon')
      .sort({ rating: -1, reviewCount: -1 })
      .limit(10);
      
    return successResponse(res, 'Featured restaurants fetched successfully', restaurants);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getFastestRestaurants = async (req, res) => {
  try {
    const restaurants = await Restaurant.find({ isApproved: true, isActive: true })
      .populate('categories', 'name icon')
      .sort({ deliveryTime: 1 })
      .limit(10);
      
    return successResponse(res, 'Fastest restaurants fetched successfully', restaurants);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getPopularRestaurants = async (req, res) => {
  try {
    const restaurants = await Restaurant.find({ isApproved: true, isActive: true })
      .populate('categories', 'name icon')
      .sort({ reviewCount: -1, rating: -1 })
      .limit(10);
      
    return successResponse(res, 'Popular restaurants fetched successfully', restaurants);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getRestaurantDetail = async (req, res) => {
  try {
    const { id } = req.params;
    
    const restaurant = await Restaurant.findOne({
      _id: id,
      isApproved: true,
      isActive: true,
    }).populate('categories', 'name icon');

    if (!restaurant) {
      return errorResponse(res, 'Restaurant not found or inactive', 404);
    }

    const menu = await MenuItem.find({
      restaurant: id,
      isAvailable: true,
    });

    return successResponse(res, 'Restaurant details fetched successfully', {
      restaurant,
      menu,
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.search = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return successResponse(res, 'No search query provided', { restaurants: [], menuItems: [] });
    }

    // Search active restaurants
    const restaurants = await Restaurant.find({
      isApproved: true,
      isActive: true,
      name: { $regex: q, $options: 'i' },
    }).populate('categories', 'name icon');

    // To search menu items, we must ensure they belong to active/approved restaurants
    // First find matching items
    const menuItemsRaw = await MenuItem.find({
      name: { $regex: q, $options: 'i' },
      isAvailable: true,
    }).populate({
      path: 'restaurant',
      match: { isApproved: true, isActive: true },
      select: 'name isApproved isActive deliveryTime rating',
    });

    // Filter out items whose restaurant is not approved/active
    const menuItems = menuItemsRaw.filter((item) => item.restaurant !== null);

    return successResponse(res, 'Search completed', {
      restaurants,
      menuItems,
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};
