import { atom, read, update } from 'claude-code'
import type { Register, SessionContextUsage, SessionRateLimit, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'

// ---------------------------------------------------------------------------
// State: two whole-number percentages the backdrop reads. Writing either one
// redraws the scene.
// ---------------------------------------------------------------------------
const snowAtom = atom({ plugin: 'snow-and-ember', key: 'snow' } as const, 0, { shape: 'pct-1' })
const fireAtom = atom({ plugin: 'snow-and-ember', key: 'fire' } as const, 100, { shape: 'pct-1' })
const weekAtom = atom({ plugin: 'snow-and-ember', key: 'week' } as const, -1, { shape: 'pct-1' })

const SCENE = 'snow-and-ember'

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

/** Context window fill, 0 to 100. */
const snowFrom = (context: SessionContextUsage) => clamp(context.percent ?? 0)

/** Plan usage LEFT in the 5-hour window (or any non-weekly window); -1 if none. */
const fireFrom = (limits: readonly SessionRateLimit[]) => {
  const win = limits.find(l => l.kind === 'five_hour') ?? limits.find(l => l.kind !== 'seven_day')
  return win === undefined ? -1 : clamp(100 - win.percentUsed)
}

/** Weekly plan usage USED (drives the eclipse); -1 if not reported. */
const weekFrom = (limits: readonly SessionRateLimit[]) => {
  const win = limits.find(l => l.kind === 'seven_day')
  return win === undefined ? -1 : clamp(win.percentUsed)
}

// ---------------------------------------------------------------------------
// Colours: a cold winter night, firelight accents.
// ---------------------------------------------------------------------------
const { theme, problems } = makeColors({
  label: 'Snow and Ember',
  only: 'dark',
  roles: { accent: '#7fb2e5', danger: '#e2634a', success: '#7cc29a', warning: '#f0a03c', pro: '#b49ae6' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#0e1522',
        'surface-1': '#141c2b',
        'surface-2': '#192233',
        'surface-3': '#1e283a',
        'text-primary': '#eef3fa',
        'text-secondary': '#c6d1e0',
        'text-muted': '#9aa8bc',
      },
    },
  },
})

const LOOK: ThemeSetArgs = {
  colors: theme,
  backdrop: { scene: SCENE, glass: { blur: 14, tint: '#0e1522', opacity: 0.55 } },
}

// ---------------------------------------------------------------------------
// The scene. Pure SVG + CSS, regenerated whenever a percentage changes.
// ---------------------------------------------------------------------------

/** Deterministic pseudo-random so the flakes don't jump around on each redraw. */
const rand = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}
const f1 = (n: number) => n.toFixed(1)

// Left panel geometry (800 x 900, pinned bottom-left): Taranaki seen from
// New Plymouth, the ring plain and coast at its foot, the sea in front.
const PEAK_X = 400
const PEAK_Y = 235
const BASE_Y = 760 // where the cone meets the ring plain
const SHORE_Y = 802 // where the sea starts

/** The bare cone at x: rounded summit, long concave flanks, Fanthams Peak on the left. */
const rockY = (x: number) => {
  const d = Math.abs(x - PEAK_X) / 560
  const ds = Math.min(1, Math.max(0, Math.sqrt(d * d + 0.0006) - 0.0245))
  const cone = PEAK_Y + (BASE_Y - PEAK_Y) * Math.pow(ds, 0.7)
  const fanthams = 38 * Math.exp(-Math.pow((x - 262) / 30, 2))
  return Math.min(BASE_Y, cone - fanthams)
}

/** Snowpack thickness in scene units: none until half full, absurd by 100%. */
const thickness = (p: number) => (p > 0.5 ? Math.pow((p - 0.5) / 0.5, 1.4) * 115 : 0)

/** Top of the snow at x (the rock itself while the pack is thin). */
const snowTopY = (x: number, T: number) => {
  const d = Math.abs(x - PEAK_X) / 560
  const lump = 0.8 + 0.2 * Math.sin(x / 31 + 1.3)
  const dome = T > 0 ? 34 * (T / 115) * Math.exp(-Math.pow((x - PEAK_X) / 60, 2)) : 0
  return rockY(x) - T * lump * (1 - 0.35 * Math.min(1, d)) - dome
}

/** Ridges and gullies radiating from the summit to the foot of the cone. */
const ridgePaths = () =>
  [-330, -240, -175, -105, -55, -18, 30, 85, 150, 215, 300]
    .map((dx, i) => {
      const bx = PEAK_X + dx * 1.6 + (rand(i + 1500) - 0.5) * 50
      const cx = PEAK_X + dx * (0.26 + rand(i + 1600) * 0.14)
      return `M${f1(PEAK_X + dx * 0.02)},${PEAK_Y + 12} Q${f1(cx)},${f1(PEAK_Y + 230)} ${f1(bx)},${BASE_Y}`
    })
    .join(' ')

function snowSide(snowPct: number): string {
  const p = snowPct / 100
  const T = thickness(p)
  const snowLine = PEAK_Y + 55 + p * (BASE_Y - PEAK_Y - 65)

  const xs: number[] = []
  for (let x = -160; x <= 960; x += 16) xs.push(x)
  const mountain = `M-160,${BASE_Y + 4} ${xs.map(x => `L${x},${f1(rockY(x))}`).join(' ')} L960,${BASE_Y + 4} Z`
  const snowShape = `M-160,${BASE_Y + 4} ${xs.map(x => `L${x},${f1(snowTopY(x, T))}`).join(' ')} L960,${BASE_Y + 4} Z`
  // Everything above a jagged snow line, with gullies of snow reaching further down.
  const snowClip = `M-200,-300 L1000,-300 L1000,${f1(snowLine)} ${xs
    .slice()
    .reverse()
    .map((x, i) => `L${x},${f1(snowLine + (i % 3 === 1 ? 30 + rand(i + 40) * 55 : rand(i + 60) * 18))}`)
    .join(' ')} Z`
  // The bush ring of the national park: a clean edge partway down the cone.
  const bushTop = `M-200,${BASE_Y + 10} L-200,650 ${xs.map((x, i) => `L${x},${f1(648 + rand(i + 150) * 8)}`).join(' ')} L1000,650 L1000,${BASE_Y + 10} Z`

  const ridges = ridgePaths()

  const cornices =
    T > 8
      ? [-28, 0, 28]
          .map(
            (dx, i) =>
              `<circle cx="${PEAK_X + dx}" cy="${f1(snowTopY(PEAK_X + dx, T) + T * 0.35)}" r="${f1(T * (0.35 + 0.12 * rand(i + 70)))}" fill="#f6faff"/>`,
          )
          .join('')
      : ''

  // Falling flakes land on the snow, or drop into the sea past the mountain.
  const count = 40 + Math.round(snowPct * 0.8)
  const flakes: string[] = []
  const rules: string[] = []
  for (let i = 0; i < count; i++) {
    const x = rand(i) * 800
    const surface = snowTopY(x, T)
    const land = surface < BASE_Y - 2 ? surface - 4 : SHORE_Y + 20
    const r = 1.5 + rand(i + 100) * 3
    const dur = 9 + rand(i + 200) * 10
    const delay = -rand(i + 300) * dur
    const drift = (rand(i + 400) - 0.5) * 50
    const restY = rand(i + 500) * (land - 20)
    flakes.push(`<circle class="fl k${i}" cx="${f1(x)}" cy="${f1(restY)}" r="${f1(r)}"/>`)
    rules.push(
      `.k${i}{animation:fall${i} ${f1(dur)}s linear ${f1(delay)}s infinite}` +
        `@keyframes fall${i}{from{transform:translate(0px,${f1(-restY - 20)}px)}to{transform:translate(${f1(drift)}px,${f1(land - restY)}px)}}`,
    )
  }

  // New Plymouth's lights along the coast, Paritutu and the Sugar Loaf Islands.
  const lights = Array.from({ length: 26 }, (_, i) => {
    const x = 330 + rand(i + 1200) * 300
    const y = 786 + rand(i + 1300) * 12
    return `<circle class="${i % 4 === 0 ? 'lt tw2' : 'lt'}" cx="${f1(x)}" cy="${f1(y)}" r="${f1(1.2 + rand(i + 1400) * 1.3)}"/>`
  }).join('')
  const coast =
    `<path d="M-200,${SHORE_Y} L-200,${BASE_Y} Q200,${BASE_Y + 6} 600,${BASE_Y + 22} L640,${SHORE_Y} Z" fill="#162419"/>` +
    `<path d="M600,${SHORE_Y + 2} Q628,790 646,738 Q660,700 680,702 Q700,706 714,760 Q726,796 760,${SHORE_Y + 2} Z" fill="#101a26"/>` +
    `<path d="M736,${SHORE_Y + 3} Q748,778 762,780 Q774,784 782,${SHORE_Y + 3} Z" fill="#101a26"/>` +
    `<path d="M786,${SHORE_Y + 3} Q794,788 804,789 Q812,792 818,${SHORE_Y + 3} Z" fill="#101a26"/>` +
    lights

  const waveRun = Array.from({ length: 34 }, () => 't80,0').join(' ')
  const waves = [0, 1, 2, 3]
    .map(i => {
      const y = SHORE_Y + 14 + i * 22
      return `<path class="wv w${i}" d="M-300,${y} q40,-5 80,0 ${waveRun}" fill="none" stroke="#7d97bb" stroke-width="1.5" opacity="${f1(0.28 - i * 0.05)}"/>`
    })
    .join('')

  const cabbage = (x: number, base: number, s: number) =>
    `<g transform="translate(${x},${base}) scale(${s})" stroke="#0c1511" stroke-linecap="round" fill="none">` +
    `<path d="M0,0 L0,-90 M0,-90 L-22,-140 M0,-90 L20,-135 M0,-90 L2,-150" stroke-width="7"/>` +
    [
      [-22, -140],
      [20, -135],
      [2, -150],
    ]
      .map(([tx, ty]) =>
        [-70, -45, -20, 0, 20, 45, 70, 100, -100, 140, -140]
          .map(a => {
            const rad = ((a - 90) * Math.PI) / 180
            return `M${tx},${ty} L${f1(tx + Math.cos(rad) * 30)},${f1(ty + Math.sin(rad) * 30)}`
          })
          .join(' '),
      )
      .map(d => `<path d="${d}" stroke-width="3"/>`)
      .join('') +
    `</g>`

  const top = snowTopY(PEAK_X, T)
  const labels =
    `<text class="lbl" x="${PEAK_X}" y="${f1(top - 62)}">CONTEXT WINDOW</text>` +
    `<text class="sub" x="${PEAK_X}" y="${f1(top - 36)}">${snowPct}% full</text>` +
    `<text class="place" x="${PEAK_X - 40}" y="${BASE_Y - 14}">MT TARANAKI</text>` +
    `<text class="town" x="500" y="${SHORE_Y + 50}">Ngāmotu · New Plymouth</text>`

  return (
    `<svg x="0" y="0" width="50%" height="100%" viewBox="0 0 800 900" preserveAspectRatio="xMinYMax meet" overflow="visible">` +
    `<defs>` +
    `<linearGradient id="mtn" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#46587a"/><stop offset=".55" stop-color="#34445f"/><stop offset="1" stop-color="#1f2a3e"/></linearGradient>` +
    `<linearGradient id="haze" x1="0" y1="0" x2="0" y2="1"><stop offset=".6" stop-color="#1b2740" stop-opacity="0"/><stop offset="1" stop-color="#1b2740" stop-opacity=".55"/></linearGradient>` +
    `<linearGradient id="snowshade" x1="0" y1="0" x2="1" y2="0"><stop offset=".45" stop-color="#8fa4c2" stop-opacity="0"/><stop offset="1" stop-color="#8fa4c2" stop-opacity=".55"/></linearGradient>` +
    `<linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14243d"/><stop offset="1" stop-color="#070e1b"/></linearGradient>` +
    `<clipPath id="snowclip"><path d="${snowClip}"/></clipPath>` +
    `<clipPath id="mtnclip"><path d="${mountain}"/></clipPath>` +
    `</defs>` +
    `<style>.fl{fill:#f4f8ff;opacity:.85}${rules.join('')}` +
    `.lt{fill:#ffd58a;opacity:.8}.tw2{animation:tw2 5s ease-in-out infinite}@keyframes tw2{0%,100%{opacity:.85}50%{opacity:.45}}` +
    `.wv{animation:wave 9s ease-in-out infinite alternate}.w1{animation-delay:-3s}.w2{animation-delay:-5s}.w3{animation-delay:-7s}` +
    `@keyframes wave{from{transform:translate(0px,0px)}to{transform:translate(40px,0px)}}</style>` +
    southernCross() +
    // the sea runs on under the right-hand side too
    `<rect x="-400" y="${SHORE_Y}" width="2800" height="400" fill="url(#sea)"/>` +
    waves +
    `<path d="${mountain}" fill="url(#mtn)"/>` +
    `<g clip-path="url(#mtnclip)">` +
    `<path d="${ridges}" fill="none" stroke="#18223a" stroke-width="2" opacity=".22"/>` +
    `<path d="${bushTop}" fill="#13261d"/>` +
    `<rect x="-200" y="500" width="1200" height="300" fill="url(#haze)"/>` +
    `</g>` +
    `<g clip-path="url(#snowclip)">` +
    `<path d="${snowShape}" fill="url(#snowfill)" stroke="#f6faff" stroke-width="${f1(4 + T * 0.4)}" stroke-linejoin="round"/>` +
    cornices +
    (T < 30 ? `<path d="${ridges}" fill="none" stroke="#a9bad3" stroke-width="2" opacity=".28"/>` : '') +
    `<path d="${snowShape}" fill="url(#snowshade)"/>` +
    `</g>` +
    coast +
    cabbage(60, SHORE_Y - 2, 0.75) +
    cabbage(118, SHORE_Y - 4, 0.55) +
    flakes.join('') +
    labels +
    `</svg>`
  )
}

function fireSide(firePct: number): string {
  // Right panel is 800 x 900. Fire sits at (520, 790).
  const s = firePct < 0 ? 1 : firePct / 100 // no limits reported: keep a full fire
  const lit = s > 0.02
  const glowR = 110 + 330 * s
  const glowO = 0.08 + 0.5 * s
  const coal = 0.25 + 0.75 * s
  const smokeO = f1(0.12 + (1 - s) * 0.45)

  const flame = (cls: string, color: string, scale: number, dx: number) =>
    `<g transform="translate(${520 + dx},780) scale(${f1(scale)})"><path class="${cls}" fill="${color}" d="M0,0 C-48,-20 -52,-80 -18,-130 C-10,-150 -2,-170 0,-200 C8,-170 24,-150 32,-120 C56,-70 44,-20 0,0 Z"/></g>`

  const flames = lit
    ? flame('fa', '#ff5a1f', 0.55 + 0.75 * s, -26) +
      flame('fb', '#ff7a1a', 0.7 + 0.9 * s, 18) +
      flame('fc', '#ffb22e', 0.5 + 0.7 * s, -4) +
      flame('fd', '#fff0a6', 0.25 + 0.45 * s, 0)
    : ''

  const emberCount = Math.round(14 * s)
  const embers: string[] = []
  const emberRules: string[] = []
  for (let i = 0; i < emberCount; i++) {
    const x = 520 + (rand(i + 700) - 0.5) * 80
    const dur = 4 + rand(i + 800) * 4
    const delay = -rand(i + 900) * dur
    const dx = (rand(i + 1000) - 0.5) * 120
    embers.push(`<circle class="em e${i}" cx="${f1(x)}" cy="760" r="${f1(1.5 + rand(i + 1100) * 2)}"/>`)
    emberRules.push(
      `.e${i}{animation:rise${i} ${f1(dur)}s ease-out ${f1(delay)}s infinite}` +
        `@keyframes rise${i}{from{transform:translate(0px,0px);opacity:.9}to{transform:translate(${f1(dx)}px,-${f1(260 + 200 * s)}px);opacity:0}}`,
    )
  }

  const smoke = [0, 1, 2]
    .map(
      i =>
        `<circle class="sm s${i}" cx="${510 + i * 12}" cy="740" r="${30 + i * 8}" fill="url(#smokeg)"/>`,
    )
    .join('')

  return (
    `<svg x="50%" y="0" width="50%" height="100%" viewBox="0 0 800 900" preserveAspectRatio="xMaxYMax meet" overflow="visible">` +
    `<defs><radialGradient id="smokeg" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#9aa3b3" stop-opacity=".9"/><stop offset="1" stop-color="#9aa3b3" stop-opacity="0"/></radialGradient><radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffb347" stop-opacity="1"/><stop offset=".45" stop-color="#ff6a1f" stop-opacity=".35"/><stop offset="1" stop-color="#ff6a1f" stop-opacity="0"/></radialGradient></defs>` +
    `<style>` +
    `.fa,.fb,.fc,.fd{transform-box:fill-box;transform-origin:50% 100%}` +
    `.fa{animation:flk 2.2s ease-in-out infinite}` +
    `.fb{animation:flk 1.8s ease-in-out -.6s infinite}` +
    `.fc{animation:flk 1.5s ease-in-out -.3s infinite}` +
    `.fd{animation:flk 1.3s ease-in-out -.9s infinite}` +
    `@keyframes flk{0%,100%{transform:scale(1,1) skewX(0deg)}30%{transform:scale(.96,1.07) skewX(-3deg)}65%{transform:scale(1.03,.95) skewX(2deg)}}` +
    `.gl{transform-box:fill-box;transform-origin:50% 50%;animation:breathe 4s ease-in-out infinite}` +
    `@keyframes breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}` +
    `.em{fill:#ffc25a}` +
    emberRules.join('') +
    `.sm{opacity:0;transform-box:fill-box;transform-origin:50% 50%}` +
    `.s0{animation:smk 9s ease-out infinite}.s1{animation:smk 9s ease-out -3s infinite}.s2{animation:smk 9s ease-out -6s infinite}` +
    `@keyframes smk{from{transform:translate(0px,0px) scale(.6);opacity:${smokeO}}to{transform:translate(-40px,-380px) scale(2.4);opacity:0}}` +
    `</style>` +
    `<ellipse class="gl" cx="520" cy="760" rx="${f1(glowR)}" ry="${f1(glowR * 0.8)}" fill="url(#glow)" opacity="${f1(glowO)}"/>` +
    // ground snow around the fire, lit warm by it
    `<path d="M-40,900 L-40,872 Q140,836 320,824 Q560,812 860,806 L860,900 Z" fill="#2a2a31"/>` +
    `<path d="M-40,872 Q140,836 320,824 Q560,812 860,806" fill="none" stroke="#dfe7f2" stroke-width="5" opacity=".55"/>` +
    `<ellipse cx="520" cy="835" rx="${f1(120 + 160 * s)}" ry="28" fill="#ff9a4a" opacity="${f1(0.05 + 0.25 * s)}"/>` +
    // stone ring
    `<g fill="#4b5363"><ellipse cx="430" cy="812" rx="22" ry="13"/><ellipse cx="470" cy="822" rx="20" ry="12"/><ellipse cx="520" cy="826" rx="22" ry="12"/><ellipse cx="570" cy="822" rx="20" ry="12"/><ellipse cx="610" cy="812" rx="22" ry="13"/></g>` +
    smoke +
    flames +
    // logs
    `<g><rect x="440" y="772" width="170" height="26" rx="13" fill="#4a2e1c" transform="rotate(-14 525 785)"/>` +
    `<rect x="440" y="772" width="170" height="26" rx="13" fill="#5a3822" transform="rotate(14 525 785)"/></g>` +
    // glowing coals
    `<ellipse cx="520" cy="796" rx="58" ry="10" fill="#ff4d1a" opacity="${f1(coal)}"/>` +
    embers.join('') +
    `<text class="lbl" x="520" y="400">5-HOUR USAGE</text>` +
    `<text class="sub" x="520" y="426">${firePct < 0 ? 'no limit reported' : `${firePct}% left`}</text>` +
    `</svg>`
  )
}

function eclipse(weekPct: number): string {
  // Pinned to the top-right corner. The moon slides in from the left as the
  // week's usage is spent; at 100% it covers the sun and only the corona shows.
  const w = weekPct < 0 ? 0 : weekPct / 100
  const R = 58
  const cx = 630
  const cy = 140
  const moonX = cx - (1 - w) * (R * 2.3)
  const sunGlow = 0.1 + 0.35 * (1 - w)
  const corona = w > 0.8 ? (w - 0.8) / 0.2 : 0
  return (
    `<svg x="50%" y="0" width="50%" height="100%" viewBox="0 0 800 900" preserveAspectRatio="xMaxYMin meet" overflow="visible">` +
    `<defs>` +
    `<radialGradient id="sunglow" cx="50%" cy="50%" r="50%"><stop offset=".35" stop-color="#ffd27a" stop-opacity="1"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="corona" cx="50%" cy="50%" r="50%"><stop offset=".55" stop-color="#fff6e0" stop-opacity=".9"/><stop offset=".7" stop-color="#cfe2ff" stop-opacity=".35"/><stop offset="1" stop-color="#cfe2ff" stop-opacity="0"/></radialGradient>` +
    `<clipPath id="sunclip"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath>` +
    `</defs>` +
    `<style>.cor{transform-box:fill-box;transform-origin:50% 50%;animation:cor 7s ease-in-out infinite}@keyframes cor{0%,100%{transform:scale(1) rotate(0deg)}50%{transform:scale(1.04) rotate(6deg)}}</style>` +
    `<circle cx="${cx}" cy="${cy}" r="${R * 2.4}" fill="url(#sunglow)" opacity="${f1(sunGlow)}"/>` +
    `<circle class="cor" cx="${cx}" cy="${cy}" r="${R * 1.9}" fill="url(#corona)" opacity="${f1(corona)}"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#ffd36b"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${R * 0.8}" fill="#ffe7a3" opacity=".6"/>` +
    `<g clip-path="url(#sunclip)"><circle cx="${f1(moonX)}" cy="${cy}" r="${R + 1}" fill="#0b1120"/></g>` +
    `<circle cx="${f1(moonX)}" cy="${cy}" r="${R + 1}" fill="none" stroke="#9fb3d1" stroke-opacity="${f1(0.15 + 0.25 * w)}" stroke-width="1.2"/>` +
    `<text class="lbl" x="${cx}" y="${cy + R + 40}">WEEKLY USAGE</text>` +
    `<text class="sub" x="${cx}" y="${cy + R + 66}">${weekPct < 0 ? 'no limit reported' : `${weekPct}% used`}</text>` +
    `</svg>`
  )
}

/** Te Punga, the Southern Cross: four five-pointed stars as on the flag, plus a faint fifth. */
function southernCross(): string {
  const star = (x: number, y: number, r: number) => {
    const pts: string[] = []
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI / 5) * i - Math.PI / 2
      const rr = i % 2 === 0 ? r : r * 0.42
      pts.push(`${f1(x + Math.cos(a) * rr)},${f1(y + Math.sin(a) * rr)}`)
    }
    return `<polygon class="sx" points="${pts.join(' ')}"/>`
  }
  return (
    `<g opacity=".85">` +
    star(110, 70, 9) + // Gacrux, top
    star(70, 128, 8) + // Mimosa, left
    star(158, 118, 7) + // Delta, right
    star(118, 196, 10) + // Acrux, bottom
    `<circle cx="134" cy="150" r="2" fill="#f4f7ff" opacity=".6"/>` +
    `</g>`
  )
}

function buildScene(snowPct: number, firePct: number, weekPct: number): string {
  // Night gets a touch warmer while the fire is strong.
  const warm = firePct < 0 ? 1 : firePct / 100
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">` +
    `<defs>` +
    `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070b14"/><stop offset=".7" stop-color="#16223a"/><stop offset="1" stop-color="#25324d"/></linearGradient>` +
    `<linearGradient id="warmth" x1="1" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff7a2a" stop-opacity="${f1(0.22 * warm)}"/><stop offset=".6" stop-color="#ff7a2a" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="snowfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7fbff"/><stop offset="1" stop-color="#c9d6e8"/></linearGradient>` +
    `</defs>` +
    `<style>.st{fill:#ffffff}.tw{animation:tw 6s ease-in-out infinite}@keyframes tw{0%,100%{opacity:.8}50%{opacity:.35}}` +
    `.lbl,.sub{font-family:sans-serif;text-anchor:middle;stroke:#0b1120;stroke-width:4px;stroke-linejoin:round;paint-order:stroke}` +
    `.lbl{font-size:19px;font-weight:700;letter-spacing:3px;fill:#eef4fc;opacity:.9}` +
    `.sub{font-size:16px;fill:#c9d6e8;opacity:.85}` +
    `.place,.town{font-family:sans-serif;text-anchor:middle;stroke:#0b1120;stroke-width:3px;stroke-linejoin:round;paint-order:stroke}` +
    `.place{font-size:15px;font-weight:700;letter-spacing:4px;fill:#dfe8f5;opacity:.75}` +
    `.town{font-size:13px;font-style:italic;letter-spacing:1px;fill:#ffe2ad;opacity:.7}` +
    `.sx{fill:#f4f7ff}</style>` +
    `<rect width="100%" height="100%" fill="url(#sky)"/>` +
    `<svg width="100%" height="100%" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">` +
    Array.from({ length: 60 }, (_, i) => {
      const x = rand(i + 2000) * 1600
      const y = rand(i + 2100) * 520
      return `<circle class="st${i % 3 === 0 ? ' tw' : ''}" cx="${f1(x)}" cy="${f1(y)}" r="${f1(0.6 + rand(i + 2200) * 1.2)}" opacity=".7"/>`
    }).join('') +
    `</svg>` +
    `<rect width="100%" height="100%" fill="url(#warmth)"/>` +
    eclipse(weekPct) +
    snowSide(snowPct) +
    fireSide(firePct) +
    `</svg>`
  )
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------
export const register: Register = on => {
  const statusText = (snow: number, fire: number, week: number) =>
    `❄ context ${snow}%  ·  🔥 ${fire < 0 ? '5h limit n/a' : `5h ${fire}% left`}  ·  🌘 ${week < 0 ? 'week n/a' : `week ${100 - week}% left`}`

  on('session.start', async ($, e, next) => {
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))
    if (unpainted !== undefined) $.ui.toast(unpainted)

    // Seed from the current figures so the scene is right straight away.
    try {
      const u = await $.session.usage()
      await update($, snowAtom, () => snowFrom(u.context))
      await update($, fireAtom, () => fireFrom(u.rateLimits))
      await update($, weekAtom, () => weekFrom(u.rateLimits))
    } catch (error) {
      $.ui.log(String(error))
    }

    const set = await $.theme.set(LOOK)
    if (!set.isDrawn) $.ui.log(`snow-and-ember: ${set.reason}`)
    $.ui.status(statusText(await read($, snowAtom), await read($, fireAtom), await read($, weekAtom)))

    return next(e)
  })

  // Pushed by the engine after each turn and whenever a usage window moves a point.
  on('session.measure', async ($, e, next) => {
    const snow = snowFrom(e.context)
    const fire = fireFrom(e.rateLimits)
    if (snow !== (await read($, snowAtom))) await update($, snowAtom, () => snow)
    const week = weekFrom(e.rateLimits)
    if (fire !== (await read($, fireAtom))) await update($, fireAtom, () => fire)
    if (week !== (await read($, weekAtom))) await update($, weekAtom, () => week)
    $.ui.status(statusText(snow, fire, week))
    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') return next(e)
    const { Svg } = $.ui.resolve(e)
    const snow = await read($, snowAtom)
    const fire = await read($, fireAtom)
    const week = await read($, weekAtom)
    return (
      <Svg
        source={buildScene(snow, fire, week)}
        alt={`Winter night: snow piled ${snow}% high on the left, a campfire on the right with ${fire < 0 ? 'full' : `${fire}%`} fuel left, and a sun ${week < 0 ? 'uncovered' : `${week}% eclipsed`} at the top`}
        isInteractive
      />
    )
  })
}
