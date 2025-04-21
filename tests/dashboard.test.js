const { By } = require('selenium-webdriver');
const {
  createDriver,
  login,
  takeScreenshot,
  waitAndClick,
  elementExists,
  getElementText,
  waitForNetworkIdle
} = require('./test-utils');
const { testConfig } = require('./test-config');

let driver;

describe('Dashboard Page Tests', () => {

  beforeAll(async () => {
    driver = await createDriver();
    await login(driver);
  }, 30000);

  test('should land on dashboard after login', async () => {
    const url = await driver.getCurrentUrl();
    expect(url).toBe(`${testConfig.baseUrl}/`);

    const titleText = await getElementText(driver, By.css('[data-testid="dashboard-title"]'));
    expect(titleText.toLowerCase()).toContain("dashboard");

    await takeScreenshot(driver, 'dashboard-landing');
  }, 30000);

  test('should render dashboard cards', async () => {
    const cards = await driver.findElements(By.css('[data-testid="dashboard-card"]'));
    expect(cards.length).toBeGreaterThan(0);
    await takeScreenshot(driver, 'dashboard-cards');
  }, 30000);
});
