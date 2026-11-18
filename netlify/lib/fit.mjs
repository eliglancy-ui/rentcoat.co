// Fit, fabric and size charts for each kind of piece, from the maker's own spec pages (garment measured flat, in cm).
// Product pages, the size guide and the product feed read this. Update a chart here when real samples are measured.
//   Hoodie: Tapstitch R00286 Oversize Fleeced Hoodie (size guide on tapstitch.com, read Nov 18, 2026)
//   Tee:    Tapstitch RU0014 Heavyweight Drop Shoulder Cotton T-Shirt (size guide on tapstitch.com, read Nov 18, 2026)
//   Sweats: Tapstitch fleece sweatpants (chart added once the exact blank is confirmed from the sample)
//   Cap:    Printful classic dad hat (one size, adjustable strap); Sticker: Printful kiss-cut, 4 x 4 in
export const SIZES = ["S", "M", "L", "XL", "2XL"];

export const FIT = {
  Hoodie: {
    fit: "Oversized",
    line: "Oversized and heavy, with dropped shoulders and a roomy body. No drawstrings, so nothing gets in the way of the print.",
    advice: "Take your usual size for the oversized look. Size down for a cleaner, closer fit.",
    details: ["350 gsm fleece (10.3 oz), thick and warm", "42% cotton, 53% polyester, 5% other fibers", "Oversized fit, dropped shoulders", "Hood with no drawstrings", "Printed to order in the US"],
    care: "Machine wash cold, inside out, gentle cycle. Tumble dry low. Don't iron the print.",
    // rows: [label, how to measure], cm per size in SIZES order
    chart: { rows: [["Length", "Shoulder seam at the collar to the hem"], ["Chest", "Straight across, armpit to armpit"], ["Shoulder", "Shoulder seam to shoulder seam"], ["Sleeve", "Shoulder seam to the cuff"]],
      cm: { Length: [70, 72, 74, 76, 78], Chest: [66, 68, 70, 72, 74], Shoulder: [65, 67, 69, 71, 73], Sleeve: [53.5, 54.5, 55.5, 56.5, 57.5] } },
    source: "Maker's measurements. Each piece can vary by 1 to 3 cm.",
  },
  Tee: {
    fit: "Boxy",
    line: "Boxy and oversized, with dropped shoulders and a heavy, structured feel. It holds its shape and doesn't cling.",
    advice: "Take your usual size for a boxy fit. Size up for an oversized, drapey look. The maker notes this blank runs a little small.",
    details: ["300 gsm heavyweight cotton (8.8 oz), 100% cotton", "Boxy, relaxed fit with dropped shoulders", "Printed to order in the US"],
    care: "Machine wash cold, inside out. Tumble dry low or hang dry. Don't iron the print.",
    chart: { rows: [["Length", "Shoulder seam at the collar to the hem"], ["Chest", "Straight across, armpit to armpit"], ["Shoulder", "Shoulder seam to shoulder seam"], ["Sleeve", "Shoulder seam to the end of the sleeve"]],
      cm: { Length: [67, 69, 71, 73, 75], Chest: [52, 54, 56, 58, 60], Shoulder: [50, 52, 54, 56, 58], Sleeve: [20, 21, 22, 23, 24] } },
    source: "Maker's measurements. Each piece can vary by 1 to 3 cm.",
  },
  Sweats: {
    fit: "Relaxed",
    line: "Heavy fleece sweats with an elastic waist and a relaxed leg. Made to match the hoodies.",
    advice: "Take your usual size. Between sizes, size up for a looser leg.",
    details: ["Heavyweight fleece", "Elastic waist", "Relaxed fit", "Printed to order in the US"],
    care: "Machine wash cold, inside out. Tumble dry low.",
    chart: null,
    source: "",
  },
  Cap: { fit: "One size", line: "Washed cotton dad cap with an unstructured crown and a curved brim.", advice: "One size. The strap in the back adjusts to fit.",
    details: ["Cotton twill, unstructured", "Curved brim", "Adjustable strap with buckle", "Embroidered, not printed"], care: "Spot clean or hand wash cold. Air dry.", chart: null, source: "" },
  Sticker: { fit: "4 x 4 in", line: "A thick vinyl sticker, cut around the design.", advice: "4 x 4 inches at its widest.",
    details: ["Kiss-cut vinyl", "4 x 4 inches", "Water resistant", "Printed by Printful"], care: "For smooth, clean surfaces.", chart: null, source: "" },
};
FIT.Set = { ...FIT.Hoodie, fit: "Oversized set", line: "The Steadfast Hoodie and the Press Forward Sweats together, one verse across both. Pick one size for both pieces.",
  advice: "Pick your usual size: it applies to both pieces. Hoodie measurements below.", details: [...FIT.Hoodie.details.slice(0, 3), "Matching heavy fleece sweats", "Printed to order in the US"] };

export const inches = cm => Math.round(cm / 2.54 * 10) / 10;
