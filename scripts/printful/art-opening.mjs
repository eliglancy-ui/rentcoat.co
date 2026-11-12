// The opening set (store opens Black Friday, Nov 27, 2026): finished print files already in print/, placed by
// size in inches instead of filling the print area. Bella+Canvas 3010 tees and Cotton Heritage M2580 hoodies.
// pos: widthIn = printed width; topIn = from the top of Printful's print area; leftOfCenterIn = left edge measured
// from the center line toward the wearer's left (omit to center). Left-chest logos sit about 3 in below the
// collar, 3.5 in wide (see print/chest/PLACEMENT.md). Backs are 10.5 in wide, about 1 in below the top of the area.
const BACK = { widthIn: 10.5, topIn: 1 };
const CHEST_TEE = { widthIn: 3.5, topIn: 2, leftOfCenterIn: 2 };
const CHEST_HOODIE = { widthIn: 3.5, topIn: 2.2, leftOfCenterIn: 2 };
const SLEEVE = { widthIn: 2.8, topIn: 0 };
const tee = (id, back, chest) => [
  { id, place: "back", file: back, pos: BACK },
  { id, place: "front", file: chest, pos: CHEST_TEE },
];
const hoodie = (id, back, chest, sleeves = []) => [
  { id, place: "back", file: back, pos: BACK },
  { id, place: "front", file: chest, pos: CHEST_HOODIE },
  ...sleeves.map(([place, file]) => ({ id, place, file, pos: SLEEVE })),
];
export const OPEN_FILES = [
  ...tee("open-cureloms", "review/cureloms-v3-back.png", "chest/chest-forest.png"),
  ...tee("open-liberty", "review/liberty-v4-back.png", "chest/chest-bone.png"),
  ...tee("open-liahona", "concept-liahona-back.png", "chest/chest-liahona-cream.png"),
  ...tee("open-rejoice", "review/rejoice-picture-back.png", "chest/chest-bone.png"),
  ...hoodie("open-rejoice-hoodie", "review/rejoice-picture-back.png", "chest/chest-bone.png"),
  ...tee("open-great-joy", "review/glad-tidings-color-back.png", "chest/chest-bone.png"),
  ...hoodie("open-rent-hoodie", "review/idea-he-rent-his-coat-back.png", "chest/chest-bone.png",
    [["sleeve_left", "review/idea-he-rent-his-coat-sleeve-left.png"], ["sleeve_right", "review/idea-he-rent-his-coat-sleeve-right.png"]]),
  ...tee("open-go-and-do", "review/idea-go-and-do-back.png", "chest/chest-bone.png"),
  ...tee("open-service-club", "review/idea-service-club-back.png", "chest/chest-forest.png"),
  ...tee("open-lehi", "lehi-tee-back.png", "chest/chest-lehi.png"),
];
