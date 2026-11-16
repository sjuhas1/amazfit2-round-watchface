// Generates all watch face images (dial, hands, digits, icons) from SVG.
// Usage: node tools/gen-assets.js
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'assets', '466x466-active-2')
const W = 466
const C = W / 2

// ---- Design tokens ---------------------------------------------------------
const COL = {
  bg: '#000000',
  hand: '#A6FF00', // bright lime hour/minute hands
  second: '#FF2B2B', // red second hand
  battery: '#2E8BFF', // blue battery arc (live arc colour is set in index.js)
  batteryTrack: '#0D2340',
  steps: '#3DDC84', // green step-goal ring (live colour is set in index.js)
  stepsTrack: '#0E2E1C',
  numeral: '#F2F2F2',
  text: '#FFFFFF',
  dim: '#9A9A9A',
  heart: '#FF4D5E',
  sun: '#FFC800',
  cloud: '#C9CED6',
  rain: '#4AA3FF',
  snow: '#FFFFFF',
  dust: '#C8A060',
}
const FONT = 'Lato'

// ---- Geometry (shared with watchface/layout.js) ---------------------------
const L = require(path.join(ROOT, 'watchface', 'layout.js'))

// ---- Helpers ---------------------------------------------------------------
const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`

async function save(rel, w, h, body, viewBox = null) {
  const file = path.join(OUT, rel)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  let s = svg(w, h, body)
  if (viewBox) s = s.replace(`viewBox="0 0 ${w} ${h}"`, `viewBox="0 0 ${viewBox} ${viewBox}"`)
  await sharp(Buffer.from(s)).png().toFile(file)
  return file
}

const polar = (r, deg) => {
  // deg: 0 = 12 o'clock, clockwise
  const a = ((deg - 90) * Math.PI) / 180
  return [C + r * Math.cos(a), C + r * Math.sin(a)]
}

const text = (x, y, s, size, fill, weight = 700, extra = '') =>
  `<text x="${x}" y="${y}" font-family="${FONT}" font-weight="${weight}" font-size="${size}" fill="${fill}" text-anchor="middle" ${extra}>${s}</text>`

// ---- Icons -----------------------------------------------------------------
const heartPath = (cx, cy, s, fill) => {
  // heart roughly s wide, centred at cx,cy
  const k = s / 24
  return `<path transform="translate(${cx - 12 * k} ${cy - 11 * k}) scale(${k})" fill="${fill}" d="M12 21.4 10.6 20.1C5.4 15.4 2 12.3 2 8.5 2 5.4 4.4 3 7.5 3c1.7 0 3.4.8 4.5 2.1C13.1 3.8 14.8 3 16.5 3 19.6 3 22 5.4 22 8.5c0 3.8-3.4 6.9-8.6 11.6L12 21.4z"/>`
}

// Weather icon pieces, drawn in a 40x40 box.
const sun = (x, y, r) => {
  let rays = ''
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4
    rays += `<line x1="${x + Math.cos(a) * (r + 3)}" y1="${y + Math.sin(a) * (r + 3)}" x2="${x + Math.cos(a) * (r + 7)}" y2="${y + Math.sin(a) * (r + 7)}" stroke="${COL.sun}" stroke-width="2.5" stroke-linecap="round"/>`
  }
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${COL.sun}"/>${rays}`
}
const moon = (x, y, r) =>
  `<path fill="#E8E2C8" d="M${x + r * 0.35} ${y - r} A${r} ${r} 0 1 0 ${x + r} ${y + r * 0.35} A${r * 0.8} ${r * 0.8} 0 0 1 ${x + r * 0.35} ${y - r} Z"/>`
const cloud = (dy = 0, fill = COL.cloud) =>
  `<path fill="${fill}" stroke="#000" stroke-width="1.5" transform="translate(0 ${dy})" d="M10 28 h21 a6.5 6.5 0 0 0 0-13 a9 9 0 0 0-17-2 a7.5 7.5 0 0 0-4 15z"/>`
const drops = (n, color = COL.rain) => {
  const xs = n === 1 ? [20] : n === 2 ? [15, 25] : [12, 20, 28]
  return xs
    .map((x) => `<line x1="${x}" y1="31" x2="${x - 2.5}" y2="37" stroke="${color}" stroke-width="2.6" stroke-linecap="round"/>`)
    .join('')
}
const flakes = (n) => {
  const xs = n === 1 ? [20] : n === 2 ? [15, 25] : [12, 20, 28]
  return xs.map((x) => `<circle cx="${x}" cy="34" r="2.3" fill="${COL.snow}"/>`).join('')
}
const bolt = `<path fill="${COL.sun}" d="M21 26 l-5 8 h4 l-2 6 l7-9 h-4 l2-5z"/>`
const lines = (color, dashed) =>
  [14, 21, 28]
    .map(
      (y, i) =>
        `<line x1="${7 + (i % 2) * 3}" y1="${y}" x2="${33 - (i % 2) * 3}" y2="${y}" stroke="${color}" stroke-width="3" stroke-linecap="round" ${dashed ? 'stroke-dasharray="5 4"' : ''}/>`,
    )
    .join('')

// Index -> icon, per Zepp weather codes (docs/watchface/specification.md).
const WEATHER = [
  /* 0 cloudy (partly) */ sun(14, 13, 6) + cloud(4),
  /* 1 shower */ sun(14, 11, 5) + cloud(0) + drops(2),
  /* 2 snow shower */ sun(14, 11, 5) + cloud(0) + flakes(2),
  /* 3 sunny */ sun(20, 20, 8),
  /* 4 overcast */ cloud(2),
  /* 5 light rain */ cloud(0) + drops(1),
  /* 6 light snow */ cloud(0) + flakes(1),
  /* 7 moderate rain */ cloud(0) + drops(2),
  /* 8 moderate snow */ cloud(0) + flakes(2),
  /* 9 heavy snow */ cloud(0) + flakes(3),
  /* 10 heavy rain */ cloud(0) + drops(3),
  /* 11 sandstorm */ lines(COL.dust, false),
  /* 12 sleet */ null, // set below
  /* 13 fog */ lines(COL.cloud, false),
  /* 14 haze */ lines(COL.cloud, true),
  /* 15 thundershower */ cloud(0) + bolt,
  /* 16 snowstorm */ cloud(0) + flakes(3),
  /* 17 dust */ lines(COL.dust, true),
  /* 18 extraordinary rainstorm */ cloud(0, '#8C939E') + drops(3),
  /* 19 rain with hail */ cloud(0) + drops(2) + `<circle cx="20" cy="35" r="2.3" fill="${COL.snow}"/>`,
  /* 20 thundershower with hail */ cloud(0) + bolt + `<circle cx="12" cy="35" r="2.3" fill="${COL.snow}"/>`,
  /* 21 heavy rainstorm */ cloud(0, '#8C939E') + drops(3),
  /* 22 sand blowing */ lines(COL.dust, true),
  /* 23 strong sandstorm */ lines(COL.dust, false),
  /* 24 rainstorm */ cloud(0, '#A9AFB8') + drops(3),
  /* 25 unknown */ text(20, 31, '?', 30, COL.dim),
  /* 26 cloudy at night */ moon(14, 12, 7) + cloud(4),
  /* 27 shower at night */ moon(14, 10, 6) + cloud(0) + drops(2),
  /* 28 clear night */ moon(20, 20, 10),
]
// fix sleet entry (keep one drop + one flake)
WEATHER[12] = cloud(0) + `<line x1="15" y1="31" x2="12.5" y2="37" stroke="${COL.rain}" stroke-width="2.6" stroke-linecap="round"/><circle cx="26" cy="34" r="2.3" fill="${COL.snow}"/>`

// ---- Dial ------------------------------------------------------------------
// Hour numerals with a black outline, so they stay readable where they cross the rings.
function numerals(color) {
  let b = ''
  for (let h = 1; h <= 12; h++) {
    const [x, y] = polar(L.numerals.radius, h * 30)
    b += text(x, y + L.numerals.size * 0.36, h, L.numerals.size, color, 700,
      'stroke="#000" stroke-width="5" paint-order="stroke" stroke-linejoin="round"')
  }
  return b
}

function dial({ aod }) {
  let b = `<rect width="${W}" height="${W}" fill="${COL.bg}"/>`

  // full-circle tracks behind the live battery and step rings
  if (!aod) {
    b += `<circle cx="${C}" cy="${C}" r="${L.battery.radius}" fill="none" stroke="${COL.batteryTrack}" stroke-width="${L.battery.width}"/>`
    b += `<circle cx="${C}" cy="${C}" r="${L.stepRing.radius}" fill="none" stroke="${COL.stepsTrack}" stroke-width="${L.stepRing.width}"/>`
  }

  // in normal mode the numerals are a separate overlay (numerals.png) drawn above the rings
  if (aod) b += numerals('#7A7A7A')

  if (!aod) {
    // static complication icons
    b += heartPath(L.heart.cx, L.heart.iconY, L.heart.iconSize, COL.heart)
  }
  return b
}

// ---- Hands (drawn pointing to 12, rotation centre given in layout) ---------
// Hand: outline, solid from the tail up to L.hands.fill of its length, hollow beyond.
const HAND_STROKE = 3.5
function hollowHand({ w, cy, width, tail, tip, color }) {
  const x = w / 2
  const top = cy - tip + HAND_STROKE / 2
  const bottom = cy + tail - HAND_STROKE / 2
  const half = width / 2 - HAND_STROKE / 2
  const fillTop = cy - tip * L.hands.fill
  return (
    `<rect x="${x - width / 2}" y="${fillTop}" width="${width}" height="${cy + tail - fillTop}" rx="${width / 2}" fill="${color}"/>` +
    `<rect x="${x - half}" y="${top}" width="${2 * half}" height="${bottom - top}" rx="${half}" fill="none" stroke="${color}" stroke-width="${HAND_STROKE}"/>`
  )
}

async function hands(prefix, aod) {
  const H = L.hands
  const handColor = aod ? '#4D7A00' : COL.hand
  await save(`${prefix}hour.png`, H.hour.w, H.hour.h, hollowHand({ ...H.hour, cy: H.hour.posY, color: handColor }))
  await save(`${prefix}minute.png`, H.minute.w, H.minute.h, hollowHand({ ...H.minute, cy: H.minute.posY, color: handColor }))
  if (!aod) {
    const s = H.second
    const x = s.w / 2
    await save('second.png', s.w, s.h,
      `<line x1="${x}" y1="${s.posY - s.tip}" x2="${x}" y2="${s.posY + s.tail}" stroke="${COL.second}" stroke-width="3" stroke-linecap="round"/>` +
        `<circle cx="${x}" cy="${s.posY + s.tail - 6}" r="5.5" fill="${COL.second}"/>`)
    await save('cap.png', s.cap, s.cap,
      `<circle cx="${s.cap / 2}" cy="${s.cap / 2}" r="${s.cap / 2 - 1}" fill="${COL.second}"/><circle cx="${s.cap / 2}" cy="${s.cap / 2}" r="3" fill="#000"/>`)
  }
}

// ---- Digit fonts -----------------------------------------------------------
async function digits(dir, font, color) {
  const { w, h, baseline, size } = font
  for (let i = 0; i <= 9; i++) await save(`${dir}/${i}.png`, w, h, text(w / 2, baseline, i, size, color))
  await save(`${dir}/minus.png`, Math.round(w * 0.7), h, `<rect x="2" y="${baseline - size * 0.36}" width="${w * 0.7 - 4}" height="3.5" rx="1.5" fill="${color}"/>`)
  await save(`${dir}/invalid.png`, w * 2, h, text(w, baseline, '--', size, color))
  await save(`${dir}/degree.png`, Math.round(w * 0.6), h, `<circle cx="${w * 0.3}" cy="${baseline - size * 0.62}" r="3.6" fill="none" stroke="${color}" stroke-width="2.4"/>`)
}

const WEEK = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

async function main() {
  fs.rmSync(OUT, { recursive: true, force: true })
  fs.mkdirSync(OUT, { recursive: true })

  await save('bg.png', W, W, dial({ aod: false }))
  await save('aod/bg.png', W, W, dial({ aod: true }))
  await save('numerals.png', W, W, numerals(COL.numeral))
  await hands('', false)
  await hands('aod/', true)

  await digits('num', L.font, COL.text)
  await digits('date', L.dateFont, COL.text)
  const D = L.dateFont
  for (let i = 0; i < 7; i++)
    await save(`week/${i}.png`, L.date.weekW, D.h, text(L.date.weekW / 2, D.baseline, WEEK[i], D.size - 4, COL.dim))
  const ws = L.weather.iconSize
  for (let i = 0; i < WEATHER.length; i++) await save(`weather/${i}.png`, ws, ws, WEATHER[i], 40)

  // app icon + preview (10:10:30, sample data)
  await renderPreview()
  console.log('assets written to', path.relative(ROOT, OUT))
}

// ---- Preview: composite the real assets the way the watch would ----------
async function renderPreview() {
  const H = L.hands
  const P = (f) => path.join(OUT, f)
  const rot = async (file, deg, posX, posY) => {
    // place image so that its (posX,posY) lands on the dial centre, rotated by deg
    const clear = { r: 0, g: 0, b: 0, alpha: 0 }
    const canvas = await sharp({ create: { width: W, height: W, channels: 4, background: clear } })
      .composite([{ input: file, left: Math.round(C - posX), top: Math.round(C - posY) }])
      .png().toBuffer()
    const r = await sharp(canvas).rotate(deg, { background: clear }).png().toBuffer()
    const m = await sharp(r).metadata()
    const off = Math.round((m.width - W) / 2)
    const cropped = await sharp(r).extract({ left: off, top: off, width: W, height: W }).png().toBuffer()
    return { input: cropped, left: 0, top: 0 }
  }
  const textImg = async (str, cx, y, dir = 'num') => {
    const files = [...str].map((ch) => (ch === '-' ? `${dir}/minus.png` : ch === '°' ? `${dir}/degree.png` : `${dir}/${ch}.png`))
    const metas = await Promise.all(files.map((f) => sharp(P(f)).metadata()))
    const total = metas.reduce((s, m) => s + m.width, 0)
    let x = Math.round(cx - total / 2)
    return files.map((f, i) => { const o = { input: P(f), left: x, top: y }; x += metas[i].width; return o })
  }
  // arc from a to b degrees (0 = 12 o'clock, clockwise), same convention as ARC_PROGRESS on the watch
  const arcPath = (r, a, b, color, width) => {
    const [x1, y1] = polar(r, a), [x2, y2] = polar(r, b)
    return `<path d="M${x1} ${y1} A${r} ${r} 0 ${b - a > 180 ? 1 : 0} 1 ${x2} ${y2}" fill="none" stroke="${color}" stroke-width="${width}"/>`
  }
  // sample data: 72% battery, 15400 steps (thin lap full, fat lap at 3.4)
  const batt = 72, steps = 15400
  const lap = 12 * L.stepRing.stepsPerHour
  const deg = (v) => Math.min(359.9, Math.max(0, (v / lap) * 360))
  const R = L.stepRing
  const arcs = Buffer.from(svg(W, W,
    arcPath(L.battery.radius, 0, 3.6 * batt, COL.battery, L.battery.width) +
    arcPath(R.radius, 0, deg(steps), COL.steps, R.thin) +
    (steps > lap ? arcPath(R.radius, 0, deg(steps - lap), COL.steps, R.fat) : '')))
  const ws = L.weather.iconSize
  const layers = [
    { input: arcs, left: 0, top: 0 },
    { input: P('numerals.png'), left: 0, top: 0 },
    { input: P('weather/0.png'), left: L.weather.cx - ws / 2, top: L.weather.iconY - ws / 2 },
    ...(await textImg('12°', L.weather.cx, L.weather.textY)),
    ...(await textImg('72', L.heart.cx, L.heart.textY)),
    { input: P('week/6.png'), left: L.date.weekX, top: L.date.y },
    ...(await textImg('15', L.date.dayX + L.dateFont.w, L.date.y, 'date')),
    await rot(P('hour.png'), 10 * 30 + 10 * 0.5, H.hour.w / 2, H.hour.posY),
    await rot(P('minute.png'), 10 * 6 + 0.5 * 6, H.minute.w / 2, H.minute.posY),
    await rot(P('second.png'), 30 * 6, H.second.w / 2, H.second.posY),
    { input: P('cap.png'), left: C - H.second.cap / 2, top: C - H.second.cap / 2 },
  ]
  const round = Buffer.from(svg(W, W, `<circle cx="${C}" cy="${C}" r="${C}" fill="#fff"/>`))
  const face = await sharp(P('bg.png')).composite(layers).png().toBuffer()
  const masked = await sharp(face).composite([{ input: round, blend: 'dest-in' }]).png().toBuffer()
  await sharp(masked).toFile(path.join(ROOT, 'preview.png'))
  await sharp(masked).resize(L.previewSize, L.previewSize).toFile(P('preview.png'))
  await sharp(masked).resize(124, 124).toFile(P('icon.png'))
}

main().catch((e) => { console.error(e); process.exit(1) })
