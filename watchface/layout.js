// Shared geometry for the 466x466 Active 2 dial.
// Used by watchface/index.js on the watch and by tools/gen-assets.cjs on the PC.
const C = 233

const font = { size: 36, w: 23, h: 38, baseline: 32 } // digit cell for heart rate / weather
const dateFont = { size: 44, w: 27, h: 46, baseline: 39 } // digit cell for the date
const weekW = 92
const dateGap = 8
const dateWidth = weekW + dateGap + 2 * dateFont.w
const weekX = C - Math.round(dateWidth / 2)

// Date, heart rate and weather sit evenly around the centre, 120 degrees apart
// (12, 4 and 8 o'clock), each block centred on a circle of this radius.
const SLOT_R = 115
const slot = (deg) => {
  const a = ((deg - 90) * Math.PI) / 180
  return { x: Math.round(C + SLOT_R * Math.cos(a)), y: Math.round(C + SLOT_R * Math.sin(a)) }
}
const top = slot(0), right = slot(120), left = slot(240)
// icon + value blocks: icon above, value below, block centred on the slot point
const block = (p) => ({ cx: p.x, iconY: p.y - 22, textY: p.y + 6 })

module.exports = {
  C,
  font,
  dateFont,
  numerals: { radius: 203, size: 52 }, // overlay image drawn above the rings
  // Rings. ARC_PROGRESS on the watch measures angles from 12 o'clock, clockwise.
  battery: { radius: 228, width: 3 }, // outer ring: full at 100%, drains back toward 12
  // inner ring: 1000 steps per hour number, two laps (24000 steps):
  // lap 1 (0-12k) fills a thin line, lap 2 (12k-24k) fills a fat band on top of it
  stepRing: { radius: 214, thin: 3, fat: 9, width: 9, stepsPerHour: 1000, laps: 2 },
  date: { y: top.y - Math.round(dateFont.h / 2), weekW, weekX, dayX: weekX + weekW + dateGap },
  weather: { ...block(left), iconSize: 52 },
  heart: { ...block(right), iconSize: 34 },
  hands: {
    fill: 0.5, // inner 50% of each hand is solid, the rest is an outline
    hour: { w: 30, h: 150, posY: 125, tip: 112, tail: 22, width: 18 },
    minute: { w: 26, h: 216, posY: 192, tip: 182, tail: 22, width: 14 },
    second: { w: 16, h: 250, posY: 205, tip: 200, tail: 40, cap: 22 },
  },
  previewSize: 314,
}
