// Which Printful blank, color and catalog variants each new piece uses.
// Variant IDs come from Printful's public catalog (api.printful.com/products/<product>), checked October 28, 2026.
// Sizes match the variant keys in netlify/lib/store.mjs.

const v = (S, M, L, XL, XXL) => ({ S, M, L, XL, "2XL": XXL });

// Blanks: Shaka Wear SHGDD tee 1626, Cotton Heritage M2580 hoodie 380, M2480 crewneck 411, M7580 sweatpants 412,
// M2475 fleece pullover 674, SOL'S 32000 windbreaker 661, Champion CO200 packable anorak 399,
// Yupoong 6245CM dad hat 206, Yupoong 1501KC cuffed beanie 266.
export const CATALOG = {
  "rent-hoodie":        { product: 380,  color: "Black",            variants: v(10779, 10780, 10781, 10782, 10783) },
  "strait-joggers":     { product: 412,  color: "Charcoal Heather", variants: v(11284, 11285, 11286, 11287, 11288) },
  "flag-cap":           { product: 206,  color: "Spruce",           variants: { OS: 8745 } },
  "flag-beanie":        { product: 266,  color: "Red",              variants: { OS: 8939 } },
  "shelem-fleece":      { product: 674,  color: "Black",            variants: v(16715, 16716, 16717, 16718, 16719) },
  "hagoth-windbreaker": { product: 661,  color: "Forest Green",     variants: v(16429, 16430, 16431, 16432, 16433) },
  "ironrod-anorak":     { product: 399,  color: "Navy",             variants: v(11014, 11015, 11016, 11017, 11018) },
  "barge-tee":          { product: 1626, color: "Cream",            variants: v(50231, 50232, 50233, 50260, 50234) },
  "irreantum-tee":      { product: 1626, color: "Oatmeal",          variants: v(50251, 50252, 50253, 50262, 50254) },
  "samuel-tee":         { product: 1626, color: "Shadow",           variants: v(50239, 50240, 50241, 50264, 50242) },
  "curelom-cap":        { product: 206,  color: "Khaki",            variants: { OS: 7855 } },
  "stories-tee":        { product: 1626, color: "Cream",            variants: v(50231, 50232, 50233, 50260, 50234) },
  "stories-hoodie":     { product: 380,  color: "Bone",             variants: v(20284, 20285, 20286, 20287, 20288) },
  // White glossy mug 19 (11 oz) and enamel camp mug 407 (12 oz).
  "lehi-tee":           { product: 1626, color: "Mocha",            variants: v(50235, 50236, 50237, 50261, 50238) },
  "barge-mug":          { product: 19,   color: "White",            variants: { OS: 1320 } },
  "lehi-mug":           { product: 407,  color: "White",            variants: { OS: 11189 } },
};
