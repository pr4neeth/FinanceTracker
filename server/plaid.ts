import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';
import dotenv from 'dotenv';

dotenv.config();

// Ensure the necessary environment variables are set
if (!process.env.PLAID_CLIENT_ID) {
  throw new Error('PLAID_CLIENT_ID is required');
}
if (!process.env.PLAID_SECRET) {
  throw new Error('PLAID_SECRET is required');
}
if (!process.env.PLAID_ENV) {
  throw new Error('PLAID_ENV is required');
}

// Determine which Plaid environment to use
const plaidEnv = process.env.PLAID_ENV.toLowerCase();
let environment = PlaidEnvironments.sandbox;

if (plaidEnv === 'development') {
  environment = PlaidEnvironments.development;
} else if (plaidEnv === 'production') {
  environment = PlaidEnvironments.production;
}

// Initialize Plaid client
const configuration = new Configuration({
  basePath: environment,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
      'Plaid-Version': '2020-09-14', // Use the latest API version
    },
  },
});

export const plaidClient = new PlaidApi(configuration);

// Helper function to create a link token
export const createLinkToken = async (userId: string): Promise<string> => {
  try {
    const response = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: userId,
      },
      client_name: 'FinTrack App',
      products: [Products.Transactions, Products.Auth, Products.Balance],
      country_codes: [CountryCode.Us],
      language: 'en',
    });

    return response.data.link_token;
  } catch (error) {
    console.error('Error creating link token:', error);
    throw error;
  }
};

// Exchange public token for access token
export const exchangePublicToken = async (publicToken: string): Promise<string> => {
  try {
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    return response.data.access_token;
  } catch (error) {
    console.error('Error exchanging public token:', error);
    throw error;
  }
};

// Get accounts for a user
export const getAccounts = async (accessToken: string) => {
  try {
    const response = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    return response.data.accounts;
  } catch (error) {
    console.error('Error getting accounts:', error);
    throw error;
  }
};

// Get transactions for a user
export const getTransactions = async (
  accessToken: string,
  startDate: string,
  endDate: string,
) => {
  try {
    const request = {
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
    };
    const response = await plaidClient.transactionsGet(request);
    let transactions = response.data.transactions;

    // Handle pagination if necessary
    const { total_transactions } = response.data;
    if (transactions.length < total_transactions) {
      let cursor = response.data.next_cursor;
      while (cursor) {
        const paginatedResponse = await plaidClient.transactionsSync({
          access_token: accessToken,
          cursor: cursor,
        });
        transactions = transactions.concat(paginatedResponse.data.added);
        cursor = paginatedResponse.data.next_cursor || null;
      }
    }

    return transactions;
  } catch (error) {
    console.error('Error getting transactions:', error);
    throw error;
  }
};

// Get account balances
export const getBalances = async (accessToken: string) => {
  try {
    const response = await plaidClient.accountsBalanceGet({
      access_token: accessToken,
    });

    return response.data.accounts;
  } catch (error) {
    console.error('Error getting balances:', error);
    throw error;
  }
};