# AI Safety Detection System — CCTV Live Monitor
## Enrico Kamutengo PHIRI | MSc GIS & Land Management | Circet Morocco

---

## QUICK START (3 steps)

### 1. Install Node.js
Download from https://nodejs.org (LTS version)

### 2. Add your Anthropic API Key
Edit `server.js` line 14:
```js
const ANTHROPIC_API_KEY = "sk-ant-YOUR_KEY_HERE";
```
Or set as environment variable:
- Windows:   `set ANTHROPIC_API_KEY=sk-ant-...`
- Mac/Linux: `export ANTHROPIC_API_KEY=sk-ant-...`

### 3. Run the server
```bash
cd safety-detection
npm install
node server.js
```

---

## OPENING THE APP

| Device | URL |
|--------|-----|
| Laptop browser | http://localhost:3000 |
| Phone (same WiFi) | http://YOUR_LAPTOP_IP:3000 |

The terminal will print your exact phone URL when the server starts.

---

## LIVE CAMERA SETUP

### Laptop webcam
1. Click **▶ ACTIVATE CAMERA** on CAM 01 or CAM 02
2. Allow camera permission in browser
3. Camera starts immediately as a live CCTV feed

### Phone camera (mimics a remote CCTV)
**Simple way (photo mode):**
- Open http://YOUR_LAPTOP_IP:3000 on your phone
- Click Activate Camera → phone camera starts live

**For live video on phone (HTTPS required):**
```bash
npm install selfsigned --save-dev
node generate-cert.js
node server.js
```
Then open **https://YOUR_LAPTOP_IP:3443** on phone → accept security warning → Activate Camera

---

## HOW TO USE THE CCTV MONITOR

1. **Activate cameras** — click "▶ ACTIVATE CAMERA" on CAM 01 and/or CAM 02
2. **Click "⚡ START AUTO DETECTION"** in the control panel (bottom-right cell)
3. Choose detection interval: **5s / 10s / 20s**
4. The system analyzes live frames continuously and:
   - Draws bounding boxes on workers (Helmet, Vest, etc.)
   - Shows GREEN banner = compliant, RED banner = unsafe
   - Fires an alert popup when unsafe worker detected
   - Logs all events in the Alert History panel

**Manual analyze:** Click **"📸 ANALYZE NOW (ALL CAMS)"** anytime

---

## CAMERA LAYOUT
```
┌─────────────────┬─────────────────┐
│  CAM 01         │  CAM 02         │
│  SITE ENTRANCE  │  WORK ZONE      │
│  (Laptop/Phone) │  (Laptop/Phone) │
├─────────────────┼─────────────────┤
│  CAM 03         │  SYS CONTROL    │
│  Phone tip/URL  │  Auto detection │
└─────────────────┴─────────────────┘
```

---

## DETECTION CLASSES (YOLOv5 model from thesis)
| Class | Meaning |
|-------|---------|
| Helmet | ✅ Wearing hard hat |
| No-Helmet | ❌ Missing hard hat |
| Vest | ✅ Wearing safety vest |
| No-Vest | ❌ Missing vest |
| Worker | Person detected |
| Partially Safe | Some PPE missing |
| Full Safety | All PPE compliant |
| No Safety | No PPE at all |

---

## MODEL INFO (from thesis)
- YOLOv5s | 50 epochs | batch 16 | img 320
- Dataset: 1,065 images (Roboflow public workers)  
- mAP@0.5: 0.555 | Precision: 1.00 | Recall: 0.73
- Original GUI: Tkinter (Python) → rebuilt as CCTV web dashboard
