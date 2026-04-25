const QRCode = require("qrcode");
const path = require("path");
const fs = require("fs");

// Base URL where your frontend is hosted
const BASE_URL = process.env.TRACE_BASE_URL || "https://trace.earthwell.com";

const batchIds = [
  "EW-2026-001",
  // Add more batch IDs here
];

const outputDir = path.join(__dirname, "output");
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

(async () => {
  for (const batchId of batchIds) {
    const url = `${BASE_URL}?batch=${encodeURIComponent(batchId)}`;
    const filePath = path.join(outputDir, `${batchId}.png`);
    await QRCode.toFile(filePath, url, { width: 512, margin: 2 });
    console.log(`Generated: ${filePath}  →  ${url}`);
  }
})();
