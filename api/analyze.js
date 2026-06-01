const PROMPT = (imgWidth, imgHeight) => `You are a PPE (Personal Protective Equipment) detection system. Your job is simple: find every visible PERSON in this image and check whether they are wearing a hard hat and a safety vest.

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
Empty frame response: {"detections":[],"summary":{"total_workers":0,"helmet_count":0,"vest_count":0,"unsafe_count":0,"safety_status":"SAFE"},"analysis":"No people visible in frame."}`;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  try {
    // Vercel may auto-parse JSON or leave it as a raw string — handle both
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch(e) { body = {}; }
    }
    if (!body || typeof body !== "object") {
      body = {};
    }

    const { imageBase64, mediaType, imgWidth, imgHeight } = body;

    if (!imageBase64) {
      return res.status(400).json({
        error: "No image received — make sure a camera is active before analyzing",
        debug: { bodyType: typeof req.body, hasBody: !!req.body }
      });
    }

    // Strip any non-base64 characters (guards against BOM or encoding artifacts)
    const cleanBase64 = String(imageBase64).replace(/[^A-Za-z0-9+/=]/g, "");

    console.log(`Analyzing image: ${imgWidth}x${imgHeight}, base64 chars: ${cleanBase64.length}`);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
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
              source: { type: "base64", media_type: mediaType || "image/jpeg", data: cleanBase64 }
            },
            {
              type: "text",
              text: PROMPT(imgWidth || 640, imgHeight || 480)
            }
          ]
        }]
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error("Claude API error:", JSON.stringify(data.error));
      return res.status(500).json({ error: data.error.message });
    }

    const text = data.content?.find(c => c.type === "text")?.text || "{}";
    console.log("Claude response preview:", text.substring(0, 300));

    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    console.log(`Result: ${parsed.summary?.total_workers ?? "?"} workers | ${parsed.summary?.safety_status ?? "?"}`);

    res.json(parsed);
  } catch (err) {
    console.error("Handler error:", err.message, "\n", err.stack?.split("\n").slice(0, 4).join("\n"));
    res.status(500).json({ error: err.message });
  }
};
