const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const AWS = require('aws-sdk');

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create Order Endpoint
router.post('/create-order', async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || isNaN(amount)) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const options = {
      amount: amount,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);
    res.json({
      success: true,
      orderId: order.id,
      razorpayKey: process.env.RAZORPAY_KEY_ID
    });

  } catch (error) {
    console.error('Razorpay Order Error:', error);
    res.status(500).json({ 
      error: 'Failed to create order',
      details: error.error?.description || error.message
    });
  }
});

// Verify Payment Endpoint
router.post('/verify-payment', async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification fields' });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Generate S3 download URL
    const downloadUrl = await generateSignedUrl();
    res.json({
      success: true,
      message: 'Payment verified successfully',
      downloadUrl
    });

  } catch (error) {
    console.error('Payment Verification Error:', error);
    res.status(500).json({ 
      error: 'Payment verification failed',
      details: error.message
    });
  }
});

// Helper function for S3 signed URL
const generateSignedUrl = async () => {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: 'ebook1-training.pdf',
    Expires: 300, // 5 minutes
    ResponseContentDisposition: 'attachment'
  };
  return await s3.getSignedUrlPromise('getObject', params);
};

module.exports = router;