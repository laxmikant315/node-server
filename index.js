const express = require("express");
const app = express();
const port = process.env.PORT || 4000;
const puppeteer = require("puppeteer");
const cors = require("cors");

//Serving static files
app.use(express.static("public"));
app.use(cors());

let page = null;

async function configureTheBrowser() {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  return await browser.newPage();
}

app.get("/getResult/:ticker", async (req, res) => {
  if (!page) {
    page = await configureTheBrowser(url);
  }
  const ticker = req.params.ticker;
  console.log("ticker", ticker);
  const url = `https://mo.streak.tech/?utm_source=context-menu&utm_medium=kite&stock=NSE:${ticker}&theme=dark`;
  await page.goto(url, { waitUntil: "networkidle0" });
  let results = await page.content();
  res.send(results);
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
