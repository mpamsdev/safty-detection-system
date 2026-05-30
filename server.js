/**
 * AI Safety Detection System - Local Server
 * Proxies requests to Anthropic API (keeps your API key safe)
 * Run: node server.js
 */

// Load .env for local development (ignored if not present)
try { require("dotenv").config(); } catch(e) {}

const express = require("express");
const cors = require("cors");
const path = require("path");
const https = require("https");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Proxy route - forwards image analysis requests to Anthropic
app.post("/api/analyze", async (req, res) => {
  try {
    const { imageBase64, mediaType, imgWidth, imgHeight } = req.body;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType || "image/jpeg", data: imageBase64 }
            },
            {
              type: "text",
              text: `You are a PPE (Personal Protective Equipment) detection system. Your job is simple: find every visible PERSON in this image and check whether they are wearing a hard hat and a safety vest.

THIS IS A TEST/DEMO ENVIRONMENT. Detect ANY person regardless of setting — office, home, outdoors, anywhere.

For each person you can see, assign ONE class based solely on what PPE they are visibly wearing:
- "full_safety"  → person has BOTH a hard hat/helmet on head AND a high-vis vest on torso
- "no_helmet"    → person has a vest but their head has NO hard hat
- "no_vest"      → person has a hard hat but their torso has NO high-vis vest
- "no_safety"    → person has NEITHER a hard hat NOR a high-vis vest

Draw the bounding box around the WHOLE person (from head to at least the waist).

RULES:
- If you see a person → you MUST include a detection for them. Do not skip people.
- If NO people at all are visible → return empty detections and total_workers=0.
- Do NOT use any class names other than the four above.
- safety_status: "SAFE" if all people have full_safety | "UNSAFE" if anyone is missing PPE | "PARTIAL" if mixed

Respond with ONLY valid JSON, nothing else before or after:
{"detections":[{"class":"full_safety|no_helmet|no_vest|no_safety","confidence":0.95,"x":100,"y":50,"w":200,"h":400}],"summary":{"total_workers":1,"helmet_count":0,"vest_count":0,"unsafe_count":1,"safety_status":"UNSAFE"},"analysis":"One person detected with no PPE."}

Image: ${imgWidth}x${imgHeight}px. Use exact pixel coordinates.
Empty frame response: {"detections":[],"summary":{"total_workers":0,"helmet_count":0,"vest_count":0,"unsafe_count":0,"safety_status":"SAFE"},"analysis":"No people visible in frame."}`
            }
          ]
        }]
      })
    });

    const data = await response.json();

    // Debug: log what Claude actually returned
    if (data.error) {
      console.error("Claude API error:", JSON.stringify(data.error));
      return res.status(500).json({ error: data.error.message });
    }
    const text = data.content?.find(c => c.type === "text")?.text || "{}";
    console.log("Claude raw response:", text.substring(0, 300));

    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    console.log(`Detected: ${parsed.summary?.total_workers ?? "?"} workers | status: ${parsed.summary?.safety_status ?? "?"}`);
    res.json(parsed);

  } catch (err) {
    console.error("Analysis error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Health check — returns all local IPs so the phone URL display is accurate
app.get("/api/health", (req, res) => {
  const os = require("os");
  const nets = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) {
        ips.push({ iface: name, address: net.address });
      }
    }
  }
  res.json({
    status: "ok",
    keySet: ANTHROPIC_API_KEY !== "YOUR_API_KEY_HERE",
    ips,
    httpPort: PORT,
    httpsPort: HTTPS_PORT,
    httpsReady: fs.existsSync("./cert.pem") && fs.existsSync("./key.pem"),
  });
});

// ── HTTP server (laptop browser) ────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  const os = require("os");
  const nets = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) {
        ips.push({ name, address: net.address });
      }
    }
  }
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║    AI SAFETY DETECTION SYSTEM — SERVER STARTED      ║");
  console.log("╠══════════════════════════════════════════════════════╣");
  console.log(`║  💻 Laptop:  http://localhost:${PORT}                  ║`);
  if (ips.length === 0) {
    console.log("║  📱 Phone:   No network interfaces found             ║");
  } else {
    ips.forEach(({ name, address }) => {
      const line = `  📱 [${name}]  http://${address}:${PORT}`;
      console.log(`║ ${line.padEnd(53)}║`);
    });
  }
  console.log("║  🔒 HTTPS (for phone camera) starting on port 3443   ║");
  console.log("║     Phone: https://LAPTOP_IP:3443 — accept warning  ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");
});

// ── HTTPS server (required for phone camera access) ──────────────────────────
// Auto-generates a self-signed cert if none exists, so no manual step needed.
(function startHttps() {
  let cert, key;
  if (fs.existsSync("./cert.pem") && fs.existsSync("./key.pem")) {
    cert = fs.readFileSync("./cert.pem");
    key  = fs.readFileSync("./key.pem");
  } else {
    try {
      console.log("🔑 No cert found — auto-generating self-signed certificate...");
      const { generateCert } = require("./generate-cert.js");
      const pems = generateCert();
      cert = pems.cert;
      key  = pems.key;
    } catch (e) {
      console.warn("⚠  Could not generate cert (selfsigned package missing?). Run: npm install");
      console.warn("   Phone camera access will not work without HTTPS.");
      return;
    }
  }

  const os = require("os");
  const nets = os.networkInterfaces();
  https.createServer({ cert, key }, app).listen(HTTPS_PORT, "0.0.0.0", () => {
    const ips = [];
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === "IPv4" && !net.internal) ips.push(net.address);
      }
    }
    console.log(`🔒 HTTPS running on port ${HTTPS_PORT}`);
    ips.forEach(ip => console.log(`   📱 Phone URL: https://${ip}:${HTTPS_PORT}`));
    console.log("   Accept the browser security warning on your phone — it's safe.\n");
  });
})();
