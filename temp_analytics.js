
exports.getComprehensiveAnalytics = async (req, res) => {
  try {
    const { timeRange = "7days", city = "all" } = req.query;
    
    // Calculate date range
    const days = timeRange === "30days" ? 30 : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Common Match filter
    const orderMatch = {
      createdAt: { $gte: startDate }
    };
    // City filter (assuming deliveryAddress.city exists)
    if (city !== "all") {
      orderMatch["deliveryAddress.city"] = new RegExp(city, "i");
    }

    const Order = require("../models/Order");
    const Consumer = require("../models/Consumer");
    const Restaurant = require("../models/Restaurant");
    
    // 1. User Growth (Signups by month/day)
    // For 7days, group by day. For 30days, group by day/week/month. Let us group by day for both, or month if longer.
    const userGrowthFormat = days === 30 ? "%Y-%m-%d" : "%Y-%m-%d";
    const userGrowthData = await Consumer.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: { $dateToString: { format: userGrowthFormat, date: "$createdAt" } }, signups: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Active users: distinct users who ordered
    const activeUsersData = await Order.aggregate([
      { $match: orderMatch },
      { $group: { _id: { date: { $dateToString: { format: userGrowthFormat, date: "$createdAt" } }, user: "$user" } } },
      { $group: { _id: "$_id.date", active: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Merge User Growth
    const userGrowthMap = {};
    userGrowthData.forEach(d => { userGrowthMap[d._id] = { month: d._id, signups: d.signups, active: 0 }; });
    activeUsersData.forEach(d => { 
      if (!userGrowthMap[d._id]) userGrowthMap[d._id] = { month: d._id, signups: 0, active: 0 };
      userGrowthMap[d._id].active = d.active;
    });
    const userGrowth = Object.values(userGrowthMap).sort((a,b) => a.month.localeCompare(b.month));

    // 2. Top Vendors
    const topVendorsData = await Order.aggregate([
      { $match: orderMatch },
      { $group: { _id: "$restaurant", orders: { $sum: 1 }, revenue: { $sum: "$totalAmount" } } },
      { $sort: { revenue: -1 } },
      { $limit: 5 }
    ]);
    const populatedVendors = await Restaurant.populate(topVendorsData, { path: "_id", select: "name" });
    const topVendors = populatedVendors.map(v => ({
      name: v._id ? v._id.name : "Unknown",
      orders: v.orders,
      revenue: v.revenue
    }));

    // 3. Driver Performance
    const driverPerfData = await Order.aggregate([
      { $match: { ...orderMatch, status: "delivered", deliveredAt: { $exists: true }, pickedUpAt: { $exists: true } } },
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
    const driverPerformance = driverPerfData.map(d => ({
      name: d._id,
      activeDrivers: d.activeDrivers,
      avgDeliveryTime: Math.round(d.avgDeliveryTimeMs / 60000) || 0
    }));

    // 4. Heatmap Data
    const heatmapOrders = await Order.find({ ...orderMatch, "deliveryAddress.location": { $exists: true } })
                                     .select("deliveryAddress.location");
    const heatmap = heatmapOrders.filter(o => o.deliveryAddress && o.deliveryAddress.location && o.deliveryAddress.location.coordinates).map(o => ({
      center: [o.deliveryAddress.location.coordinates[1], o.deliveryAddress.location.coordinates[0]], // [lat, lng]
      radius: 20,
      color: "#ef4444",
      opacity: 0.5,
      label: "Order"
    }));

    return res.status(200).json({
      success: true,
      data: {
        userGrowth,
        topVendors,
        driverPerformance,
        heatmap
      }
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

