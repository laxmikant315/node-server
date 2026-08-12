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
  if (!buyPrice) {
    return res.status(400).json({ error: "buyPrice is required" });
  }
  let prompt = `
  Act as an expert stock market analyst specializing in short-term swing trading.

Analyze the following stock using the latest reliable market data available:

Stock Symbol: ${symbol}
User Buy Price: ${buyPrice}
User Target Price: ${targetPrice}
User Stop Loss: ${stopLoss}
Current Price: ${currentPrice}

Evaluate:

* Price action and short/medium-term trend
* RSI, MACD, EMA/SMA, Bollinger Bands and ATR
* Volume and momentum
* Key support and resistance
* Market and sector trend
* Recent relevant news and catalysts
* Volatility and risk/reward

Give greater weight to price action, volume, momentum, support/resistance and recent catalysts than to any single indicator.

Determine whether the user's target price and stop loss are technically reasonable. If not, calculate more appropriate levels.

Rules:

* Never invent market data, technical indicators or news.
* If reliable data is unavailable, reduce the confidence score.
* Do not guarantee profits or future price movements.
* Recommendation must be exactly BUY, HOLD, or SELL.
* Prioritize capital preservation and favorable risk/reward.
* Round numerical values to 2 decimal places.
* Keep the analysis concise and actionable.
* Preserve the original user values in userBuyPrice, userTargetPrice and userStopLoss.
* correctTargetPrice and correctStopLoss must contain your recommended levels.
* Do not blindly use the user's target or stop-loss.
* If the current price is already near/above the target, consider whether entering or holding still provides a favorable risk/reward.
* If the setup is weak or unclear, prefer HOLD rather than forcing a BUY or SELL.

Calculations:
currentProfitLossPercent = ((currentPrice - userBuyPrice) / userBuyPrice) * 100

expectedReturnPercent = ((correctTargetPrice - currentPrice) / currentPrice) * 100

downsidePercent = ((currentPrice - correctStopLoss) / currentPrice) * 100

riskRewardRatio = (correctTargetPrice - currentPrice) / (currentPrice - correctStopLoss)

Return ONLY valid JSON.
No Markdown.
No code fences.
No text outside the JSON.
Use valid JSON with double quotes and no trailing commas.

{
"analysis": "<concise HTML analysis>",
"recommendation": "BUY|HOLD|SELL",
"userBuyPrice": 0,
"userTargetPrice": 0,
"userStopLoss": 0,
"correctTargetPrice": 0,
"correctStopLoss": 0,
"currentProfitLossPercent": 0,
"expectedReturnPercent": 0,
"downsidePercent": 0,
"riskRewardRatio": 0,
"aiResponseConfidenceLevelPercent": 0,
"riskLevel": "LOW|MEDIUM|HIGH|VERY_HIGH",
"timeFrame": "2-5 trading days",
"newsImpact": "POSITIVE|NEGATIVE|NEUTRAL",
"newsImpactPercent": 0,
"currentPrice": 0
}

The HTML analysis must briefly contain:

* Trend
* Technical Signals
* Support/Resistance
* News/Catalysts
* Trade Setup
* Risk/Reward
* Recommendation Reason

Use only simple HTML such as <h3>, <p>, <ul>, <li>, <table>, <tr>, <th>, and <td>.

For missing or unavailable numerical values, use null instead of inventing a value.

If a calculation cannot be performed because required values are unavailable, return null for that field.

Ensure all numerical values are internally consistent with the recommended target, stop-loss and current price.

Make sure currentProfitLossPercent calculated correctly.
  `;
  const interaction = await ai.interactions.create({
    model: req.body.model || process.env.GOOGLE_GENAI_MODEL,
    input: prompt,
  });


  return res.json({ answer: JSON.parse(interaction.output_text.replace(/```json\n|```/g, '')) });

})
app.get("/getResult/:ticker/:candelType/:exchange", async (req, res) => {
  try {


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
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Get the page content and send it as a response
    const pageContent = await pageInstance.content();
    res.send(pageContent);

    // Close the page instance
    await pageInstance.close();

    // Update the last used time for the browser
    lastUsedTime = Date.now();

  } catch (error) { 

    console.log("ERROR:",{error})
    browser = null
    lastUsedTime = null
  }
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
