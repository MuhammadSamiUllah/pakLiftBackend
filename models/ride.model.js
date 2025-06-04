const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  // Driver reference (enhanced with required field)
  /*driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true // Added required as per request
  },*/

  // Enhanced from/to structure (simplified from your dual structure)
  from: {
    name: { 
      type: String, 
      required: true 
    },
    coordinates: {
      latitude: { 
        type: Number, 
        required: true 
      },
      longitude: { 
        type: Number, 
        required: true 
      }
    }
  },
  
  to: {
    name: { 
      type: String, 
      required: true 
    },
    coordinates: {
      latitude: { 
        type: Number, 
        required: true 
      },
      longitude: { 
        type: Number, 
        required: true 
      }
    }
  },

  // Route coordinates (enhanced from your existing)
  routeCoordinates: [{
    latitude: { 
      type: Number 
    },
    longitude: { 
      type: Number 
    }
  }],

  // Current location with timestamp (enhanced with required fields)
  currentLocation: {
    latitude: { 
      type: Number 
    },
    longitude: { 
      type: Number 
    },
    timestamp: { 
      type: Date, 
      default: Date.now 
    }
  },

  // Existing financial and capacity fields
  totalFare: {
    type: Number,
    required: true
  },
  
  seats: {
    type: Number,
    required: true
  },
  
  // Added availableSeats as requested
  availableSeats: {
    type: Number,
    required: true,
    default: function() { return this.seats } // Defaults to total seats
  },
  
  distance: {
    type: String,
    required: true
  },
  
  duration: {
    type: String,
    required: true
  },

  // Status tracking (enhanced with enum)
  isActive: {
    type: Boolean,
    default: true
  },
  
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },

  // Vehicle reference (added as requested)
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle'
  },

  // Passengers array (existing)
  passengers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // Automatic timestamps (existing)
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Enhanced middleware to handle status changes and seat availability
rideSchema.pre('save', function(next) {
  // Sync isActive with status
  if (this.isModified('status')) {
    this.isActive = this.status === 'active';
  } else if (this.isModified('isActive')) {
    this.status = this.isActive ? 'active' : 'completed';
  }
  
  // Ensure availableSeats doesn't exceed total seats
  if (this.isModified('seats')) {
    if (this.availableSeats > this.seats) {
      this.availableSeats = this.seats;
    }
  }
  
  // Ensure updatedAt is always current
  this.updatedAt = new Date();
  next();
});

// Add a virtual for checking if ride has available seats
rideSchema.virtual('hasAvailableSeats').get(function() {
  return this.availableSeats > 0;
});

// Add instance method to book a seat
rideSchema.methods.bookSeat = async function(passengerId) {
  if (this.availableSeats <= 0) {
    throw new Error('No available seats');
  }
  
  if (this.passengers.includes(passengerId)) {
    throw new Error('Passenger already booked');
  }
  
  this.passengers.push(passengerId);
  this.availableSeats -= 1;
  
  if (this.availableSeats === 0) {
    this.status = 'completed';
    this.isActive = false;
  }
  
  return this.save();
};

// Add instance method to update location
rideSchema.methods.updateLocation = function(latitude, longitude) {
  this.currentLocation = {
    latitude,
    longitude,
    timestamp: new Date()
  };
  return this.save();
};

module.exports = mongoose.model('Ride', rideSchema);