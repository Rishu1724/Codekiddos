const express = require("express");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const auth = require("../middleware/auth");

const router = express.Router();

// Create order from cart
router.post("/create", auth, async (req, res) => {
  try {
    const { shippingAddress, paymentMethod = "cash_on_delivery" } = req.body;
    
    // Get user's cart
    const cart = await Cart.findOne({ user: req.user._id })
      .populate("products.product");
    
    if (!cart || cart.products.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }
    
    // Group products by seller
    const sellerGroups = {};
    let totalAmount = 0;
    
    for (const item of cart.products) {
      const product = item.product;
      const sellerId = product.seller.toString();
      
      if (!sellerGroups[sellerId]) {
        sellerGroups[sellerId] = {
          seller: product.seller,
          products: []
        };
      }
      
      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;
      
      sellerGroups[sellerId].products.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price
      });
    }
    
    // Create orders for each seller
    const orders = [];
    
    for (const sellerId in sellerGroups) {
      const group = sellerGroups[sellerId];
      const orderTotal = group.products.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      const order = new Order({
        buyer: req.user._id,
        seller: group.seller,
        products: group.products,
        totalAmount: orderTotal,
        shippingAddress,
        paymentMethod
      });
      
      await order.save();
      orders.push(order);
      
      // Update product availability
      for (const item of group.products) {
        await Product.findByIdAndUpdate(item.product, { isAvailable: false });
      }
    }
    
    // Clear cart
    cart.products = [];
    await cart.save();
    
    res.status(201).json({
      message: "Orders created successfully",
      orders: orders.map(order => ({
        id: order._id,
        seller: order.seller,
        totalAmount: order.totalAmount,
        status: order.status
      })),
      totalAmount
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get user's orders (as buyer)
router.get("/my-orders", auth, async (req, res) => {
  try {
    const orders = await Order.find({ buyer: req.user._id })
      .populate("seller", "username email phone")
      .populate("products.product", "title price images")
      .sort({ createdAt: -1 });
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get user's sales (as seller)
router.get("/my-sales", auth, async (req, res) => {
  try {
    const orders = await Order.find({ seller: req.user._id })
      .populate("buyer", "username email phone")
      .populate("products.product", "title price images")
      .sort({ createdAt: -1 });
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get single order
router.get("/:id", auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("buyer", "username email phone")
      .populate("seller", "username email phone")
      .populate("products.product", "title price images condition");
    
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    // Check if user is buyer or seller
    if (order.buyer._id.toString() !== req.user._id.toString() && 
        order.seller._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to view this order" });
    }
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Update order status (seller only)
router.put("/:id/status", auth, async (req, res) => {
  try {
    const { status } = req.body;
    
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    // Check if user is the seller
    if (order.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to update this order" });
    }
    
    order.status = status;
    await order.save();
    
    res.json({
      message: "Order status updated successfully",
      order
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
