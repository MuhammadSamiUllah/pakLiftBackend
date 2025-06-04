require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const driverRoutes = require('./routes/driver.Routes');
const customerRoutes = require('./routes/customer.routes');
const rideRoutes = require('./routes/ride.routes'); // Single declaration here
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Routes
app.use('/api/drivers', driverRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/rides', rideRoutes); // Single usage here

// Database connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('MongoDB connected');
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
})
.catch((err) => {
  console.error('MongoDB connection error:', err);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ message: 'Internal server error' });
});




app.use('/api', rideRoutes);







const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI; // or your MongoDB Atlas URI
const client = new MongoClient(uri);
async function getData() {
  try {
    await client.connect();
    const db = client.db('paklift');
    const collection = db.collection('rides');

    const data = await collection.find({}).toArray(); // fetch all documents
    console.log(data);
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

getData();
