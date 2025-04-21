const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');
const path = require('path');
const { testConfig } = require('./test-config');

/**
 * Create and return a new Chrome WebDriver instance in headless mode.
 */
async function createDriver() {
  const chromeOptions = new chrome.Options()
    .addArguments(
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1280,800'
    );

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(chromeOptions)
    .build();

  await driver.manage().setTimeouts({ implicit: 10000 });
  return driver;
}

/**
 * Simulates user login on the AuthPage using test credentials.
 */
/**
 * Simulates user login on the AuthPage using test credentials.
 * Accepts optional selector to wait for after login (e.g., dashboard or transactions).
 */
async function login(driver, postLoginSelector = '[data-testid="dashboard-title"]') {
  await driver.get(`${testConfig.baseUrl}/auth`);

  // Select the login tab
  const tabs = await driver.findElements(By.css('[role="tab"]'));
  for (const tab of tabs) {
    const text = await tab.getText();
    if (text.toLowerCase().includes('login')) {
      await tab.click();
      break;
    }
  }

  // Fill in credentials
  await waitAndSendKeys(driver, By.name("username"), testConfig.testUser.username);
  await waitAndSendKeys(driver, By.name("password"), testConfig.testUser.password);

  // Submit login
  await waitAndClick(driver, By.css('button[type="submit"]'));

  try {
    console.log('🔄 Waiting for redirect and page load...');
    await driver.wait(until.urlIs(`${testConfig.baseUrl}/`), 10000);

    if (postLoginSelector) {
      await driver.wait(until.elementLocated(By.css(postLoginSelector)), 10000);
    }

    console.log('Login successful');
  } catch (error) {
    console.error('Login failed or post-login element not found.');
    throw error;
  }
}


/**
 * Wait for an element to be located and visible before clicking.
 */
async function waitAndClick(driver, locator) {
  const element = await driver.wait(until.elementLocated(locator), 10000);
  await driver.wait(until.elementIsVisible(element), 5000);
  await driver.executeScript("arguments[0].scrollIntoView({block: 'center'});", element);
  await driver.sleep(200);
  await element.click();
}

/**
 * Wait for an element to be located and visible before typing.
 */
async function waitAndSendKeys(driver, locator, text) {
  const element = await driver.wait(until.elementLocated(locator), 10000);
  await driver.wait(until.elementIsVisible(element), 5000);
  await driver.executeScript("arguments[0].scrollIntoView({block: 'center'});", element);
  await driver.sleep(200);
  await element.clear();
  await element.sendKeys(text);
}

/**
 * Check if an element exists on the page.
 */
async function elementExists(driver, locator) {
  try {
    await driver.findElement(locator);
    return true;
  } catch {
    return false;
  }
}

/**
 * Return the visible text of the first element matching the locator.
 */
async function getElementText(driver, locator) {
  const element = await driver.wait(until.elementLocated(locator), 10000);
  return await element.getText();
}

/**
 * Wait for network idle (simulated by timeout).
 */
async function waitForNetworkIdle(driver, timeout = 3000) {
  await driver.sleep(timeout);
}

/**
 * Takes a screenshot and saves it to the screenshots directory.
 */
async function takeScreenshot(driver, name) {
  const dir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `${name}_${timestamp}.png`;
  const filePath = path.join(dir, fileName);

  try {
    const image = await driver.takeScreenshot();
    fs.writeFileSync(filePath, image, 'base64');
    console.log(`✅ Screenshot saved: ${fileName}`);
  } catch (err) {
    console.error(`❌ Failed to take screenshot: ${err.message}`);
  }
}

/**
 * Generate a random alphanumeric string.
 */
function generateRandomString(length = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length })
    .map(() => chars.charAt(Math.floor(Math.random() * chars.length)))
    .join('');
}

module.exports = {
  createDriver,
  login,
  waitAndClick,
  waitAndSendKeys,
  elementExists,
  getElementText,
  waitForNetworkIdle,
  takeScreenshot,
  generateRandomString,
};
