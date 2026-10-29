// Dev tool: screenshot a page with your installed Chrome (no browser download needed).
//
//   node scripts/shot.mjs <url> <out.png> [--width 1440] [--height 900] [--full] [--eval "js"] [--wait 500]
//
// Example: node scripts/shot.mjs http://localhost:3000/ /tmp/home.png --width 390 --full
import puppeteer from "puppeteer-core";

const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const [url, out] = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};
if (!url || !out) {
  console.error("usage: node scripts/shot.mjs <url> <out.png> [--width N] [--height N] [--full] [--eval js] [--wait ms]");
  process.exit(1);
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: Number(opt("width", 1440)), height: Number(opt("height", 900)), deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  const js = opt("eval");
  if (js) await page.evaluate(js);
  await new Promise((r) => setTimeout(r, Number(opt("wait", 400))));
  await page.screenshot({ path: out, fullPage: process.argv.includes("--full") });
  console.log("saved", out);
} finally {
  await browser.close();
}
