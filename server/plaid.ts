import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';
import dotenv from 'dotenv';

dotenv.config();

// Check if required environment variables are set
const requiredEnvVars = ['PLAID_CLIENT_ID', 'PLAID_SECRET', 'PLAID_ENV'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.warn(`Warning: Missing required Plaid environment variables: ${missingEnvVars.join(', ')}`);
  console.warn('Plaid API functionality will be limited. Set these variables in your .env file.');
}

// Determine Plaid environment from env var
const getPlaidEnvironment = () => {
  const env = process.env.PLAID_ENV?.toLowerCase() || 'sandbox';
  switch (env) {
    case 'production':
      return PlaidEnvironments.production;
    case 'development':
      return PlaidEnvironments.development;
    case 'sandbox':
    default:
      return PlaidEnvironments.sandbox;
  }
};

// Create a new configuration for Plaid
const configuration = new Configuration({
  basePath: getPlaidEnvironment(),
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID || '',
      'PLAID-SECRET': process.env.PLAID_SECRET || '',
    },
  },
});

// Create Plaid client
export const plaidClient = new PlaidApi(configuration);

/**
 * Creates a link token for the Plaid Link flow
 * @param userId The user ID to associate with the link token
 * @returns The link token string
 */
export async function createLinkToken(userId: string): Promise<string> {
  try {
    const response = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: userId,
      },
      client_name: 'Finance Tracker',
      products: ['transactions'] as Products[],
      country_codes: ['US'] as CountryCode[],
      language: 'en',
    });

    return response.data.link_token;
  } catch (error) {
    console.error('Error creating link token:', error);
    throw new Error('Failed to create link token');
  }
}

/**
 * Exchanges a public token for an access token
 * @param publicToken The public token received from the Plaid Link flow
 * @returns The access token and item ID
 */
export async function exchangePublicToken(publicToken: string): Promise<{ access_token: string; item_id: string }> {
  try {
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    return {
      access_token: response.data.access_token,
      item_id: response.data.item_id,
    };
  } catch (error) {
    console.error('Error exchanging public token:', error);
    throw new Error('Failed to exchange public token');
  }
}

/**
 * Gets accounts for a given access token
 * @param accessToken The access token for the item
 * @returns Array of accounts
 */
export async function getAccounts(accessToken: string) {
  try {
    const response = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    return response.data.accounts;
  } catch (error) {
    console.error('Error getting accounts:', error);
    throw new Error('Failed to get accounts');
  }
}

/**
 * Gets account balances for a given access token
 * @param accessToken The access token for the item
 * @returns Array of accounts with balance information
 */
export async function getBalances(accessToken: string) {
  try {
    const response = await plaidClient.accountsBalanceGet({
      access_token: accessToken,
    });

    return response.data.accounts;
  } catch (error) {
    console.error('Error getting balances:', error);
    throw new Error('Failed to get balances');
  }
}

/**
 * Gets transactions for a given access token
 * @param accessToken The access token for the item
 * @param startDate Optional start date for transactions (defaults to 30 days ago)
 * @param endDate Optional end date for transactions (defaults to today)
 * @returns Array of transactions
 */
export async function getTransactions(
  accessToken: string,
  startDate?: string,
  endDate?: string
) {
  try {
    // Default to the last 30 days if dates not provided
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const start = startDate || thirtyDaysAgo.toISOString().slice(0, 10);
    const end = endDate || today.toISOString().slice(0, 10);

    const request = {
      access_token: accessToken,
      start_date: start,
      end_date: end,
    };

    const response = await plaidClient.transactionsGet(request);
    let transactions = response.data.transactions;

    // Handle pagination if needed
    const totalTransactions = response.data.total_transactions;
    let hasMore = transactions.length < totalTransactions;
    const batchSize = 500; // The maximum number of transactions to fetch in one request

    while (hasMore) {
      const paginatedRequest = {
        access_token: accessToken,
        start_date: start,
        end_date: end,
        options: {
          offset: transactions.length,
          count: batchSize,
        },
      };

      const paginatedResponse = await plaidClient.transactionsGet(paginatedRequest);
      const newTransactions = paginatedResponse.data.transactions;
      transactions = transactions.concat(newTransactions);
      hasMore = transactions.length < totalTransactions;
    }

    return transactions;
  } catch (error) {
    console.error('Error getting transactions:', error);
    throw new Error('Failed to get transactions');
  }
}