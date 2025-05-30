const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  fullName: { type: String, required: true },      // Use fullName here for customer
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },    
  verificationCode: { type: String }, // OTP field
  isVerified: { type: Boolean, default: false }, 
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);
