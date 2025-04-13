import mongoose from 'mongoose';
const { Schema } = mongoose;

// Check for MONGODB_URI environment variable
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/financeapp';

// Define the Category schema
const CategorySchema = new Schema({
  name: { type: String, required: true },
  icon: { type: String, required: true },
  color: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Create the Category model
const Category = mongoose.model('Category', CategorySchema);

// Default categories to add
const categories = [
  {
    name: 'Food & Dining',
    icon: 'utensils',
    color: '#FF5722'
  },
  {
    name: 'Transportation',
    icon: 'car',
    color: '#2196F3'
  },
  {
    name: 'Housing',
    icon: 'home',
    color: '#4CAF50'
  },
  {
    name: 'Entertainment',
    icon: 'film',
    color: '#9C27B0'
  },
  {
    name: 'Shopping',
    icon: 'shopping-bag',
    color: '#E91E63'
  },
  {
    name: 'Utilities',
    icon: 'bolt',
    color: '#FFC107'
  },
  {
    name: 'Health',
    icon: 'heart',
    color: '#F44336'
  },
  {
    name: 'Education',
    icon: 'graduation-cap',
    color: '#607D8B'
  },
  {
    name: 'Travel',
    icon: 'plane',
    color: '#00BCD4'
  },
  {
    name: 'Personal Care',
    icon: 'spa',
    color: '#8BC34A'
  }
];

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('Failed to connect to MongoDB', error);
    return false;
  }
}

// Create a test user
async function createTestUser() {
  const UserSchema = new Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String, required: true },
    fullName: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  });

  const User = mongoose.model('User', UserSchema);
  
  try {
    // Check if test user already exists
    const existingUser = await User.findOne({ username: 'testuser' });
    if (existingUser) {
      console.log('Test user already exists with ID:', existingUser._id);
      return existingUser._id;
    }
    
    // Create a test user if it doesn't exist
    const user = new User({
      username: 'testuser',
      password: '$2b$10$EJr7mW2X6M8PDDx3jqmMQOKCUuQI2wm/pd2SEWKtieS6KJSu7JnXW', // hashed 'password123'
      email: 'test@example.com',
      fullName: 'Test User'
    });
    
    await user.save();
    console.log('Created test user with ID:', user._id);
    return user._id;
  } catch (error) {
    console.error('Error creating test user:', error);
    process.exit(1);
  }
}

// Add categories for a user
async function addCategories(userId) {
  try {
    // Check if categories already exist for this user
    const existingCategories = await Category.find({ userId });
    if (existingCategories.length > 0) {
      console.log(`Already have ${existingCategories.length} categories for user ID: ${userId}`);
      console.log('Existing categories:');
      existingCategories.forEach(cat => {
        console.log(`- ${cat.name} (${cat.icon}, ${cat.color})`);
      });
      return;
    }
    
    // Add the categories
    const categoryDocs = categories.map(cat => ({
      ...cat,
      userId
    }));
    
    await Category.insertMany(categoryDocs);
    console.log(`Added ${categories.length} categories for user ID: ${userId}`);
    
    // Display the added categories
    const addedCategories = await Category.find({ userId });
    console.log('Added categories:');
    addedCategories.forEach(cat => {
      console.log(`- ${cat.name} (${cat.icon}, ${cat.color})`);
    });
  } catch (error) {
    console.error('Error adding categories:', error);
  }
}

// Main function
async function main() {
  const connected = await connectToMongoDB();
  if (!connected) {
    process.exit(1);
  }
  
  const userId = await createTestUser();
  await addCategories(userId);
  
  // Disconnect after operations are done
  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
}

// Run the main function
main().catch(console.error);