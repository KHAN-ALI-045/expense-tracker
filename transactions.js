const express = require('express');
const router = express.Router();
const Transaction = require('./Transaction');

// @desc    Get all transactions for the LOGGED-IN user
// @route   GET /api/transactions
router.get('/', async (req, res) => {
  try {
    // req.auth.sub comes from your Auth0 Token!
    const transactions = await Transaction.find({ user: req.auth.sub }).sort({ createdAt: -1 });
    
    return res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (err) {
    console.error("GET Error:", err.message);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// @desc    Add transaction and link it to the LOGGED-IN user
// @route   POST /api/transactions
router.post('/', async (req, res) => {
  try {
    // We combine your form data with the User ID from the Auth0 token
    const transactionData = {
      ...req.body,
      user: req.auth.sub 
    };

    const transaction = await Transaction.create(transactionData);

    return res.status(201).json({
      success: true,
      data: transaction
    });
  } catch (err) {
    console.error("POST Error:", err.message);
    
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        error: messages
      });
    } else {
      return res.status(500).json({
        success: false,
        error: err.message 
      });
    }
  }
});

// @desc    Delete transaction (only if it exists)
router.delete('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'No transaction found'
      });
    }

    // Security check: Only allow delete if the user owns it
    if (transaction.user !== req.auth.sub) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to delete this transaction'
      });
    }

    await transaction.deleteOne();

    return res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    console.error("DELETE Error:", err.message);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;
