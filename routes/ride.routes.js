const express = require('express');
const router = express.Router();
const Ride = require('../models/ride.model');
const axios = require('axios');

// Google Maps API configuration
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY; // Make sure to set this in your environment

// Helper function to get coordinates
async function getCoordinates(address) {
  const response = await axios.get(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_API_KEY}`
  );
  
  if (response.data.results.length > 0) {
    return {
      latitude: response.data.results[0].geometry.location.lat,
      longitude: response.data.results[0].geometry.location.lng
    };
  }
  throw new Error('Address not found');
}

// Validation middleware for location updates
const validateLocationUpdate = (req, res, next) => {
  const { latitude, longitude, timestamp } = req.body;
  
  // Check required fields
  if (latitude === undefined || longitude === undefined) {
    console.error('[Validation Error] Missing coordinates:', req.body);
    return res.status(400).json({ 
      success: false,
      error: 'Missing coordinates',
      required: ['latitude', 'longitude'],
      received: Object.keys(req.body)
    });
  }

  // Validate numerical values
  if (isNaN(latitude) || isNaN(longitude)) {
    console.error('[Validation Error] Invalid coordinate values:', req.body);
    return res.status(400).json({ 
      success: false,
      error: 'Coordinates must be numbers',
      invalidFields: {
        latitude: typeof latitude,
        longitude: typeof longitude
      }
    });
  }

  // Validate latitude range
  if (latitude < -90 || latitude > 90) {
    console.error('[Validation Error] Invalid latitude range:', latitude);
    return res.status(400).json({ 
      success: false,
      error: 'Latitude must be between -90 and 90',
      received: latitude
    });
  }

  // Validate longitude range
  if (longitude < -180 || longitude > 180) {
    console.error('[Validation Error] Invalid longitude range:', longitude);
    return res.status(400).json({ 
      success: false,
      error: 'Longitude must be between -180 and 180',
      received: longitude
    });
  }

  // Validate timestamp if provided
  if (timestamp && (isNaN(timestamp) || timestamp <= 0)) {
    console.error('[Validation Error] Invalid timestamp:', timestamp);
    return res.status(400).json({ 
      success: false,
      error: 'Timestamp must be a positive number',
      received: timestamp
    });
  }

  next();
};

router.post('/', async (req, res) => {
  try {
    const { from, to, totalFare, seats, distance, duration } = req.body;

    // Validate required fields
    if (!from?.name || !to?.name || !seats) {
      throw new Error('Missing required fields');
    }

    // Use coordinates if provided, otherwise fetch them
    const fromCoords = from.coordinates || await getCoordinates(from.name);
    const toCoords = to.coordinates || await getCoordinates(to.name);

    const ride = new Ride({
      from: {
        name: from.name,
        coordinates: fromCoords
      },
      to: {
        name: to.name,
        coordinates: toCoords
      },
      totalFare: parseFloat(totalFare) || 0,
      seats: parseInt(seats) || 1,
      distance,
      duration,
      isActive: true,
      currentLocation: null
    });

    await ride.save();

    console.log(`[Ride Created] ID: ${ride._id}`, {
      from: ride.from,
      to: ride.to,
      seats: ride.seats,
      status: 'Active'
    });

    res.status(201).json({
      success: true,
      data: ride,
      message: 'Ride created successfully'
    });
  } catch (error) {
    console.error('[Ride Creation Failed]', {
      error: error.message,
      body: req.body
    });

    let errorMessage = 'Failed to create ride: ' + error.message;
    if (error.message.includes('Address not found')) {
      errorMessage = 'Could not find coordinates for one of the addresses';
    }

    res.status(400).json({ 
      success: false,
      message: errorMessage,
      requiredFields: ['from.name', 'to.name', 'seats']
    });
  }
});


// Get all active rides (unchanged)
router.get('/active', async (req, res) => {
  try {
    const activeRides = await Ride.find({ isActive: true })

      .populate('driver', 'name email phone')
      .lean();

    console.log(`[Active Rides Fetched] Count: ${activeRides.length}`);
    
    res.json({
      success: true,
      count: activeRides.length,
      data: activeRides,
      message: 'Active rides retrieved successfully'
    });
  } catch (error) {
    console.error('[Active Rides Fetch Error]', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching active rides',
      error: error.message
    });
  }
});

// Location update endpoint (unchanged)
router.patch('/:id/location', validateLocationUpdate, async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, timestamp } = req.body;

    const update = {
      $set: {
        'currentLocation': {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          timestamp: timestamp ? new Date(timestamp) : new Date()
        }
      },
      $inc: { __v: 1 }
    };

    const options = { 
      new: true,
      runValidators: true
    };

    const updatedRide = await Ride.findOneAndUpdate(
      { _id: id, isActive: true },
      update,
      options
    );

    if (!updatedRide) {
      console.warn(`[Location Update Failed] Ride not found or inactive: ${id}`);
      return res.status(404).json({ 
        success: false,
        message: 'Active ride not found' 
      });
    }

    console.log(`[Location Updated] Ride: ${id}`, {
      coordinates: updatedRide.currentLocation,
      updatedAt: updatedRide.updatedAt
    });

    res.json({
      success: true,
      data: updatedRide.currentLocation,
      message: 'Location updated successfully'
    });
  } catch (error) {
    console.error('[Location Update Error]', {
      error: error.message,
      rideId: req.params.id,
      stack: error.stack
    });
    res.status(500).json({ 
      success: false,
      message: 'Server error during location update',
      error: error.message
    });
  }
});

// End a ride (unchanged)
router.patch('/:id/end', async (req, res) => {
  try {
    const { id } = req.params;
    const ride = await Ride.findOneAndUpdate(
      { _id: id, isActive: true },
      { 
        isActive: false,
        endedAt: new Date(),
        $unset: { currentLocation: 1 }
      },
      { new: true }
    );

    if (!ride) {
      console.warn(`[End Ride Failed] Active ride not found: ${id}`);
      return res.status(404).json({ 
        success: false,
        message: 'Active ride not found' 
      });
    }

    console.log(`[Ride Ended] ID: ${ride._id}`, {
      duration: ride.endedAt - ride.createdAt,
      endedAt: ride.endedAt
    });

    res.json({
      success: true,
      data: {
        isActive: ride.isActive,
        endedAt: ride.endedAt
      },
      message: 'Ride ended successfully'
    });
  } catch (error) {
    console.error('[End Ride Error]', {
      error: error.message,
      rideId: req.params.id
    });
    res.status(500).json({ 
      success: false,
      message: 'Server error while ending ride',
      error: error.message
    });
  }
});

// Get ride location (unchanged)
router.get('/:id/location', async (req, res) => {
  try {
    const { id } = req.params;
    const ride = await Ride.findOne(
      { _id: id },
      { currentLocation: 1, isActive: 1, from: 1, to: 1, createdAt: 1 }
    ).lean();

    if (!ride) {
      console.warn(`[Location Fetch Failed] Ride not found: ${id}`);
      return res.status(404).json({ 
        success: false,
        message: 'Ride not found' 
      });
    }

    const response = {
      isActive: ride.isActive,
      from: ride.from,
      to: ride.to,
      location: ride.currentLocation || null,
      lastUpdated: ride.currentLocation?.timestamp || null,
      rideDuration: ride.currentLocation?.timestamp 
        ? new Date() - new Date(ride.createdAt)
        : null
    };

    console.log(`[Location Fetched] Ride: ${id}`, {
      status: ride.isActive ? 'Active' : 'Ended',
      hasLocation: !!ride.currentLocation
    });

    res.json({
      success: true,
      data: response,
      message: ride.currentLocation 
        ? 'Location data available' 
        : 'No location updates yet'
    });

    console.log('[Ride Found from DB]', ride); 
  } catch (error) {
    console.error('[Location Fetch Error]', {
      error: error.message,
      rideId: req.params.id,
      stack: error.stack
    });
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching location',
      error: error.message
    });
  }
});



// GET all rides
router.get('/rides', async (req, res) => {
  try {
    const rides = await Ride.find()
      .populate('driver', 'name email') // populate driver name & email
      .populate('vehicle', 'brand model plateNumber'); // populate vehicle data if needed

    res.json(rides);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving rides', error: err.message });
  }
});
router.get('/', async (req, res) => {
  try {
    const rides = await Ride.find(); // Fetch all rides from MongoDB
    res.json(rides);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch rides', error: err.message });
  }
});

module.exports = router;