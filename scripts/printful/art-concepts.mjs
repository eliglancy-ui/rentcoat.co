// Design-direction concepts, rendered as ready PNGs by scripts/art/concepts.py and concepts2.py (public-domain art,
// OFL fonts). Only photographed with { "preview": true }; nothing here is a product yet.
const TEE = 1626, HOODIE = 380;
const tee = { Black: 50244, Cream: 50232, Shadow: 50240 };
const hood = { Black: 10780, Bone: 20285, "Navy Blazer": 11492 };
// [key, product, color, has a front print]
const C = [["engraving-hosanna", TEE, "Black"], ["engraving-come", TEE, "Cream"], ["gothic-king", TEE, "Black"], ["gothic-heaven", TEE, "Shadow"],
  ["photo-earth", TEE, "Black"], ["jik-hoodie", HOODIE, "Black", 1], ["samuel", TEE, "Shadow", 1], ["storm", TEE, "Cream", 1],
  ["shelem", HOODIE, "Navy Blazer", 1], ["liahona", TEE, "Cream", 1], ["mom", HOODIE, "Bone", 1]];
export const CONCEPT_FILES = C.flatMap(([k, , , fr]) => [{ id: `concept-${k}`, place: "back", size: "DTG", file: `concept-${k}-back.png` },
  ...(fr ? [{ id: `concept-${k}`, place: "front", size: "DTG", file: `concept-${k}-front.png` }] : [])]);
export const CONCEPT_PREVIEWS = C.map(([k, product, color]) => ({ key: `concept-${k}`, product, variant: (product === TEE ? tee : hood)[color], color, files: [`concept-${k}`] }));
