const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const AWS = require('aws-sdk');
const dotenv = require('dotenv');
dotenv.config();

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const generateSignedUrl = async () => {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: 'ebook1-training.pdf',
    Expires: 60,
    ResponseContentDisposition: 'attachment',
  };

  try {
    const url = await s3.getSignedUrlPromise('getObject', params);
    return url;
  } catch (error) {
    console.error("Error generating signed URL", error);
    throw new Error('Failed to generate signed URL');
  }
};

router.post('/create-order', async (req, res) => {
  const { amount } = req.body;

  try {
    const options = {
      amount,
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

router.post('/verify-payment', async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expectedSignature === razorpay_signature) {
    try {
      const downloadUrl = await generateSignedUrl();
      res.status(200).json({ message: 'Payment verified successfully', downloadUrl });
    } catch (error) {
      res.status(500).json({ message: 'Failed to generate download URL' });
    }
  } else {
    res.status(400).json({ message: 'Payment verification failed' });
  }
});

module.exports = router;