const express = require('express');
const Razorpay = require('razorpay');
const router = express.Router();

// Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID, // Store key in env variables
  key_secret: process.env.RAZORPAY_KEY_SECRET, // Store key in env variables
});

// Create Order endpoint
router.post('/create-order', async (req, res) => {
  const { amount } = req.body; // Expect amount to be sent from frontend (in paise)

  try {
    const options = {
      amount: amount, // amount in paise (1 INR = 100 paise)
      currency: 'INR',
      receipt: `receipt_${Date.now()}`, // Unique receipt for this transaction
    };

    const order = await razorpay.orders.create(options); // Call Razorpay API to create order
    res.json({ id: order.id }); // Send the order ID to frontend
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).send('Error creating order');
  }
});

module.exports = router;
