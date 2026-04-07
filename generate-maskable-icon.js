/**
 * Generates icon-maskable.png : 512x512, dark blue background (#1a2744),
 * content scaled to 60% center safe zone (maskable spec).
 * Usage: node generate-maskable-icon.js
 */
import sharp from "sharp";
import { createCanvas } from "canvas";
import { writeFileSync } from "fs";

const SIZE = 512;
const SAFE_ZONE = 0.6; // content fits within 60% of the icon (maskable safe zone)
const CONTENT_SIZE = Math.round(SIZE * SAFE_ZONE); // 307px
const OFFSET = Math.round((SIZE - CONTENT_SIZE) / 2); // 102px margin

// Background: dark blue #1a2744
const BG_R = 0x1a, BG_G = 0x27, BG_B = 0x44;

// Build a 512x512 raw RGBA buffer with the background color
const bgBuffer = Buffer.alloc(SIZE * SIZE * 4);
for (let i = 0; i < SIZE * SIZE; i++) {
  bgBuffer[i * 4 + 0] = BG_R;
  bgBuffer[i * 4 + 1] = BG_G;
  bgBuffer[i * 4 + 2] = BG_B;
  bgBuffer[i * 4 + 3] = 255;
}

// Resize existing icon-512.png to CONTENT_SIZE, then composite centered on bg
sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: { r: BG_R, g: BG_G, b: BG_B, alpha: 1 } } })
  .composite([{
    input: await sharp("public/icons/icon-512.png")
      .resize(CONTENT_SIZE, CONTENT_SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer(),
    left: OFFSET,
    top: OFFSET,
  }])
  .png()
  .toFile("public/icons/icon-maskable.png")
  .then(() => console.log("✅ icon-maskable.png generated (512x512, safe zone 60%)"))
  .catch(err => console.error("❌", err));
