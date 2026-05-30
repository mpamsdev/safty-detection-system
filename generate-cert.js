/**
 * Generates a self-signed SSL certificate covering ALL local network IPs.
 * HTTPS is required by browsers to allow camera access from a phone.
 * Run: node generate-cert.js
 * Or just start the server — it auto-generates if certs are missing.
 */

const selfsigned = require("selfsigned");
const fs = require("fs");
const os = require("os");

function getAllLocalIPs() {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  return ips;
}

function generateCert() {
  const ips = getAllLocalIPs();
  const primaryIP = ips[0] || "127.0.0.1";

  const attrs = [{ name: "commonName", value: primaryIP }];
  const altNames = [
    { type: 7, ip: "127.0.0.1" },
    { type: 2, value: "localhost" },
    ...ips.map(ip => ({ type: 7, ip })),
  ];

  const opts = { days: 365, keySize: 2048, extensions: [{ name: "subjectAltName", altNames }] };

  console.log("Generating self-signed certificate for IPs:", ips);
  const pems = selfsigned.generate(attrs, opts);
  fs.writeFileSync("cert.pem", pems.cert);
  fs.writeFileSync("key.pem", pems.private);
  console.log("✅ cert.pem and key.pem created.");
  ips.forEach(ip => console.log(`   📱 Phone URL: https://${ip}:3443`));
  console.log("   Accept the browser security warning — it's your own local cert.");
  return { cert: pems.cert, key: pems.private };
}

// Run directly
if (require.main === module) {
  generateCert();
}

module.exports = { generateCert, getAllLocalIPs };
