require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const driverRoutes = require('./routes/driver.Routes');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// All driver related routes (signup, login, etc)
app.use('/api/drivers', driverRoutes);

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
//customer
const customerRoutes = require('./routes/customer.routes');

app.use('/api/customers', customerRoutes);