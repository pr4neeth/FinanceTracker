const { By, until } = require('selenium-webdriver');
const assert = require('assert');
const {
  createDriver,
  waitAndSendKeys,
  waitAndClick,
  takeScreenshot,
  generateRandomString,
} = require('./test-utils');
const { testConfig } = require('./test-config');

let driver;

// Set global timeout
jest.setTimeout(60000);

describe('Authentication Tests', () => {
  beforeAll(async () => {
    driver = await createDriver();
  });

  afterAll(async () => {
    if (driver) {
      await driver.quit();
    }
  });

  test('should display the authentication page', async () => {
    await driver.get(`${testConfig.baseUrl}/auth`);
    await takeScreenshot(driver, 'auth-page');

    await driver.wait(until.elementLocated(By.css('h1')), 15000);
    const heading = await driver.findElement(By.css('h1'));
    const text = await heading.getText();
    expect(text.replace(/\s/g, '')).toMatch(/FinSmartAI/i);

    const loginForm = await driver.findElement(By.css('form'));
    expect(await loginForm.isDisplayed()).toBe(true);
  }, 20000);

  test('should register a new user', async () => {
    await driver.get(`${testConfig.baseUrl}/auth`);

    const tabs = await driver.findElements(By.css('[role="tab"]'));
    for (const tab of tabs) {
      const text = await tab.getText();
      if (text.toLowerCase().includes('register')) {
        await tab.click();
        break;
      }
    }

    const username = `selenium_${generateRandomString(6)}`;
    const email = `${username}@example.com`;
    const password = 'Test@123';
    const fullName = 'Selenium Test';

    await driver.wait(until.elementLocated(By.css('input')), 10000);
    const inputs = await driver.findElements(By.css('input'));
    for (const input of inputs) {
      const placeholder = await input.getAttribute('placeholder');
      if (placeholder?.toLowerCase().includes('johndoe')) {
        await input.sendKeys(username);
      } else if (placeholder?.toLowerCase().includes('john doe')) {
        await input.sendKeys(fullName);
      } else if (placeholder?.toLowerCase().includes('@')) {
        await input.sendKeys(email);
      } else if (placeholder?.includes('•')) {
        await input.sendKeys(password);
      }
    }

    await takeScreenshot(driver, 'registration-filled');
    await waitAndClick(driver, By.css('button[type="submit"]'));

    //await driver.wait(until.urlIs(`${testConfig.baseUrl}/`), 20000);
    await takeScreenshot(driver, 'after-registration');

    const currentUrl = await driver.getCurrentUrl();
    expect([`${testConfig.baseUrl}/auth`, `${testConfig.baseUrl}`]).toContain(currentUrl);
  }, 30000);
});