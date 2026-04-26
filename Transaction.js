const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  text: {
    type: String,
    trim: true,
    required: [true, 'Please add some text']
  },
  amount: {
    type: Number,
    required: [true, 'Please add a positive or negative number']
  },
  receiptUrl: {
    type: String, 
    default: null
  },
  // --- ADDED THIS FIELD FOR PRIVATE USER DATA ---
  user: {
    type: String,
    required: [true, 'User ID is required']
  },
  // ----------------------------------------------
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Transaction', TransactionSchema);
