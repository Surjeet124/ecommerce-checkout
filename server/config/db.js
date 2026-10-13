const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is not set. Add it to server/.env');

  await mongoose.connect(uri);
  console.log(`MongoDB connected (database: ${mongoose.connection.name})`);
}

module.exports = connectDB;
