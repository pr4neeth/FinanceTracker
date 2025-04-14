const fs = require('fs');
const path = require('path');

// Read the file
const filePath = path.join(process.cwd(), 'server/mongo-routes.ts');
let content = fs.readFileSync(filePath, 'utf8');

// The pattern to replace
const pattern = `          // Try to find a matching category
          let categoryId = null;
          const categories = await storage.getCategoriesByUserId(req.user._id.toString());
          
          if (transaction.category && transaction.category.length > 0) {
            // Try to match Plaid category to our categories
            const primaryCategory = transaction.category[0].toLowerCase();
            for (const category of categories) {
              if (category.name.toLowerCase().includes(primaryCategory)) {
                categoryId = category._id;
                break;
              }
            }
          }`;

// The replacement
const replacement = `          // Try to find a matching category using config-based helper
          let categoryId = categorizePlaidTransactionWithConfig(transaction);`;

// Replace all occurrences
let newContent = content.replace(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement);

// Write back to the file
fs.writeFileSync(filePath, newContent, 'utf8');
console.log('File updated successfully');
