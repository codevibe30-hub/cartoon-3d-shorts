// Measure subtitle text widths in the SAME Chromium as the render itself:
// canvas measureText with '800 <FONT_PX>px "Nunito"' + letterSpacing, driven through
// @remotion/renderer's openBrowser on the bundled chrome-headless-shell. Nunito is the
// project's variable font (public/fonts/Nunito.ttf, wght 100-900); it is loaded into the
// measurement page through a FontFace with weight range "100 900" — exactly how Episode.tsx
// registers it for the render — and the 800 (ExtraBold) instance is measured.
//
// Usage:
//   node scripts/measure_widths.mjs words   -> scripts/text_widths.json (unique words of voice/lines.txt)
//   node scripts/measure_widths.mjs verify  -> measures every chunk in src/videos/example/captions.ts
//                                              exactly as one string; exit 1 if any exceeds LIMIT.
import fs from "node:fs";
import path from "node:path";
process.env.REMOTION_TMP = path.resolve("out/.tmp");
fs.mkdirSync(process.env.REMOTION_TMP, { recursive: true });
process.env.TEMP = process.env.TMP = process.env.TMPDIR = process.env.REMOTION_TMP;
import { openBrowser } from "@remotion/renderer";

const FONT_PX = 99;
const FONT_WEIGHT = 500;
const LETTER_SPACING = 0.5; // px, matches letterSpacing in Episode.tsx TextOverlay
const LIMIT = 1000; // px measured width; overlay div caps at 96% of 1080 = 1036.8, stroke+shadow need the rest

const browserExecutable = path.resolve("node_modules/.remotion/chrome-headless-shell/linux64/chrome-headless-shell-linux64/chrome-headless-shell");
const chromiumOptions = { gl: process.env.REMOTION_GL || "swangle" };
const mode = process.argv[2] || "words";

let texts = [];
if (mode === "words") {
  const lines = fs.readFileSync("voice/lines.txt", "utf8").split("\n").map((s) => s.trim()).filter(Boolean);
  const set = new Set();
  for (const l of lines) for (const w of l.split(/\s+/)) set.add(w);
  set.add(" ");
  texts = [...set];
} else if (mode === "verify") {
  const src = fs.readFileSync("src/videos/example/captions.ts", "utf8");
  texts = [...src.matchAll(/"text":\s*"((?:[^"\\]|\\.)*)"/g)].map((m) => JSON.parse(`"${m[1]}"`));
} else {
  console.error("unknown mode:", mode);
  process.exit(2);
}

const fontB64 = fs.readFileSync(path.resolve("public/fonts/Nunito.ttf")).toString("base64");

const browser = await openBrowser("chrome", { browserExecutable, chromiumOptions });
try {
  const page = await browser.newPage({ context: () => null, logLevel: "error", indent: false, pageIndex: 0, onBrowserLog: null, onLog: () => {} });
  const result = await page.evaluate(
    async (arg) => {
      const buf = Uint8Array.from(atob(arg.fontB64), (c) => c.charCodeAt(0)).buffer;
      const face = new FontFace("Nunito", buf, { weight: "200 1000" });
      document.fonts.add(face);
      await face.load();
      await document.fonts.load(`${arg.weight} ${arg.fontPx}px "Nunito"`, "Ag");
      const c = document.createElement("canvas").getContext("2d");
      c.font = `${arg.weight} ${arg.fontPx}px "Nunito", sans-serif`;
      let lsApplied = false;
      try {
        c.letterSpacing = `${arg.ls}px`;
        lsApplied = c.letterSpacing === `${arg.ls}px`;
      } catch (e) { /* older engine: widths would miss letterSpacing */ }
      const widths = {};
      for (const t of arg.texts) widths[t] = c.measureText(t).width;
      return { widths, lsApplied, nunitoLoaded: document.fonts.check(`${arg.weight} ${arg.fontPx}px "Nunito"`) };
    },
    { texts, fontPx: FONT_PX, weight: FONT_WEIGHT, ls: LETTER_SPACING, fontB64 },
  );

  if (mode === "words") {
    const out = { font: "Nunito", weight: FONT_WEIGHT, fontPx: FONT_PX, letterSpacing: LETTER_SPACING, lsApplied: result.lsApplied, nunitoLoaded: result.nunitoLoaded, widths: result.widths };
    fs.writeFileSync("scripts/text_widths.json", JSON.stringify(out, null, 1) + "\n");
    const sorted = Object.entries(result.widths).sort((a, b) => b[1] - a[1]);
    console.log(`measured ${texts.length} unique strings; Nunito loaded: ${result.nunitoLoaded}; letterSpacing applied in canvas: ${result.lsApplied}`);
    console.log("widest words:", sorted.slice(0, 8).map(([w, v]) => `${JSON.stringify(w)}=${v.toFixed(1)}px`).join("  "));
    const bb = result.widths["bareng-bareng,"];
    if (bb !== undefined) console.log(`"bareng-bareng," = ${bb.toFixed(1)}px at Nunito ${FONT_WEIGHT} ${FONT_PX}px (frame 1080px, verify limit ${LIMIT}px)`);
  } else {
    let max = null, bad = 0;
    for (const t of texts) {
      const w = result.widths[t];
      if (!max || w > max.w) max = { t, w };
      if (w > LIMIT) { bad++; console.log(`OVER LIMIT ${w.toFixed(1)}px > ${LIMIT}px: ${JSON.stringify(t)}`); }
    }
    console.log(`verify: ${texts.length} chunks, widest = ${max.w.toFixed(1)}px ${JSON.stringify(max.t)}, over-limit: ${bad}`);
    if (bad) process.exit(1);
  }
} finally {
  await browser.close({ silent: true });
}
