const express = require("express");
const app = express();
const port = 4000;
const puppeteer = require("puppeteer");

//Serving static files
app.use(express.static("public"));

async function configureTheBrowser(url) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "load", timeout: 0 });
  return page;
}

app.get("/getResult/:ticker", async (req, res) => {
  const ticker = req.params.ticker;
  console.log("ticker", ticker);
  const url = `https://mo.streak.tech/?utm_source=context-menu&utm_medium=kite&stock=NSE:${ticker}&theme=dark`;
  let page = await configureTheBrowser(url);
  let results = await page.content();
  res.send(results);
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
