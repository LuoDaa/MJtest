<template>
  <div class="page">
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark">卜</span>
        <span class="brand-name">四川麻将运势</span>
      </div>
      <div class="topbar-date">今日 · {{ todayLabel }}</div>
    </header>

    <main class="content">
      <section class="hero">
        <div class="hero-title">川麻手气卦</div>
        <div class="hero-sub">
          以八字五行与生克关系推演今日三门局势，稳中求胜。
        </div>
        <div class="hero-icons">
          <span>🀄</span>
          <span>🎴</span>
          <span>🧧</span>
          <span>🔥</span>
        </div>
      </section>

      <section v-if="view === 'home'" class="card home-card">
        <div class="card-title">输入信息</div>
        <div class="card-sub">同一天同输入，结果稳定且可重复。</div>

        <div class="form">
          <label class="field">
            <span class="label">姓名</span>
            <input
              class="input"
              v-model.trim="form.name"
              placeholder="例如：周明"
            />
          </label>
          <label class="field">
            <span class="label">生日</span>
            <input
              class="input"
              type="date"
              v-model.trim="form.birth"
              :max="todayKey"
            />
          </label>
          <label class="field">
            <span class="label">出生时辰（可选）</span>
            <input
              class="input"
              type="time"
              v-model="form.birthTime"
            />
            <span class="field-help">用于推算八字时柱，不是打麻将的时间。</span>
          </label>
          <label class="field">
            <span class="label">出生地经度（可选）</span>
            <input
              class="input"
              type="number"
              step="0.01"
              placeholder="例如：104.06（东经为正）"
              v-model="form.birthLongitude"
            />
            <span class="field-help">用于真太阳时修正，未填则按标准时间。</span>
          </label>
        </div>

        <div class="actions single">
          <button class="btn primary" @click="start">生成今日运势</button>
        </div>

        <div class="note">
          <div class="note-title">小提示</div>
          <div class="note-body">
            仅供娱乐：不替代现实判断。时辰未填默认子时。换名字或生日会得到不同结果。
          </div>
        </div>
      </section>

      <section v-else ref="resultRef" class="card result capture-root">
        <div class="result-head">
          <div class="who">
            <div class="name">{{ form.name }}</div>
            <div class="birth">
              生日 {{ form.birth }}<span v-if="form.birthTime"> {{ form.birthTime }}</span> · 生肖{{ result.birthInfo.zodiac }} ·
              {{ result.birthInfo.constellation }} · 日主{{ result.wuxingRelation.personalElement }} ·
              {{ result.inputs.mahjongType }}
            </div>
          </div>
          <div class="head-actions">
            <div class="score-badge">
              <div class="score-badge-k">手气指数 · {{ result.level }}</div>
              <div class="score-badge-v">
                <span class="num">{{ result.score }}</span>
                <span class="unit">分</span>
              </div>
              <div class="score-badge-desc">{{ result.summary }}</div>
            </div>
            <div v-if="isHot" class="score-fx hot">火力全开</div>
            <div v-else-if="isLow" class="score-fx low">谨慎防守</div>
          </div>
        </div>

        <div class="result-grid">
          <div class="card-box small">
            <div class="label">🀄 今日字诀</div>
            <div class="value large">{{ result.mahjong.word }}</div>
            <div class="value-sub">{{ result.mahjong.wordJoke }}</div>
          </div>
          <div class="card-box small">
            <div class="label">♟️ 打法倾向</div>
            <div class="value">{{ result.mahjong.strategy.title }}</div>
            <div class="value-sub">{{ result.mahjong.strategy.desc }}</div>
          </div>

          <div class="card-box wide">
            <div class="label">🎴 三门局势</div>
            <div class="suits-grid">
              <div class="suit-chip favored">
                <span class="chip-tag">旺门</span>
                <span class="chip-value">{{ result.mahjong.suits.favored }}</span>
              </div>
              <div class="suit-chip neutral">
                <span class="chip-tag">平门</span>
                <span class="chip-value">{{ result.mahjong.suits.neutral }}</span>
              </div>
              <div class="suit-chip avoid">
                <span class="chip-tag">忌门</span>
                <span class="chip-value">{{ result.mahjong.suits.avoid }}</span>
              </div>
            </div>
            <div class="value-sub suits-note">
              旺门对应{{ result.mahjong.suits.favoredElement }}行，忌门避{{ result.mahjong.suits.avoidElement }}行。
            </div>
          </div>

          <div class="card-box wide">
            <div class="label">☯️ 五行关系</div>
            <div class="value text">{{ result.wuxingRelation.text }}</div>
            <div class="value-sub">
              日主{{ result.wuxingRelation.personalElement }} · 日干{{ result.wuxingRelation.dayElement }} ·
              {{ result.wuxingRelation.label }} · 强弱{{ result.wuxingRelation.strengthTag || "中和" }}
            </div>
            <div class="value-sub">
              用{{ (result.wuxingRelation.useGods || []).join("、") || "无" }} ·
              喜{{ (result.wuxingRelation.joyGods || []).join("、") || "无" }} ·
              忌{{ (result.wuxingRelation.avoidGods || []).join("、") || "无" }}
            </div>
            <div v-if="result.wuxingRelation.todaySummary" class="value-sub">
              今日麻将：{{ result.wuxingRelation.todaySummary }}
            </div>
            <div v-if="result.wuxingRelation.summary || result.wuxingRelation.countsText" class="value-sub">
              {{ result.wuxingRelation.summary }} <span v-if="result.wuxingRelation.countsText">· 分布 {{ result.wuxingRelation.countsText }}</span>
            </div>
          </div>

          <div v-if="result.baziInfo" class="card-box wide">
            <div class="label">📜 八字四柱</div>
            <div class="value text">
              年柱：{{ result.baziInfo.year }}（{{ result.baziInfo.elements.year }}）
              月柱：{{ result.baziInfo.month }}（{{ result.baziInfo.elements.month }}）
              日柱：{{ result.baziInfo.day }}（{{ result.baziInfo.elements.day }}）
              时柱：{{ result.baziInfo.hour }}（{{ result.baziInfo.elements.hour }}）
              <span v-if="result.baziInfo.hourLabel"> · {{ result.baziInfo.hourLabel }} {{ result.baziInfo.hourRange }}</span>
            </div>
            <div class="value-sub">要点：年看根基，月看环境，日看本人，时看晚运。</div>
            <div v-if="result.baziInfo.tenGods" class="value-sub">
              十神：年干{{ result.baziInfo.tenGods.year }} · 月干{{ result.baziInfo.tenGods.month }} · 时干{{ result.baziInfo.tenGods.hour }}
            </div>
            <div v-if="result.baziSummary" class="value-sub">今日麻将：{{ result.baziSummary }}</div>
            <div v-if="result.baziInfo.timeAdjusted" class="value-sub">
              已按经度修正真太阳时（{{ result.baziInfo.timeOffsetMinutes }} 分钟）。
            </div>
            <div v-if="!result.baziInfo.timeKnown" class="value-sub">
              时辰未填，按子时估算。
            </div>
          </div>

          <div class="card-box wide">
            <div class="label">✨ 今日断语</div>
            <div class="value text">{{ result.mahjong.reading }}</div>
            <div class="quote">“{{ result.mahjong.tip }}”</div>
          </div>

          <div class="card-box wide">
            <div class="label">📈 评分说明</div>
            <div class="value text">
              分数 = 基础盘势 + 八字修正 + 当日气场
            </div>
            <div class="value-sub">
              基础盘势 {{ result.scoreBreakdown.base }} · 八字修正 {{ formatDelta(result.scoreBreakdown.baziDelta) }}
              · 当日气场 {{ formatDelta(result.scoreBreakdown.almanacDelta) }} · 最终 {{ result.score }}
            </div>
            <div class="value-sub">
              八字修正 = 季节 {{ formatDelta(result.scoreBreakdown.seasonDelta) }} · 强弱 {{ formatDelta(result.scoreBreakdown.strengthDelta) }}
              · 用神喜忌 {{ formatDelta(result.scoreBreakdown.favorableDelta) }} · 流年流月 {{ formatDelta(result.scoreBreakdown.flowDelta) }}
            </div>
            <div v-if="result.flowInfo" class="value-sub">
              流年：{{ result.flowInfo.yearGanzhi }}（{{ result.flowInfo.yearElement }}） ·
              流月：{{ result.flowInfo.monthGanzhi }}（{{ result.flowInfo.monthElement }}）
            </div>
          </div>
        </div>

        <div class="actions">
          <button class="btn ghost" @click="onShare">截图分享</button>
          <button class="btn ghost" @click="onCopy">复制结果</button>
          <button class="btn primary" @click="backHome">再测一次</button>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import html2canvas from "html2canvas";
import { computed, nextTick, reactive, ref } from "vue";
import { generateFortune, todayKeyLocal } from "./utils/fortune_optimized";

const view = ref("home"); // home | result
const form = reactive({
  name: "",
  birth: "",
  birthTime: "",
  birthLongitude: "",
});
const resultRef = ref(null);

function ymdLabel(ymd) {
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  return `${m[1]}年${Number(m[2])}月${Number(m[3])}日`;
}

function isValidYmd(ymd) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false;
  const [y, m, d] = ymd.split("-").map((v) => Number(v));
  const date = new Date(y, m - 1, d);
  return (
    date.getFullYear() === y &&
    date.getMonth() + 1 === m &&
    date.getDate() === d
  );
}

function isValidHm(hm) {
  if (!hm) return true;
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(hm);
}

function isValidLongitude(lon) {
  if (lon === "" || lon === null || lon === undefined) return true;
  const num = Number(lon);
  return !Number.isNaN(num) && num >= -180 && num <= 180;
}

function formatDelta(n) {
  const num = Number(n) || 0;
  if (num > 0) return `+${num}`;
  return `${num}`;
}

const todayKey = computed(() => todayKeyLocal());
const todayLabel = computed(() => ymdLabel(todayKey.value));

const result = computed(() =>
  generateFortune({
    name: form.name,
    birthYmd: form.birth,
    birthTime: form.birthTime,
    birthLongitude: form.birthLongitude,
    dateKey: todayKey.value,
  })
);
const isHot = computed(() => result.value.score >= 85);
const isLow = computed(() => result.value.score <= 55);

function start() {
  if (!form.name) {
    alert("请先填写姓名");
    return;
  }
  if (!isValidYmd(form.birth)) {
    alert("请输入正确生日格式：YYYY-MM-DD");
    return;
  }
  if (!isValidHm(form.birthTime)) {
    alert("请输入正确时辰格式：HH:mm");
    return;
  }
  if (!isValidLongitude(form.birthLongitude)) {
    alert("请输入有效经度（-180 到 180）");
    return;
  }
  view.value = "result";
}

function backHome() {
  view.value = "home";
}

async function onShare() {
  await nextTick();
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }
  const node = resultRef.value || document.body;
  if (!node) return;
  const rect = node.getBoundingClientRect();
  const fullWidth = Math.ceil(rect.width);
  const fullHeight = Math.ceil(rect.height);
  const scale = Math.min(window.devicePixelRatio || 2, 3);
  html2canvas(node, {
    backgroundColor: "#140707",
    scale,
    useCORS: true,
    width: fullWidth,
    height: fullHeight,
    windowWidth: fullWidth,
    windowHeight: fullHeight,
    x: 0,
    y: 0,
    scrollX: 0,
    scrollY: 0,
  })
    .then((canvas) => {
      const link = document.createElement("a");
      link.download = `mahjong-${todayKey.value}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    })
    .catch(() => {
      alert("截图失败，请稍后重试。");
    });
}

async function onCopy() {
  const lines = [];
  lines.push(`姓名：${form.name}`);
  lines.push(`生日：${form.birth}${form.birthTime ? " " + form.birthTime : ""}`);
  if (form.birthLongitude) {
    lines.push(`经度：${form.birthLongitude}`);
  }
  lines.push(`手气指数：${result.value.score}（${result.value.level}）`);
  lines.push(`字诀：${result.value.mahjong.word} · ${result.value.mahjong.wordJoke}`);
  lines.push(`打法：${result.value.mahjong.strategy.title} · ${result.value.mahjong.strategy.desc}`);
  lines.push(`三门：旺${result.value.mahjong.suits.favored} 平${result.value.mahjong.suits.neutral} 忌${result.value.mahjong.suits.avoid}`);
  lines.push(`五行关系：${result.value.wuxingRelation.text}`);
  const gods = result.value.wuxingRelation || {};
  lines.push(
    `用神喜忌：用${(gods.useGods || []).join("、") || "无"} 喜${(gods.joyGods || []).join("、") || "无"} 忌${(gods.avoidGods || []).join("、") || "无"}${(gods.enemyGods || []).length ? ` 仇${(gods.enemyGods || []).join("、")}` : ""}`
  );
  lines.push(`断语：${result.value.mahjong.reading}`);
  lines.push(`贴士：${result.value.mahjong.tip}`);
  const content = lines.join("\n");
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(content);
      alert("已复制结果");
      return;
    }
  } catch {
    // fallback below
  }
  const textarea = document.createElement("textarea");
  textarea.value = content;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
  alert("已复制结果");
}
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=ZCOOL+XiaoWei&family=Noto+Serif+SC:wght@400;600;700&display=swap");

.page {
  min-height: 100vh;
  position: relative;
  isolation: isolate;
  color: rgba(255, 244, 220, 0.92);
  background:
    radial-gradient(1200px 600px at 10% -10%, rgba(255, 200, 130, 0.25), transparent 65%),
    radial-gradient(900px 520px at 90% 5%, rgba(255, 90, 90, 0.2), transparent 60%),
    linear-gradient(180deg, #1b0907 0%, #0f0505 60%, #080303 100%);
  font-family: "Noto Serif SC", "ZCOOL XiaoWei", "STKaiti", "KaiTi", serif;
}

.page::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(800px 500px at 20% 20%, rgba(255, 210, 140, 0.14), transparent 70%),
    repeating-linear-gradient(135deg, rgba(255, 220, 160, 0.08) 0 2px, transparent 2px 7px);
  opacity: 0.55;
  z-index: 0;
}

.page > * {
  position: relative;
  z-index: 1;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  background: linear-gradient(120deg, rgba(177, 23, 27, 0.95), rgba(92, 12, 12, 0.95));
  border-bottom: 1px solid rgba(244, 197, 106, 0.25);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(10px);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
}

.brand-mark {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, rgba(255, 220, 160, 0.35), rgba(244, 197, 106, 0.15));
  border: 1px solid rgba(244, 197, 106, 0.45);
  color: #f9d889;
  font-size: 20px;
}

.brand-name {
  font-size: 18px;
  letter-spacing: 2px;
  color: #f9e2ad;
}

.topbar-date {
  font-size: 12px;
  color: rgba(255, 230, 190, 0.7);
}

.content {
  max-width: clamp(320px, 94vw, 780px);
  margin: 0 auto;
  padding: clamp(10px, 3vw, 16px);
}

.hero {
  text-align: left;
  margin-bottom: 18px;
  animation: float-in 0.7s ease;
}

.hero-title {
  font-size: 34px;
  letter-spacing: 2px;
  font-weight: 700;
  color: #ffe4b8;
  text-shadow: 0 6px 18px rgba(0, 0, 0, 0.45);
}

.hero-sub {
  margin-top: 8px;
  font-size: 15px;
  color: rgba(255, 226, 190, 0.75);
}

.hero-icons {
  margin-top: 10px;
  display: inline-flex;
  gap: 10px;
  font-size: 20px;
}

.card {
  border-radius: 16px;
  padding: clamp(10px, 3vw, 14px);
  background: linear-gradient(180deg, rgba(60, 14, 14, 0.92), rgba(22, 8, 8, 0.85));
  border: 1px solid rgba(244, 197, 106, 0.18);
  box-shadow: 0 22px 50px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  animation: float-in 0.7s ease;
}

.home-card {
  display: grid;
  gap: 12px;
}

.card.result {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.card-title {
  font-size: 20px;
  font-weight: 700;
  color: #ffe4b8;
}

.card-sub {
  margin-top: 6px;
  font-size: 13px;
  color: rgba(255, 226, 190, 0.7);
}

.form {
  margin-top: 14px;
  display: grid;
  gap: 12px;
}

.field {
  display: grid;
  gap: 8px;
}

.label {
  font-size: 12px;
  color: rgba(255, 226, 190, 0.7);
}

.field-help {
  margin-top: 4px;
  font-size: 11px;
  color: rgba(255, 226, 190, 0.6);
}

.input {
  height: 44px;
  border-radius: 12px;
  border: 1px solid rgba(244, 197, 106, 0.2);
  background: rgba(28, 8, 8, 0.75);
  color: rgba(255, 244, 220, 0.92);
  padding: 0 12px;
  font-size: 15px;
  outline: none;
}

.input:focus {
  border-color: rgba(244, 197, 106, 0.55);
  box-shadow: 0 0 0 2px rgba(244, 197, 106, 0.15);
}

.note {
  margin-top: 12px;
  border-radius: 14px;
  padding: 12px;
  background: rgba(20, 7, 7, 0.7);
  border: 1px dashed rgba(244, 197, 106, 0.2);
}

.note-title {
  font-size: 12px;
  font-weight: 700;
  color: #f9d889;
}

.note-body {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(255, 226, 190, 0.75);
}

.result-head {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) auto;
  align-items: flex-start;
  gap: 10px;
}

.who {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.head-actions {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
}

.score-badge {
  width: clamp(120px, 45vw, 180px);
  border-radius: 12px;
  padding: 8px 10px;
  background: radial-gradient(120px 80px at 20% 20%, rgba(244, 197, 106, 0.18), transparent 60%),
              rgba(16, 6, 6, 0.85);
  border: 1px solid rgba(244, 197, 106, 0.35);
  text-align: center;
}

.score-badge-k {
  font-size: 11px;
  color: rgba(255, 226, 190, 0.7);
}

.score-badge-v {
  margin-top: 6px;
  display: flex;
  justify-content: center;
  align-items: baseline;
  gap: 6px;
}

.score-badge-v .num {
  font-size: clamp(22px, 5.4vw, 28px);
  font-weight: 700;
  color: #f9d889;
}

.score-badge-v .unit {
  font-size: 12px;
  color: rgba(255, 226, 190, 0.75);
}

.score-badge-desc {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(255, 226, 190, 0.82);
}

.score-fx {
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.score-fx.hot {
  background: linear-gradient(120deg, rgba(255, 204, 130, 0.95), rgba(255, 118, 118, 0.95));
  color: #3b0c0c;
  animation: pop 1.2s ease-in-out infinite;
}

.score-fx.low {
  background: rgba(255, 88, 88, 0.15);
  color: #ffb0b0;
  border: 1px solid rgba(255, 140, 140, 0.4);
  animation: shake 0.8s ease-in-out infinite;
}

.result-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.card-box {
  border-radius: 14px;
  padding: 12px;
  background: rgba(14, 6, 6, 0.82);
  border: 1px solid rgba(244, 197, 106, 0.12);
}

.card-box.small {
  min-height: 88px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.card-box.wide {
  grid-column: span 2;
}

.card-box .label {
  font-size: 12px;
  color: rgba(255, 226, 190, 0.65);
}

.card-box .value {
  margin-top: 6px;
  font-size: clamp(15px, 4vw, 17px);
  font-weight: 700;
}

.card-box .value.large {
  font-size: clamp(16px, 4.4vw, 19px);
}

.card-box .value.text {
  font-size: 12.5px;
  line-height: 1.52;
  font-weight: 500;
  color: rgba(255, 236, 205, 0.88);
}

.value-sub {
  margin-top: 5px;
  font-size: 11.5px;
  line-height: 1.42;
  color: rgba(255, 226, 190, 0.72);
}

.muted-inline {
  font-size: 11px;
  color: rgba(255, 226, 190, 0.55);
  margin-left: 6px;
}

.name {
  font-size: 20px;
  font-weight: 700;
  color: #ffe4b8;
}

.birth {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(255, 226, 190, 0.75);
}

.suits-grid {
  margin-top: 8px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
  gap: 8px;
}

.suit-chip {
  border-radius: 10px;
  padding: 8px;
  text-align: center;
  border: 1px solid rgba(244, 197, 106, 0.15);
  background: rgba(20, 7, 7, 0.8);
}

.suit-chip.favored {
  border-color: rgba(244, 197, 106, 0.55);
  background: linear-gradient(160deg, rgba(244, 197, 106, 0.25), rgba(20, 7, 7, 0.85));
  color: #ffe4b8;
}

.suit-chip.neutral {
  border-color: rgba(244, 197, 106, 0.25);
}

.suit-chip.avoid {
  border-color: rgba(255, 120, 120, 0.45);
  background: rgba(40, 10, 10, 0.85);
  color: #ffb8b8;
}

.chip-tag {
  display: block;
  font-size: 11px;
  color: rgba(255, 226, 190, 0.7);
}

.chip-value {
  display: block;
  margin-top: 4px;
  font-size: 15px;
  font-weight: 700;
}

.suits-note {
  margin-top: 8px;
}

.quote {
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(28, 10, 10, 0.75);
  border: 1px dashed rgba(244, 197, 106, 0.25);
  color: rgba(255, 226, 190, 0.9);
  font-size: 12px;
  line-height: 1.5;
}

.actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 10px;
}

.actions.single {
  grid-template-columns: 1fr;
}

.btn {
  height: 40px;
  border-radius: 12px;
  font-size: 13.5px;
  font-weight: 700;
  border: 1px solid rgba(244, 197, 106, 0.25);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.btn.primary {
  color: #3b0c0c;
  background: linear-gradient(135deg, #f6d28d, #d9a441);
  box-shadow: 0 12px 24px rgba(217, 164, 65, 0.35);
}

.btn.primary:hover {
  transform: translateY(-1px);
}

.btn.ghost {
  background: rgba(26, 9, 9, 0.7);
  color: rgba(255, 236, 205, 0.92);
}

@keyframes float-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pop {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

@keyframes shake {
  0%, 100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-2px);
  }
  75% {
    transform: translateX(2px);
  }
}

@media (max-width: 640px) {
  .topbar {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }

  .content {
    padding: 12px 10px 20px;
  }

  .result-head {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
  }

  .who {
    align-items: center;
  }

  .head-actions {
    flex-direction: column;
    align-items: center;
  }

  .score-badge {
    width: 100%;
    max-width: 260px;
  }

  .actions {
    grid-template-columns: 1fr;
  }
 
  .result-grid {
    grid-template-columns: 1fr;
  }

  .card-box.wide {
    grid-column: span 1;
  }

  .suits-grid {
    grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
  }

  .hero-title {
    font-size: 28px;
  }

  .hero-sub {
    font-size: 13px;
  }

  .card-title {
    font-size: 18px;
  }

  .card {
    padding: 12px;
    border-radius: 14px;
  }

  .card-box {
    padding: 10px;
  }

  .name {
    font-size: 18px;
  }

  .card-box .value {
    font-size: 16px;
  }

  .card-box .value.large {
    font-size: 17px;
  }

  .card-box .value.text,
  .value-sub {
    font-size: 12px;
  }

  .btn {
    height: 38px;
    font-size: 12.5px;
  }
}

@media (max-width: 420px) {
  .content {
    padding: 10px 8px 16px;
  }

  .hero-title {
    font-size: 26px;
  }

  .card {
    padding: 10px;
    border-radius: 12px;
  }

  .card-box {
    padding: 9px;
    border-radius: 11px;
  }

  .card-box .value {
    font-size: 15px;
  }

  .card-box .value.large {
    font-size: 16px;
  }

  .card-box .value.text,
  .value-sub {
    font-size: 11.5px;
  }

  .btn {
    height: 36px;
    font-size: 12px;
  }

  .score-badge {
    min-width: 130px;
    padding: 8px 10px;
  }
}
</style>
