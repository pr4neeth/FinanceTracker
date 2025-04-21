const { By, until } = require('selenium-webdriver');

const {
  createDriver,
  login,
  waitAndClick,
  elementExists,
  getElementText,
  takeScreenshot,
  waitForNetworkIdle,
} = require('./test-utils');
const { testConfig } = require('./test-config');

let driver;

describe('Transactions Page Tests', () => {

  beforeAll(async () => {
    driver = await createDriver();
    // Log in and wait for dashboard
    await login(driver, '[data-testid="dashboard-title"]');
    // Navigate to transactions page
    await waitAndClick(driver, By.css('[data-testid="transactions-link"]'));
    await driver.wait(until.urlContains('/transactions'), 10000);
    await driver.wait(until.elementLocated(By.css('[data-testid="transactions-page"]')), 10000);
  }, 30000);


  test('should load the transactions page', async () => {
    const pageTitle = await getElementText(driver, By.css('[data-testid="page-title"]'));
    expect(pageTitle.toLowerCase()).toContain('transaction');

    await takeScreenshot(driver, 'transactions-page-loaded');
  }, 30000);

  test('should display at least one transaction card or row', async () => {
    await waitForNetworkIdle(driver, 3000);

    await driver.wait(until.elementLocated(By.css('[data-testid="transactions-table"]')), 10000);

    const hasTransactions = await elementExists(driver, By.css('[data-testid="transaction-row"], .transaction-item'));
    expect(hasTransactions).toBe(true);

    await takeScreenshot(driver, 'transactions-visible');
  }, 30000);
});
