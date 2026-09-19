/** Catalog of the 7 SMRITI cognitive games (AI adaptive progression). */

export interface GameDef {
  slug: string;
  name: string;
  description: string;
  /** Total levels per game. */
  maxLevel: number;
}

export const GAMES: GameDef[] = [
  {
    slug: "bamboo-sequence",
    name: "Bamboo Sequence",
    description: "Repeat the growing bamboo pattern.",
    maxLevel: 5,
  },
  {
    slug: "memory-match",
    name: "Memory Match",
    description: "Find pairs of matching cards.",
    maxLevel: 5,
  },
  {
    slug: "color-recall",
    name: "Color Recall",
    description: "Remember the color order.",
    maxLevel: 5,
  },
  {
    slug: "number-chain",
    name: "Number Chain",
    description: "Tap numbers in ascending order.",
    maxLevel: 5,
  },
  {
    slug: "word-pairs",
    name: "Word Pairs",
    description: "Recall the word pairings.",
    maxLevel: 5,
  },
  {
    slug: "face-names",
    name: "Faces & Names",
    description: "Match faces to names.",
    maxLevel: 5,
  },
  {
    slug: "sound-order",
    name: "Sound Order",
    description: "Repeat tones in the same order.",
    maxLevel: 5,
  },
];

export const GAME_BY_SLUG = new Map(GAMES.map((g) => [g.slug, g]));

export const PASS_THRESHOLD = 75;

/** Accuracy for a sequence round: correct taps / total taps. */
export function sequenceAccuracy(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100);
}
