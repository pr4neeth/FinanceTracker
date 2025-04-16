import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Check for MONGODB_URI environment variable
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/financeapp';

// Connection options
const options = {
  autoIndex: true,
};

// Connect to MongoDB
mongoose.connect(MONGODB_URI, options)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });

export const connection = mongoose.connection;

// Export mongoose for use in other files
export default mongoose;