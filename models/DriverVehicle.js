// models/driverVehicle.model.js
const mongoose = require('mongoose');

const driverVehicleSchema = new mongoose.Schema({

  licenseNo: { type: String, required: true },
  numberOfSeats: { type: Number, required: true },
  numberPlate: { type: String, required: true },
  busImage: { type: String, required: true }, // This will store the image URL
  isApproved: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('DriverVehicle', driverVehicleSchema);