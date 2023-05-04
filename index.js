const express = require("express");
const app = express();
const port = process.env.PORT || 4000;
const puppeteer = require("puppeteer");
const cors = require("cors");

//Serving static files
app.use(express.static("public"));
app.use(cors());

let isActive = false;

function sleep(milliseconds) {
  const date = Date.now();
  let currentDate = null;
  do {
    currentDate = Date.now();
  } while (currentDate - date < milliseconds);
}
let browser = null;
let page = null;

async function getResult(ticker, candelType = "day", exchange = "NSE") {
  try {
    if (!page) {
      console.log("Launching Browser");
      browser = await puppeteer.launch({
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        ignoreDefaultArgs: ["--disable-extensions"],
      });
      page = await browser.newPage();
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
    const timeout1 = setTimeout(async () => {
      if (!isActive && browser && page) {
        console.log("No Active Request, Closing Browser");
        await browser.close();
        browser = null;
        page = null;
        clearTimeout(timeout1);
      }
    }, [30000]);
    return results;
  } catch (error) {
    console.log("error", error);
  }
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
