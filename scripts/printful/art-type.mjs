// The "type" tees: a short line centered on the chest, and on the back a bold illustration of the verse's own image
// above the verse set big and justified, like the big backs. Every quote is copied word for word from
// churchofjesuschrist.org (checked October 30, 2026). The Rent Coat Co. mark sits under the collar on the back.
// No crosses, no depictions of the Savior and no other non-LDS imagery: each drawing is a symbol from the verse itself.
import { INK, t } from "./art.mjs";
import { worn, ref, neck, rays, halftone, fit } from "./art-bold.mjs";

const LIGHT = [INK.night, INK.red], DARK = [INK.bone, INK.gold];
const round = (n, k = 1) => n.toFixed(k);

// Each drawing is centered on x 900 and fits between y 260 and 1160, above the verse.
const ART = {
  // A five-point crown (jewels, no cross) in front of a sunburst.
  crown: (ink, acc) => `<clipPath id="burst"><circle cx="900" cy="720" r="470"/></clipPath><g clip-path="url(#burst)">${rays(900, 720, 620, 32, acc)}</g>`
    + `<circle cx="900" cy="720" r="470" fill="none" stroke="${acc}" stroke-width="12"/>`
    + `<path d="M520 930 L560 560 L720 760 L900 470 L1080 760 L1240 560 L1280 930 Z" fill="${ink}"/>`
    + `<rect x="500" y="930" width="800" height="120" rx="14" fill="${ink}"/>`
    + [560, 900, 1240].map((x, i) => `<circle cx="${x}" cy="${i === 1 ? 440 : 535}" r="${i === 1 ? 46 : 38}" fill="${acc}"/>`).join("")
    + [620, 760, 900, 1040, 1180].map((x, i) => i % 2 ? `<rect x="${x - 26}" y="964" width="52" height="52" transform="rotate(45 ${x} 990)" fill="${acc}"/>` : `<circle cx="${x}" cy="990" r="28" fill="${acc}"/>`).join(""),

  // An open book with light coming off its pages.
  book: (ink, acc) => {
    const lines = side => Array.from({ length: 6 }, (_, i) => { const y = 760 + i * 46, x0 = side < 0 ? 470 : 945, x1 = side < 0 ? 855 : 1330; return `<path d="M${x0} ${y} Q${(x0 + x1) / 2} ${y - 22} ${x1} ${y}" stroke="${acc}" stroke-width="12" fill="none" stroke-linecap="round"/>`; }).join("");
    return `<g>${rays(900, 700, 560, 20, acc, Math.PI)}</g>`
      + `<path d="M900 1110 C760 1040 600 1040 420 1090 L420 720 C600 670 760 670 900 740 Z" fill="${ink}"/>`
      + `<path d="M900 1110 C1040 1040 1200 1040 1380 1090 L1380 720 C1200 670 1040 670 900 740 Z" fill="${ink}"/>`
      + `<path d="M900 740 L900 1110" stroke="${acc}" stroke-width="10"/>`
      + lines(-1) + lines(1);
  },

  // A rock that holds while the storm beats on it: clouds, lightning, hail (Helaman 5:12).
  rock: (ink, acc) => {
    const cloud = [[560, 430, 120], [700, 380, 150], [860, 400, 130], [1010, 370, 160], [1170, 420, 130], [1300, 450, 100]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join("");
    const hail = Array.from({ length: 26 }, (_, i) => { const x = 470 + (i * 137) % 880, y = 600 + (i * 89) % 260; return `<path d="M${x} ${y} l-22 52" stroke="${acc}" stroke-width="12" stroke-linecap="round"/>`; }).join("");
    return `<g fill="${ink}">${cloud}<rect x="440" y="420" width="960" height="110"/></g>`
      + `<path d="M760 540 L700 700 L770 700 L720 860 L860 660 L790 660 L840 540 Z M1120 540 L1080 650 L1130 650 L1090 760 L1190 620 L1140 620 L1180 540 Z" fill="${acc}"/>` + hail
      + `<path d="M330 1160 L470 930 L590 980 L720 820 L860 880 L980 780 L1120 900 L1250 860 L1470 1160 Z" fill="${ink}"/>`
      + `<path d="M720 820 L690 900 L740 880 M980 780 L950 850 L1000 840 M1250 860 L1230 920" stroke="${acc}" stroke-width="10" fill="none" stroke-linecap="round"/>`;
  },

  // The sun coming up over the horizon.
  sun: (ink, acc) => `<clipPath id="sky"><rect x="0" y="0" width="1800" height="1000"/></clipPath>`
    + `<g clip-path="url(#sky)">${rays(900, 1000, 760, 36, acc)}<circle cx="900" cy="1000" r="330" fill="${ink}"/>${halftone(900, 1000, 330, acc, { step: 28, max: 12, toward: [0, 1] })}</g>`
    + Array.from({ length: 4 }, (_, i) => `<rect x="${330 + i * 60}" y="${1024 + i * 34}" width="${1140 - i * 120}" height="${18 - i * 2}" rx="8" fill="${ink}"/>`).join(""),

  // A path running to the sunrise between two hills.
  path: (ink, acc) => `<clipPath id="sky2"><rect x="0" y="0" width="1800" height="800"/></clipPath><g clip-path="url(#sky2)">${rays(900, 800, 600, 28, acc)}<circle cx="900" cy="800" r="170" fill="${acc}"/></g>`
    + `<path d="M300 1160 L300 820 C480 760 640 770 820 800 L980 800 C1160 770 1320 760 1500 820 L1500 1160 Z" fill="${ink}"/>`
    + `<path d="M870 800 L930 800 C950 900 1060 1000 1180 1160 L620 1160 C740 1000 850 900 870 800 Z" fill="${acc}"/>`
    + `<path d="M900 830 L900 870 M904 920 L908 980 M915 1040 L924 1120" stroke="${ink}" stroke-width="14" stroke-linecap="round"/>`,

  // A guiding eight-point star over the mountains, with a few smaller stars.
  star: (ink, acc) => {
    const pt = (cx, cy, R, r) => Array.from({ length: 16 }, (_, i) => { const a = (Math.PI * i) / 8 - Math.PI / 2, rr = i % 2 ? r : (i % 4 ? R * 0.62 : R); return `${i ? "L" : "M"}${round(cx + rr * Math.cos(a))} ${round(cy + rr * Math.sin(a))}`; }).join(" ") + " Z";
    const small = [[520, 420], [1290, 470], [430, 700], [1380, 760], [640, 300], [1160, 300]].map(([x, y], i) => `<path d="${pt(x, y, 34 - (i % 3) * 6, 12)}" fill="${ink}"/>`).join("");
    return `<path d="${pt(900, 600, 330, 70)}" fill="${acc}"/><circle cx="900" cy="600" r="60" fill="${ink}"/>${small}`
      + `<path d="M300 1160 L560 860 L680 960 L900 760 L1120 960 L1250 870 L1500 1160 Z" fill="${ink}"/>`
      + `<path d="M900 760 L850 830 L900 815 L945 860 L985 820 Z M560 860 L525 905 L570 895 Z" fill="${acc}"/>`;
  },

  // An old key.
  key: (ink, acc) => `${halftone(900, 760, 430, acc, { step: 30, max: 12 })}`
    + `<g transform="rotate(-18 900 760)"><circle cx="560" cy="760" r="170" fill="none" stroke="${ink}" stroke-width="64"/>`
    + `<circle cx="560" cy="760" r="60" fill="none" stroke="${ink}" stroke-width="22"/>`
    + `<rect x="700" y="728" width="680" height="64" rx="12" fill="${ink}"/><rect x="760" y="712" width="40" height="96" rx="8" fill="${ink}"/>`
    + `<path d="M1220 792 L1220 920 L1290 920 L1290 860 L1330 860 L1330 960 L1380 960 L1380 792 Z" fill="${ink}"/></g>`,

  // A switchback trail up to the summit, with the sun behind the peak.
  trail: (ink, acc) => `<circle cx="1040" cy="470" r="150" fill="${acc}"/>`
    + `<path d="M320 1160 L880 420 L1100 700 L1180 620 L1480 1160 Z" fill="${ink}"/>`
    + `<path d="M880 420 L830 490 L880 470 L930 520 L960 480 Z" fill="${acc}"/>`
    + `<path d="M620 1120 L1060 1000 L760 900 L1000 800 L840 700 L920 600 L880 520" stroke="${acc}" stroke-width="16" stroke-dasharray="34 22" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,

  // A chain breaking apart in a burst of light (Alma 36:18).
  chain: (ink, acc) => {
    const link = (x, y, a) => `<ellipse cx="${x}" cy="${y}" rx="78" ry="44" transform="rotate(${a} ${x} ${y})" fill="none" stroke="${ink}" stroke-width="30"/>`;
    let ch = "";
    for (let i = 0; i < 4; i++) ch += link(330 + i * 120, 760 + (i % 2 ? 0 : 0), i % 2 ? 90 : 0) + link(1470 - i * 120, 760, i % 2 ? 90 : 0);
    return `${rays(900, 760, 560, 24, acc)}<circle cx="900" cy="760" r="150" fill="${acc}"/>${ch}`
      + `<path d="M760 720 A78 44 0 0 1 820 790" fill="none" stroke="${ink}" stroke-width="30" stroke-linecap="round" transform="rotate(-20 790 760)"/>`
      + `<path d="M1040 800 A78 44 0 0 1 980 730" fill="none" stroke="${ink}" stroke-width="30" stroke-linecap="round" transform="rotate(-20 1010 760)"/>`;
  },

  // Palm branches rising in a V around the sun.
  palms: (ink, acc) => {
    const frond = (dir) => {
      let out = "";
      const p = s => { const x = 900 + dir * (s * 470), y = 1130 - s * 760 + s * s * 260; return [x, y]; };
      for (let i = 1; i <= 15; i++) {
        const s = i / 16, [x, y] = p(s), [x2, y2] = p(s + 0.02), ang = Math.atan2(y2 - y, x2 - x) * 180 / Math.PI, len = 150 * Math.sin(Math.PI * s) + 40;
        out += `<ellipse cx="${round(x + dir * 0)}" cy="${round(y)}" rx="${round(len / 2)}" ry="16" transform="rotate(${round(ang - dir * 55)} ${round(x)} ${round(y)}) translate(${round(-dir * len / 2.4)} 0)" fill="${ink}"/>`;
        out += `<ellipse cx="${round(x)}" cy="${round(y)}" rx="${round(len / 2)}" ry="16" transform="rotate(${round(ang + dir * 55)} ${round(x)} ${round(y)}) translate(${round(dir * len / 2.4)} 0)" fill="${ink}"/>`;
      }
      const pts = Array.from({ length: 18 }, (_, i) => p(i / 17).map(n => round(n)).join(" ")).join(" L");
      return out + `<path d="M${pts}" stroke="${ink}" stroke-width="16" fill="none" stroke-linecap="round"/>`;
    };
    return `<circle cx="900" cy="640" r="230" fill="${acc}"/>${halftone(900, 640, 360, acc, { step: 30, max: 10 })}${frond(-1)}${frond(1)}`;
  },

  // The earth, with rays and a small crown above it.
  globe: (ink, acc) => `${rays(900, 780, 600, 36, acc)}<circle cx="900" cy="780" r="360" fill="${ink}"/>`
    + `<g fill="none" stroke="${acc}" stroke-width="12"><ellipse cx="900" cy="780" rx="170" ry="360"/><ellipse cx="900" cy="780" rx="360" ry="130"/><path d="M540 780 L1260 780 M900 420 L900 1140"/><ellipse cx="900" cy="780" rx="300" ry="360"/></g>`
    + `<g transform="translate(900 380) scale(0.32) translate(-900 -760)"><path d="M520 930 L560 560 L720 760 L900 470 L1080 760 L1240 560 L1280 930 Z" fill="${acc}"/><rect x="500" y="930" width="800" height="120" rx="14" fill="${acc}"/></g>`,
};

// The verse block. Each line is sized to fill the width; a short line stops at `max` and keeps its natural width
// instead of being stretched, so no line looks squashed or pulled.
function block(lines, y0, { W = 1580, max = 200, lead = 0.94, gap = 22 } = {}) {
  let y = y0, out = "";
  for (const [txt, fill] of lines) {
    const fitSize = W / (txt.length * 0.47), size = Math.min(max, fitSize);
    y += size * lead;
    const stretch = size === fitSize ? ` textLength="${W}" lengthAdjust="spacingAndGlyphs"` : "";
    out += `<text x="900" y="${y.toFixed(1)}" text-anchor="middle"${stretch} fill="${fill}" style="font-family:'Archivo';font-weight:900;font-stretch:62%;font-size:${size.toFixed(1)}px">${txt}</text>`;
    y += gap;
  }
  return { svg: out, bottom: y };
}

const back = (art, lines, verse, [ink, accent]) => () => {
  const { svg, bottom } = block(lines.map((l, i) => [l, i % 2 ? accent : ink]), 1220);
  return neck(ink, accent) + worn(fit(ART[art](ink, accent), 710, 0.92) + svg + `<rect x="780" y="${(bottom + 40).toFixed(1)}" width="240" height="10" fill="${accent}"/>` + ref(bottom + 150, verse, accent));
};
// The chest line, centered about 2.2" below the collar, with the verse under it in small type.
const front = (txt, verse, [ink, accent]) => () => {
  const size = Math.min(190, 1150 / (txt.length * 0.47));
  return worn(t(900, 330, size, txt, { fill: ink, wd: 62 }) + (verse ? t(900, 330 + 70, 38, verse, { f: "m", fill: accent, ls: 10, w: 600 }) : ""));
};

// id: [chest line, drawing, back lines, verse, ink, cite the verse on the chest]
const DESIGNS = {
  king:    ["JESUS IS KING", "crown", ["I, THE LORD,", "THE KING OF HEAVEN,", "WILL BE THEIR KING"], "2 NEPHI 10:14", DARK, false],
  "king-light": ["JESUS IS KING", "crown", ["I, THE LORD,", "THE KING OF HEAVEN,", "WILL BE THEIR KING"], "2 NEPHI 10:14", LIGHT, false],
  talk:    ["WE TALK OF CHRIST", "book", ["WE TALK OF CHRIST,", "WE REJOICE IN CHRIST,", "WE PREACH OF CHRIST,", "WE PROPHESY OF CHRIST"], "2 NEPHI 25:26", LIGHT],
  rock:    ["A SURE FOUNDATION", "rock", ["UPON THE ROCK", "OF OUR REDEEMER,", "WHO IS CHRIST,", "THE SON OF GOD"], "HELAMAN 5:12", DARK],
  light:   ["THE LIGHT AND THE LIFE", "sun", ["I AM THE LIGHT", "AND THE LIFE", "OF THE WORLD"], "3 NEPHI 11:11", DARK],
  come:    ["COME UNTO CHRIST", "path", ["COME UNTO CHRIST,", "AND BE PERFECTED", "IN HIM"], "MORONI 10:32", LIGHT],
  seek:    ["SEEK THIS JESUS", "star", ["SEEK THIS JESUS", "OF WHOM THE PROPHETS", "AND APOSTLES", "HAVE WRITTEN"], "ETHER 12:41", LIGHT],
  name:    ["NONE OTHER NAME", "key", ["THERE IS NONE OTHER", "NAME GIVEN UNDER HEAVEN", "SAVE IT BE THIS", "JESUS CHRIST"], "2 NEPHI 25:20", DARK],
  press:   ["PRESS FORWARD", "trail", ["PRESS FORWARD", "WITH A STEADFASTNESS", "IN CHRIST"], "2 NEPHI 31:20", LIGHT],
  mercy:   ["THOU SON OF GOD", "chain", ["O JESUS,", "THOU SON OF GOD,", "HAVE MERCY ON ME"], "ALMA 36:18", DARK],
  hosanna: ["HOSANNA", "palms", ["HOSANNA!", "BLESSED BE THE NAME", "OF THE MOST HIGH GOD!"], "3 NEPHI 11:17", LIGHT],
  glory:   ["KING OF ALL THE EARTH", "globe", ["BEHOLD THE GLORY", "OF THE KING", "OF ALL THE EARTH"], "ALMA 5:50", DARK],
};

// "JESUS IS KING" on the chest is the brand's own line, not a quote, so it carries no verse.
export const TYPE_FILES = Object.entries(DESIGNS).flatMap(([k, [chest, art, lines, verse, ink, cite = true]]) => [
  { id: `type-${k}`, place: "back", size: "DTG", svg: back(art, lines, verse, ink) },
  { id: `type-${k}`, place: "front", size: "DTG", svg: front(chest, cite ? verse : "", ink) },
]);
