<template>
  <header class="topbar">
    <div class="brand">
      <span class="brand-mark">卜</span>
      <span class="brand-name">四川麻将运势</span>
    </div>
    <div class="topbar-date">今日 · {{ todayLabel }}</div>
  </header>

  <section class="hero">
    <div class="hero-title">川麻手气卦</div>
    <div class="hero-sub">以八字五行与生克关系推演今日三门局势，稳中求胜。</div>
    <div class="hero-icons" aria-hidden="true">
      <span>🀄</span>
      <span>🎴</span>
      <span>🧧</span>
      <span>🔥</span>
    </div>
  </section>
</template>

<script setup>
defineProps({
  todayLabel: {
    type: String,
    default: "",
  },
});
</script>
