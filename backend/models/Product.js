const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: String,
  description: String,
  price: Number,
  weight: Number,
  image: String
});

module.exports = mongoose.model('Product', ProductSchema);
