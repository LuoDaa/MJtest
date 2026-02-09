<template>
  <section class="card result">
    <div class="result-head">
      <div class="who-card">
        <div class="who">
          <div class="name">{{ form.name || "未命名" }}</div>
          <div class="birth">
            生日 {{ form.birth || "未填写" }}<span v-if="form.birthTime"> {{ form.birthTime }}</span>
            · 生肖{{ result.birthInfo.zodiac }} · {{ result.birthInfo.constellation }}
            · 日主{{ result.wuxingRelation.personalElement }} · {{ result.inputs.mahjongType }}
          </div>
        </div>
      </div>

      <div class="head-actions">
        <div class="score-badge">
          <div class="score-badge-top">
            <div class="score-badge-k">手气指数 · {{ result.level }}</div>
            <div class="score-mood" :class="scoreToneClass(result.score)">
              <span class="score-mood-emoji">{{ scoreMoodEmoji(result.score) }}</span>
              <span>{{ scoreMoodLabel(result.score) }}</span>
            </div>
          </div>
          <div class="score-badge-v">
            <span class="num" :class="scoreToneClass(result.score)">{{ result.score }}</span>
            <span class="unit">分</span>
          </div>
          <div class="score-badge-desc">{{ result.summary }}</div>
        </div>
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

      <div class="card-box wide almanac-card">
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

      <div class="card-box wide reading-card">
        <div class="label">📅 今日黄历</div>
        <div class="value text">
          公历 {{ result.almanac.solar }} · 农历 {{ result.almanac.lunar }} ·
          {{ result.almanac.solarTerm || "无节气" }} · 建除 {{ result.almanac.jianchu }}
        </div>
        <div class="value-sub">宜：{{ joinList(result.almanac.yi, "平") }}</div>
        <div class="value-sub">
          忌：{{ joinList(result.almanac.ji, "平") }}
          <span v-if="result.almanac.avoidTime"> · 忌时 {{ result.almanac.avoidTime }}</span>
        </div>
        <div v-if="result.almanac.luckyTimes?.length" class="value-sub">
          吉时：{{ result.almanac.luckyTimes.join("、") }}
        </div>
        <div v-if="result.almanac.jianchuMeaning" class="value-sub muted-inline">
          建除：{{ result.almanac.jianchuMeaning }}
        </div>
      </div>

      <div class="card-box wide">
        <div class="label">✨ 今日断语</div>
        <div class="value text">{{ result.mahjong.reading }}</div>
        <div class="quote">“{{ result.mahjong.tip }}”</div>
      </div>

      <div class="info-dual">
        <div class="card-box wuxing-card">
          <div class="label">☯️ 五行关系</div>
          <div class="value text compact-line">
            {{ result.wuxingRelation.label }} · 日主{{ result.wuxingRelation.personalElement }}/日干{{ result.wuxingRelation.dayElement }} ·
            {{ result.wuxingRelation.strengthTag || "中和" }}
          </div>
          <div class="value-sub">
            用{{ joinList(result.wuxingRelation.useGods, "无") }} · 忌{{ joinList(result.wuxingRelation.avoidGods, "无") }}
          </div>
          <div class="value-sub muted-inline">{{ result.wuxingRelation.text }}</div>
        </div>

        <div v-if="result.baziInfo" class="card-box bazi-card">
          <div class="label">📜 八字四柱</div>
          <div class="value text compact-line">
            {{ result.baziInfo.year }} · {{ result.baziInfo.month }} · {{ result.baziInfo.day }} · {{ result.baziInfo.hour }}
          </div>
          <div class="value-sub">
            喜用：{{ joinList(result.wuxingRelation.useGods, "无") }} · 忌：{{ joinList(result.wuxingRelation.avoidGods, "无") }}
          </div>
          <div v-if="result.baziInfo.timeAdjusted" class="value-sub muted-inline">
            经度修正 {{ result.baziInfo.timeOffsetMinutes }} 分钟
          </div>
          <div v-else-if="!result.baziInfo.timeKnown" class="value-sub muted-inline">
            时辰未填，默认子时。
          </div>
        </div>
      </div>

      <div class="card-box wide score-card">
        <div class="label">📈 评分说明</div>
        <div class="value text">分数 = 基础盘势 + 八字修正 + 当日气场</div>
        <div class="value-sub">
          基础盘势 {{ result.scoreBreakdown.base }} · 八字修正 {{ formatDelta(result.scoreBreakdown.baziDelta) }} ·
          当日气场 {{ formatDelta(result.scoreBreakdown.almanacDelta) }} · 最终 {{ result.score }}
        </div>
        <div class="value-sub">
          八字修正 = 季节 {{ formatDelta(result.scoreBreakdown.seasonDelta) }} · 强弱 {{ formatDelta(result.scoreBreakdown.strengthDelta) }} ·
          用神喜忌 {{ formatDelta(result.scoreBreakdown.favorableDelta) }} · 流年流月 {{ formatDelta(result.scoreBreakdown.flowDelta) }}
        </div>
        <div class="value-sub">
          流年：{{ result.flowInfo.yearGanzhi }}（{{ result.flowInfo.yearElement }}） ·
          流月：{{ result.flowInfo.monthGanzhi }}（{{ result.flowInfo.monthElement }}）
        </div>
      </div>
    </div>

    <div class="actions">
      <button class="btn ghost" @click="$emit('share')">截图分享</button>
      <button class="btn ghost" @click="$emit('copy')">复制结果</button>
      <button class="btn primary" @click="$emit('retry')">再测一次</button>
    </div>
  </section>
</template>

<script setup>
defineEmits(["share", "copy", "retry"]);

defineProps({
  form: {
    type: Object,
    required: true,
  },
  result: {
    type: Object,
    required: true,
  },
});

function formatDelta(value) {
  const numeric = Number(value) || 0;
  return numeric > 0 ? `+${numeric}` : `${numeric}`;
}

function joinList(list, fallback = "") {
  if (!Array.isArray(list) || !list.length) return fallback;
  const text = list.filter(Boolean).join("、");
  return text || fallback;
}

function scoreToneClass(score) {
  const numeric = Number(score) || 0;
  if (numeric >= 90) return "score-top";
  if (numeric >= 75) return "score-high";
  if (numeric >= 60) return "score-mid";
  if (numeric >= 45) return "score-low";
  return "score-risk";
}

function scoreMoodLabel(score) {
  const numeric = Number(score) || 0;
  if (numeric >= 90) return "火力全开";
  if (numeric >= 75) return "乘势进攻";
  if (numeric >= 60) return "稳中求进";
  if (numeric >= 45) return "谨慎试探";
  return "保守防守";
}

function scoreMoodEmoji(score) {
  const numeric = Number(score) || 0;
  if (numeric >= 90) return "🔥";
  if (numeric >= 75) return "⚡";
  if (numeric >= 60) return "🙂";
  if (numeric >= 45) return "🧊";
  return "🛡️";
}
</script>
