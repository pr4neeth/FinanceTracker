import { Types } from 'mongoose';
import { findCategoryByName, categorizeTxByDescription } from '../config/categories';

/**
 * Helper function to categorize a Plaid transaction by matching its category
 * or analyzing its description
 * 
 * @param transaction Plaid transaction object
 * @returns MongoDB ObjectId for matched category or null if no match
 */
export function categorizePlaidTransactionWithConfig(transaction: any): Types.ObjectId | null {
  if (!transaction) return null;
  
  // Try to find a matching category
  if (transaction.category && transaction.category.length > 0) {
    // Try to match Plaid category to our categories
    const primaryCategory = transaction.category[0].toLowerCase();
    const matchedCategory = findCategoryByName(primaryCategory);
    
    if (matchedCategory) {
      return matchedCategory._id;
    }
  }
  
  // If no category match, try to categorize by transaction description
  if (transaction.name) {
    return categorizeTxByDescription(transaction.name);
  }
  
  return null;
}