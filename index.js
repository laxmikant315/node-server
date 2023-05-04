const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
const port = 3000;

let browser = null;
let page = null;
let lastUsedTime = null;

async function getBrowserInstance() {
  // If there's no browser instance, create one
  if (!browser) {
    browser = await puppeteer.launch();
    console.log("Launching Browser");
  }
  lastUsedTime = Date.now();
  return browser;
}

async function getPageInstance() {
  // If there's no page instance, create one
  if (!page) {
    const browserInstance = await getBrowserInstance();
    page = await browserInstance.newPage();
    // Set the page timeout to 60 seconds
    await page.setDefaultNavigationTimeout(30000);
    console.log("Creating new Page");
  }
  lastUsedTime = Date.now();
  return page;
}

// Close the browser if it's been idle for a minute
setInterval(() => {
  if (browser && Date.now() - lastUsedTime > 30000) {
    browser.close();
    browser = null;
    page = null;
    console.log("Closing Browser");
  }
}, 1000);

app.get("/getResult/:ticker/:candelType/:exchange", async (req, res) => {
  const { ticker, candelType, exchange } = req.params;

  // Get a page instance
  const pageInstance = await getPageInstance();

  if (ticker && ticker.toUpperCase().includes("NIFTY")) {
    exchange = "INDICES";
  }
  // Construct the URL with the parameters
  const url = `https://mo.streak.tech/?utm_source=context-menu&utm_medium=kite&stock=${exchange}:${encodeURIComponent(
    ticker
  )}&theme=dark`;
  console.log("URL", url);

  // Navigate to the URL with a timeout of 60 seconds
  await pageInstance.goto(url, { timeout: 30000 });

  // Wait for the button with the candelType variable as the ID to appear on the page
  await pageInstance.waitForSelector(`#${candelType}`);

  // Click on the button with the type variable as the ID
  await pageInstance.click(`#${candelType}`);

  // Wait for 1 second for the page to load after clicking the button
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Get the page content and send it as a response
  const pageContent = await pageInstance.content();
  res.send(pageContent);

  // Update the last used time for the page and browser
  lastUsedTime = Date.now();
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
