const express = require("express");
const puppeteer = require("puppeteer");

const { GoogleGenAI } = require("@google/genai");

const app = express();
const port = process.env.PORT || 4000;
console.log("GOOGLE_GENAI_API_KEY", process.env.GOOGLE_GENAI_API_KEY);
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY });

let browser = null;
let lastUsedTime = null;

console.log("Start");
app.use(express.json());

async function getBrowserInstance() {
  // If there's no browser instance, create one
  if (!browser) {
    browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      ignoreDefaultArgs: ["--disable-extensions"],
    });
    console.log("Launching Browser");
  }
  lastUsedTime = Date.now();
  return browser;
}

// Close the browser if it's been idle for 30 seconds
setInterval(() => {
  if (browser && Date.now() - lastUsedTime > 30000) {
    browser.close();
    browser = null;
    console.log("Closing Browser");
  }
}, 1000);


app.post("/predictStockwithAI", async (req, res) => {
  console.log("Request Body:", req.body);
  let { symbol, buyPrice, targetPrice, stopLoss, currentPrice } = req.body;

  let prompt = `
  Act as Stock Market Analyst and predict the following stock for swing trading.
  If input values are not provided, you can use your own analysis to predict the values.
  Stock Symbol: ${symbol},
  Buy Price: ${buyPrice},
  Target Price: ${targetPrice},
  Stop Loss: ${stopLoss},
  Current Price: ${currentPrice} ,
  Provide a detailed analysis of the stock's performance, including technical indicators, market trends, and any relevant news or events that may impact the stock's price. 
  Additionally, provide a recommendation on whether to buy, hold, or sell the stock based on your analysis.
  also provide your target price and stoploss.
  Mostly response in number format if values are numbers.
  please respond in json format with the following keys: "analysis": <html_format>, "recommendation":"BUY|HOLD|SELL", "targetPrice", "stopLoss", "currentProfitLossPercent", "aiResponseConfidenceLevelPercent", "riskLevel", "timeFrame", "newsImpact":"POSITIVE|NEGATIVE|NEUTRAL", "newsImpactPercent" , "currentPrice","buyPrice":${buyPrice}



  `;
  const interaction = await ai.interactions.create({
    model: process.env.GOOGLE_GENAI_MODEL,
    input: prompt,
  });
  

  return res.json({ answer: JSON.parse(interaction.output_text.replace(/```json\n|```/g, '')) });

})
app.get("/getResult/:ticker/:candelType/:exchange", async (req, res) => {
  let { ticker, candelType, exchange } = req.params;

  if (ticker && ticker.toUpperCase().includes("NIFTY")) {
    exchange = "INDICES";
  }
  // Construct the URL with the parameters
  const url = `https://technicalwidget.streak.tech/?utm_source=context-menu&utm_medium=kite&stock=${exchange}:${encodeURIComponent(
    ticker
  )}&theme=dark`
  console.log("URL", url);

  // Get a new page instance
  const browserInstance = await getBrowserInstance();
  const pageInstance = await browserInstance.newPage();

  // Set the page timeout to 30 seconds
  await pageInstance.setDefaultNavigationTimeout(30000);

  // Navigate to the URL with a timeout of 30 seconds
  await pageInstance.goto(url, { timeout: 30000 });

  // Wait for the button with the candelType variable as the ID to appear on the page
  if (candelType === "5min") {
    candelType = "\\35min";
  }
  await pageInstance.waitForSelector(`#${candelType}`);

  // Click on the button with the type variable as the ID
  await pageInstance.click(`#${candelType}`);

  // Wait for 1 second for the page to load after clicking the button
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Get the page content and send it as a response
  const pageContent = await pageInstance.content();
  res.send(pageContent);

  // Close the page instance
  await pageInstance.close();

  // Update the last used time for the browser
  lastUsedTime = Date.now();
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
