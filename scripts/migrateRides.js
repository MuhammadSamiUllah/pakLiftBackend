// migrateRides.js
const mongoose = require('mongoose');
const Ride = require('./models/ride.model');
const { getCoordinates } = require('./routes/ride.route'); // Or define the function here

const migrate = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  
  const rides = await Ride.find({
    $or: [
      { 'from.coordinates': { $exists: false } },
      { 'to.coordinates': { $exists: false } }
    ]
  });

  for (const ride of rides) {
    try {
      const fromCoords = await getCoordinates(ride.from);
      const toCoords = await getCoordinates(ride.to);
      
      ride.from = {
        name: ride.from,
        coordinates: fromCoords
      };
      ride.to = {
        name: ride.to,
        coordinates: toCoords
      };
      
      await ride.save();
      console.log(`Migrated ride ${ride._id}`);
    } catch (error) {
      console.error(`Failed to migrate ride ${ride._id}:`, error.message);
    }
  }
  
  mongoose.disconnect();
};

migrate();