import { Types } from 'mongoose';

// Predefined categories with fixed ObjectId values for consistency
export const DEFAULT_CATEGORIES = [
  {
    _id: new Types.ObjectId('000000000000000000000001'),
    name: 'Housing',
    icon: 'home',
    color: '#4A6FA5'
  },
  {
    _id: new Types.ObjectId('000000000000000000000002'),
    name: 'Food & Dining',
    icon: 'utensils',
    color: '#FFA500'
  },
  {
    _id: new Types.ObjectId('000000000000000000000003'),
    name: 'Transportation',
    icon: 'car',
    color: '#38B2AC'
  },
  {
    _id: new Types.ObjectId('000000000000000000000004'),
    name: 'Entertainment',
    icon: 'film',
    color: '#805AD5'
  },
  {
    _id: new Types.ObjectId('000000000000000000000005'),
    name: 'Shopping',
    icon: 'shopping-cart',
    color: '#F687B3'
  },
  {
    _id: new Types.ObjectId('000000000000000000000006'),
    name: 'Utilities',
    icon: 'bolt',
    color: '#F56565'
  },
  {
    _id: new Types.ObjectId('000000000000000000000007'),
    name: 'Healthcare',
    icon: 'heartbeat',
    color: '#48BB78'
  },
  {
    _id: new Types.ObjectId('000000000000000000000008'),
    name: 'Education',
    icon: 'graduation-cap',
    color: '#ED8936'
  },
  {
    _id: new Types.ObjectId('000000000000000000000009'),
    name: 'Personal Care',
    icon: 'cut',
    color: '#9F7AEA'
  },
  {
    _id: new Types.ObjectId('000000000000000000000010'),
    name: 'Travel',
    icon: 'plane',
    color: '#667EEA'
  },
  {
    _id: new Types.ObjectId('000000000000000000000011'),
    name: 'Gifts & Donations',
    icon: 'gift',
    color: '#FC8181'
  },
  {
    _id: new Types.ObjectId('000000000000000000000012'),
    name: 'Investments',
    icon: 'chart-line',
    color: '#4FD1C5'
  },
  {
    _id: new Types.ObjectId('000000000000000000000013'),
    name: 'Income',
    icon: 'dollar-sign',
    color: '#68D391'
  },
  {
    _id: new Types.ObjectId('000000000000000000000014'),
    name: 'Taxes',
    icon: 'file-invoice-dollar',
    color: '#CBD5E0'
  },
  {
    _id: new Types.ObjectId('000000000000000000000015'),
    name: 'Miscellaneous',
    icon: 'ellipsis-h',
    color: '#A0AEC0'
  }
];

// Map to quickly find categories by common expense types/keywords
export const CATEGORY_KEYWORDS = {
  // Housing related
  'rent': '000000000000000000000001',
  'mortgage': '000000000000000000000001',
  'apartment': '000000000000000000000001',
  'housing': '000000000000000000000001',
  
  // Food related
  'restaurant': '000000000000000000000002',
  'cafe': '000000000000000000000002',
  'grocery': '000000000000000000000002',
  'takeout': '000000000000000000000002',
  'food': '000000000000000000000002',
  'dining': '000000000000000000000002',
  
  // Transportation
  'gas': '000000000000000000000003',
  'fuel': '000000000000000000000003',
  'car': '000000000000000000000003',
  'auto': '000000000000000000000003',
  'bus': '000000000000000000000003',
  'train': '000000000000000000000003',
  'uber': '000000000000000000000003',
  'lyft': '000000000000000000000003',
  'taxi': '000000000000000000000003',
  
  // Entertainment
  'movie': '000000000000000000000004',
  'theatre': '000000000000000000000004',
  'theater': '000000000000000000000004',
  'concert': '000000000000000000000004',
  'streaming': '000000000000000000000004',
  'netflix': '000000000000000000000004',
  'spotify': '000000000000000000000004',
  
  // Shopping
  'amazon': '000000000000000000000005',
  'walmart': '000000000000000000000005',
  'target': '000000000000000000000005',
  'store': '000000000000000000000005',
  'shopping': '000000000000000000000005',
  'purchase': '000000000000000000000005',
  
  // Utilities
  'electric': '000000000000000000000006',
  'water': '000000000000000000000006',
  'gas bill': '000000000000000000000006',
  'utility': '000000000000000000000006',
  'internet': '000000000000000000000006',
  'phone': '000000000000000000000006',
  'mobile': '000000000000000000000006',
  
  // Healthcare
  'doctor': '000000000000000000000007',
  'medical': '000000000000000000000007',
  'clinic': '000000000000000000000007',
  'hospital': '000000000000000000000007',
  'pharmacy': '000000000000000000000007',
  'prescription': '000000000000000000000007',
  
  // Education
  'school': '000000000000000000000008',
  'college': '000000000000000000000008',
  'university': '000000000000000000000008',
  'tuition': '000000000000000000000008',
  'course': '000000000000000000000008',
  'book': '000000000000000000000008',
  
  // Income
  'salary': '000000000000000000000013',
  'paycheck': '000000000000000000000013',
  'income': '000000000000000000000013',
  'wage': '000000000000000000000013',
  'deposit': '000000000000000000000013',
  'refund': '000000000000000000000013',
  
  // Fallback
  'other': '000000000000000000000015',
  'misc': '000000000000000000000015',
  'unknown': '000000000000000000000015'
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