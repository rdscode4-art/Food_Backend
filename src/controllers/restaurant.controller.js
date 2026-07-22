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
    const { q, isVeg, isSpicy, minRating, maxDistance, sort, freeDelivery } = req.query;
    
    // Save search query to history if present
    if (q && req.user && req.user._id) {
      const User = require('../models/User');
      await User.findByIdAndUpdate(req.user._id, {
        $addToSet: { recentSearches: q }
      });
    }

    if (!q && !isVeg && !isSpicy && !minRating && !freeDelivery) {
      return successResponse(res, 'No search parameters provided', { restaurants: [], menuItems: [] });
    }

    // --- Search Restaurants ---
    const restaurantQuery = {
      isApproved: true,
      isActive: true,
    };

    if (q) {
      restaurantQuery.name = { $regex: q, $options: 'i' };
    }
    
    if (minRating) {
      restaurantQuery.rating = { $gte: parseFloat(minRating) };
    }
    
    if (freeDelivery === 'true') {
      restaurantQuery.deliveryFee = 0;
    }

    let restaurantSort = { rating: -1 }; // default Recommended / Rating
    if (sort === 'delivery_time') {
      restaurantSort = { deliveryTime: 1 };
    }

    const restaurants = await Restaurant.find(restaurantQuery)
      .populate('categories', 'name icon')
      .sort(restaurantSort);


    // --- Search Menu Items ---
    const menuQuery = {
      isAvailable: true,
    };
    
    if (q) {
      menuQuery.name = { $regex: q, $options: 'i' };
    }
    if (isVeg === 'true') menuQuery.isVeg = true;
    if (isSpicy === 'true') menuQuery.isSpicy = true;

    // We must ensure they belong to active/approved restaurants matching constraints
    let menuSort = {};
    if (sort === 'price_low_high') menuSort = { price: 1 };
    if (sort === 'price_high_low') menuSort = { price: -1 };

    const menuItemsRaw = await MenuItem.find(menuQuery)
      .populate({
        path: 'restaurant',
        match: restaurantQuery,
        select: 'name isApproved isActive deliveryTime rating deliveryFee',
      })
      .sort(menuSort);

    // Filter out items whose restaurant is not approved/active or doesn't match restaurant constraints
    const menuItems = menuItemsRaw.filter((item) => item.restaurant !== null);

    return successResponse(res, 'Search completed', {
      restaurants,
      menuItems,
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};
