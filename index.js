const express = require("express");
const app = express();
const port = process.env.PORT || 4000;
const puppeteer = require("puppeteer");
const cors = require("cors");

//Serving static files
app.use(express.static("public"));
app.use(cors());

let page = null;
let isActive = false;
async function configureTheBrowser() {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  return await browser.newPage();
}

function sleep(milliseconds) {
  const date = Date.now();
  let currentDate = null;
  do {
    currentDate = Date.now();
  } while (currentDate - date < milliseconds);
}

async function getResult(ticker, candelType = "day", exchange = "NSE") {
  if (!page) {
    page = await configureTheBrowser();
  }
  console.log("ticker", ticker);
  if (ticker && ticker.toUpperCase().includes("NIFTY")) {
    exchange = "INDICES";
  }
  const url = `https://mo.streak.tech/?utm_source=context-menu&utm_medium=kite&stock=${exchange}:${encodeURIComponent(
    ticker
  )}&theme=dark`;
  await page.goto(url, { waitUntil: "networkidle0" });
  // const divs = await page.$(".jss48");
  const button = await page.evaluateHandle(
    // () => document.querySelector(".jss47").lastChild
    (candelType) => document.getElementById(candelType),
    candelType
  );
  // const button = await page.evaluateHandle(() => {
  //   return document.querySelector(".jss47").lastChild;
  // });

  await button.click();
  sleep(1000);
  // await page.waitForSelector(".jss66");
  let results = await page.content();
  return results;
}

app.get("/getResult/:ticker/:candelType/:exchange?", (req, res) => {
  try {
    while (!isActive) {
      const ticker = req.params.ticker;
      const exchange = req.params.exchange;
      const candelType = req.params.candelType;
      isActive = true;
      getResult(ticker, candelType, exchange).then((results) => {
        isActive = false;
        res.send(results);
      });
    }
  } catch (error) {
    console.log("Error", error);
  }
});

const server = app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

server.timeout = 9000;
