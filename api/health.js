const os = require("os");
const fs = require("fs");
const path = require("path");

module.exports = function handler(req, res) {
  const isVercel = !!process.env.VERCEL;
  const vercelUrl = process.env.VERCEL_URL;

  let ips = [];
  if (!isVercel) {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === "IPv4" && !net.internal) {
          ips.push({ iface: name, address: net.address });
        }
      }
    }
  }

  const certExists = isVercel || (
    fs.existsSync(path.join(process.cwd(), "cert.pem")) &&
    fs.existsSync(path.join(process.cwd(), "key.pem"))
  );

  res.json({
    status: "ok",
    keySet: !!process.env.ANTHROPIC_API_KEY,
    ips,
    httpPort: process.env.PORT || 3000,
    httpsPort: process.env.HTTPS_PORT || 3443,
    httpsReady: certExists,
    isVercel,
    vercelUrl: vercelUrl ? `https://${vercelUrl}` : null,
  });
};
