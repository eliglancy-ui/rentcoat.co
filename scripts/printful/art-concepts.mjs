// Design-direction concepts, rendered as ready PNGs by scripts/art/concepts.py (public-domain art, OFL fonts).
// Only photographed with { "preview": true }; nothing here is a product yet.
const TEE = 1626, tee = { Black: 50244, Cream: 50232, Shadow: 50240 };
const C = [["engraving-hosanna", "Black"], ["engraving-come", "Cream"], ["gothic-king", "Black"], ["gothic-heaven", "Shadow"], ["photo-earth", "Black"], ["photo-light", "Black"]];
export const CONCEPT_FILES = C.map(([k]) => ({ id: `concept-${k}`, place: "back", size: "DTG", file: `concept-${k}-back.png` }));
export const CONCEPT_PREVIEWS = C.map(([k, color]) => ({ key: `concept-${k}`, product: TEE, variant: tee[color], color, files: [`concept-${k}`] }));
