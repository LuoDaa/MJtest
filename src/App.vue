<template>
  <div class="page">
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark">卜</span>
        <span class="brand-name">四川麻将运势</span>
      </div>
      <div class="topbar-date">{{ todayLabel }}</div>
    </header>

    <main class="content">
      <section class="hero">
        <div class="hero-title">麻将运势预测</div>
        <div class="hero-sub">
          输入姓名与生日，生成你的专属牌桌手气与建议。
        </div>
        <div class="hero-icons">
          <span>🀄</span>
          <span>🧧</span>
          <span>💰</span>
          <span>🎴</span>
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
        </div>

        <div class="actions single">
          <button class="btn primary" @click="start">生成今日运势</button>
        </div>

        <div class="note">
          <div class="note-title">小提示</div>
          <div class="note-body">
            仅供娱乐：不替代现实判断。换名字或生日会得到不同结果。
          </div>
        </div>
      </section>

      <section v-else ref="resultRef" class="card result capture-root">
        <div class="result-head">
          <div class="who">
            <div class="name">{{ form.name }}</div>
          <div class="birth">
              生日 {{ form.birth }} · 生肖{{ result.birthInfo.zodiac }} ·
              {{ result.birthInfo.constellation }} · {{ result.inputs.mahjongType }}
          </div>
        </div>
          <div class="head-actions">
            <div class="score-badge">
              <div class="score-badge-k">手气指数</div>
              <div class="score-badge-v">
                <span class="num">{{ result.score }}</span>
                <span class="unit">分</span>
              </div>
              <div class="score-badge-desc">{{ result.mahjong.tagline }}</div>
            </div>
            <div v-if="isHot" class="score-fx hot">杠上开花</div>
            <div v-else-if="isLow" class="score-fx low">点炮预警</div>
            <button class="btn ghost small" @click="backHome">换人再测</button>
          </div>
        </div>

        <div class="result-grid">
          <div class="card-box small">
            <div class="label">🀄 今日字诀</div>
            <div class="value large">{{ result.mahjong.word }}</div>
            <div class="value-sub">{{ result.mahjong.wordJoke }}</div>
          </div>
          <div class="card-box small">
            <div class="label">🧭 最佳方位</div>
            <div class="value large">
              {{ result.mahjong.bazi.direction }}
              <span class="muted-inline">· {{ result.mahjong.bazi.element }}</span>
            </div>
          </div>

          <div class="card-box small">
            <div class="label">🎯 建议定缺</div>
            <div class="value">{{ result.mahjong.avoidSuit }}</div>
          </div>
          <div class="card-box small">
            <div class="label">🧧 本命财神牌</div>
            <div class="value">{{ result.mahjong.fortuneTile }}</div>
          </div>

          <div class="card-box small">
            <div class="label">✅ 宜</div>
            <div class="value good-text">{{ result.mahjong.good }}</div>
            <div class="value-sub good-text">{{ result.mahjong.goodDetail }}</div>
          </div>
          <div class="card-box small">
            <div class="label">⛔ 忌</div>
            <div class="value bad-text">{{ result.mahjong.bad }}</div>
            <div class="value-sub bad-text">{{ result.mahjong.badDetail }}</div>
          </div>

          <div class="card-box wide">
            <div class="label">🤝 最佳牌友气质</div>
            <div class="value">{{ result.mahjong.bestBuddy }}</div>
          </div>

          <div class="card-box wide">
            <div class="label">✨ 麻将运势</div>
            <div class="value text">{{ result.mahjong.reading }}</div>
          </div>

          <div class="card-box wide">
            <div class="label">🧠 雀神小贴士</div>
            <div class="value text">“{{ result.mahjong.tip }}”</div>
          </div>

          <div class="card-box wide">
            <div class="label">📜 黄历运势</div>
            <ul class="almanac-lines">
              <li v-for="(line, idx) in result.almanacSummary" :key="idx" :class="almanacLineClass(line)">
                {{ line }}
              </li>
            </ul>
          </div>
        </div>

        <div class="actions">
          <button class="btn ghost" @click="onShare">截图分享</button>
          <button class="btn primary" @click="backHome">再测一次</button>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import html2canvas from "html2canvas";
import { computed, nextTick, reactive, ref } from "vue";
import { generateFortune, todayKeyLocal } from "./utils/fortune";

const view = ref("home"); // home | result
const form = reactive({
  name: "",
  birth: "",
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

const todayKey = computed(() => todayKeyLocal());
const todayLabel = computed(() => ymdLabel(todayKey.value));

const result = computed(() =>
  generateFortune({ name: form.name, birthYmd: form.birth, dateKey: todayKey.value })
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
  const node = document.body;
  if (!node) return;
  const docEl = document.documentElement;
  const fullWidth = Math.max(docEl.scrollWidth, docEl.clientWidth);
  const fullHeight = Math.max(docEl.scrollHeight, docEl.clientHeight);
  const scale = Math.min(window.devicePixelRatio || 2, 3);
  html2canvas(node, {
    backgroundColor: null,
    scale,
    useCORS: true,
    allowTaint: true,
    foreignObjectRendering: true,
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

function almanacLineClass(line) {
  if (line.startsWith("宜")) return "good-text";
  if (line.startsWith("吉时")) return "good-text";
  if (line.startsWith("忌")) return "bad-text";
  if (line.startsWith("避时")) return "bad-text";
  return "";
}
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=ZCOOL+XiaoWei&family=Noto+Serif+SC:wght@400;600;700&display=swap");

.page {
  min-height: 100vh;
  color: rgba(255, 255, 255, 0.92);
  background:
    radial-gradient(900px 600px at 20% 0%, rgba(255, 188, 120, 0.25), transparent 60%),
    radial-gradient(700px 520px at 85% 15%, rgba(255, 70, 90, 0.22), transparent 60%),
    radial-gradient(600px 420px at 50% 80%, rgba(70, 140, 255, 0.18), transparent 60%),
    linear-gradient(180deg, #0b1018 0%, #06070a 60%, #050505 100%);
  font-family: "Noto Serif SC", "ZCOOL XiaoWei", "STKaiti", "KaiTi", serif;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  background: linear-gradient(120deg, rgba(193, 39, 45, 0.92), rgba(112, 21, 24, 0.92));
  backdrop-filter: blur(10px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
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
  background: rgba(255, 255, 255, 0.15);
  font-size: 20px;
}

.brand-name {
  font-size: 18px;
  letter-spacing: 2px;
}

.topbar-date {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.72);
}

.content {
  max-width: 720px;
  margin: 0 auto;
  padding: 18px 18px 30px;
}

.hero {
  text-align: left;
  margin-bottom: 16px;
  animation: float-in 0.7s ease;
}

.hero-title {
  font-size: 32px;
  letter-spacing: 1px;
  font-weight: 700;
}

.hero-sub {
  margin-top: 8px;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
}

.hero-icons {
  margin-top: 10px;
  display: inline-flex;
  gap: 10px;
  font-size: 20px;
}

.card {
  border-radius: 20px;
  padding: 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.05));
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 20px 55px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(12px);
  animation: float-in 0.7s ease;
}

.home-card {
  display: grid;
  gap: 14px;
}

.card.result {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-title {
  font-size: 20px;
  font-weight: 700;
}

.card-sub {
  margin-top: 6px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.72);
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
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}

.input {
  height: 42px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(10, 16, 24, 0.55);
  color: rgba(255, 255, 255, 0.92);
  padding: 0 12px;
  font-size: 15px;
  outline: none;
}

.note {
  margin-top: 12px;
  border-radius: 14px;
  padding: 12px;
  background: rgba(7, 10, 16, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.note-title {
  font-size: 12px;
  font-weight: 700;
}

.note-body {
  margin-top: 6px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.75);
}

.result-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
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
  min-width: 160px;
  border-radius: 16px;
  padding: 12px 14px;
  background: radial-gradient(120px 80px at 20% 20%, rgba(255, 255, 255, 0.08), transparent 60%),
              rgba(6, 10, 18, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.12);
  text-align: center;
}

.score-badge-k {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.68);
}

.score-badge-v {
  margin-top: 6px;
  display: flex;
  justify-content: center;
  align-items: baseline;
  gap: 6px;
}

.score-badge-v .num {
  font-size: 30px;
  font-weight: 700;
}

.score-badge-v .unit {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.score-badge-desc {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.78);
}

.score-fx {
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.score-fx.hot {
  background: linear-gradient(120deg, rgba(255, 190, 92, 0.9), rgba(255, 107, 107, 0.9));
  color: #2a1405;
  animation: pop 1.2s ease-in-out infinite;
}

.score-fx.low {
  background: rgba(255, 88, 88, 0.18);
  color: #ff8a8a;
  border: 1px solid rgba(255, 122, 122, 0.4);
  animation: shake 0.8s ease-in-out infinite;
}

.result-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.span-2 {
  grid-column: span 2;
}

.card-box {
  border-radius: 16px;
  padding: 14px;
  background: rgba(6, 10, 18, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.08);
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
  color: rgba(255, 255, 255, 0.65);
}

.card-box .value {
  margin-top: 8px;
  font-size: 18px;
  font-weight: 700;
}

.card-box .value.large {
  font-size: 20px;
}

.card-box .value.text {
  font-size: 13px;
  line-height: 1.6;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.85);
}

.value-sub {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.7);
}

.muted-inline {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.65);
  margin-left: 4px;
}

.good-text {
  color: #6fe3a1;
}

.bad-text {
  color: #ff7a7a;
}

.name {
  font-size: 22px;
  font-weight: 700;
}

.birth {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.almanac-lines {
  margin: 8px 0 0;
  padding-left: 18px;
  color: rgba(255, 255, 255, 0.82);
  font-size: 13px;
  line-height: 1.6;
}

.almanac-lines li {
  margin-bottom: 6px;
}


.actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.actions.single {
  grid-template-columns: 1fr;
}

.btn {
  height: 46px;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 700;
  border: 1px solid rgba(255, 255, 255, 0.12);
  cursor: pointer;
}

.btn.primary {
  color: #111;
  background: linear-gradient(120deg, #ffb357, #ff6b6b);
}

.btn.ghost {
  background: rgba(10, 14, 22, 0.55);
  color: rgba(255, 255, 255, 0.9);
}

.btn.small {
  height: 34px;
  font-size: 12px;
  padding: 0 12px;
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
    max-width: 240px;
  }

  .actions {
    grid-template-columns: 1fr;
  }
}
</style>
