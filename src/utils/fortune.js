// src/utils/fortune.js

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

// mulberry32: seed -> deterministic PRNG [0,1)
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

function mod(n, m) {
  return ((n % m) + m) % m;
}

const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const ZODIAC = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"];

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

const YI_JI_BY_JIAN = {
  建: {
    yi: ["出行", "上任", "会友", "求财", "开市"],
    ji: ["动土", "开仓", "安葬", "修造"],
  },
  除: {
    yi: ["解除", "祭祀", "祈福", "求医", "出行"],
    ji: ["结婚", "搬家", "开市", "诉讼"],
  },
  满: {
    yi: ["祭祀", "祈福", "求财", "结婚", "修造"],
    ji: ["赴任", "求医", "栽种", "出行"],
  },
  平: {
    yi: ["祭祀", "修补", "涂泥", "交易", "安床"],
    ji: ["开市", "远行", "开仓", "动土"],
  },
  定: {
    yi: ["交易", "立券", "会友", "订婚", "求职"],
    ji: ["诉讼", "出行", "开仓", "移徙"],
  },
  执: {
    yi: ["祈福", "祭祀", "求子", "结婚", "立约"],
    ji: ["开市", "交易", "搬家", "安床"],
  },
  破: {
    yi: ["破屋", "坏垣", "求医", "解除"],
    ji: ["结婚", "出行", "开市", "动土"],
  },
  危: {
    yi: ["交易", "立券", "安床", "求财", "祭祀"],
    ji: ["登山", "乘船", "动土", "远行"],
  },
  成: {
    yi: ["结婚", "开市", "修造", "入学", "出行"],
    ji: ["诉讼", "争执", "安葬"],
  },
  收: {
    yi: ["祭祀", "求财", "签约", "纳畜", "立券"],
    ji: ["安床", "造葬", "搬家"],
  },
  开: {
    yi: ["祭祀", "祈福", "开市", "出行", "交易"],
    ji: ["安葬", "诉讼", "动土"],
  },
  闭: {
    yi: ["祭祀", "交易", "纳财", "安葬"],
    ji: ["出行", "结婚", "开市"],
  },
};

const SHICHEN = [
  { label: "子时", range: "23:00-01:00" },
  { label: "丑时", range: "01:00-03:00" },
  { label: "寅时", range: "03:00-05:00" },
  { label: "卯时", range: "05:00-07:00" },
  { label: "辰时", range: "07:00-09:00" },
  { label: "巳时", range: "09:00-11:00" },
  { label: "午时", range: "11:00-13:00" },
  { label: "未时", range: "13:00-15:00" },
  { label: "申时", range: "15:00-17:00" },
  { label: "酉时", range: "17:00-19:00" },
  { label: "戌时", range: "19:00-21:00" },
  { label: "亥时", range: "21:00-23:00" },
];

const SANHE_GROUPS = [
  ["申", "子", "辰"],
  ["寅", "午", "戌"],
  ["亥", "卯", "未"],
  ["巳", "酉", "丑"],
];

function getSanhe(branch) {
  for (const group of SANHE_GROUPS) {
    if (group.includes(branch)) return group;
  }
  return [branch];
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
  const yiJi = YI_JI_BY_JIAN[jianchu] || { yi: [], ji: [] };

  const sanhe = getSanhe(dayBranch).filter((b) => b !== dayBranch);
  const luckyTimes = sanhe
    .map((b) => {
      const idx = BRANCHES.indexOf(b);
      const slot = SHICHEN[idx];
      return slot ? `${slot.label} ${slot.range}` : "";
    })
    .filter(Boolean);

  const chongIndex = mod(dayBranchIndex + 6, 12);
  const avoidTimeSlot = SHICHEN[chongIndex];

  return {
    solar: `${solar.y}-${pad2(solar.m)}-${pad2(solar.d)}`,
    lunarDate,
    solarTerm,
    ganzhiDay: lunar.cDay,
    ganzhiMonth: lunar.cMonth,
    ganzhiYear: lunar.cYear,
    dayAnimal: getZodiacByLunarYear(lunar.lYear),
    jianchu,
    yi: yiJi.yi,
    ji: yiJi.ji,
    luckyTimes,
    avoidTime: avoidTimeSlot ? `${avoidTimeSlot.label} ${avoidTimeSlot.range}` : "",
  };
}

const COLORS = ["玄青", "赤金", "松石", "月白", "石榴红", "黛蓝", "竹青", "杏黄"];
const DIRECTIONS = ["正东", "东南", "正南", "西南", "正西", "西北", "正北", "东北"];
const ITEMS = ["护身符", "木纹手链", "茶杯", "小记事本", "硬币包", "金属钥匙扣", "香包", "竹签"];

function scoreToLevel(score) {
  if (score >= 88) return "大吉";
  if (score >= 75) return "中吉";
  if (score >= 62) return "小吉";
  if (score >= 48) return "平";
  return "小凶";
}

const MAHJONG_HINTS = {
  建: [
    "牌局宜快节奏，先拿小胡稳住场面。",
    "少做高危操作，稳住听牌即可。",
    "开局先做成型速度牌，别急着奔清一色。",
    "场面热时先抢先听，别让节奏被带走。",
  ],
  除: [
    "适合断舍离，及时止损别恋战。",
    "拆牌要干脆，宁可小亏别大输。",
    "不要抱死门清，拆散不顺的搭子。",
    "点炮风险偏高，先做防守留余地。",
  ],
  满: [
    "牌势偏旺，可适度加速冲分。",
    "起手好就稳扎稳打，避免贪大牌。",
    "适合做快胡，连胡更容易上分。",
    "手顺就加速，别在好牌上犹豫。",
  ],
  平: [
    "今日走稳健路线，少做激进清一色。",
    "防守优先，避免点炮。",
    "能听就听，别在中盘反复改牌。",
    "局势平稳就保守，先把进张做稳。",
  ],
  定: [
    "定型后别频繁改动，听牌后守住节奏。",
    "稳中求进，切勿轻易放弃好型。",
    "有好型就锁定，别被表面进张诱惑。",
    "适合中速推进，追求稳定上分。",
  ],
  执: [
    "手牌稳则守，进攻需择机。",
    "避免冲动杠牌，先看场面。",
    "遇到危险牌先停一拍，别硬拆。",
    "保持手牌可进可退，留一手安全。",
  ],
  破: [
    "运势有波动，别盲目追大牌。",
    "适合保守小胡，降低风险。",
    "局势乱时先求和牌，不要冒进。",
    "点炮易发，宁可慢一圈也别乱打。",
  ],
  危: [
    "谨慎为主，少碰少杠。",
    "听牌后耐心等，别硬上。",
    "对手强势时先防守，减少暴露。",
    "手牌不顺就先止损，别恋战。",
  ],
  成: [
    "容易成牌，可尝试提高番数。",
    "把握手顺，顺势加速。",
    "有机会就收番，别放过好型。",
    "适合冲一波，但注意别被反打。",
  ],
  收: [
    "收尾见好就收，别恋战。",
    "逆风时先止损，顺风时稳稳收割。",
    "末盘更要稳，守住优势就赢。",
    "收官少点炮，小胡稳住局势。",
  ],
  开: [
    "适合开局抢先，争取主动。",
    "早点建立优势，后程守住。",
    "开局快听，先抢节奏再说。",
    "手顺就冲，没牌就保守。",
  ],
  闭: [
    "今日不宜久战，短局为佳。",
    "宜保守，别主动做大牌。",
    "宁可小胡收手，别拖到后盘。",
    "谨慎碰杠，守住牌型即可。",
  ],
};

const MAHJONG_WORDS = [
  "狂", "稳", "准", "狠", "守", "冲", "顺", "藏", "亮", "快",
  "准狠", "稳扎", "顺手", "守势", "快听",
];
const AVOID_SUIT = ["万子", "条子", "筒子"];
const FORTUNE_TILES = [
  "一万", "九万", "二万", "八万",
  "一条", "九条", "二条", "八条",
  "一筒", "九筒", "二筒", "八筒",
];
const GOODS = [
  "抢杠胡", "稳住听牌", "小胡不断", "暗杠尽量开", "早听早胡",
  "见好就收", "中盘稳住", "先防后攻", "先听再提速",
  "先胡先收", "低番快胡", "稳听保底", "多看少碰",
  "先拆边张", "保住安全牌", "抓紧机会胡", "顺牌就冲",
  "稳住节奏", "稳住分差",
  "两面听优先", "避免单钓", "先稳后冲", "听牌即守",
  "少碰多进张", "顺势开杠", "小胡垫底", "有番就收",
  "合理控场", "控牌路", "保留安全口", "稳扎稳打",
  "先做牌型", "保持进张", "见好就胡", "顺风加速",
  "逆风止损", "稳住心态",
];
const BADS = [
  "坐则所亏", "硬上绝张", "连点两家", "情绪上头", "开局乱杠",
  "盲目清一色", "硬碰硬杠", "追张过深", "乱拆安全牌",
  "顶风硬追", "贪番过头", "乱碰乱杠", "硬拆对子",
  "乱改听牌", "无谓放铳", "开局上头", "追张不看场",
  "高危放炮",
  "执意单钓", "不看牌河", "乱打危险牌", "放弃安全口",
  "过度贪清一色", "忽视对手节奏", "盲目立直打法",
  "碰了就后悔", "先慢后乱", "连拆好搭子",
  "吃碰过多", "牌型不成硬冲", "胡牌犹豫",
  "杠上继续贪", "不肯收手",
];
const BUDDIES = [
  "头发很少的", "沉默但很准的", "话多但不点炮的", "看起来菜其实很阴的", "只喝水不抽烟的",
  "不抢话但总能听的", "脸上没表情的", "牌品很稳的", "笑而不语的",
  "起手很稳的", "牌路很细的", "慢热但不乱的", "看牌很深的",
  "懂得收手的", "不乱杠的", "出牌很干净的", "自控力强的",
  "听牌很快的", "能守能攻的", "不乱碰的", "出牌很稳的",
  "话少但靠谱的", "稳稳当当的", "有耐心的", "出手谨慎的",
  "能看场的", "不急躁的", "有节奏感的", "读牌厉害的",
  "不爱冒险的", "稳健派的", "运气不浮的", "不逞强的",
];
const TIPS = [
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
];

const MAHJONG_STYLE_BY_JIANCHU = {
  建: { word: "快", style: "偏快偏攻", key: "attack" },
  满: { word: "冲", style: "强势进攻", key: "attack" },
  成: { word: "狠", style: "趁势进攻", key: "attack" },
  开: { word: "狂", style: "先手抢攻", key: "attack" },
  定: { word: "稳", style: "稳中带进", key: "balance" },
  执: { word: "准", style: "稳中求准", key: "balance" },
  收: { word: "守", style: "见好就收", key: "balance" },
  平: { word: "顺", style: "稳中带守", key: "balance" },
  除: { word: "藏", style: "偏稳偏守", key: "defend" },
  破: { word: "守", style: "以守为主", key: "defend" },
  危: { word: "稳", style: "谨慎防守", key: "defend" },
  闭: { word: "藏", style: "收手保守", key: "defend" },
};

const GOODS_BY_STYLE = {
  attack: [
    "抢杠胡", "早听早胡", "抓紧机会胡", "顺牌就冲",
    "两面听优先", "先胡先收", "顺风加速", "有番就收",
  ],
  balance: [
    "稳住听牌", "先防后攻", "先听再提速", "中盘稳住",
    "稳听保底", "稳住节奏", "稳扎稳打", "小胡不断",
  ],
  defend: [
    "保住安全牌", "多看少碰", "低番快胡", "见好就收",
    "逆风止损", "稳住心态", "稳听保底", "先拆边张",
  ],
};

const BADS_BY_STYLE = {
  attack: [
    "硬上绝张", "贪番过头", "追张过深", "盲目清一色",
    "乱改听牌", "硬碰硬杠", "顶风硬追",
  ],
  balance: [
    "开局乱杠", "情绪上头", "乱拆安全牌", "追张不看场",
    "乱碰乱杠", "硬拆对子",
  ],
  defend: [
    "无谓放铳", "不看牌河", "乱打危险牌", "放弃安全口",
    "高危放炮", "不肯收手",
  ],
};

const TIPS_BY_STYLE = {
  attack: [
    "顺风多提速，逆风先止损。",
    "有机会就收番，别在好牌上犹豫。",
    "手顺时多胡几口，拉开分差。",
  ],
  balance: [
    "先防守再进攻，手顺时再加速。",
    "中盘别恋清一色，稳定听牌更重要。",
    "稳住节奏比追番更重要。",
  ],
  defend: [
    "谨慎碰杠，守住安全牌再找机会。",
    "局势不明就先看牌，别急着碰。",
    "听牌后先稳守，别为了快胡乱打危险牌。",
  ],
};

function mahjongLuckFromAlmanac(almanac, rng) {
  const jianchu = almanac.jianchu || "平";
  const baseMap = {
    建: 6,
    除: -2,
    满: 8,
    平: 0,
    定: 4,
    执: 2,
    破: -6,
    危: -4,
    成: 10,
    收: 3,
    开: 7,
    闭: -5,
  };
  const yiBoost = clamp((almanac.yi || []).length * 1.2, 0, 6);
  const jiPenalty = clamp((almanac.ji || []).length * 1.0, 0, 5);
  const timeBoost = clamp((almanac.luckyTimes || []).length * 2, 0, 4);
  const delta = (baseMap[jianchu] ?? 0) + yiBoost + timeBoost - jiPenalty;

  const hints = MAHJONG_HINTS[jianchu] ?? MAHJONG_HINTS["平"];
  const picked = pickUnique(rng, hints, 1)[0];

  return { delta, hint: picked };
}

function getMahjongStyle(almanac) {
  const jianchu = almanac.jianchu || "平";
  return MAHJONG_STYLE_BY_JIANCHU[jianchu] || MAHJONG_STYLE_BY_JIANCHU["平"];
}

function pickByStyle(rng, styleKey, map, fallback) {
  const list = map[styleKey] && map[styleKey].length ? map[styleKey] : fallback;
  return pick(rng, list);
}

function scoreToTagline(score) {
  if (score >= 88) return "手气火辣";
  if (score >= 78) return "手气在线";
  if (score >= 68) return "稳中带冲";
  if (score >= 58) return "先稳后赢";
  return "先守后攻";
}

function getLuckyTimeShort(almanac) {
  const times = almanac.luckyTimes || [];
  if (!times.length) return "";
  const time = times[0].split(" ")[1] || "";
  const parts = time.split("-");
  return parts[1] || parts[0] || "";
}

function buildMahjongReading(score, mahjongLuck, mahjong) {
  const pieces = [];
  pieces.push(`今日手气指数${score}分，${scoreToTagline(score)}。`);
  pieces.push(`节奏建议：${mahjong.style}。`);
  pieces.push(`局势提示：${mahjongLuck.hint}`);
  return pieces.join("");
}

function scoreToTrend(score) {
  if (score >= 85) return "进攻优势明显";
  if (score >= 75) return "进攻略占上风";
  if (score >= 65) return "攻守较均衡";
  if (score >= 55) return "守势略占上风";
  return "先守后攻更稳";
}

function buildMahjongSummary(score, mahjongLuck, mahjong) {
  const lines = [];
  lines.push(`手气评价：${scoreToTagline(score)}，${scoreToTrend(score)}。`);
  lines.push(`节奏建议：${mahjong.style}。`);
  lines.push(`局势建议：${mahjongLuck.hint}`);
  return lines;
}

function buildAlmanacSummary(almanac) {
  const lines = [];
  const term = almanac.solarTerm ? `·${almanac.solarTerm}` : "";
  lines.push(`农历${almanac.lunarDate}${term}，日干支${almanac.ganzhiDay}。`);
  lines.push(`建除${almanac.jianchu}，值日生肖${almanac.dayAnimal}。`);
  if ((almanac.yi || []).length) {
    lines.push(`宜：${almanac.yi.join("、")}`);
  }
  if ((almanac.ji || []).length) {
    lines.push(`忌：${almanac.ji.join("、")}`);
  }
  if (almanac.luckyTimes && almanac.luckyTimes.length) {
    lines.push(`吉时：${almanac.luckyTimes.join("、")}`);
  }
  if (almanac.avoidTime) {
    lines.push(`避时：${almanac.avoidTime}`);
  }
  return lines;
}

export function generateFortune({ name, birthYmd, dateKey }) {
  const safeName = (name ?? "").trim();
  const safeBirth = (birthYmd ?? "").trim();
  const safeDate = (dateKey ?? todayKeyLocal()).trim();
  const mahjongType = "四川麻将";

  const seedStr = `${safeName}|${safeBirth}|${mahjongType}|${safeDate}`;
  const seed = xmur3(seedStr)();
  const rng = mulberry32(seed);

  const almanac = getAlmanac(safeDate);
  const mahjongLuck = mahjongLuckFromAlmanac(almanac, rng);
  const mahjongStyle = getMahjongStyle(almanac);

  const base = Math.floor(rng() * 58) + 38; // 38-95
  const score = clamp(base + mahjongLuck.delta, 0, 100);
  const level = scoreToLevel(score);

  const career = clamp(Math.round(score + (rng() * 18 - 9)), 0, 100);
  const wealth = clamp(Math.round(score + (rng() * 20 - 10)), 0, 100);
  const love = clamp(Math.round(score + (rng() * 22 - 11)), 0, 100);
  const health = clamp(Math.round(score + (rng() * 16 - 8)), 0, 100);

  const keywords = ["稳", "听", "快", "控", "拆", "守", "攻", "顺", "连", "防"];
  const tipsPool = [
    "先稳后冲，能听就听，别恋大牌。",
    "手里搭型成了就别乱改，稳住节奏。",
    "别人快就先防，别急着硬追。",
    "能小胡就小胡，点数先落袋为安。",
    "拆边张要果断，别被好看的形骗了。",
    "留两手防守牌，安全感比番数重要。",
    "顺风就加速，逆风先止损。",
    "听牌后别频繁变张，避免自损。",
  ];

  const birth = parseYmd(safeBirth);
  const zodiac =
    birth && isLunarSupported(birth.y)
      ? getZodiacByLunarYear(solarToLunar(birth.y, birth.m, birth.d).lYear)
      : "未知";
  const constellation = birth ? getConstellation(birth.m, birth.d) : "未知";

  const tipsPoolExtended = tipsPool.concat([mahjongLuck.hint]);
  const luckyTime = getLuckyTimeShort(almanac);

  const summaryMap = {
    大吉: "手气在线，果断出手更容易胡牌。",
    中吉: "稳中带进，节奏对了就能上分。",
    小吉: "小有顺风，稳住先吃一口。",
    平: "守住阵地，少犯错就是赢。",
    小凶: "谨慎为主，别硬刚大牌。",
  };

  const mahjong = {
    word: mahjongStyle.word || pick(rng, MAHJONG_WORDS),
    luckyTime,
    avoidSuit: pick(rng, AVOID_SUIT),
    fortuneTile: pick(rng, FORTUNE_TILES),
    good: pickByStyle(rng, mahjongStyle.key, GOODS_BY_STYLE, GOODS),
    bad: pickByStyle(rng, mahjongStyle.key, BADS_BY_STYLE, BADS),
    bestBuddy: pick(rng, BUDDIES),
    tip: pickByStyle(rng, mahjongStyle.key, TIPS_BY_STYLE, TIPS),
    tagline: scoreToTagline(score),
    style: mahjongStyle.style,
  };
  mahjong.reading = buildMahjongReading(score, mahjongLuck, mahjong);
  mahjong.summaryLines = buildMahjongSummary(score, mahjongLuck, mahjong);
  const almanacSummary = buildAlmanacSummary(almanac);

  return {
    seedStr,
    dateKey: safeDate,
    inputs: { name: safeName, birthYmd: safeBirth, mahjongType },
    score,
    level,
    keyword: pick(rng, keywords),
    dimensions: { career, wealth, love, health },
    mahjong,
    lucky: {
      color: pick(rng, COLORS),
      number: 1 + Math.floor(rng() * 99),
      direction: pick(rng, DIRECTIONS),
      item: pick(rng, ITEMS),
    },
    tips: pickUnique(rng, tipsPoolExtended, 3),
    summary: summaryMap[level] ?? summaryMap["平"],
    birthInfo: { zodiac, constellation },
    almanac,
    almanacSummary,
    mahjongLuck,
  };
}
