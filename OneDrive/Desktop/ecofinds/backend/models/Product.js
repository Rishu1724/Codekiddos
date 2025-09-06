const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  category: {
    type: String,
    required: true,
    enum: [
      "Electronics",
      "Clothing & Accessories",
      "Home & Garden",
      "Books & Media",
      "Sports & Fitness",
      "Toys & Games",
      "Automotive",
      "Health & Beauty",
      "Jewelry & Watches",
      "Furniture",
      "Other"
    ]
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  images: [{
    type: String,
    required: true
  }],
  condition: {
    type: String,
    required: true,
    enum: ["New", "Like New", "Good", "Fair", "Poor"]
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  location: {
    city: String,
    state: String,
    pincode: String
  },
  tags: [String],
  views: {
    type: Number,
    default: 0
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }]
}, {
  timestamps: true
});

// Index for search functionality
productSchema.index({ title: "text", description: "text", tags: "text" });
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ seller: 1 });

module.exports = mongoose.model("Product", productSchema);
