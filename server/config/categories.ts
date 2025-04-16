import { Types } from 'mongoose';

// Predefined categories with fixed ObjectId values for consistency
export const DEFAULT_CATEGORIES = [
  {
    _id: 'Housing',
    name: 'Housing',
    icon: 'home',
    color: '#4A6FA5'
  },
  {
    _id: 'Food & Dining',
    name: 'Food & Dining',
    icon: 'utensils',
    color: '#FFA500'
  },
  {
    _id: 'Transportation',
    name: 'Transportation',
    icon: 'car',
    color: '#38B2AC'
  },
  {
    _id: 'Entertainment',
    name: 'Entertainment',
    icon: 'film',
    color: '#805AD5'
  },
  {
    _id: 'Shopping',
    name: 'Shopping',
    icon: 'shopping-cart',
    color: '#F687B3'
  },
  {
    _id: 'Utilities',
    name: 'Utilities',
    icon: 'bolt',
    color: '#F56565'
  },
  {
    _id: 'Healthcare',
    name: 'Healthcare',
    icon: 'heartbeat',
    color: '#48BB78'
  },
  {
    _id: 'Education',
    name: 'Education',
    icon: 'graduation-cap',
    color: '#ED8936'
  },
  {
    _id: 'Personal Care',
    name: 'Personal Care',
    icon: 'cut',
    color: '#9F7AEA'
  },
  {
    _id: 'Travel',
    name: 'Travel',
    icon: 'plane',
    color: '#667EEA'
  },
  {
    _id: 'Gifts & Donations',
    name: 'Gifts & Donations',
    icon: 'gift',
    color: '#FC8181'
  },
  {
    _id: 'Investments',
    name: 'Investments',
    icon: 'chart-line',
    color: '#4FD1C5'
  },
  {
    _id: 'Income',
    name: 'Income',
    icon: 'dollar-sign',
    color: '#68D391'
  },
  {
    _id: 'Taxes',
    name: 'Taxes',
    icon: 'file-invoice-dollar',
    color: '#CBD5E0'
  },
  {
    _id: 'Miscellaneous',
    name: 'Miscellaneous',
    icon: 'ellipsis-h',
    color: '#A0AEC0'
  }
];

// Map to quickly find categories by common expense types/keywords
export const CATEGORY_KEYWORDS = {
  // Housing related
  'rent': 'Housing',
  'mortgage': 'Housing',
  'apartment': 'Housing',
  'housing': 'Housing',
  
  // Food related
  'restaurant': 'Food & Dining',
  'cafe': 'Food & Dining',
  'grocery': 'Food & Dining',
  'takeout': 'Food & Dining',
  'food': 'Food & Dining',
  'dining': 'Food & Dining',
  
  // Transportation
  'gas': 'Transportation',
  'fuel': 'Transportation',
  'car': 'Transportation',
  'auto': 'Transportation',
  'bus': 'Transportation',
  'train': 'Transportation',
  'uber': 'Transportation',
  'lyft': 'Transportation',
  'taxi': 'Transportation',
  
  // Entertainment
  'movie': 'Entertainment',
  'theatre': 'Entertainment',
  'theater': 'Entertainment',
  'concert': 'Entertainment',
  'streaming': 'Entertainment',
  'netflix': 'Entertainment',
  'spotify': 'Entertainment',
  
  // Shopping
  'amazon': 'Shopping',
  'walmart': 'Shopping',
  'target': 'Shopping',
  'store': 'Shopping',
  'shopping': 'Shopping',
  'purchase': 'Shopping',
  
  // Utilities
  'electric': 'Utilities',
  'water': 'Utilities',
  'gas bill': 'Utilities',
  'utility': 'Utilities',
  'internet': 'Utilities',
  'phone': 'Utilities',
  'mobile': 'Utilities',
  
  // Healthcare
  'doctor': 'Healthcare',
  'medical': 'Healthcare',
  'clinic': 'Healthcare',
  'hospital': 'Healthcare',
  'pharmacy': 'Healthcare',
  'prescription': 'Healthcare',
  
  // Education
  'school': 'Education',
  'college': 'Education',
  'university': 'Education',
  'tuition': 'Education',
  'course': 'Education',
  'book': 'Education',
  
  // Income
  'salary': 'Income',
  'paycheck': 'Income',
  'income': 'Income',
  'wage': 'Income',
  'deposit': 'Income',
  'refund': 'Income',
  
  // Fallback
  'other': 'Miscellaneous',
  'misc': 'Miscellaneous',
  'unknown': 'Miscellaneous'
};

// Helper function to find a category by name (case-insensitive partial match)
export function findCategoryByName(name: string) {
  const lowerName = name.toLowerCase();
  return DEFAULT_CATEGORIES.find(category => 
    category.name.toLowerCase().includes(lowerName) || 
    lowerName.includes(category.name.toLowerCase())
  );
}

// Helper function to find a category by ID
export function findCategoryById(id: string) {
  return DEFAULT_CATEGORIES.find(category => 
    category._id.toString() === id
  );
}

// Function to get all categories
export function getAllCategories() {
  return DEFAULT_CATEGORIES;
}

// Helper function to categorize a transaction description
export function categorizeTxByDescription(description: string): Types.ObjectId | null {
  if (!description) return null;
  
  const lowerDesc = description.toLowerCase();
  
  // Check for keyword matches
  for (const [keyword, categoryId] of Object.entries(CATEGORY_KEYWORDS)) {
    if (lowerDesc.includes(keyword.toLowerCase())) {
      return new Types.ObjectId(categoryId);
    }
  }
  
  // If no matches, return null (uncategorized)
  return null;
}