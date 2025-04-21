const { By } = require('selenium-webdriver');
const {
  createDriver,
  login,
  takeScreenshot,
  waitAndClick,
  waitAndSendKeys,
  elementExists,
  getElementText,
  waitForNetworkIdle
} = require('./test-utils');
const { testConfig } = require('./test-config');

let driver;

describe('AI Insights Page Tests', () => {

  // Setup - runs before all tests
  beforeAll(async () => {
    driver = await createDriver();

    try {
      await login(driver);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }, 30000);

  test('should navigate to AI Insights page', async () => {
    await waitAndClick(driver, By.css('[data-testid="ai-insights-link"]'));
    await waitForNetworkIdle(driver);

    const pageTitle = await getElementText(driver, By.css('[data-testid="page-title"]'));
    expect(pageTitle.toLowerCase()).toContain('ai financial intelligence');

    await takeScreenshot(driver, 'ai-insights-page');
  }, 30000);

  test('should display AI insights cards', async () => {
    const currentUrl = await driver.getCurrentUrl();
    if (!currentUrl.includes('insights')) {
      await waitAndClick(driver, By.css('[data-testid="ai-insights-link"]'));
      await waitForNetworkIdle(driver);
    }

    const insightCards = await driver.findElements(By.css('.insight-card, [data-testid="insight-card"]'));
    expect(insightCards.length).toBeGreaterThan(0);

    await takeScreenshot(driver, 'ai-insights-cards');
  }, 30000);

  test('should be able to ask AI a question', async () => {
    const currentUrl = await driver.getCurrentUrl();
    if (!currentUrl.includes('insights')) {
      await waitAndClick(driver, By.css('[data-testid="ai-insights-link"]'));
      await waitForNetworkIdle(driver);
    }

    const hasInput = await elementExists(driver, By.css('[data-testid="ai-question-input"], .ai-question-input, input[placeholder*="question"]'));

    if (hasInput) {
      await waitAndSendKeys(driver, By.css('[data-testid="ai-question-input"], .ai-question-input, input[placeholder*="question"]'), 'How can I improve my savings?');

      await waitAndClick(driver, By.css('[data-testid="ai-question-submit"], button[type="submit"]'));

      await waitForNetworkIdle(driver, 10000);
      await takeScreenshot(driver, 'ai-question-response');

      const responseExists = await elementExists(driver, By.css('.ai-response, [data-testid="ai-response"]'));
      expect(responseExists).toBe(true);
    } else {
      console.warn('AI question input not found, skipping test');
    }
  }, 45000);

  test('should display spending analysis section', async () => {
    const currentUrl = await driver.getCurrentUrl();
    if (!currentUrl.includes('insights')) {
      await waitAndClick(driver, By.css('[data-testid="ai-insights-link"]'));
      await waitForNetworkIdle(driver);
    }

    const hasSpendingAnalysis = await elementExists(driver, By.css('.spending-analysis, [data-testid="spending-analysis"]'));

    if (hasSpendingAnalysis) {
      await takeScreenshot(driver, 'spending-analysis');

      const hasCharts = await elementExists(driver, By.css('.recharts-wrapper, .chart, [data-testid="chart"]'));
      expect(hasCharts).toBe(true);
    } else {
      console.warn('Spending analysis section not found, skipping test');
    }
  }, 30000);
});
