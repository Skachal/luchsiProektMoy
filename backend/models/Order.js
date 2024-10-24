const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [
    {
      itemId: { type: String, required: true },
      name: { type: String, required: true },
      description: { type: String, required: true },
      price: { type: String, required: true },
      weight: { type: String, required: true },
      image: { type: String, required: true },
      quantity: { type: Number, required: true },
    },
  ],
  totalAmount: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Order', OrderSchema);
