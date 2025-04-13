import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';
import * as dotenv from 'dotenv';

dotenv.config();

// Ensure Plaid environment variables are set
if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET || !process.env.PLAID_ENV) {
  console.warn('Warning: PLAID_CLIENT_ID, PLAID_SECRET, and/or PLAID_ENV environment variables are not set.');
  console.warn('Plaid integration will be disabled. Set these environment variables to enable Plaid integration.');
}

// Set up Plaid configuration
const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

export const plaidClient = new PlaidApi(configuration);

// Create a link token
export const createLinkToken = async (userId: string): Promise<string> => {
  try {
    const request = {
      user: {
        client_user_id: userId,
      },
      client_name: 'Finance Tracker',
      products: ['transactions', 'auth'] as Products[],
      country_codes: ['US'] as CountryCode[],
      language: 'en',
    };

    const response = await plaidClient.linkTokenCreate(request);
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

// Get accounts
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

// Get transactions
export const getTransactions = async (
  accessToken: string,
  startDate: string,
  endDate: string
) => {
  try {
    const response = await plaidClient.transactionsGet({
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
    });
    return response.data.transactions;
  } catch (error) {
    console.error('Error getting transactions:', error);
    throw error;
  }
};

// Get balances
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