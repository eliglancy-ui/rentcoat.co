// "Find my size": recommends a size from height, weight, how you like it to fit and (optionally) your usual size,
// using the maker's flat garment measurements for that piece (netlify/lib/fit.mjs, printed into each product page).
// Body chest is estimated from height and weight (an approximation for unisex tops); we add room ("ease") for the
// fit you asked for and pick the smallest size whose chest is at least that wide. No data leaves the browser.
(function (root) {
  const SIZES = ["S", "M", "L", "XL", "2XL"];
  // room added across the flat chest (cm), by garment and fit preference
  const EASE = { Tee: { fitted: 1, regular: 3.5, oversized: 7.5 }, Hoodie: { fitted: 13, regular: 17, oversized: 20 } };
  const FIT_WORD = { Tee: { fitted: "a closer fit", regular: "a relaxed, boxy fit", oversized: "an oversized, drapey fit" },
    Hoodie: { fitted: "a cleaner, closer fit", regular: "the oversized look it's made for", oversized: "extra roomy" } };

  function bodyChestCm(heightCm, weightKg) { return 0.47 * weightKg + 0.25 * heightCm + 20; } // full chest circumference, estimate

  function recommend(input, chart, kind) {
    const k = kind === "Set" ? "Hoodie" : kind;
    if (!chart || !EASE[k]) return null;
    const h = Number(input.heightCm), w = Number(input.weightKg), fit = EASE[k][input.fit] != null ? input.fit : "regular";
    if (!(h >= 120 && h <= 230 && w >= 30 && w <= 250)) return { error: "Check your height and weight." };
    const need = bodyChestCm(h, w) / 2 + EASE[k][fit];           // flat chest width the garment should have
    let i = chart.Chest.findIndex(c => c >= need);
    let note = "";
    if (i < 0) { i = SIZES.length - 1; note = "Even 2XL may feel snug for the fit you picked. Email us before ordering and we'll help."; }
    // your usual size pulls the pick at most one step, so a wrong estimate can't send you two sizes off
    const u = SIZES.indexOf(input.usual);
    if (u >= 0 && Math.abs(i - u) > 1) i = u + Math.sign(i - u);
    // tall: if the body length is short for your height, suggest one up
    const len = chart.Length?.[i];
    if (len && h >= 190 && len < 74 && i < SIZES.length - 1) note = note || "You're tall: size up if you want more length.";
    const room = chart.Chest[i] * 2 - bodyChestCm(h, w);           // total room around the chest
    return {
      size: SIZES[i], fit, chestIn: +(chart.Chest[i] / 2.54).toFixed(1), lengthIn: len ? +(len / 2.54).toFixed(1) : null,
      roomIn: Math.max(0, Math.round(room / 2.54)),
      why: `${SIZES[i]} measures ${(chart.Chest[i] / 2.54).toFixed(1)}″ across the chest${len ? ` and ${(len / 2.54).toFixed(1)}″ long` : ""}, about ${Math.max(0, Math.round(room / 2.54))}″ of room around you: ${FIT_WORD[k][fit]}.`,
      note,
    };
  }
  const api = { recommend, bodyChestCm, SIZES };
  root.RCFit = api;
})(typeof window !== "undefined" ? window : globalThis);
