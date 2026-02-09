function scrubText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  let text = String(value);
  text = text.replace(/undefined|null/gi, "");
  text = text.replace(/[\s\u00A0]+/g, " ").trim();
  text = text.replace(/([·，、。；：])\1+/g, "$1");
  return text || fallback;
}

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function toTextList(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const text = scrubText(item);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }
  return out;
}

function toObject(value) {
  return value && typeof value === "object" ? value : {};
}

function sanitizeBaziInfo(value) {
  if (!value || typeof value !== "object") return null;
  const obj = toObject(value);
  return {
    ...obj,
    year: scrubText(obj.year, "未知"),
    month: scrubText(obj.month, "未知"),
    day: scrubText(obj.day, "未知"),
    hour: scrubText(obj.hour, "未知"),
    timeAdjusted: Boolean(obj.timeAdjusted),
    timeOffsetMinutes: toNumber(obj.timeOffsetMinutes, 0),
    timeKnown: Boolean(obj.timeKnown),
  };
}

export function sanitizeFortuneResult(raw) {
  const source = toObject(raw);
  const mahjong = toObject(source.mahjong);
  const strategy = toObject(mahjong.strategy);
  const suits = toObject(mahjong.suits);
  const wuxing = toObject(source.wuxingRelation);
  const scoreBreakdown = toObject(source.scoreBreakdown);
  const almanac = toObject(source.almanac);
  const flowInfo = toObject(source.flowInfo);
  const birthInfo = toObject(source.birthInfo);
  const inputs = toObject(source.inputs);

  const safeResult = {
    ...source,
    dateKey: scrubText(source.dateKey, ""),
    seedStr: scrubText(source.seedStr, ""),
    score: toNumber(source.score, 0),
    level: scrubText(source.level, "平"),
    summary: scrubText(source.summary, "稳中求进，理性娱乐。"),
    inputs: {
      ...inputs,
      name: scrubText(inputs.name, "匿名"),
      birthYmd: scrubText(inputs.birthYmd, ""),
      birthTime: scrubText(inputs.birthTime, ""),
      birthLongitude: inputs.birthLongitude ?? "",
      mahjongType: scrubText(inputs.mahjongType, "四川麻将"),
    },
    birthInfo: {
      zodiac: scrubText(birthInfo.zodiac, "未知"),
      constellation: scrubText(birthInfo.constellation, "未知"),
    },
    mahjong: {
      ...mahjong,
      word: scrubText(mahjong.word, "稳"),
      wordJoke: scrubText(mahjong.wordJoke, "顺势而为，稳扎稳打。"),
      reading: scrubText(mahjong.reading, "今日宜稳中求进，量力而行。"),
      tip: scrubText(mahjong.tip, "谨慎出牌，避免急躁。"),
      strategy: {
        ...strategy,
        key: scrubText(strategy.key, "balance"),
        title: scrubText(strategy.title, "稳扎稳打"),
        desc: scrubText(strategy.desc, "控制风险，循序渐进。"),
      },
      suits: {
        ...suits,
        favored: scrubText(suits.favored, "条子"),
        neutral: scrubText(suits.neutral, "筒子"),
        avoid: scrubText(suits.avoid, "万子"),
        favoredElement: scrubText(suits.favoredElement, "木"),
        avoidElement: scrubText(suits.avoidElement, "金"),
      },
    },
    wuxingRelation: {
      ...wuxing,
      personalElement: scrubText(wuxing.personalElement, "土"),
      dayElement: scrubText(wuxing.dayElement, "土"),
      label: scrubText(wuxing.label, "平衡"),
      text: scrubText(wuxing.text, "五行走势平稳。"),
      type: scrubText(wuxing.type, "same"),
      summary: scrubText(wuxing.summary, ""),
      countsText: scrubText(wuxing.countsText, ""),
      strengthTag: scrubText(wuxing.strengthTag, "中和"),
      strengthExplain: scrubText(wuxing.strengthExplain, ""),
      favorableElements: toTextList(wuxing.favorableElements),
      unfavorableElements: toTextList(wuxing.unfavorableElements),
      useGods: toTextList(wuxing.useGods),
      joyGods: toTextList(wuxing.joyGods),
      avoidGods: toTextList(wuxing.avoidGods),
      enemyGods: toTextList(wuxing.enemyGods),
      idleGods: toTextList(wuxing.idleGods),
      godMethod: scrubText(wuxing.godMethod, ""),
      godExplain: scrubText(wuxing.godExplain, ""),
      todaySummary: scrubText(wuxing.todaySummary, ""),
    },
    baziInfo: sanitizeBaziInfo(source.baziInfo),
    baziSummary: scrubText(source.baziSummary, ""),
    almanac: {
      ...almanac,
      solar: scrubText(almanac.solar, ""),
      lunar: scrubText(almanac.lunar, ""),
      solarTerm: scrubText(almanac.solarTerm, ""),
      jianchu: scrubText(almanac.jianchu, "平"),
      jianchuMeaning: scrubText(almanac.jianchuMeaning, ""),
      yi: toTextList(almanac.yi),
      ji: toTextList(almanac.ji),
      luckyTimes: toTextList(almanac.luckyTimes),
      avoidTime: scrubText(almanac.avoidTime, ""),
      dayAnimal: scrubText(almanac.dayAnimal, ""),
      dayBranch: scrubText(almanac.dayBranch, ""),
      dayElement: scrubText(almanac.dayElement, "土"),
    },
    flowInfo: {
      yearGanzhi: scrubText(flowInfo.yearGanzhi, ""),
      monthGanzhi: scrubText(flowInfo.monthGanzhi, ""),
      yearElement: scrubText(flowInfo.yearElement, ""),
      monthElement: scrubText(flowInfo.monthElement, ""),
    },
    scoreBreakdown: {
      base: toNumber(scoreBreakdown.base, 0),
      baziDelta: toNumber(scoreBreakdown.baziDelta, 0),
      seasonDelta: toNumber(scoreBreakdown.seasonDelta, 0),
      strengthDelta: toNumber(scoreBreakdown.strengthDelta, 0),
      favorableDelta: toNumber(scoreBreakdown.favorableDelta, 0),
      flowDelta: toNumber(scoreBreakdown.flowDelta, 0),
      almanacDelta: toNumber(scoreBreakdown.almanacDelta, 0),
      raw: toNumber(scoreBreakdown.raw, 0),
      final: toNumber(scoreBreakdown.final, 0),
    },
  };

  return safeResult;
}
