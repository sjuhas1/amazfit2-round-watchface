import L from './layout'

const NORMAL = hmUI.show_level.ONLY_NORMAL
const AOD = hmUI.show_level.ONAL_AOD
const BATTERY_COLOR = 0x2e8bff
const STEPS_COLOR = 0x3ddc84

const range = (n, fn) => Array.from({ length: n }, (_, i) => fn(i))
const DIGITS = range(10, (i) => `num/${i}.png`)
const DATE_DIGITS = range(10, (i) => `date/${i}.png`)
const WEEK = range(7, (i) => `week/${i}.png`) // Mon..Sun
const WEATHER = range(29, (i) => `weather/${i}.png`)

// TEXT_IMG bound to live data, horizontally centred on cx
function value(type, cx, y, extra = {}) {
  const w = 120
  return hmUI.createWidget(hmUI.widget.TEXT_IMG, {
    x: cx - w / 2,
    y,
    w,
    h: L.font.h,
    font_array: DIGITS,
    h_space: 0,
    align_h: hmUI.align.CENTER_H,
    invalid_image: 'num/invalid.png',
    type,
    show_level: NORMAL,
    ...extra,
  })
}

// Tap area that opens the matching system app
function tap(type, cx, cy, size = 90) {
  hmUI.createWidget(hmUI.widget.IMG_CLICK, {
    x: cx - size / 2,
    y: cy - size / 2,
    w: size,
    h: size,
    src: '',
    type,
    show_level: NORMAL,
  })
}

function hands(prefix, withSeconds, show_level) {
  const H = L.hands
  const cfg = {
    hour_centerX: L.C,
    hour_centerY: L.C,
    hour_posX: H.hour.w / 2,
    hour_posY: H.hour.posY,
    hour_path: `${prefix}hour.png`,
    minute_centerX: L.C,
    minute_centerY: L.C,
    minute_posX: H.minute.w / 2,
    minute_posY: H.minute.posY,
    minute_path: `${prefix}minute.png`,
    show_level,
  }
  if (withSeconds) {
    Object.assign(cfg, {
      second_centerX: L.C,
      second_centerY: L.C,
      second_posX: H.second.w / 2,
      second_posY: H.second.posY,
      second_path: 'second.png',
      second_cover_path: 'cap.png',
      second_cover_x: L.C - H.second.cap / 2,
      second_cover_y: L.C - H.second.cap / 2,
    })
  }
  hmUI.createWidget(hmUI.widget.TIME_POINTER, cfg)
}

WatchFace({
  build() {
    // backgrounds first, so everything else draws on top of them
    hmUI.createWidget(hmUI.widget.IMG, { x: 0, y: 0, src: 'bg.png', show_level: NORMAL })
    hmUI.createWidget(hmUI.widget.IMG, { x: 0, y: 0, src: 'aod/bg.png', show_level: AOD })

    // Rings: full-circle ARC_PROGRESS widgets (0 = 12 o'clock, clockwise) whose angles never
    // change; only the fill level is updated via prop.LEVEL. Updating with a partial prop.MORE
    // made the rings vanish on the watch.
    const ring = (r, color, width = r.width) =>
      hmUI.createWidget(hmUI.widget.ARC_PROGRESS, {
        center_x: L.C,
        center_y: L.C,
        radius: r.radius,
        start_angle: 0,
        end_angle: 360,
        line_width: width,
        color,
        level: 0,
        show_level: NORMAL,
      })
    const pct = (v) => Math.max(0, Math.min(100, v || 0))

    // battery: outer ring, full at 100%, drains back counter-clockwise toward 12
    const batteryArc = ring(L.battery, BATTERY_COLOR)
    const battery = hmSensor.createSensor(hmSensor.id.BATTERY)
    const updateBattery = () => batteryArc.setProperty(hmUI.prop.LEVEL, pct(battery.current))

    // steps: inner ring, clockwise from 12; each hour number = 1000 steps.
    // Lap 1 (0-12000) fills a thin line, lap 2 (12000-24000) a fat band drawn over it.
    const thinArc = ring(L.stepRing, STEPS_COLOR, L.stepRing.thin)
    const fatArc = ring(L.stepRing, STEPS_COLOR, L.stepRing.fat)
    const step = hmSensor.createSensor(hmSensor.id.STEP)
    const lap = 12 * L.stepRing.stepsPerHour
    const updateSteps = () => {
      const s = step.current || 0
      thinArc.setProperty(hmUI.prop.LEVEL, pct((s / lap) * 100))
      fatArc.setProperty(hmUI.prop.LEVEL, pct(((s - lap) / lap) * 100))
    }

    updateBattery()
    updateSteps()

    // listen only while the face is on screen; re-read everything when it comes back
    hmUI.createWidget(hmUI.widget.WIDGET_DELEGATE, {
      resume_call: () => {
        battery.addEventListener(hmSensor.event.CHANGE, updateBattery)
        step.addEventListener(hmSensor.event.CHANGE, updateSteps)
        updateBattery()
        updateSteps()
      },
      pause_call: () => {
        battery.removeEventListener(hmSensor.event.CHANGE, updateBattery)
        step.removeEventListener(hmSensor.event.CHANGE, updateSteps)
      },
    })

    // hour numerals on top of the rings
    hmUI.createWidget(hmUI.widget.IMG, { x: 0, y: 0, src: 'numerals.png', show_level: NORMAL })

    // date: weekday + day of month
    hmUI.createWidget(hmUI.widget.IMG_WEEK, {
      x: L.date.weekX,
      y: L.date.y,
      week_en: WEEK,
      week_sc: WEEK,
      week_tc: WEEK,
      show_level: NORMAL | AOD,
    })
    hmUI.createWidget(hmUI.widget.IMG_DATE, {
      day_startX: L.date.dayX,
      day_startY: L.date.y,
      day_align: hmUI.align.LEFT,
      day_space: 0,
      day_zero: 1,
      day_follow: 0,
      day_en_array: DATE_DIGITS,
      day_sc_array: DATE_DIGITS,
      day_tc_array: DATE_DIGITS,
      day_is_character: false,
      show_level: NORMAL | AOD,
    })

    // weather: icon + current temperature
    hmUI.createWidget(hmUI.widget.IMG_LEVEL, {
      x: L.weather.cx - L.weather.iconSize / 2,
      y: L.weather.iconY - L.weather.iconSize / 2,
      image_array: WEATHER,
      image_length: WEATHER.length,
      type: hmUI.data_type.WEATHER_CURRENT,
      show_level: NORMAL,
    })
    value(hmUI.data_type.WEATHER_CURRENT, L.weather.cx, L.weather.textY, {
      negative_image: 'num/minus.png',
      unit_en: 'num/degree.png',
      unit_sc: 'num/degree.png',
      unit_tc: 'num/degree.png',
      imperial_unit_en: 'num/degree.png',
      imperial_unit_sc: 'num/degree.png',
      imperial_unit_tc: 'num/degree.png',
    })

    // heart rate (icon is part of bg.png)
    value(hmUI.data_type.HEART, L.heart.cx, L.heart.textY)

    tap(hmUI.data_type.WEATHER_CURRENT, L.weather.cx, L.weather.iconY + 15)
    tap(hmUI.data_type.HEART, L.heart.cx, L.heart.iconY + 15)

    hands('', true, NORMAL)

    // always-on display: dim hands, no seconds
    hands('aod/', false, AOD)
  },
})
