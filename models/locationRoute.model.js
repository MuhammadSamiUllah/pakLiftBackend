const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
  driver: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Driver', 
    required: true 
  },
  from: { 
    type: String, 
    required: true 
  },
  to: { 
    type: String, 
    required: true 
  },
  distance: { 
    type: Number, 
    required: true 
  },
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  placeName: {
    type: String
  }
}, { timestamps: true ,collection: 'driver_routes'} );

// Create geospatial index
routeSchema.index({ currentLocation: '2dsphere' });

module.exports = mongoose.model('Route', routeSchema);