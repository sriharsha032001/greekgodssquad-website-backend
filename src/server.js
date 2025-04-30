const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();

// Middlewares
app.use(
  cors({
    origin: "https://4fe3d11a.greekgodsquad-website.pages.dev/",
    credentials: true,
  })
);
app.use(bodyParser.json());

// Routes
app.use('/api/payment', paymentRoutes);

// Root route (Test)
app.get('/', (req, res) => {
  res.send('Razorpay Backend Server is Running!');
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
