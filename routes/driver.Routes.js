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

// Register route
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

    // Send welcome email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      verificationCode,
      subject: 'Welcome to Pak Lift!',
      html: `<h3>Hello ${driverName},</h3>
             <h3> Here is your otp for driving verification ${verificationCode} <h3>
             <p>Thank you for registering as a driver with us. We're excited to have you on board!</p>
             <p>Best regards,<br/>Your App Team</p>`,
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error('Email error:', err);
      } else {
        console.log('Email sent:', info.response);
      }
    });

    return res.status(201).json({ message: 'Driver registered successfully' });
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

    return res.status(200).json({ message: 'Login successful' });
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

// Add vehicle details route
router.post('/vehicle-details', upload.single('busImage'), async (req, res) => {
  try {
    const { driverId, licenseNo, cnic, numberPlate } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: 'Bus image is required' });
    }

    const newVehicle = new DriverVehicle({
      driverId,
      licenseNo,
      cnic,
      numberPlate,
      busImage: req.file.path // or you can upload to cloud storage and store URL
    });

    await newVehicle.save();

    return res.status(201).json({ 
      message: 'Vehicle details submitted successfully',
      vehicle: newVehicle
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
