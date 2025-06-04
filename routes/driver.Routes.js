const express = require('express');
const router = express.Router();
const Driver = require('../models/driver.model');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

// Nodemailer transporter setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// In the register route
router.post('/register', async (req, res) => {
  try {
    const { driverName, email, phone, cnic, password } = req.body;

    const existingDriver = await Driver.findOne({
      $or: [{ email }, { phone }, { cnic }],
    });
    if (existingDriver) {
      return res.status(400).json({ message: 'Driver with provided email, phone, or CNIC already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = Math.floor(100000 + Math.random() * 900000);

    const newDriver = new Driver({
      driverName,
      email,
      phone,
      cnic,
      password: hashedPassword,
      verificationCode
    });

    await newDriver.save();

    // Send welcome email - FIXED: Using the email from request body
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email, // This should be the email from the form
      subject: 'Welcome to Pak Lift!',
      html: `<h3>Hello ${driverName},</h3>
             <h3>Here is your OTP for driving verification: ${verificationCode}</h3>
             <p>Thank you for registering as a driver with us!</p>`,
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error('Email error:', err);
      } else {
        console.log('Email sent to:', email); // Log which email was sent to
      }
    });

    return res.status(201).json({ 
      message: 'Driver registered successfully',
      driver: {
        _id: newDriver._id,
        email: newDriver.email,
        driverName: newDriver.driverName
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const driver = await Driver.findOne({ email });
    if (!driver) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, driver.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    return res.status(200).json({ message: 'Login successful', "success": true, });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});
//otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, code } = req.body;

    const driver = await Driver.findOne({ email });
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    if (driver.verificationCode === code) {
      driver.verificationCode = null; // clear OTP after use
      driver.isVerified = true;
      await driver.save();

      return res.status(200).json({ message: 'Verification successful' });
    } else {
      return res.status(400).json({ message: 'Invalid verification code' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
}
);
// routes/driver.routes.js (add these at the bottom)
const DriverVehicle = require('../models/DriverVehicle');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/driver-vehicles');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'vehicle-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });
//Vehicle Details
router.post('/vehicle-details', upload.single('busImage'), async (req, res) => {
  try {
    const { driverEmail, licenseNo, numberOfSeats, numberPlate, distance } = req.body;
    const petrolPrice = 280;  // fixed petrol price

    if (!req.file) {
      return res.status(400).json({ message: 'Bus image is required' });
    }

    /*if (!distance) {
      return res.status(400).json({ message: 'Distance is required for fare calculation' });
    }

    const driver = await Driver.findOne({ email: driverEmail });
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }*/

    const seats = parseInt(numberOfSeats);
    const dist = parseFloat(distance);

    if (isNaN(seats) || seats <= 0) {
      return res.status(400).json({ message: 'Invalid number of seats' });
    }

   /* if (isNaN(dist) || dist <= 0) {
      return res.status(400).json({ message: 'Invalid distance' });
    }*/

    // Calculate fare
  // const fare = (dist * petrolPrice) / seats;

    const newVehicle = new DriverVehicle({
    //  fare: fare,
    //  driver: driver._id,
      licenseNo,
      numberOfSeats: seats,
      numberPlate,
      busImage: req.file.path,
        // save fare in DB if you want, optional
    });

    await newVehicle.save();

    return res.status(201).json({
      // fare: fare,
      message: 'Vehicle details submitted successfully',
      vehicle: newVehicle,
     
    //  driverId: driver._id,
  //    driverName: driver.driverName,
    //  driverContact: driver.phone,
     // distance: dist
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});



//locations Storing
const Route = require('../models/locationRoute.model');
// Updated route to match the frontend requirements
router.post('/save-route', async (req, res) => {
  try {
    const { 
      driverEmail, 
      from, 
      to, 
      distance, 
      duration,
      fare,
      seats,
      fromLocation,
      toLocation,
      routeCoordinates,
      status = 'active'
    } = req.body;

    const driver = await Driver.findOne({ email: driverEmail }).populate('vehicles');
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    if (!driver.vehicles || driver.vehicles.length === 0) {
      return res.status(400).json({ message: 'Driver has no registered vehicle' });
    }

    const vehicle = driver.vehicles[0];
    const dist = distance.split(' ')[0]; // Extract numeric value from "10 km" format

    const newRoute = new Route({
      driver: driver._id,
      from: {
        name: from,
        coordinates: {
          latitude: fromLocation.lat,
          longitude: fromLocation.lng
        }
      },
      to: {
        name: to,
        coordinates: {
          latitude: toLocation.lat,
          longitude: toLocation.lng
        }
      },
      distance: distance,
      duration: duration,
      fare: fare,
      seats: parseInt(seats),
      routeCoordinates: routeCoordinates,
      status: status,
      vehicle: vehicle._id
    });

    await newRoute.save();

    return res.status(201).json({ 
      message: 'Route saved successfully',
      route: newRoute,
      rideId: newRoute._id // Return ride ID  for tracking
    });
  } catch (error) {
    console.error('Error saving route:', error);
    return res.status(500).json({ 
      message: 'Server error',
      error: error.message 
    });
  }
});
// Add this new endpoint
router.post('/check-destination-match', async (req, res) => {
  try {
    const { customerLocation } = req.body;

    // Find all routes where driver's destination matches customer's location
    const matchedRoutes = await Route.find({
      to: { $regex: new RegExp(customerLocation, 'i') } // Case-insensitive match
    }).populate('driver', 'driverName phone vehicleModel');

    if (matchedRoutes.length > 0) {
      return res.json({ 
        match: true,
        message: 'Ride available!',
        matchedRoutes 
      });
    } else {
      return res.json({ 
        match: false,
        message: 'No rides available to this destination' 
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});
// In driver.Routes.js - Keep only one implementation (uncomment and use this one):
router.post('/check-destination-match', async (req, res) => {
  try {
    const { customerLocation } = req.body;

    if (!customerLocation) {
      return res.status(400).json({ message: 'Destination is required' });
    }

    const matchedRoutes = await Route.find({
      $or: [
        { to: { $regex: new RegExp(customerLocation, 'i') } },
        { placeName: { $regex: new RegExp(customerLocation, 'i') } }
      ]
    }).populate('driver', 'driverName phone vehicleModel');

    if (matchedRoutes.length === 0) {
      return res.json({ match: false, message: 'No matching rides found' });
    }

    return res.json({ 
      match: true, 
      message: `${matchedRoutes.length} rides found`,
      matchedRoutes 
    });
  } catch (error) {
    console.error('Destination match error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});
module.exports = router;
