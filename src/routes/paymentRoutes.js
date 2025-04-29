const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const AWS = require('aws-sdk');
const dotenv = require('dotenv');
dotenv.config();

const router = express.Router();

// Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID, // Environment variable for Razorpay Key ID
  key_secret: process.env.RAZORPAY_KEY_SECRET, // Environment variable for Razorpay Key Secret
});

// AWS S3 instance
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Function to generate a signed URL for S3 bucket
const generateSignedUrl = async () => {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: 'ebook1-training.pdf',  // Your file key
    Expires: 60,  // link valid for 1 minute
    ResponseContentDisposition: 'attachment',  // forces download
  };

  try {
    const url = await s3.getSignedUrlPromise('getObject', params);
    return url;
  } catch (error) {
    console.error("Error generating signed URL", error);
    throw new Error('Failed to generate signed URL');
  }
};

// Route to create an order
router.post('/create-order', async (req, res) => {
  const { amount } = req.body;

  try {
    const options = {
      amount: amount,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.json({ id: order.id, key: process.env.RAZORPAY_KEY_ID });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).send('Error creating order');
  }
});

// Route to verify the payment signature and generate the download URL
router.post('/verify-payment', async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expectedSignature === razorpay_signature) {
    try {
      const downloadUrl = await generateSignedUrl(); // Generate the download link after successful payment
      res.status(200).json({ message: 'Payment verified successfully', downloadUrl });
    } catch (error) {
      res.status(500).json({ message: 'Failed to generate download URL' });
    }
  } else {
    res.status(400).json({ message: 'Payment verification failed' });
  }
});

module.exports = router;
