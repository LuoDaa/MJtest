import assert from "node:assert/strict";
import { generateFortune } from "../src/utils/fortune_optimized.js";

const fixedDate = "2026-02-09";

const cases = [
  {
    name: "罗达",
    birthYmd: "2000-11-01",
    birthTime: "18:00",
    birthLongitude: "104.06",
    dateKey: fixedDate,
  },
  {
    name: "阿青",
    birthYmd: "1996-04-17",
    birthTime: "09:30",
    birthLongitude: "121.47",
    dateKey: fixedDate,
  },
  {
    name: "测试用户",
    birthYmd: "2002-12-02",
    birthTime: "",
    birthLongitude: "",
    dateKey: fixedDate,
  },
];

for (const payload of cases) {
  const a = generateFortune(payload);
  const b = generateFortune(payload);

  assert.deepStrictEqual(a, b, "同输入同日期应生成完全一致结果");
  assert.ok(Number.isFinite(a.score), "score 应为数值");
  assert.ok(a.score >= 0 && a.score <= 100, "score 应在 0-100");

  assert.ok(a.mahjong?.word, "字诀不能为空");
  assert.ok(a.mahjong?.strategy?.title, "打法标题不能为空");
  assert.ok(a.mahjong?.strategy?.desc, "打法描述不能为空");
  assert.ok(a.wuxingRelation?.personalElement, "日主五行不能为空");

  assert.ok(Array.isArray(a.almanac?.yi), "黄历宜必须是数组");
  assert.ok(Array.isArray(a.almanac?.ji), "黄历忌必须是数组");
  assert.ok(Array.isArray(a.wuxingRelation?.useGods), "用神必须是数组");
  assert.ok(Array.isArray(a.wuxingRelation?.avoidGods), "忌神必须是数组");

  const criticalText = [
    a.summary,
    a.mahjong?.wordJoke,
    a.mahjong?.reading,
    a.mahjong?.tip,
    a.wuxingRelation?.text,
  ]
    .join("\n")
    .toLowerCase();

  assert.equal(criticalText.includes("undefined"), false, "关键文案不应包含 undefined");
  assert.equal(criticalText.includes("null"), false, "关键文案不应包含 null");
}

const sameDateA = generateFortune({
  name: "用户甲",
  birthYmd: "2002-12-02",
  birthTime: "12:00",
  birthLongitude: "104.06",
  dateKey: fixedDate,
});

const sameDateB = generateFortune({
  name: "用户乙",
  birthYmd: "2002-12-02",
  birthTime: "12:00",
  birthLongitude: "104.06",
  dateKey: fixedDate,
});

assert.notEqual(sameDateA.seedStr, sameDateB.seedStr, "不同输入应产生不同 seed");

console.log("fortune check passed");
