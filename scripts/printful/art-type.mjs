// The "type" tees: a short line centered on the chest and a verse set big and bold across the back, shoulder to
// shoulder. Every quote is copied word for word from churchofjesuschrist.org (checked October 30, 2026).
// The Rent Coat Co. mark sits under the collar on the back. No crosses or other non-LDS imagery.
import { INK, t } from "./art.mjs";
import { worn, ref, neck } from "./art-bold.mjs";

const LIGHT = [INK.night, INK.red], DARK = [INK.bone, INK.gold];

// The verse block. Each line is sized to fill the width; a short line stops at `max` and stays its natural width
// instead of being stretched, so no line looks squashed or pulled.
function block(lines, y0, { W = 1680, max = 400, lead = 0.94, gap = 24 } = {}) {
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

const back = (lines, verse, [ink, accent]) => () => {
  const { svg, bottom } = block(lines.map((l, i) => [l, i % 2 ? accent : ink]), 190);
  return neck(ink, accent) + worn(svg + `<rect x="780" y="${(bottom + 46).toFixed(1)}" width="240" height="10" fill="${accent}"/>` + ref(bottom + 160, verse, accent));
};
// The chest line, centered about 2.2" below the collar, with the verse under it in small type.
const front = (txt, verse, [ink, accent]) => () => {
  const size = Math.min(190, 1150 / (txt.length * 0.47));
  return worn(t(900, 330, size, txt, { fill: ink, wd: 62 }) + (verse ? t(900, 330 + 70, 38, verse, { f: "m", fill: accent, ls: 10, w: 600 }) : ""));
};

// id: [chest line, back lines, verse, ink]
const DESIGNS = {
  king:    ["JESUS IS KING", ["I, THE LORD,", "THE KING", "OF HEAVEN,", "WILL BE THEIR KING"], "2 NEPHI 10:14", DARK, false],
  "king-light": ["JESUS IS KING", ["I, THE LORD,", "THE KING", "OF HEAVEN,", "WILL BE THEIR KING"], "2 NEPHI 10:14", LIGHT, false],
  talk:    ["WE TALK OF CHRIST", ["WE TALK OF CHRIST,", "WE REJOICE IN CHRIST,", "WE PREACH OF CHRIST,", "WE PROPHESY OF CHRIST"], "2 NEPHI 25:26", LIGHT],
  rock:    ["A SURE FOUNDATION", ["UPON THE ROCK", "OF OUR REDEEMER,", "WHO IS CHRIST,", "THE SON OF GOD"], "HELAMAN 5:12", DARK],
  light:   ["THE LIGHT AND THE LIFE", ["I AM THE LIGHT", "AND THE LIFE", "OF THE WORLD"], "3 NEPHI 11:11", DARK],
  come:    ["COME UNTO CHRIST", ["COME UNTO CHRIST,", "AND BE PERFECTED", "IN HIM"], "MORONI 10:32", LIGHT],
  seek:    ["SEEK THIS JESUS", ["SEEK THIS JESUS", "OF WHOM THE PROPHETS", "AND APOSTLES", "HAVE WRITTEN"], "ETHER 12:41", LIGHT],
  name:    ["NONE OTHER NAME", ["THERE IS NONE OTHER", "NAME GIVEN", "UNDER HEAVEN", "SAVE IT BE THIS", "JESUS CHRIST"], "2 NEPHI 25:20", DARK],
  press:   ["PRESS FORWARD", ["PRESS FORWARD", "WITH A STEADFASTNESS", "IN CHRIST"], "2 NEPHI 31:20", LIGHT],
  mercy:   ["THOU SON OF GOD", ["O JESUS,", "THOU SON OF GOD,", "HAVE MERCY ON ME"], "ALMA 36:18", DARK],
  hosanna: ["HOSANNA", ["HOSANNA!", "BLESSED BE THE NAME", "OF THE MOST HIGH GOD!"], "3 NEPHI 11:17", LIGHT],
  glory:   ["KING OF ALL THE EARTH", ["BEHOLD THE GLORY", "OF THE KING", "OF ALL THE EARTH"], "ALMA 5:50", DARK],
};

// "JESUS IS KING" on the chest is the brand's own line, not a quote, so it carries no verse.
export const TYPE_FILES = Object.entries(DESIGNS).flatMap(([k, [chest, lines, verse, ink, cite = true]]) => [
  { id: `type-${k}`, place: "back", size: "DTG", svg: back(lines, verse, ink) },
  { id: `type-${k}`, place: "front", size: "DTG", svg: front(chest, cite ? verse : "", ink) },
]);
