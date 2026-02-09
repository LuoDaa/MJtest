// src/utils/fortune_optimized.js - 优化版传统文化算卦逻辑

// xmur3: string -> 32-bit seed
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

// mulberry32: seed -> deterministic PRNG (0,1)
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

// Use local timezone "today" for stable daily result.
export function todayKeyLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function pickUnique(rng, arr, n) {
  const pool = arr.slice();
  const out = [];
  while (pool.length && out.length < n) {
    const i = Math.floor(rng() * pool.length);
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

function buildComboPool(listA, listB, target, joiner = "") {
  const out = [];
  for (const a of listA) {
    for (const b of listB) {
      const text = `${a}${joiner}${b}`;
      if (!out.includes(text)) out.push(text);
      if (out.length >= target) return out;
    }
  }
  return out;
}

function buildStrategyPool(titleA, titleB, descA, descB, target = 100) {
  const titles = buildComboPool(titleA, titleB, target);
  const descs = buildComboPool(descA, descB, target, "，");
  const limit = Math.min(target, titles.length, descs.length);
  const out = [];
  for (let i = 0; i < limit; i += 1) {
    out.push({ title: titles[i], desc: descs[i] });
  }
  return out;
}

function mergePool(primary, legacy, target) {
  const out = [];
  const pushUnique = (item) => {
    if (!item) return;
    if (!out.includes(item)) out.push(item);
  };
  (legacy || []).forEach(pushUnique);
  (primary || []).forEach(pushUnique);
  return out.slice(0, target);
}

function buildBaziNote({ bazi, gods, strengthTag, favoredElement }) {
  const parts = [];
  if (bazi?.day) {
    parts.push(`日主${bazi.day}`);
  } else if (favoredElement) {
    parts.push(`日主${favoredElement}`);
  }
  const use = gods?.use?.[0];
  const joy = gods?.joy?.[0];
  const avoid = gods?.avoid?.[0];
  if (use) parts.push(`用${use}`);
  if (joy) parts.push(`喜${joy}`);
  if (avoid) parts.push(`忌${avoid}`);
  if (strengthTag) parts.push(strengthTag);
  return parts.slice(0, 3).join("·");
}

function appendBaziNote(text, note) {
  if (!note || !text) return text || "";
  if (text.includes("日主") || text.includes("用神") || text.includes("喜神") || text.includes("忌神")) {
    return text;
  }
  return `${text}（${note}）`;
}

function parseYmd(ymd) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, m, d] = ymd.split("-").map((v) => Number(v));
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() + 1 !== m ||
    date.getDate() !== d
  ) {
    return null;
  }
  return { y, m, d, date };
}

function parseHm(hm) {
  if (!hm) return null;
  const m = hm.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (Number.isNaN(h) || Number.isNaN(min)) return null;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { h, min };
}

function parseLongitude(lon) {
  if (lon === null || lon === undefined || lon === "") return null;
  const num = Number(lon);
  if (Number.isNaN(num)) return null;
  if (num < -180 || num > 180) return null;
  return num;
}

function getDayCyl(y, m, d) {
  const base = Date.UTC(1900, 0, 31);
  const target = Date.UTC(y, m - 1, d);
  const offset = Math.floor((target - base) / 86400000);
  return offset + 40;
}

function mod(n, m) {
  return ((n % m) + m) % m;
}

const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const ZODIAC = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"];
const MONTH_BRANCHES = ["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"];

const CONSTELLATIONS = [
  { name: "摩羯座", from: [12, 22], to: [1, 19] },
  { name: "水瓶座", from: [1, 20], to: [2, 18] },
  { name: "双鱼座", from: [2, 19], to: [3, 20] },
  { name: "白羊座", from: [3, 21], to: [4, 19] },
  { name: "金牛座", from: [4, 20], to: [5, 20] },
  { name: "双子座", from: [5, 21], to: [6, 21] },
  { name: "巨蟹座", from: [6, 22], to: [7, 22] },
  { name: "狮子座", from: [7, 23], to: [8, 22] },
  { name: "处女座", from: [8, 23], to: [9, 22] },
  { name: "天秤座", from: [9, 23], to: [10, 23] },
  { name: "天蝎座", from: [10, 24], to: [11, 22] },
  { name: "射手座", from: [11, 23], to: [12, 21] },
];

function getConstellation(month, day) {
  for (const item of CONSTELLATIONS) {
    const [fm, fd] = item.from;
    const [tm, td] = item.to;
    if (fm <= tm) {
      if (month === fm && day >= fd) return item.name;
      if (month === tm && day <= td) return item.name;
      if (month > fm && month < tm) return item.name;
    } else {
      // Across year end.
      if (month === fm && day >= fd) return item.name;
      if (month === tm && day <= td) return item.name;
      if (month > fm || month < tm) return item.name;
    }
  }
  return "未知";
}

// ====== Accurate lunar conversion (1900-2100) ======
// Lunar data from 1900 to 2100 (standard bitmask table).
const LUNAR_INFO = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0,
  0x09ad0, 0x055d2, 0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540,
  0x0d6a0, 0x0ada2, 0x095b0, 0x14977, 0x04970, 0x0a4b0, 0x0b4b5, 0x06a50,
  0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970, 0x06566, 0x0d4a0,
  0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2,
  0x0a950, 0x0b557, 0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573,
  0x052b0, 0x0a9a8, 0x0e950, 0x06aa0, 0x0aea6, 0x0ab50, 0x04b60, 0x0aae4,
  0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0, 0x096d0, 0x04dd5,
  0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b5a0, 0x195a6,
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46,
  0x0ab60, 0x09570, 0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58,
  0x05ac0, 0x0ab60, 0x096d5, 0x092e0, 0x0c960, 0x0d954, 0x0d4a0, 0x0da50,
  0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5, 0x0a950, 0x0b4a0,
  0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260,
  0x0ea65, 0x0d530, 0x05aa0, 0x076a3, 0x096d0, 0x04bd7, 0x04ad0, 0x0a4d0,
  0x1d0b6, 0x0d250, 0x0d520, 0x0dd45, 0x0b5a0, 0x056d0, 0x055b2, 0x049b0,
  0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0, 0x14b63, 0x09370,
  0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06aa0, 0x0aea4, 0x0ab50,
  0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540,
  0x0b5a0, 0x195a6, 0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50,
  0x06d40, 0x0af46, 0x0ab60, 0x09570, 0x04af5, 0x04970, 0x064b0, 0x074a3,
  0x0ea50, 0x06b58, 0x05ac0, 0x0ab60, 0x096d5, 0x092e0, 0x0c960, 0x0d954,
  0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176,
  0x052b0, 0x0a930, 0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6,
  0x0a4e0, 0x0d260, 0x0ea65, 0x0d530, 0x05aa0, 0x076a3, 0x096d0, 0x04bd7,
  0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45, 0x0b5a0, 0x056d0,
  0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,
  0x14b63,
];

function lYearDays(y) {
  let sum = 348;
  const info = LUNAR_INFO[y - 1900];
  for (let i = 0x8000; i > 0x8; i >>= 1) {
    sum += info & i ? 1 : 0;
  }
  return sum + leapDays(y);
}

function leapMonth(y) {
  return LUNAR_INFO[y - 1900] & 0xf;
}

function leapDays(y) {
  if (leapMonth(y)) {
    return LUNAR_INFO[y - 1900] & 0x10000 ? 30 : 29;
  }
  return 0;
}

function monthDays(y, m) {
  return LUNAR_INFO[y - 1900] & (0x10000 >> m) ? 30 : 29;
}

function cyclical(num) {
  return `${STEMS[num % 10]}${BRANCHES[num % 12]}`;
}

function solarToLunar(y, m, d) {
  const base = Date.UTC(1900, 0, 31);
  const target = Date.UTC(y, m - 1, d);
  let offset = Math.floor((target - base) / 86400000);
  let dayCyl = offset + 40;
  let monCyl = 14;

  let year = 1900;
  let temp = 0;
  for (year = 1900; year < 2101 && offset > 0; year++) {
    temp = lYearDays(year);
    offset -= temp;
    monCyl += 12;
  }
  if (offset < 0) {
    offset += temp;
    year--;
    monCyl -= 12;
  }

  const yearCyl = year - 1864;
  const leap = leapMonth(year);
  let isLeap = false;
  let month = 1;

  for (month = 1; month < 13 && offset > 0; month++) {
    if (leap > 0 && month === leap + 1 && !isLeap) {
      --month;
      isLeap = true;
      temp = leapDays(year);
    } else {
      temp = monthDays(year, month);
    }
    if (isLeap && month === leap + 1) isLeap = false;
    offset -= temp;
    if (!isLeap) monCyl++;
  }

  if (offset === 0 && leap > 0 && month === leap + 1) {
    if (isLeap) {
      isLeap = false;
    } else {
      isLeap = true;
      --month;
      --monCyl;
    }
  }

  if (offset < 0) {
    offset += temp;
    --month;
    --monCyl;
  }

  const day = offset + 1;

  return {
    lYear: year,
    lMonth: month,
    lDay: day,
    isLeap,
    cYear: cyclical(yearCyl),
    cMonth: cyclical(monCyl),
    cDay: cyclical(dayCyl),
    dayCyl,
    monCyl,
  };
}

function isLunarSupported(year) {
  return year >= 1900 && year <= 2100;
}

const SOLAR_TERM_INFO = [
  0, 21208, 42467, 63836, 85337, 107014, 128867, 150921, 173149, 195551, 218072,
  240693, 263343, 285989, 308563, 331033, 353350, 375494, 397447, 419210, 440795,
  462224, 483532, 504758,
];

const SOLAR_TERMS = [
  "小寒", "大寒", "立春", "雨水", "惊蛰", "春分",
  "清明", "谷雨", "立夏", "小满", "芒种", "夏至",
  "小暑", "大暑", "立秋", "处暑", "白露", "秋分",
  "寒露", "霜降", "立冬", "小雪", "大雪", "冬至",
];

function solarTermDay(year, index) {
  const base = Date.UTC(1900, 0, 6, 2, 5);
  const ms =
    31556925974.7 * (year - 1900) + SOLAR_TERM_INFO[index] * 60000 + base;
  return new Date(ms).getUTCDate();
}

function getSolarTerm(year, month, day) {
  const idx = (month - 1) * 2;
  const day1 = solarTermDay(year, idx);
  const day2 = solarTermDay(year, idx + 1);
  if (day === day1) return SOLAR_TERMS[idx];
  if (day === day2) return SOLAR_TERMS[idx + 1];
  return "";
}

function getZodiacByLunarYear(year) {
  return ZODIAC[mod(year - 4, 12)];
}

const CH_MONTH = ["正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "冬", "腊"];
const CH_DAY_TEN = ["初", "十", "廿", "三"];
const CH_DAY = [
  "初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十",
  "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
  "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十",
];

function formatLunarDate(lMonth, lDay, isLeap) {
  const monthName = CH_MONTH[lMonth - 1] || "";
  const dayName = CH_DAY[lDay - 1] || "";
  return `${isLeap ? "闰" : ""}${monthName}月${dayName}`;
}

// 传统黄历建除十二神 - 增强版，加入八卦、五行等元素
const YI_JI_BY_JIAN = {
  建: {
    yi: ["出行", "上任", "会友", "求财", "开市"],
    ji: ["动土", "开仓", "安葬", "修造"],
    // 八卦对应
    trigram: "震", // 震卦，代表行动、出发
    element: "木",
    meaning: "建始，万物生发之象，宜开始新事务",
    // 五行生克关系
    generates: "水", // 水生木
    overcomes: "土", // 木克土
  },
  除: {
    yi: ["解除", "祭祀", "祈福", "求医", "出行"],
    ji: ["结婚", "搬家", "开市", "诉讼"],
    trigram: "艮", // 艮卦，代表停止、清理
    element: "土",
    meaning: "清除旧物，更新气象，适宜消除不良因素",
    generates: "金", // 土生金
    overcomes: "水", // 土克水
  },
  满: {
    yi: ["祭祀", "祈福", "求财", "结婚", "修造"],
    ji: ["赴任", "求医", "栽种", "出行"],
    trigram: "坎", // 坎卦，代表险阻、充满
    element: "水",
    meaning: "圆满充盈，适宜完成事物，但需防过满",
    generates: "木", // 水生木
    overcomes: "火", // 水克火
  },
  平: {
    yi: ["祭祀", "修补", "涂泥", "交易", "安床"],
    ji: ["开市", "远行", "开仓", "动土"],
    trigram: "兑", // 兑卦，代表和谐、平衡
    element: "金",
    meaning: "平稳安宁，适宜巩固基础，不宜轻举妄动",
    generates: "水", // 金生水
    overcomes: "木", // 金克木
  },
  定: {
    yi: ["交易", "立券", "会友", "订婚", "求职"],
    ji: ["诉讼", "出行", "开仓", "移徙"],
    trigram: "坤", // 坤卦，代表稳定、确定
    element: "土",
    meaning: "安定稳固，适宜确立关系，奠定基础",
    generates: "金", // 土生金
    overcomes: "水", // 土克水
  },
  执: {
    yi: ["祈福", "祭祀", "求子", "结婚", "立约"],
    ji: ["开市", "交易", "搬家", "安床"],
    trigram: "巽", // 巽卦，代表渗透、执行
    element: "木",
    meaning: "执行决定，适宜坚持既定计划，履行承诺",
    generates: "火", // 木生火
    overcomes: "土", // 木克土
  },
  破: {
    yi: ["破屋", "坏垣", "求医", "解除"],
    ji: ["结婚", "出行", "开市", "动土"],
    trigram: "离", // 离卦，代表分离、破坏
    element: "火",
    meaning: "破旧立新，适宜打破陈规，但需谨慎从事",
    generates: "土", // 火生土
    overcomes: "金", // 火克金
  },
  危: {
    yi: ["交易", "立券", "安床", "求财", "祭祀"],
    ji: ["登山", "乘船", "动土", "远行"],
    trigram: "乾", // 乾卦，代表刚健、进取
    element: "金",
    meaning: "危险与机遇并存，需谨慎应对，防范风险",
    generates: "水", // 金生水
    overcomes: "木", // 金克木
  },
  成: {
    yi: ["结婚", "开市", "修造", "入学", "出行"],
    ji: ["诉讼", "争执", "安葬"],
    trigram: "乾", // 乾卦，代表成就、成功
    element: "金",
    meaning: "事情成就，适宜庆祝完成，收获成果",
    generates: "水", // 金生水
    overcomes: "木", // 金克木
  },
  收: {
    yi: ["祭祀", "求财", "签约", "纳畜", "立券"],
    ji: ["安床", "造葬", "搬家"],
    trigram: "坤", // 坤卦，代表收藏、收纳
    element: "土",
    meaning: "收敛聚集，适宜储蓄积累，整理归纳",
    generates: "金", // 土生金
    overcomes: "水", // 土克水
  },
  开: {
    yi: ["祭祀", "祈福", "开市", "出行", "交易"],
    ji: ["安葬", "诉讼", "动土"],
    trigram: "震", // 震卦，代表开启、发动
    element: "木",
    meaning: "开启门户，万事亨通，适宜开展新事业",
    generates: "火", // 木生火
    overcomes: "土", // 木克土
  },
  闭: {
    yi: ["祭祀", "交易", "纳财", "安葬"],
    ji: ["出行", "结婚", "开市"],
    trigram: "艮", // 艮卦，代表闭藏、静止
    element: "土",
    meaning: "闭藏收敛，适宜休养生息，不宜外务",
    generates: "金", // 土生金
    overcomes: "水", // 土克水
  },
};

const SHICHEN = [
  { label: "子时", range: "23:00-01:00", branch: "子", element: "水" },
  { label: "丑时", range: "01:00-03:00", branch: "丑", element: "土" },
  { label: "寅时", range: "03:00-05:00", branch: "寅", element: "木" },
  { label: "卯时", range: "05:00-07:00", branch: "卯", element: "木" },
  { label: "辰时", range: "07:00-09:00", branch: "辰", element: "土" },
  { label: "巳时", range: "09:00-11:00", branch: "巳", element: "火" },
  { label: "午时", range: "11:00-13:00", branch: "午", element: "火" },
  { label: "未时", range: "13:00-15:00", branch: "未", element: "土" },
  { label: "申时", range: "15:00-17:00", branch: "申", element: "金" },
  { label: "酉时", range: "17:00-19:00", branch: "酉", element: "金" },
  { label: "戌时", range: "19:00-21:00", branch: "戌", element: "土" },
  { label: "亥时", range: "21:00-23:00", branch: "亥", element: "水" },
];

// 三合局
const SANHE_GROUPS = [
  ["申", "子", "辰"], // 申子辰水局
  ["寅", "午", "戌"], // 寅午戌火局
  ["亥", "卯", "未"], // 亥卯未木局
  ["巳", "酉", "丑"], // 巳酉丑金局
];

function getSanhe(branch) {
  for (const group of SANHE_GROUPS) {
    if (group.includes(branch)) return group;
  }
  return [branch];
}

// 六冲
const LIUCHONG = {
  "子": "午",
  "丑": "未",
  "寅": "申", 
  "卯": "酉",
  "辰": "戌",
  "巳": "亥",
  "午": "子",
  "未": "丑",
  "申": "寅",
  "酉": "卯",
  "戌": "辰",
  "亥": "巳"
};

function getYearGanzhi(date) {
  let year = date.getFullYear();
  const lichunDay = solarTermDay(year, 2);
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if (m < 2 || (m === 2 && d < lichunDay)) {
    year -= 1;
  }
  return cyclical(year - 1864);
}

function getMonthBranchIndex(date) {
  const year = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if (m === 2) {
    const lichunDay = solarTermDay(year, 2);
    if (d < lichunDay) return 11;
  }
  if (m === 1) {
    const xiaohanDay = solarTermDay(year, 0);
    return d >= xiaohanDay ? 11 : 10;
  }

  const starts = [
    { m: 2, d: solarTermDay(year, 2), idx: 0 },
    { m: 3, d: solarTermDay(year, 4), idx: 1 },
    { m: 4, d: solarTermDay(year, 6), idx: 2 },
    { m: 5, d: solarTermDay(year, 8), idx: 3 },
    { m: 6, d: solarTermDay(year, 10), idx: 4 },
    { m: 7, d: solarTermDay(year, 12), idx: 5 },
    { m: 8, d: solarTermDay(year, 14), idx: 6 },
    { m: 9, d: solarTermDay(year, 16), idx: 7 },
    { m: 10, d: solarTermDay(year, 18), idx: 8 },
    { m: 11, d: solarTermDay(year, 20), idx: 9 },
    { m: 12, d: solarTermDay(year, 22), idx: 10 },
  ];

  let idx = 10;
  for (const start of starts) {
    if (m > start.m || (m === start.m && d >= start.d)) {
      idx = start.idx;
    }
  }
  return idx;
}

function getMonthGanzhi(date, yearGanzhi) {
  const monthIndex = getMonthBranchIndex(date);
  const yearStemIndex = STEMS.indexOf(yearGanzhi[0]);
  const monthStemIndex = mod(yearStemIndex * 2 + monthIndex + 2, 10);
  return `${STEMS[monthStemIndex]}${MONTH_BRANCHES[monthIndex]}`;
}

function getTenGod(dayStem, targetStem) {
  if (!dayStem || !targetStem) return "";
  const dayElement = STEM_TO_ELEMENT[dayStem];
  const targetElement = STEM_TO_ELEMENT[targetStem];
  if (!dayElement || !targetElement) return "";
  const samePolarity = STEM_YIN_YANG[dayStem] === STEM_YIN_YANG[targetStem];
  if (dayElement === targetElement) {
    return samePolarity ? "比肩" : "劫财";
  }
  if (ELEMENT_SHENG[dayElement] === targetElement) {
    return samePolarity ? "食神" : "伤官";
  }
  if (ELEMENT_SHENG[targetElement] === dayElement) {
    return samePolarity ? "偏印" : "正印";
  }
  if (ELEMENT_KE[dayElement] === targetElement) {
    return samePolarity ? "偏财" : "正财";
  }
  if (ELEMENT_KE[targetElement] === dayElement) {
    return samePolarity ? "七杀" : "正官";
  }
  return "";
}

function getHourBranchIndex(hour) {
  if (hour === 23) return 0;
  return Math.floor((hour + 1) / 2) % 12;
}

function buildElementSummary(counts) {
  const entries = Object.entries(counts);
  let dominant = entries[0][0];
  let weak = entries[0][0];
  for (const [key, value] of entries) {
    if (value > counts[dominant]) dominant = key;
    if (value < counts[weak]) weak = key;
  }
  const diff = counts[dominant] - counts[weak];
  if (diff >= 3) {
    return `五行偏${dominant}，${weak}偏弱。`;
  }
  if (diff >= 2) {
    return `五行略偏${dominant}。`;
  }
  return "五行较均衡。";
}

// 根据生辰八字推算命理（按节气分年、节气分月、23点起日）
function calculateBaZi({ y, m, d, timeHm, longitude }) {
  if (!y || !m || !d) return null;

  const parsedHm = parseHm(timeHm);
  const timeKnown = Boolean(parsedHm);
  let hour = parsedHm ? parsedHm.h : 0;
  let min = parsedHm ? parsedHm.min : 0;

  let solarAdjusted = false;
  let solarOffsetMinutes = 0;
  const lon = parseLongitude(longitude);
  if (timeKnown && lon !== null) {
    const offset = Math.round((lon - 120) * 4);
    if (offset !== 0) {
      const adjusted = new Date(y, m - 1, d, hour, min);
      adjusted.setMinutes(adjusted.getMinutes() + offset);
      y = adjusted.getFullYear();
      m = adjusted.getMonth() + 1;
      d = adjusted.getDate();
      hour = adjusted.getHours();
      min = adjusted.getMinutes();
      solarAdjusted = true;
      solarOffsetMinutes = offset;
    }
  }

  const baseDate = new Date(y, m - 1, d);
  if (hour >= 23) {
    baseDate.setDate(baseDate.getDate() + 1);
  }

  const yearGanzhi = getYearGanzhi(baseDate);
  const monthGanzhi = getMonthGanzhi(baseDate, yearGanzhi);
  const dayCyl = getDayCyl(baseDate.getFullYear(), baseDate.getMonth() + 1, baseDate.getDate());
  const dayGanzhi = cyclical(dayCyl);

  const dayStemIndex = STEMS.indexOf(dayGanzhi[0]);
  const hourBranchIndex = getHourBranchIndex(hour);
  const hourStemIndex = mod(dayStemIndex * 2 + hourBranchIndex, 10);
  const hourGanzhi = `${STEMS[hourStemIndex]}${BRANCHES[hourBranchIndex]}`;
  const hourInfo = SHICHEN[hourBranchIndex];
  const dayStem = dayGanzhi[0];
  const tenGods = {
    year: getTenGod(dayStem, yearGanzhi[0]),
    month: getTenGod(dayStem, monthGanzhi[0]),
    day: "日主",
    hour: getTenGod(dayStem, hourGanzhi[0]),
  };

  const counts = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  const pillars = [yearGanzhi, monthGanzhi, dayGanzhi, hourGanzhi];
  for (const pillar of pillars) {
    const stem = pillar[0];
    const branch = pillar[1];
    const stemElement = STEM_TO_ELEMENT[stem];
    const branchElement = BRANCH_TO_ELEMENT[branch];
    if (stemElement) counts[stemElement] += 1;
    if (branchElement) counts[branchElement] += 1;
  }

  return {
    year: yearGanzhi,
    month: monthGanzhi,
    day: dayGanzhi,
    hour: hourGanzhi,
    hourLabel: hourInfo ? hourInfo.label : "",
    hourRange: hourInfo ? hourInfo.range : "",
    timeKnown,
    elements: {
      year: STEM_TO_ELEMENT[yearGanzhi[0]],
      month: STEM_TO_ELEMENT[monthGanzhi[0]],
      day: STEM_TO_ELEMENT[dayGanzhi[0]],
      hour: STEM_TO_ELEMENT[hourGanzhi[0]],
    },
    counts,
    summary: buildElementSummary(counts),
    timeHint: timeKnown ? `${pad2(hour)}:${pad2(min)}` : "未填时辰",
    timeAdjusted: solarAdjusted,
    timeOffsetMinutes: solarOffsetMinutes,
    tenGods,
  };
}

function getAlmanac(dateKey) {
  const parsed = parseYmd(dateKey);
  const date = parsed ? parsed.date : new Date();
  const solar = {
    y: date.getFullYear(),
    m: date.getMonth() + 1,
    d: date.getDate(),
  };

  const lunar = solarToLunar(solar.y, solar.m, solar.d);
  const lunarDate = formatLunarDate(lunar.lMonth, lunar.lDay, lunar.isLeap);
  const solarTerm = getSolarTerm(solar.y, solar.m, solar.d);

  const dayBranchIndex = mod(lunar.dayCyl, 12);
  const dayBranch = BRANCHES[dayBranchIndex];
  const monthBranchIndex = mod(lunar.lMonth + 1, 12); // lunar month 1 -> 寅
  const jianchuIndex = mod(dayBranchIndex - monthBranchIndex, 12);
  const JIANCHU = ["建", "除", "满", "平", "定", "执", "破", "危", "成", "收", "开", "闭"];
  const jianchu = JIANCHU[jianchuIndex];
  const yiJi = YI_JI_BY_JIAN[jianchu] || { yi: [], ji: [], trigram: "坤", element: "土", meaning: "平稳安宁" };

  // 三合吉时
  const sanhe = getSanhe(dayBranch).filter((b) => b !== dayBranch);
  const luckyTimes = sanhe
    .map((b) => {
      const shichen = SHICHEN.find(sc => sc.branch === b);
      return shichen ? `${shichen.label} ${shichen.range}` : "";
    })
    .filter(Boolean);

  // 冲煞时辰
  const chongBranch = LIUCHONG[dayBranch];
  const avoidTimeSlot = SHICHEN.find(sc => sc.branch === chongBranch);

  return {
    solar: `${solar.y}-${pad2(solar.m)}-${pad2(solar.d)}`,
    lunarDate,
    solarTerm,
    ganzhiDay: lunar.cDay,
    ganzhiMonth: lunar.cMonth,
    ganzhiYear: lunar.cYear,
    dayAnimal: getZodiacByLunarYear(lunar.lYear),
    jianchu,
    jianchuMeaning: yiJi.meaning,
    jianchuTrigram: yiJi.trigram,
    jianchuElement: yiJi.element,
    yi: yiJi.yi,
    ji: yiJi.ji,
    luckyTimes,
    avoidTime: avoidTimeSlot ? `${avoidTimeSlot.label} ${avoidTimeSlot.range}` : "",
    dayBranch, // 当日地支
    dayElement: STEM_TO_ELEMENT[lunar.cDay[0]] // 当日天干五行
  };
}

function scoreToLevel(score) {
  if (score >= 90) return "大吉";
  if (score >= 75) return "中吉";
  if (score >= 60) return "小吉";
  if (score >= 45) return "平";
  return "小凶";
}

// 麻将运势与八卦五行结合（建除各100条）
const LEGACY_MAHJONG_HINTS = {
  建: [
    "今日运势向上，宜主动出击，先声夺人。",
    "适合快节奏打法，抢占先机。",
    "开局宜快速组牌，建立优势。",
    "积极听牌，把握时机胡牌。"
  ],
  除: [
    "今日宜去除杂念，专注牌局。",
    "清理手中废牌，集中精力。",
    "适时改变策略，灵活应变。",
    "放下包袱，轻松应对。"
  ],
  满: [
    "运势饱满，宜稳中求胜。",
    "手中牌型丰富，可适当提高目标。",
    "注意不要贪大牌而错失良机。",
    "见好就收，避免因满而溢。"
  ],
  平: [
    "今日平和，以稳健为主。",
    "不宜冒险，稳扎稳打。",
    "保持平常心，避免情绪波动。",
    "防守为先，伺机而动。"
  ],
  定: [
    "运势稳定，宜定下心神。",
    "确定策略后不要轻易更改。",
    "稳中求进，步步为营。",
    "定下目标，坚定执行。"
  ],
  执: [
    "执行力强，按计划行事。",
    "坚持既定策略，不轻易动摇。",
    "抓住机会，果断行动。",
    "执行到位，功到自然成。"
  ],
  破: [
    "破而后立，可打破常规。",
    "旧策略不灵，需创新思维。",
    "破除固有思维，寻找新机会。",
    "敢于冒险，或有意外收获。"
  ],
  危: [
    "小心谨慎，防范风险。",
    "注意安全牌，避免点炮。",
    "形势复杂，需多加思考。",
    "稳中求存，等待转机。"
  ],
  成: [
    "事半功倍，易获成功。",
    "牌运亨通，宜抓住机会。",
    "成功率高，可适当进取。",
    "乘势而上，扩大战果。"
  ],
  收: [
    "宜收敛锋芒，低调行事。",
    "见好就收，积少成多。",
    "注重防守，稳中求胜。",
    "积累实力，蓄势待发。"
  ],
  开: [
    "开门红，万事顺利。",
    "新开局必胜，宜积极进取。",
    "机会来临，当仁不让。",
    "开门见山，直奔主题。"
  ],
  闭: [
    "宜静不宜动，保守为上。",
    "不宜久战，速战速决。",
    "收敛锋芒，避免冲突。",
    "休养生息，来日再战。"
  ],
};

const JIANCHU_HINT_SEEDS = {
  建: {
    a: ["建日开局", "宜开局抢势", "适合早听", "起手易成型", "先手有利", "顺势开张", "先攻占位", "主动推进", "抢先布局", "开门见红"],
    b: ["先声夺人", "快成快胡", "先做顺牌", "提速推进", "抓住先机", "顺势提速", "多看进张", "先稳后攻", "压制对手", "抢先成势"],
  },
  除: {
    a: ["除日宜清理", "先弃杂牌", "去旧换新", "手牌混杂需清理", "宜去破张", "先整理牌型", "清除累赘", "收敛杂张", "先断废牌", "去散归整"],
    b: ["集中成型", "稳住节奏", "再寻冲击", "减少冒进", "以稳为主", "避免贪番", "听口更清晰", "收窄牌路", "守住安全口", "循序渐进"],
  },
  满: {
    a: ["满日气盛", "手牌较顺", "成型机会多", "进张顺畅", "牌势饱满", "场面顺风", "起手顺利", "运势充足", "节奏容易带起", "领先机会多"],
    b: ["稳中求胜", "见好就收", "避免贪大", "小胡稳分", "快成快收", "控制风险", "稳住优势", "别过满则溢", "适度提速", "锁定优势"],
  },
  平: {
    a: ["平日平稳", "局势均衡", "场面胶着", "手牌一般", "进张普通", "对手相当", "牌河复杂", "中盘拉锯", "节奏平缓", "优势不明"],
    b: ["稳扎稳打", "守中求进", "控制节奏", "小胡积累", "先稳后冲", "稳听为先", "观察再动", "别急冒进", "保持均衡", "稳分为上"],
  },
  定: {
    a: ["定日宜定策", "稳定心态", "确定打法", "牌型稳定", "不宜频变", "布局清晰", "节奏可控", "稳听为主", "手牌规整", "路线明确"],
    b: ["坚持执行", "稳住牌型", "少改牌路", "稳步推进", "守住节奏", "稳听到胡", "稳中求胜", "按计划推进", "先稳后动", "守成不乱"],
  },
  执: {
    a: ["执日重执行", "执行力强", "遵循计划", "按牌型推进", "坚持策略", "稳住思路", "牌路清晰", "起手成型", "进张可期", "稳步推进"],
    b: ["少犹豫", "果断出手", "按既定走", "持续推进", "听牌即守", "稳扎稳打", "不轻易改", "稳步收分", "保持节奏", "抓住时机"],
  },
  破: {
    a: ["破日宜破局", "旧路不通", "需打破常规", "手牌受阻", "易有变数", "局势波动", "牌型易碎", "节奏易乱", "对手压制", "进张受阻"],
    b: ["调整思路", "果断变张", "大胆拆牌", "寻找新路", "敢于求变", "以变应变", "小心冒进", "先稳后破", "破而后立", "抓住转机"],
  },
  危: {
    a: ["危日宜谨慎", "风险较大", "危险牌多", "点炮风险高", "对手有压", "局势偏险", "进张不稳", "牌河凶", "起手不顺", "中盘受制"],
    b: ["先保分", "稳守安全口", "少碰少杠", "避免冒险", "稳住节奏", "守住牌型", "慢打等机", "留足退路", "先防后攻", "谨慎推进"],
  },
  成: {
    a: ["成日易有成果", "成型机会多", "手气顺", "进张连上", "牌型易成", "局势向好", "起手见喜", "对手易漏", "节奏领先", "运势高涨"],
    b: ["抓住胜机", "顺势收分", "快成快胡", "稳住优势", "乘胜追击", "稳收分差", "见好就收", "不贪冒进", "锁定优势", "稳中快攻"],
  },
  收: {
    a: ["收日宜收敛", "适合收分", "局势可控", "牌型稳固", "中盘见利", "节奏偏稳", "进张尚可", "优势可守", "手牌成型", "稳局可收"],
    b: ["稳收分差", "减少冒险", "见好就收", "稳听收口", "守住优势", "慢打稳胡", "小胡积累", "把握收益", "稳中收势", "收拢战线"],
  },
  开: {
    a: ["开日气开", "利开局", "起手顺畅", "先手有利", "节奏易起", "牌势可开", "进张开门", "容易成型", "场面向上", "先发优势"],
    b: ["主动出击", "抢先成型", "提速推进", "敢于进攻", "快胡抢势", "先攻后守", "稳中提速", "抓住先机", "加压压场", "冲分拉开"],
  },
  闭: {
    a: ["闭日宜守", "收敛为主", "局势偏稳", "进张偏慢", "牌路宜缩", "手牌偏散", "对手压制", "节奏放缓", "不宜冒进", "起手平淡"],
    b: ["先稳后动", "保安全口", "少碰少杠", "稳听待机", "收缩牌型", "稳守收分", "慢打防炮", "守住节奏", "留好退路", "谨慎推进"],
  },
};

const MAHJONG_HINTS = Object.fromEntries(
  Object.entries(JIANCHU_HINT_SEEDS).map(([key, seed]) => [
    key,
    mergePool(
      buildComboPool(seed.a, seed.b, 100, "，"),
      LEGACY_MAHJONG_HINTS[key] || [],
      100
    ),
  ])
);

// 八卦对应的麻将策略
const TRIGRAM_STRATEGIES = {
  乾: { word: "健", style: "积极进取", key: "attack", desc: "天行健，君子以自强不息" },
  坤: { word: "顺", style: "稳扎稳打", key: "balance", desc: "地势坤，君子以厚德载物" },
  震: { word: "动", style: "迅速反应", key: "attack", desc: "雷震，行动迅速" },
  巽: { word: "入", style: "灵活变通", key: "balance", desc: "风入，渗透变化" },
  坎: { word: "陷", style: "谨慎小心", key: "defend", desc: "水陷，小心陷阱" },
  离: { word: "丽", style: "光明正大", key: "balance", desc: "火丽，明察秋毫" },
  艮: { word: "止", style: "适可而止", key: "defend", desc: "山止，知止而后定" },
  兌: { word: "悦", style: "和谐共赢", key: "balance", desc: "泽悦，和气生财" }
};

const STRATEGY_TITLE_A = {
  attack: ["抢先", "提速", "直进", "快打", "连动", "压制", "强攻", "破局", "急攻", "猛冲", "破阵", "冲锋"],
  balance: ["稳进", "中速", "控场", "稳盘", "续航", "节奏", "均衡", "稳听", "持稳", "慢进", "稳控", "慢稳"],
  defend: ["稳守", "收口", "低调", "护盘", "避锋", "缓守", "收缩", "稳防", "回守", "慎守", "封口", "守底"],
};

const STRATEGY_TITLE_B = {
  attack: ["成型", "抢势", "强听", "快胡", "压场", "逼张", "抢先", "快成", "突进", "冲分", "立势", "提分"],
  balance: ["求稳", "控势", "稳分", "守听", "稳线", "调速", "稳打", "稳收", "稳局", "稳形", "续势", "稳场"],
  defend: ["保分", "护势", "稳口", "避险", "守分", "缓进", "收势", "稳听", "封口", "退守", "守局", "退控"],
};

const STRATEGY_DESC_A = {
  attack: [
    "起手就抢节奏", "有利即推", "牌型成则提速", "场面顺就加压", "听牌就施压",
    "顺手就进攻", "强听优先", "上手就推进", "抢先成型", "快攻见好",
    "手顺就提速", "先动压场",
  ],
  balance: [
    "先稳后进", "节奏为先", "听牌不乱改", "稳住牌形", "进退有度",
    "控场不冒险", "以稳为主", "稳中求进", "张力适中", "稳听保底",
    "牌势平稳先守", "稳住牌河",
  ],
  defend: [
    "先保安全口", "少碰少杠", "危险张回避", "守牌优先", "别硬追",
    "能胡就收", "先稳分差", "低番快胡", "稳住防线", "别贪大牌",
    "手弱就先缩线", "对手强就稳住",
  ],
};

const STRATEGY_DESC_B = {
  attack: [
    "快速成型后扩大优势", "抢先听牌再择机胡", "进张到位就果断冲",
    "适度冒险争取高效", "趁势扩大领先", "牌顺就加速收割",
    "对手慢就持续压制", "手顺时多胡几口", "抢先听口锁定", "先攻后守见机收",
    "连续压制锁定局面", "领先时稳收优势",
  ],
  balance: [
    "控制风险再争番", "稳住节奏再提速", "中盘保持稳定", "场面清晰再发力",
    "稳中拿分更安全", "听牌即守不冒险", "小胡不断稳分差", "循序渐进不急躁",
    "稳局为主再找机会", "注意牌河保持节奏",
    "稳中抓机会提速", "保持均衡不贪大",
  ],
  defend: [
    "先守分再找机会", "减少冲动碰杠", "守住安全牌", "避免点炮",
    "低风险推进", "局势不明先看牌", "控风险再进张", "留后路防反击",
    "守住节奏慢慢转", "先稳后动更稳",
    "守好安全口再寻张", "避险为先慢慢翻",
  ],
};

const STRATEGY_POOL = {
  attack: buildStrategyPool(
    STRATEGY_TITLE_A.attack,
    STRATEGY_TITLE_B.attack,
    STRATEGY_DESC_A.attack,
    STRATEGY_DESC_B.attack,
    100
  ),
  balance: buildStrategyPool(
    STRATEGY_TITLE_A.balance,
    STRATEGY_TITLE_B.balance,
    STRATEGY_DESC_A.balance,
    STRATEGY_DESC_B.balance,
    100
  ),
  defend: buildStrategyPool(
    STRATEGY_TITLE_A.defend,
    STRATEGY_TITLE_B.defend,
    STRATEGY_DESC_A.defend,
    STRATEGY_DESC_B.defend,
    100
  ),
};

const LEGACY_WORDS = {
  木: [
    "生发", "抽枝", "舒展", "进张", "连枝", "成型", "护势", "缓进", "稳进", "柔进",
    "聚木", "顺藤", "续势", "养势", "清润", "合围", "平展", "长线", "轻进", "守序",
  ],
  火: [
    "火势", "速攻", "连胡", "抢势", "快打", "热手", "强冲", "直进", "急张", "闪攻",
    "提速", "燃势", "点火", "爆发", "烈进", "快成", "强听", "抢先", "急变", "冲刺",
  ],
  土: [
    "稳扎", "厚守", "固盘", "收分", "稳局", "厚势", "沉稳", "盘活", "守成", "稳收",
    "缓守", "稳听", "厚积", "稳落", "安盘", "守势", "稳压", "稳守", "固守", "稳盘",
  ],
  金: [
    "精准", "决断", "控场", "破势", "断张", "收割", "明打", "快断", "稳削", "铁守",
    "快切", "准进", "斩张", "直取", "利落", "果断", "切换", "凝势", "冷切", "击中",
  ],
  水: [
    "潜行", "暗藏", "回旋", "渗透", "灵动", "巧避", "转势", "顺流", "缓行", "静听",
    "迂回", "藏锋", "引流", "避锋", "回收", "柔守", "流转", "轻守", "顺波", "化势",
  ],
};

const WORD_SEEDS = {
  木: {
    a: ["生发", "舒展", "连枝", "顺藤", "护势", "养势", "清润", "柔进", "长线", "合围"],
    b: ["稳进", "缓攻", "守势", "稳听", "成型", "续航", "进张", "聚势", "收分", "稳盘"],
  },
  火: {
    a: ["火势", "急攻", "快打", "热手", "强冲", "直进", "连胡", "提速", "点火", "爆发"],
    b: ["快成", "猛进", "抢势", "冲分", "强听", "压场", "速胡", "连动", "急张", "逼张"],
  },
  土: {
    a: ["稳扎", "厚守", "固盘", "收分", "稳局", "厚势", "沉稳", "守成", "安盘", "稳听"],
    b: ["缓进", "稳守", "护口", "固守", "收势", "稳收", "续航", "稳盘", "稳压", "缓打"],
  },
  金: {
    a: ["精准", "决断", "控场", "断张", "破势", "快切", "利落", "收割", "冷切", "斩张"],
    b: ["稳削", "直取", "快断", "压制", "封口", "锁势", "切换", "定势", "准进", "制胜"],
  },
  水: {
    a: ["潜行", "暗藏", "回旋", "渗透", "灵动", "转势", "顺流", "藏锋", "迂回", "静听"],
    b: ["缓行", "柔守", "避锋", "化势", "引流", "稳转", "轻守", "顺波", "回收", "守势"],
  },
};

const WORD_BY_ELEMENT = {
  木: mergePool(buildComboPool(WORD_SEEDS.木.a, WORD_SEEDS.木.b, 100), LEGACY_WORDS.木, 100),
  火: mergePool(buildComboPool(WORD_SEEDS.火.a, WORD_SEEDS.火.b, 100), LEGACY_WORDS.火, 100),
  土: mergePool(buildComboPool(WORD_SEEDS.土.a, WORD_SEEDS.土.b, 100), LEGACY_WORDS.土, 100),
  金: mergePool(buildComboPool(WORD_SEEDS.金.a, WORD_SEEDS.金.b, 100), LEGACY_WORDS.金, 100),
  水: mergePool(buildComboPool(WORD_SEEDS.水.a, WORD_SEEDS.水.b, 100), LEGACY_WORDS.水, 100),
};

const MAHJONG_WORDS = Object.values(WORD_BY_ELEMENT).flat();

const WORD_EXPLAIN_BY_ELEMENT = {
  木: "木主生发，宜稳进慢攻，守住节奏。",
  火: "火主迅猛，宜提速抢先，快成快胡。",
  土: "土主厚稳，宜稳守收分，少冒进。",
  金: "金主决断，宜控场断张，出手果断。",
  水: "水主灵动，宜藏锋回旋，伺机而动。",
};

// 根据日干支匹配五行，再对应到八卦
const DAYGAN_TRIGRAM_MAPPING = {
  "甲": "震", // 甲木对应震卦
  "乙": "巽", // 乙木对应巽卦
  "丙": "离", // 丙火对应离卦
  "丁": "离", // 丁火对应离卦
  "戊": "坤", // 戊土对应坤卦
  "己": "坤", // 己土对应坤卦
  "庚": "乾", // 庚金对应乾卦
  "辛": "兑", // 辛金对应兑卦
  "壬": "坎", // 壬水对应坎卦
  "癸": "坎"  // 癸水对应坎卦
};

// 五行相生相克对麻将的影响
const WUXING_RELATIONS = {
  // 相生关系带来的好运
  "木生火": "运势上升，进攻有力",
  "火生土": "财运亨通，稳中有升", 
  "土生金": "贵人相助，稳中求胜",
  "金生水": "智慧开启，灵活应对",
  "水生木": "生机勃勃，活力无限",
  
  // 相克关系需要注意
  "木克土": "注意阻碍，稳步前行",
  "土克水": "限制较多，耐心应对",
  "水克火": "压力较大，冷静处理",
  "火克金": "阻力重重，坚持到底",
  "金克木": "竞争激烈，谨慎应对"
};

const ELEMENT_KE = {
  木: "土",
  土: "水",
  水: "火",
  火: "金",
  金: "木",
};

const ELEMENT_SHENG = {
  木: "火",
  火: "土",
  土: "金",
  金: "水",
  水: "木",
};

const ELEMENTS = ["木", "火", "土", "金", "水"];

const MAHJONG_SUITS = ["万子", "条子", "筒子"];

const ELEMENT_TO_SUIT = {
  木: "条子",
  火: "万子",
  土: "万子",
  金: "筒子",
  水: "条子",
};

function getWuxingRelation(personalElement, dayElement) {
  if (!personalElement || !dayElement) {
    return {
      type: "neutral",
      label: "平",
      delta: 0,
      text: "五行未明，保持平常心。",
    };
  }

  if (personalElement === dayElement) {
    return {
      type: "same",
      label: "比和",
      delta: 4,
      text: "日主与日干同气，稳中有进。",
    };
  }

  const supportRelation = `${dayElement}生${personalElement}`;
  if (supportRelation in WUXING_RELATIONS) {
    return {
      type: "support",
      label: "得生",
      delta: 8,
      text: `日干${dayElement}生助日主${personalElement}，顺势可进。`,
    };
  }

  const drainRelation = `${personalElement}生${dayElement}`;
  if (drainRelation in WUXING_RELATIONS) {
    return {
      type: "drain",
      label: "泄气",
      delta: -2,
      text: `日主${personalElement}生${dayElement}，宜控节奏。`,
    };
  }

  const overcomeRelation = `${personalElement}克${dayElement}`;
  if (overcomeRelation in WUXING_RELATIONS) {
    return {
      type: "overcome",
      label: "克制",
      delta: 2,
      text: `日主${personalElement}克${dayElement}，可主动但忌贪。`,
    };
  }

  const overcomeByRelation = `${dayElement}克${personalElement}`;
  if (overcomeByRelation in WUXING_RELATIONS) {
    return {
      type: "overcome_by",
      label: "受克",
      delta: -6,
      text: `日干${dayElement}克日主${personalElement}，谨慎为上。`,
    };
  }

  return {
    type: "neutral",
    label: "平",
    delta: 0,
    text: "五行平和，保持常态。",
  };
}

function getElementThatGenerates(element) {
  return Object.keys(ELEMENT_SHENG).find((key) => ELEMENT_SHENG[key] === element) || "";
}

function getElementThatControls(element) {
  return Object.keys(ELEMENT_KE).find((key) => ELEMENT_KE[key] === element) || "";
}

function getRelationType(a, b) {
  if (!a || !b) return "neutral";
  if (a === b) return "same";
  if (ELEMENT_SHENG[a] === b) return "sheng_to";
  if (ELEMENT_SHENG[b] === a) return "sheng_from";
  if (ELEMENT_KE[a] === b) return "ke_to";
  if (ELEMENT_KE[b] === a) return "ke_from";
  return "neutral";
}

function getSeasonDelta(dayMaster, monthElement) {
  const rel = getRelationType(dayMaster, monthElement);
  switch (rel) {
    case "same":
      return 6; // 得令
    case "sheng_from":
      return 4; // 得生
    case "sheng_to":
      return -4; // 泄气
    case "ke_to":
      return -2; // 克令
    case "ke_from":
      return -6; // 受克
    default:
      return 0;
  }
}

function getDayMasterStrengthTag(counts, dayMaster, monthElement) {
  if (!counts || !dayMaster) {
    return {
      tag: "中和",
      score: 0,
      support: 0,
      drain: 0,
      control: 0,
      seasonDelta: 0,
      summary: "信息不足，按中和处理。",
    };
  }

  const same = counts[dayMaster] || 0;
  const generator = counts[getElementThatGenerates(dayMaster)] || 0;
  const output = counts[ELEMENT_SHENG[dayMaster]] || 0;
  const wealth = counts[ELEMENT_KE[dayMaster]] || 0;
  const officer = counts[getElementThatControls(dayMaster)] || 0;

  const support = same + generator;
  const drain = output + wealth;
  const control = officer;
  const seasonDelta = getSeasonDelta(dayMaster, monthElement);

  let score =
    support * 2 + Math.round(seasonDelta / 2) - drain - Math.round(control * 1.5);

  let tag = "中和";
  if (score >= 4) tag = "偏旺";
  else if (score <= -4) tag = "偏弱";

  const summary = `助身${support}、泄耗${drain}、克身${control}，季节${
    seasonDelta >= 0 ? "加" : "减"
  }${Math.abs(seasonDelta)}，判为${tag}。`;

  return {
    tag,
    score,
    support,
    drain,
    control,
    same,
    generator,
    output,
    wealth,
    officer,
    seasonDelta,
    summary,
  };
}

function getFavorableElements(dayMaster, strengthTag) {
  const generator = getElementThatGenerates(dayMaster);
  const controller = getElementThatControls(dayMaster);
  if (strengthTag === "偏旺") {
    return {
      favorable: [ELEMENT_SHENG[dayMaster], controller].filter(Boolean),
      unfavorable: [dayMaster, generator].filter(Boolean),
    };
  }
  if (strengthTag === "偏弱") {
    return {
      favorable: [dayMaster, generator].filter(Boolean),
      unfavorable: [ELEMENT_SHENG[dayMaster], controller].filter(Boolean),
    };
  }
  return {
    favorable: [dayMaster, generator].filter(Boolean),
    unfavorable: [controller].filter(Boolean),
  };
}

function getElementImpactDelta(element, favorable, unfavorable, strong = 5, weak = 5) {
  if (!element) return 0;
  if (favorable.includes(element)) return strong;
  if (unfavorable.includes(element)) return -weak;
  return 0;
}

function getWeakElement(counts) {
  if (!counts) return "";
  let weak = "木";
  let min = Number.POSITIVE_INFINITY;
  for (const key of Object.keys(counts)) {
    const val = counts[key] ?? 0;
    if (val < min) {
      min = val;
      weak = key;
    }
  }
  return weak;
}

function getDominantElement(counts) {
  if (!counts) return "";
  let dominant = "木";
  let max = Number.NEGATIVE_INFINITY;
  for (const key of Object.keys(counts)) {
    const val = counts[key] ?? 0;
    if (val > max) {
      max = val;
      dominant = key;
    }
  }
  return dominant;
}

function normalizeElements(list) {
  return [...new Set((list || []).filter(Boolean))];
}

function sortElementsByCount(elements, counts) {
  const safeCounts = counts || {};
  return (elements || [])
    .filter(Boolean)
    .sort((a, b) => (safeCounts[a] ?? 0) - (safeCounts[b] ?? 0));
}

function getSeasonAdjust(monthElement) {
  switch (monthElement) {
    case "木":
      return { use: "金", joy: "火", note: "春木旺，宜金制木、火泄木" };
    case "火":
      return { use: "水", joy: "金", note: "夏火旺，宜水制火、金生水" };
    case "金":
      return { use: "火", joy: "木", note: "秋金旺，宜火制金、木生火" };
    case "水":
      return { use: "土", joy: "火", note: "冬水旺，宜土制水、火暖局" };
    case "土":
      return { use: "木", joy: "金", note: "土旺之月，宜木克土、金泄土" };
    default:
      return { use: "", joy: "", note: "" };
  }
}

function getYongJiShen({ dayMaster, counts, monthElement, strengthTag }) {
  if (!dayMaster) {
    return {
      use: [],
      joy: [],
      avoid: [],
      enemy: [],
      idle: ELEMENTS.slice(),
      method: "简法",
      reason: "日主未明，用神待定。",
      seasonNote: "",
      dominant: "",
      weak: "",
    };
  }

  const safeCounts = counts || { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  const generator = getElementThatGenerates(dayMaster);
  const same = dayMaster;
  const output = ELEMENT_SHENG[dayMaster];
  const wealth = ELEMENT_KE[dayMaster];
  const officer = getElementThatControls(dayMaster);
  const weakElement = getWeakElement(safeCounts);
  const dominant = getDominantElement(safeCounts);
  const seasonAdjust = getSeasonAdjust(monthElement);

  let use = [];
  let joy = [];
  let avoid = [];
  let method = "扶抑";
  let reason = "";

  if (strengthTag === "偏旺") {
    const sorted = sortElementsByCount([output, officer, wealth], safeCounts);
    use = sorted.slice(0, 1);
    joy = sorted.slice(1, 2);
    avoid = normalizeElements([same, generator]);
    reason = `日主偏旺，取${use.join("、")}泄制为用，喜${
      joy.join("、") || "辅神"
    }调衡，忌比印助身。`;
  } else if (strengthTag === "偏弱") {
    const sorted = sortElementsByCount([generator, same], safeCounts);
    use = sorted.slice(0, 1);
    joy = sorted.slice(1, 2);
    avoid = normalizeElements([output, wealth, officer]);
    reason = `日主偏弱，取${use.join("、")}扶身为用，喜${
      joy.join("、") || "辅神"
    }相助，忌食伤财官耗克。`;
  } else {
    method = "调候为主、兼顾补偏";
    use = normalizeElements([seasonAdjust.use || weakElement]);
    joy = normalizeElements([seasonAdjust.joy, weakElement]);
    if (use[0] && joy[0] === use[0]) {
      joy = joy.filter((e) => e !== use[0]);
    }
    let avoidPick = dominant;
    if (avoidPick && use.includes(avoidPick)) {
      const others = ELEMENTS.filter((e) => e !== avoidPick);
      avoidPick = sortElementsByCount(others, safeCounts).slice(-1)[0];
    }
    avoid = normalizeElements([avoidPick]);
    reason = `日主中和，取${use.join("、")}调候为用，喜${
      joy.join("、") || "平衡"
    }，忌${avoid.join("、") || "过旺之气"}。`;
  }

  const enemy = normalizeElements(use.map((e) => ELEMENT_KE[e]).filter(Boolean));

  use = normalizeElements(use);
  joy = normalizeElements(joy.filter((e) => !use.includes(e)));
  avoid = normalizeElements(avoid.filter((e) => !use.includes(e) && !joy.includes(e)));
  const enemyFiltered = normalizeElements(
    enemy.filter((e) => !use.includes(e) && !joy.includes(e) && !avoid.includes(e))
  );
  const idle = ELEMENTS.filter(
    (e) =>
      !use.includes(e) &&
      !joy.includes(e) &&
      !avoid.includes(e) &&
      !enemyFiltered.includes(e)
  );

  const seasonNote = seasonAdjust.note ? `（${seasonAdjust.note}）` : "";
  return {
    use,
    joy,
    avoid,
    enemy: enemyFiltered,
    idle,
    method,
    reason: `${reason}${seasonNote}`,
    seasonNote: seasonAdjust.note,
    dominant,
    weak: weakElement,
  };
}

function getGodImpactDelta(element, gods, weights) {
  if (!element || !gods) return 0;
  const use = gods.use || [];
  const joy = gods.joy || [];
  const avoid = gods.avoid || [];
  const enemy = gods.enemy || [];
  if (use.includes(element)) return weights.use ?? 0;
  if (joy.includes(element)) return weights.joy ?? 0;
  if (enemy.includes(element)) return -(weights.enemy ?? 0);
  if (avoid.includes(element)) return -(weights.avoid ?? 0);
  return 0;
}

function getGodImpactLabel(element, gods) {
  if (!element || !gods) return "";
  if (gods.use?.includes(element)) return "助用";
  if (gods.joy?.includes(element)) return "助喜";
  if (gods.enemy?.includes(element)) return "冲用";
  if (gods.avoid?.includes(element)) return "犯忌";
  return "";
}

function pickFavoredElement({ personalElement, dayElement, favorableSet, counts }) {
  if (favorableSet?.favorable?.includes(dayElement)) return dayElement;
  if (favorableSet?.favorable?.includes(personalElement)) return personalElement;
  if (favorableSet?.favorable?.length) return favorableSet.favorable[0];
  return personalElement || dayElement || getWeakElement(counts) || "土";
}

function getFavoredElement(personalElement, dayElement, relationType, counts) {
  if (!personalElement && !dayElement) return "土";
  if (!personalElement) return dayElement || "土";
  if (!dayElement) return personalElement;

  const weakElement = getWeakElement(counts);
  if (weakElement && (relationType === "overcome_by" || relationType === "drain")) {
    return weakElement;
  }

  switch (relationType) {
    case "support":
    case "same":
      return personalElement;
    case "drain":
      return dayElement;
    case "overcome":
      return personalElement;
    case "overcome_by":
      return dayElement;
    default:
      return personalElement;
  }
}

function pickSuitByElement(element, rng) {
  const suit = ELEMENT_TO_SUIT[element];
  if (suit) return suit;
  return pick(rng, MAHJONG_SUITS);
}

function buildSuitSet(rng, favoredElement) {
  const favored = pickSuitByElement(favoredElement, rng);
  const avoidElement = ELEMENT_KE[favoredElement] || "木";
  let avoid = pickSuitByElement(avoidElement, rng);
  if (avoid === favored) {
    const others = MAHJONG_SUITS.filter((s) => s !== favored);
    avoid = pick(rng, others);
  }
  const neutral =
    MAHJONG_SUITS.find((s) => s !== favored && s !== avoid) ||
    MAHJONG_SUITS.find((s) => s !== favored) ||
    favored;
  return {
    favored,
    neutral,
    avoid,
    favoredElement,
    avoidElement,
  };
}

function pickWordByElement(element, rng) {
  const pool = WORD_BY_ELEMENT[element] || MAHJONG_WORDS;
  return pick(rng, pool);
}

function relationNote(label) {
  switch (label) {
    case "得生":
      return "顺势进取，";
    case "泄气":
      return "控速收口，";
    case "受克":
      return "谨慎为上，";
    case "克制":
      return "可主动作战，";
    case "比和":
      return "稳中求进，";
    default:
      return "守中求稳，";
  }
}

function pickStrategyProfile(rng, key) {
  const pool = STRATEGY_POOL[key] || [];
  if (pool.length) {
    const picked = pick(rng, pool);
    return { ...picked, key };
  }
  const title = `${pick(rng, STRATEGY_TITLE_A[key])}${pick(rng, STRATEGY_TITLE_B[key])}`;
  const desc = `${pick(rng, STRATEGY_DESC_A[key])}，${pick(rng, STRATEGY_DESC_B[key])}`;
  return { title, desc, key };
}

function buildStrategy({ score, relationType, relationLabel, suits, rng, baziNote }) {
  let key = "balance";
  if (relationType === "support" && score >= 75) key = "attack";
  else if (relationType === "overcome_by" || score <= 55) key = "defend";
  else if (relationType === "overcome") key = "attack";
  else if (relationType === "drain") key = "balance";

  const profile = pickStrategyProfile(rng, key);
  const note = relationNote(relationLabel);
  const suitNote = suits
    ? `旺门${suits.favored}，忌门${suits.avoid}`
    : "稳住节奏";

  return {
    ...profile,
    desc: appendBaziNote(`${profile.desc} · ${note}${suitNote}`, baziNote),
  };
}

// 根据五行关系生成建议（各100条左右）
const LEGACY_TIPS = [
  "下雨（杠牌）比胡牌更实在，手里有暗杠尽量开，落袋为安。",
  "今天适合先稳一圈，别急着拼命，等对手犯错。",
  "别迷信大牌，能胡就胡，小胜累积会爆发。",
  "听牌后别乱改，宁可慢一拍也别自爆。",
  "两边都能胡的时候，优先选更安全的那张。",
  "先防守再进攻，手顺时再加速。",
  "中盘别恋清一色，稳定听牌更重要。",
  "进张少就收缩战线，保住点数。",
  "有对子就留，别被一时顺张迷惑。",
  "开局摸得乱，先把牌做成型。",
  "牌局要有节奏，快慢切换才是稳。",
  "开局保守不吃亏，中盘再找机会冲分。",
  "手顺时多胡几口，手逆时少亏就是赢。",
  "别盯着大番，点数累积才是真胜。",
  "有危险牌就先停，别被一时手气带偏。",
  "能做两面听就别做单钓，稳中求胜。",
  "守住安全牌，给自己留退路。",
  "局势不明就先看牌，别急着碰。",
  "碰杠要看时机，别让别人读出牌路。",
  "顺风多提速，逆风先止损。",
  "开局先看牌河，别用一张就暴露手路。",
  "听牌后先稳守，别为了快胡乱打危险牌。",
  "连摸不顺就转换思路，保住安全牌。",
  "两面听更稳，单钓要看场面。",
  "听牌前别乱碰，保留进张空间。",
  "顺手时快胡止盈，逆手时慢打减损。",
  "拆牌要果断，别被漂亮牌型绑住。",
  "起手烂就先做安全路线，等机会再冲。",
  "碰杠要看收益，不亏就先收。",
  "稳住节奏比追番更重要。",
  "看清对手手路，别当送分机器。",
  "别一味防守，手顺时也要敢冲。",
  "牌局后段少冒险，守住点数最稳。",
  "先听后择机变张，避免自乱阵脚。",
  "同花色过多就分散，避免被卡死。",
  "进张差就收缩牌型，保命第一。",
  "遇到快局就适度提速，别让节奏被带走。",
  "别被一两张好牌诱惑，整体效率更重要。",
  "碰杠后的牌路更清晰，注意对手读牌。",
  "胜负心重时更容易点炮，先稳住心态。",
  "天时地利人和，方能百战不殆。",
  "知己知彼，百战不殆。",
  "顺天时，得地利，结人和。",
  "因势利导，随机应变。"
];

const LEGACY_TIPS_BY_STYLE = {
  attack: [
    "顺风多提速，逆风先止损。",
    "有机会就收番，别在好牌上犹豫。",
    "手顺时多胡几口，拉开分差。",
    "积极主动，把握先机。"
  ],
  balance: [
    "先防守再进攻，手顺时再加速。",
    "中盘别恋清一色，稳定听牌更重要。",
    "稳住节奏比追番更重要。",
    "因势利导，随机应变。"
  ],
  defend: [
    "谨慎碰杠，守住安全牌再找机会。",
    "局势不明就先看牌，别急着碰。",
    "听牌后先稳守，别为了快胡乱打危险牌。",
    "知进退，明得失。"
  ]
};

const TIP_GENERAL_A = [
  "起手不顺", "起手偏散", "手牌杂乱", "摸牌偏慢", "中盘胶着",
  "牌河复杂", "对手有压", "进张一般", "听口较窄", "场面未明",
];
const TIP_GENERAL_B = [
  "先稳再动", "少碰少杠", "控制节奏", "保住安全口", "小胡积累",
  "先守后攻", "稳住牌型", "留足退路", "择机提速", "避免冒险",
];
const TIPS = mergePool(
  buildComboPool(TIP_GENERAL_A, TIP_GENERAL_B, 100, "，"),
  LEGACY_TIPS,
  100
);

const TIP_ATTACK_A = [
  "起手顺", "摸牌流畅", "牌型成势", "场面顺风", "对手节奏慢",
  "进张连上", "早早听牌", "手气偏热", "连摸成型", "领先优势",
];
const TIP_ATTACK_B = [
  "加速推进", "抢先成型", "持续施压", "果断冲刺", "连胡拉开",
  "先攻后收", "快胡止盈", "逼张压场", "提速抢势", "锁定先机",
];
const TIP_BALANCE_A = [
  "起手平稳", "摸牌一般", "场面胶着", "手牌杂散", "进张尚可",
  "对手有威胁", "中盘未明", "牌河复杂", "局势均衡", "听口一般",
];
const TIP_BALANCE_B = [
  "先稳后进", "控制节奏", "稳听保底", "小胡拿分", "守听等牌",
  "减少冒险", "稳住牌型", "择机加速", "观察再动", "守中求进",
];
const TIP_DEFEND_A = [
  "起手偏烂", "摸牌不顺", "场面逆风", "对手压制", "危险张多",
  "点炮风险高", "听口过窄", "失张连连", "牌势偏冷", "中盘落后",
];
const TIP_DEFEND_B = [
  "先保安全口", "少碰少杠", "稳收分差", "先防后攻", "保分止损",
  "留足退路", "控制风险", "慢打等机", "避开危险张", "守牌为上",
];
const TIPS_BY_STYLE = {
  attack: mergePool(
    buildComboPool(TIP_ATTACK_A, TIP_ATTACK_B, 100, "，"),
    LEGACY_TIPS_BY_STYLE.attack,
    100
  ),
  balance: mergePool(
    buildComboPool(TIP_BALANCE_A, TIP_BALANCE_B, 100, "，"),
    LEGACY_TIPS_BY_STYLE.balance,
    100
  ),
  defend: mergePool(
    buildComboPool(TIP_DEFEND_A, TIP_DEFEND_B, 100, "，"),
    LEGACY_TIPS_BY_STYLE.defend,
    100
  ),
};

const WORD_JOKE = {
  "健": "“健”就是要积极进取，像乾卦一样自强不息，但也要注意不要过于冒进。",
  "顺": "“顺”就是顺应时势，像坤卦一样厚德载物，以柔克刚。",
  "动": "“动”就是行动迅速，像震卦一样雷厉风行，把握时机。",
  "入": "“入”就是深入观察，像巽卦一样无孔不入，灵活应变。",
  "陷": "“陷”就是小心谨慎，像坎卦一样警惕陷阱，化险为夷。",
  "丽": "“丽”就是明察秋毫，像离卦一样光明磊落，洞察先机。",
  "止": "“止”就是适可而止，像艮卦一样知止而后定，把握分寸。",
  "悦": "“悦”就是和谐共处，像兑卦一样和气生财，共赢发展。",
  "冲": "“冲”就是主动进攻，抢占先机。",
  "守": "“守”就是稳守阵地，防守为先。",
  "稳": "“稳”就是稳扎稳打，步步为营。",
  "变": "“变”就是随机应变，灵活调整。",
  "审": "“审”就是审时度势，深思熟虑。",
  "和": "“和”就是和谐相处，互利共赢。"
};

const STEM_TO_ELEMENT = {
  甲: "木",
  乙: "木", 
  丙: "火",
  丁: "火",
  戊: "土",
  己: "土",
  庚: "金",
  辛: "金",
  壬: "水",
  癸: "水"
};

const STEM_YIN_YANG = {
  甲: "阳",
  乙: "阴",
  丙: "阳",
  丁: "阴",
  戊: "阳",
  己: "阴",
  庚: "阳",
  辛: "阴",
  壬: "阳",
  癸: "阴"
};

const BRANCH_TO_ELEMENT = {
  子: "水",
  丑: "土",
  寅: "木",
  卯: "木",
  辰: "土",
  巳: "火",
  午: "火",
  未: "土",
  申: "金",
  酉: "金",
  戌: "土",
  亥: "水"
};

function mahjongLuckFromAlmanac(almanac, rng) {
  const jianchu = almanac.jianchu || "平";
  // 根据建除神和八卦意义调整分数
  const baseMap = {
    建: 8,    // 开始、创造
    除: -1,   // 清理、更新
    满: 10,   // 充盈、圆满
    平: 2,    // 平衡、稳定
    定: 6,    // 稳定、确定
    执: 4,    // 执行、坚持
    破: -4,   // 破坏、革新
    危: -3,   // 危险、谨慎
    成: 12,   // 成就、成功
    收: 5,    // 收敛、积蓄
    开: 10,   // 开启、开放
    闭: -5    // 关闭、收敛
  };
  
  const yiBoost = clamp((almanac.yi || []).length * 1.5, 0, 8); // 加强宜事影响
  const jiPenalty = clamp((almanac.ji || []).length * 1.2, 0, 6); // 加强忌事影响
  const timeBoost = clamp((almanac.luckyTimes || []).length * 3, 0, 6); // 加强吉时影响
  
  const delta = (baseMap[jianchu] ?? 0) + yiBoost - jiPenalty + timeBoost;

  const hints = MAHJONG_HINTS[jianchu] ?? MAHJONG_HINTS["平"];
  const picked = pickUnique(rng, hints, 1)[0];

  return { delta, hint: picked, trigram: almanac.jianchuTrigram };
}

function getMahjongStyleByBazi(birthDayGanzhi) {
  const stem = birthDayGanzhi ? birthDayGanzhi[0] : "";
  const element = STEM_TO_ELEMENT[stem] || "土";
  const trigramKey = DAYGAN_TRIGRAM_MAPPING[stem] || "坤";
  const trigram = TRIGRAM_STRATEGIES[trigramKey] || TRIGRAM_STRATEGIES["坤"];
  
  return {
    word: trigram.word,
    style: trigram.style,
    key: trigram.key,
    element: element,
    trigram: trigramKey,
    desc: trigram.desc
  };
}

function getWordJoke(word, element) {
  if (!word) return "";
  if (WORD_JOKE[word]) return WORD_JOKE[word];
  if (element && WORD_EXPLAIN_BY_ELEMENT[element]) return WORD_EXPLAIN_BY_ELEMENT[element];
  const lead = word[0];
  return WORD_JOKE[lead] || WORD_EXPLAIN_BY_ELEMENT[element] || "字诀蕴含易理，顺应天时为上策。";
}

function scoreToTagline(score) {
  if (score >= 90) return "鸿运当头";
  if (score >= 80) return "运势亨通";
  if (score >= 70) return "顺风顺水";
  if (score >= 60) return "稳中向好";
  if (score >= 50) return "平和安稳";
  return "需待时机";
}

function buildSummary({ level, strengthTag, gods }) {
  const baseMap = {
    大吉: "气势正盛，宜快节奏抢先成型。",
    中吉: "稳中带攻，注意节奏与安全口。",
    小吉: "小有顺风，先稳后冲更稳。",
    平: "局势平和，稳扎稳打。",
    小凶: "谨慎为上，先保分再求胡。",
  };
  const base = baseMap[level] ?? baseMap["平"];
  const strengthText = strengthTag ? `日主${strengthTag}` : "日主中和";
  const use = gods?.use?.[0];
  const joy = gods?.joy?.[0];
  const avoid = gods?.avoid?.[0];
  const parts = [strengthText];
  if (use) {
    let godPart = `用神${use}`;
    if (joy) godPart += `、喜${joy}`;
    if (avoid) godPart += `、忌${avoid}`;
    parts.push(godPart);
  }
  return `${parts.join("，")}；${base}`;
}

function getStrategyTone(strategyKey) {
  switch (strategyKey) {
    case "attack":
      return "宜快攻抢先";
    case "defend":
      return "先保分后找机会";
    case "balance":
    default:
      return "稳中求进";
  }
}

function buildWuxingTodaySummary({ gods, favoredElement, suits, strategy }) {
  const use = gods?.use?.[0] || favoredElement || "";
  const joy = gods?.joy?.[0];
  const avoid = gods?.avoid?.[0];
  const suitFav = suits?.favored || "";
  const suitAvoid = suits?.avoid || "";
  const tone = getStrategyTone(strategy?.key);
  const parts = [];
  if (use) {
    parts.push(`主用${use}`);
  }
  if (joy) {
    parts.push(`喜${joy}`);
  }
  if (avoid) {
    parts.push(`忌${avoid}`);
  }
  const elementNote = parts.length ? parts.join("，") : "顺势为主";
  const suitNote = suitFav && suitAvoid ? `旺${suitFav}，避${suitAvoid}` : "";
  return `${elementNote}；${suitNote}${suitNote ? "，" : ""}${tone}。`;
}

function buildBaziTodaySummary({ bazi, score, strategy }) {
  const day = bazi?.day ? `日主${bazi.day}` : "日主未明";
  const tone = scoreToTagline(score);
  const strat = strategy?.title ? `打法以${strategy.title}为主` : "打法稳健";
  return `${day}，${tone}，${strat}。`;
}

function buildFlowNote(flowInfo, gods) {
  if (!flowInfo || !gods) return "";
  const yearLabel = getGodImpactLabel(flowInfo.yearElement, gods);
  const monthLabel = getGodImpactLabel(flowInfo.monthElement, gods);
  const parts = [];
  if (flowInfo.yearGanzhi && yearLabel) {
    parts.push(`流年${flowInfo.yearGanzhi}（${flowInfo.yearElement}）${yearLabel}`);
  }
  if (flowInfo.monthGanzhi && monthLabel) {
    parts.push(`流月${flowInfo.monthGanzhi}（${flowInfo.monthElement}）${monthLabel}`);
  }
  if (!parts.length) return "";
  return `流年流月：${parts.join("，")}。`;
}

function buildMahjongReading({ score, relation, suits, strategy, bazi, gods, flowInfo }) {
  const pieces = [];
  pieces.push(`手气指数${score}分，${scoreToTagline(score)}。`);
  if (bazi?.dayGanzhi) {
    pieces.push(`日主${bazi.dayGanzhi}（${bazi.element}），${relation.label}：${relation.text}`);
  } else {
    pieces.push(relation.text);
  }
  if (gods?.use?.length || gods?.avoid?.length) {
    const use = gods.use?.join("、") || "未定";
    const joy = gods.joy?.length ? `，喜神${gods.joy.join("、")}` : "";
    const avoid = gods.avoid?.length ? `，忌神${gods.avoid.join("、")}` : "";
    const enemy = gods.enemy?.length ? `，仇神${gods.enemy.join("、")}` : "";
    pieces.push(`用神${use}${joy}${avoid}${enemy}。`);
  }
  const flowNote = buildFlowNote(flowInfo, gods);
  if (flowNote) pieces.push(flowNote);
  pieces.push(`三门局势：旺${suits.favored}、平${suits.neutral}、忌${suits.avoid}。`);
  pieces.push(`打法建议：${strategy.title}，${strategy.desc}`);
  return pieces.join("");
}

export function generateFortune({ name, birthYmd, birthTime, birthLongitude, dateKey }) {
  const safeName = (name ?? "").trim();
  const safeBirth = (birthYmd ?? "").trim();
  const safeTime = (birthTime ?? "").trim();
  const safeLongitude = birthLongitude ?? "";
  const safeDate = (dateKey ?? todayKeyLocal()).trim();
  const mahjongType = "四川麻将";

  const seedStr = `${safeName}|${safeBirth}|${safeTime}|${safeLongitude}|${mahjongType}|${safeDate}`;
  const seed = xmur3(seedStr)();
  const rng = mulberry32(seed);

  const almanac = getAlmanac(safeDate);
  const mahjongLuck = mahjongLuckFromAlmanac(almanac, rng);

  const birthParsed = parseYmd(safeBirth);
  const birthLunar = birthParsed && isLunarSupported(birthParsed.y)
    ? solarToLunar(birthParsed.y, birthParsed.m, birthParsed.d)
    : null;

  const bazi = birthParsed
    ? calculateBaZi({
        y: birthParsed.y,
        m: birthParsed.m,
        d: birthParsed.d,
        timeHm: safeTime,
        longitude: safeLongitude,
      })
    : null;
  const personalElement = bazi?.elements?.day || "土";
  const dayElement = almanac.dayElement || "土";
  const relation = getWuxingRelation(personalElement, dayElement);

  const baseSeed = 58 + Math.floor(rng() * 15); // 58-72基础范围

  const monthElement = bazi ? BRANCH_TO_ELEMENT[bazi.month[1]] : "";
  const strengthInfo = getDayMasterStrengthTag(bazi?.counts, personalElement, monthElement);
  const seasonDelta = getSeasonDelta(personalElement, monthElement);
  const strengthDelta = clamp(-Math.round(Math.abs(strengthInfo.score) / 2), -4, 0);

  const gods = getYongJiShen({
    dayMaster: personalElement,
    counts: bazi?.counts,
    monthElement,
    strengthTag: strengthInfo.tag,
  });
  const favorableSet = {
    favorable: [...(gods.use || []), ...(gods.joy || [])],
    unfavorable: [...(gods.avoid || []), ...(gods.enemy || [])],
  };
  const dayBranchElement = BRANCH_TO_ELEMENT[almanac.dayBranch] || "";
  const favorableDelta =
    getGodImpactDelta(dayElement, gods, { use: 7, joy: 4, avoid: 6, enemy: 8 }) +
    getGodImpactDelta(dayBranchElement, gods, { use: 4, joy: 2, avoid: 3, enemy: 4 });

  const todayParsed = parseYmd(safeDate);
  const flowDate = todayParsed ? new Date(todayParsed.y, todayParsed.m - 1, todayParsed.d) : new Date();
  const flowYearGanzhi = getYearGanzhi(flowDate);
  const flowMonthGanzhi = getMonthGanzhi(flowDate, flowYearGanzhi);
  const flowYearElement = STEM_TO_ELEMENT[flowYearGanzhi[0]] || "";
  const flowMonthElement = STEM_TO_ELEMENT[flowMonthGanzhi[0]] || "";
  const flowDelta =
    getGodImpactDelta(flowYearElement, gods, { use: 2, joy: 1, avoid: 2, enemy: 3 }) +
    getGodImpactDelta(flowMonthElement, gods, { use: 3, joy: 2, avoid: 3, enemy: 4 });

  const baziDelta = seasonDelta + strengthDelta + favorableDelta + flowDelta;
  const almanacDelta = Math.round(mahjongLuck.delta * 0.25);
  const scoreRaw = baseSeed + baziDelta + almanacDelta;

  const score = clamp(scoreRaw, 0, 100);
  const level = scoreToLevel(score);

  const birthLunarCalc = birthLunar;
  const zodiac = birthLunarCalc ? getZodiacByLunarYear(birthLunarCalc.lYear) : "未知";
  const constellation = birthParsed ? getConstellation(birthParsed.m, birthParsed.d) : "未知";
  const birthDayGanzhi = bazi ? bazi.day : "";
  const baziStyle = getMahjongStyleByBazi(birthDayGanzhi);
  const birthElement = STEM_TO_ELEMENT[birthDayGanzhi[0]] || personalElement || "土";
  const summary = buildSummary({
    level,
    strengthTag: strengthInfo.tag,
    gods,
  });

  const favoredElement =
    gods.use?.[0] ||
    pickFavoredElement({
      personalElement,
      dayElement,
      favorableSet,
      counts: bazi?.counts,
    }) ||
    getFavoredElement(personalElement, dayElement, relation.type, bazi?.counts);
  const suits = buildSuitSet(rng, favoredElement);
  const baziNote = buildBaziNote({
    bazi,
    gods,
    strengthTag: strengthInfo.tag,
    favoredElement,
  });
  const strategy = buildStrategy({
    score,
    relationType: relation.type,
    relationLabel: relation.label,
    suits,
    rng,
    baziNote,
  });
  const strategyKey = strategy.key || baziStyle.key;
  let word = pickWordByElement(favoredElement || personalElement, rng);
  if (baziStyle.word && rng() < 0.15) {
    word = baziStyle.word;
  }
  const styleTips =
    (TIPS_BY_STYLE[strategyKey] && TIPS_BY_STYLE[strategyKey].length)
      ? TIPS_BY_STYLE[strategyKey]
      : TIPS;
  const tipPool = [
    ...pickUnique(rng, styleTips, 3),
    mahjongLuck.hint,
  ].filter(Boolean);
  const tip = appendBaziNote(pick(rng, tipPool), baziNote);

  const mahjong = {
    word,
    tip,
    tagline: scoreToTagline(score),
    style: baziStyle.style,
    trigram: baziStyle.trigram,
    suits,
    strategy,
  };
  
  const wuxingTodaySummary = buildWuxingTodaySummary({
    gods,
    favoredElement,
    suits,
    strategy,
  });
  const baziTodaySummary = buildBaziTodaySummary({
    bazi,
    score,
    strategy,
  });

  mahjong.wordJoke = appendBaziNote(
    getWordJoke(mahjong.word, favoredElement || personalElement),
    baziNote
  );
  const flowInfo = {
    yearGanzhi: flowYearGanzhi,
    monthGanzhi: flowMonthGanzhi,
    yearElement: flowYearElement,
    monthElement: flowMonthElement,
  };
  mahjong.reading = buildMahjongReading({
    score,
    relation,
    suits,
    strategy,
    bazi: {
      dayGanzhi: birthDayGanzhi,
      element: birthElement,
    },
    gods,
    flowInfo,
  });

  const wuxingRelation = {
    personalElement,
    dayElement,
    label: relation.label,
    text: relation.text,
    type: relation.type,
    summary: bazi?.summary || "",
    counts: bazi?.counts || null,
    countsText: bazi?.counts
      ? `木${bazi.counts.木} 火${bazi.counts.火} 土${bazi.counts.土} 金${bazi.counts.金} 水${bazi.counts.水}`
      : "",
    strengthTag: strengthInfo.tag,
    strengthExplain: strengthInfo.summary,
    favorableElements: favorableSet.favorable,
    unfavorableElements: favorableSet.unfavorable,
    useGods: gods.use,
    joyGods: gods.joy,
    avoidGods: gods.avoid,
    enemyGods: gods.enemy,
    idleGods: gods.idle,
    godMethod: gods.method,
    godExplain: gods.reason,
    todaySummary: wuxingTodaySummary,
  };

  const scoreBreakdown = {
    base: baseSeed,
    baziDelta,
    seasonDelta,
    strengthDelta,
    favorableDelta,
    flowDelta,
    almanacDelta,
    raw: scoreRaw,
    final: score,
  };

  return {
    seedStr,
    dateKey: safeDate,
    inputs: { name: safeName, birthYmd: safeBirth, birthTime: safeTime, birthLongitude: safeLongitude, mahjongType },
    score,
    level,
    scoreBreakdown,
    mahjong,
    summary,
    birthInfo: { zodiac, constellation },
    wuxingRelation,
    baziInfo: bazi, // 八字信息
    baziSummary: baziTodaySummary,
    flowInfo,
  };
}
