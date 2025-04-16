import OpenAI from "openai";
import dotenv from 'dotenv';

dotenv.config();
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Analyze receipt using OpenAI Vision
export async function analyzeReceipt(base64Image: string): Promise<{
  merchant: string;
  date: string;
  total: number;
  items: Array<{ name: string; price: number; category?: string }>;
}> {
  try {
    const visionResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a receipt analyzer. Extract the merchant name, date, total amount, and individual line items with their prices from the receipt image. Return the data as a JSON object with the following structure: { merchant: string, date: string, total: number, category: string, items: Array<{ name: string, price: number, category?: string }> }. Try to categorize it into a general spending category such as 'Housing', 'Food & Dining', 'Transportation', 'Entertainment', 'Shopping', 'Utilities', 'Healthcare', 'Education', 'Personal Care', 'Travel', 'Gifts & Donations', 'Investments', 'Income', 'Taxes', 'Miscellaneous'"
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this receipt and extract the merchant, date, total amount, and individual items with prices. Return the data in JSON format."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ],
        },
      ],
      response_format: { type: "json_object" },
    });

    const receiptData = JSON.parse(visionResponse.choices[0].message.content);
    return receiptData;
  } catch (error) {
    console.error("Failed to analyze receipt:", error);
    throw new Error(`Failed to analyze receipt: ${error.message}`);
  }
}

// Generate financial advice using OpenAI
export async function generateFinancialAdvice(
  topic: string,
  question: string,
  userData: {
    income: number;
    expenses: Record<string, number>;
    savings: number;
    goals?: Array<{ name: string; targetAmount: number; currentAmount: number }>;
  }
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a financial advisor providing personalized advice on ${topic}. 
            Use the user's financial data to provide specific, actionable recommendations. 
            Be encouraging but realistic. Focus on practical steps they can take to improve their finances.
            Reference specific numbers from their data when relevant. Keep your response concise and focused on 3-5 key points.`
        },
        {
          role: "user",
          content: `${question || `I need advice on ${topic}.`}
            
            Here's my current financial situation:
            Monthly Income: $${userData.income}
            Monthly Expenses:
            ${Object.entries(userData.expenses)
              .map(([category, amount]) => `- ${category}: $${amount}`)
              .join('\n')}
            Total Savings: $${userData.savings}
            ${userData.goals && userData.goals.length > 0
              ? `Financial Goals:
                ${userData.goals
                  .map(
                    goal =>
                      `- ${goal.name}: $${goal.currentAmount} saved of $${goal.targetAmount} target`
                  )
                  .join('\n')}`
              : ''}`
        }
      ]
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Failed to generate financial advice:", error);
    throw new Error(`Failed to generate financial advice: ${error.message}`);
  }
}

// Predict future expenses based on past data
export async function predictExpenses(
  pastExpenses: Array<{
    category: string;
    amounts: number[];
    months: string[];
  }>
): Promise<Array<{ category: string; predictedAmount: number; confidence: number }>> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an AI that predicts future expenses based on historical spending patterns. Analyze the provided expense data by category and predict the next month's expenses. Return an array of predictions with category, predictedAmount, and confidence level (0-1) in JSON format."
        },
        {
          role: "user",
          content: `Here are my past expenses by category. Predict what I will spend next month in each category:
          ${JSON.stringify(pastExpenses, null, 2)}`
        }
      ],
      response_format: { type: "json_object" },
    });

    const predictions = JSON.parse(response.choices[0].message.content);
    return predictions.predictions || [];
  } catch (error) {
    console.error("Failed to predict expenses:", error);
    throw new Error(`Failed to predict expenses: ${error.message}`);
  }
}

// Suggest ways to save money based on transaction history
export async function suggestSavings(
  transactions: Array<{
    description: string;
    amount: number;
    category: string;
    date: string;
  }>,
  monthlyIncome: number
): Promise<Array<{ suggestion: string; estimatedSaving: number; difficulty: string }>> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a financial advisor specializing in helping people save money. Analyze the user's transaction history and suggest specific ways they could save money. Return an array of suggestions with estimated monthly savings amount and difficulty level (easy, medium, hard). Return the data as a JSON object with the following structure: { suggestion: string, estimatedSaving: number, difficulty_level: string}."
        },
        {
          role: "user",
          content: `Here are my recent transactions:
          ${JSON.stringify(transactions, null, 2)}
          
          My monthly income is $${monthlyIncome}.
          
          Please suggest ways I could save money based on my spending patterns.`
        }
      ],
      response_format: { type: "json_object" },
    });

    const savingsSuggestions = JSON.parse(response.choices[0].message.content);
    return savingsSuggestions.suggestions || [];
  } catch (error) {
    console.error("Failed to generate savings suggestions:", error);
    throw new Error(`Failed to generate savings suggestions: ${error.message}`);
  }
}

// Categorize a transaction using AI
export async function categorizeTransaction(
  description: string,
  amount: number
): Promise<{ category: string; confidence: number }> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an AI that categorizes financial transactions. Analyze the transaction description and amount to determine the most appropriate spending category. Return a JSON object with the category name and confidence level (0-1)."
        },
        {
          role: "user",
          content: `Categorize this transaction:
          Description: ${description}
          Amount: $${amount}`
        }
      ],
      response_format: { type: "json_object" },
    });

    const categorization = JSON.parse(response.choices[0].message.content);
    return {
      category: categorization.category || "Uncategorized",
      confidence: categorization.confidence || 0.5
    };
  } catch (error) {
    console.error("Failed to categorize transaction:", error);
    throw new Error(`Failed to categorize transaction: ${error.message}`);
  }
}
