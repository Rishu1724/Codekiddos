const express = require("express");
const Product = require("../models/Product");
const auth = require("../middleware/auth");

const router = express.Router();

// Get all products with search and filter
router.get("/", async (req, res) => {
  try {
    const { search, category, minPrice, maxPrice, sortBy = "createdAt", sortOrder = "desc", page = 1, limit = 10 } = req.query;
    
    let query = { isAvailable: true };
    
    // Search functionality
    if (search) {
      query.$text = { $search: search };
    }
    
    // Category filter
    if (category) {
      query.category = category;
    }
    
    // Price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    
    // Sorting
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;
    
    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    const products = await Product.find(query)
      .populate("seller", "username email phone")
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit));
    
    const total = await Product.countDocuments(query);
    
    res.json({
      products,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalProducts: total,
        hasNext: skip + products.length < total,
        hasPrev: Number(page) > 1
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get single product
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("seller", "username email phone");
    
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    
    // Increment view count
    product.views += 1;
    await product.save();
    
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Create product
router.post("/", auth, async (req, res) => {
  try {
    const { title, description, category, price, images, condition, location, tags } = req.body;
    
    const product = new Product({
      title,
      description,
      category,
      price,
      images,
      condition,
      seller: req.user._id,
      location,
      tags: tags || []
    });
    
    await product.save();
    
    const populatedProduct = await Product.findById(product._id)
      .populate("seller", "username email phone");
    
    res.status(201).json({
      message: "Product created successfully",
      product: populatedProduct
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Update product
router.put("/:id", auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    
    // Check if user is the seller
    if (product.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to update this product" });
    }
    
    const { title, description, category, price, images, condition, location, tags, isAvailable } = req.body;
    
    if (title) product.title = title;
    if (description) product.description = description;
    if (category) product.category = category;
    if (price) product.price = price;
    if (images) product.images = images;
    if (condition) product.condition = condition;
    if (location) product.location = location;
    if (tags) product.tags = tags;
    if (isAvailable !== undefined) product.isAvailable = isAvailable;
    
    await product.save();
    
    const populatedProduct = await Product.findById(product._id)
      .populate("seller", "username email phone");
    
    res.json({
      message: "Product updated successfully",
      product: populatedProduct
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Delete product
router.delete("/:id", auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    
    // Check if user is the seller
    if (product.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this product" });
    }
    
    await Product.findByIdAndDelete(req.params.id);
    
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get user's products
router.get("/user/my-products", auth, async (req, res) => {
  try {
    const products = await Product.find({ seller: req.user._id })
      .populate("seller", "username email phone")
      .sort({ createdAt: -1 });
    
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Like/Unlike product
router.post("/:id/like", auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    
    const isLiked = product.likes.includes(req.user._id);
    
    if (isLiked) {
      product.likes.pull(req.user._id);
    } else {
      product.likes.push(req.user._id);
    }
    
    await product.save();
    
    res.json({
      message: isLiked ? "Product unliked" : "Product liked",
      isLiked: !isLiked,
      likesCount: product.likes.length
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
