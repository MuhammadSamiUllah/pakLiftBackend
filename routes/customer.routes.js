const express = require('express');
const router = express.Router();
const Customer = require('../models/customer.model');
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

// Signup route
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, phone, password } = req.body;

    // Check if customer already exists
    const existingCustomer = await Customer.findOne({
      $or: [{ email }, { phone }],
    });
    if (existingCustomer) {
      return res.status(400).json({ message: 'Customer with provided email or phone already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = Math.floor(100000 + Math.random() * 900000);

    // Create new customer
    const newCustomer = new Customer({
      fullName,
      email,
      phone,
      password: hashedPassword,
      verificationCode
    });

    await newCustomer.save();
       // Send welcome email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      verificationCode,
      subject: 'Welcome to Pak Lift!',
      html: `<h3>Hello ${fullName},</h3>
             <h3> Here is your otp for Customer verification ${verificationCode} <h3>
             <p>Thank you for registering as a driver with us. We're excited to have you on board!</p>
             <p>Best regards,<br/>Your App Team</p>`,
    };
     transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error('Email error:', err);
      } else {
        console.log('Email sent:', info.response);
      }
    }
    )

    return res.status(201).json({ message: 'Customer registered successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const customer = await Customer.findOne({ email });
    if (!customer) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, customer.password);
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
      return res.status(404).json({ message: 'Customer not found' });
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
});

module.exports = router;
