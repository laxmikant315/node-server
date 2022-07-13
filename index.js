const express = require("express");
const app = express();
const port = process.env.PORT || 4000;
const puppeteer = require("puppeteer");
const cors = require("cors");

//Serving static files
app.use(express.static("public"));
app.use(cors());

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

app.get("/getResult/:ticker", async (req, res) => {
  try {
    let page = null;
    if (!page) {
      page = await configureTheBrowser();
    }
    const ticker = req.params.ticker;
    console.log("ticker", ticker);
    const url = `https://mo.streak.tech/?utm_source=context-menu&utm_medium=kite&stock=NSE:${ticker}&theme=dark`;
    await page.goto(url, { waitUntil: "networkidle0" });
    // const divs = await page.$(".jss48");
    const button = await page.evaluateHandle(
      () => document.querySelector(".jss47").lastChild
    );
    // const button = await page.evaluateHandle(() => {
    //   return document.querySelector(".jss47").lastChild;
    // });

    await button.click();
    sleep(1000);
    await page.waitForSelector(".jss66");
    let results = await page.content();
    res.send(results);
  } catch (error) {
    console.log("Error", error);
  }
});

const server = app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

server.timeout = 9000;
