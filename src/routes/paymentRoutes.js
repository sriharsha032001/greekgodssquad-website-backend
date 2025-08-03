const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const dotenv = require('dotenv');
const { generateSignedUrl } = require('../utils/s3.js');
dotenv.config();

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const validEbooks = ['ebook1-training.pdf', 'ebook2-training.pdf','ebook3-training.pdf' ];

router.post('/create-order', async (req, res) => {
  const { amount, ebookKey } = req.body;

  if (!validEbooks.includes(ebookKey)) {
    return res.status(400).json({ message: 'Invalid ebook specified' });
  }

  try {
    const options = {
      amount,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: {
        ebookKey,
      },
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
      const order = await razorpay.orders.fetch(razorpay_order_id);
      
      if (!order.notes || !order.notes.ebookKey) {
        return res.status(400).json({ message: 'Ebook key not found in order notes' });
      }

      const ebookKey = order.notes.ebookKey;

      if (!validEbooks.includes(ebookKey)) {
        return res.status(400).json({ message: 'Invalid ebook key found in order' });
      }
      
      const downloadUrl = await generateSignedUrl(ebookKey);
      res.status(200).json({ message: 'Payment verified successfully', downloadUrl });
    } catch (error) {
      console.error('Error during payment verification:', error);
      res.status(500).json({ message: 'Failed to verify payment or generate download URL' });
    }
  } else {
    res.status(400).json({ message: 'Payment verification failed' });
  }
});

module.exports = router;