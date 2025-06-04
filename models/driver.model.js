const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  driverName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true, unique: true },
  cnic: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  verificationCode: { type: String }, // OTP field
  isVerified: { type: Boolean, default: false },
   vehicles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DriverVehicle' }]
  
  // optional
}, { timestamps: true });

module.exports = mongoose.model('Driver', driverSchema);
