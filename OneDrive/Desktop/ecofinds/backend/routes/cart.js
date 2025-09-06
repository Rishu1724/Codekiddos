const express = require("express");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const auth = require("../middleware/auth");

const router = express.Router();

// Get user's cart
router.get("/", auth, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id })
      .populate("products.product", "title price images condition seller");
    
    if (!cart) {
      cart = new Cart({ user: req.user._id, products: [] });
      await cart.save();
    }
    
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Add product to cart
router.post("/add", auth, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    
    // Check if product exists and is available
    const product = await Product.findById(productId);
    if (!product || !product.isAvailable) {
      return res.status(404).json({ message: "Product not found or not available" });
    }
    
    // Check if user is not trying to add their own product
    if (product.seller.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot add your own product to cart" });
    }
    
    let cart = await Cart.findOne({ user: req.user._id });
    
    if (!cart) {
      cart = new Cart({ user: req.user._id, products: [] });
    }
    
    // Check if product already exists in cart
    const existingProduct = cart.products.find(
      item => item.product.toString() === productId
    );
    
    if (existingProduct) {
      existingProduct.quantity += quantity;
    } else {
      cart.products.push({ product: productId, quantity });
    }
    
    await cart.save();
    
    const populatedCart = await Cart.findById(cart._id)
      .populate("products.product", "title price images condition seller");
    
    res.json({
      message: "Product added to cart successfully",
      cart: populatedCart
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Update product quantity in cart
router.put("/update", auth, async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }
    
    const product = cart.products.find(
      item => item.product.toString() === productId
    );
    
    if (!product) {
      return res.status(404).json({ message: "Product not found in cart" });
    }
    
    if (quantity <= 0) {
      cart.products.pull({ product: productId });
    } else {
      product.quantity = quantity;
    }
    
    await cart.save();
    
    const populatedCart = await Cart.findById(cart._id)
      .populate("products.product", "title price images condition seller");
    
    res.json({
      message: "Cart updated successfully",
      cart: populatedCart
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Remove product from cart
router.delete("/remove", auth, async (req, res) => {
  try {
    const { productId } = req.body;
    
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }
    
    cart.products.pull({ product: productId });
    await cart.save();
    
    const populatedCart = await Cart.findById(cart._id)
      .populate("products.product", "title price images condition seller");
    
    res.json({
      message: "Product removed from cart successfully",
      cart: populatedCart
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Clear cart
router.delete("/clear", auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }
    
    cart.products = [];
    await cart.save();
    
    res.json({ message: "Cart cleared successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
