import mongoose from 'mongoose';
import './mongodb'; // Import the MongoDB connection
import * as mongoModels from './models';

// Re-export the models from models.ts
export const models = mongoModels;

// This is a wrapper to maintain compatibility with code that expects the old PostgreSQL interface
// In practice, most code should migrate to directly using the Mongoose models
export const db = {
  // Placeholder to maintain compatibility
  // Actual database operations should use Mongoose models directly
};
