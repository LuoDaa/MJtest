export const SCORE_BASE_RANGE = Object.freeze({
  min: 58,
  max: 72,
});

export const SCORE_LEVELS = Object.freeze([
  { min: 90, label: "大吉" },
  { min: 75, label: "中吉" },
  { min: 60, label: "小吉" },
  { min: 45, label: "平" },
  { min: -Infinity, label: "小凶" },
]);

export const SCORE_RULES = Object.freeze({
  minScore: 0,
  maxScore: 100,
  almanacScale: 0.25,
});

export const GOD_IMPACT_WEIGHTS = Object.freeze({
  dayStem: Object.freeze({ use: 7, joy: 4, avoid: 6, enemy: 8 }),
  dayBranch: Object.freeze({ use: 4, joy: 2, avoid: 3, enemy: 4 }),
  flowYear: Object.freeze({ use: 2, joy: 1, avoid: 2, enemy: 3 }),
  flowMonth: Object.freeze({ use: 3, joy: 2, avoid: 3, enemy: 4 }),
});

export function resolveScoreLevel(score) {
  for (const rule of SCORE_LEVELS) {
    if (score >= rule.min) return rule.label;
  }
  return "平";
}

export function rollBaseSeed(rng) {
  const span = SCORE_BASE_RANGE.max - SCORE_BASE_RANGE.min + 1;
  return SCORE_BASE_RANGE.min + Math.floor(rng() * span);
}
