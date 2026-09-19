// Custom Next.js server entrypoint for Hostinger.
//
// - Shared hosting ("Node.js App"): Phusion Passenger runs this file and passes
//   the port to listen on via process.env.PORT.
// - VPS / Cloud: run `NODE_ENV=production node server.js` (optionally under PM2).
//
// Build first with `npm run build`, then start this file in production mode.

const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> MediaSync ready on http://${hostname}:${port} (dev=${dev})`);
  });
});
