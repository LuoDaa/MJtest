<template>
  <section class="card home-card">
    <div class="card-title">输入信息</div>
    <div class="card-sub">同一天同输入，结果稳定且可重复。</div>

    <div class="form-grid">
      <label class="field">
        <span class="label">姓名</span>
        <input class="input" v-model.trim="form.name" placeholder="例如：周明" />
      </label>

      <label class="field">
        <span class="label">生日</span>
        <input class="input" type="date" v-model.trim="form.birth" :max="todayKey" />
      </label>

      <label class="field">
        <span class="label">出生时辰（可选）</span>
        <input class="input" type="time" v-model="form.birthTime" />
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
      <button class="btn primary" @click="$emit('start')">生成今日运势</button>
    </div>

    <div class="note">
      <div class="note-title">小提示</div>
      <div class="note-body">仅供娱乐：不替代现实判断。时辰未填默认子时。换名字或生日会得到不同结果。</div>
    </div>
  </section>
</template>

<script setup>
defineEmits(["start"]);

defineProps({
  form: {
    type: Object,
    required: true,
  },
  todayKey: {
    type: String,
    default: "",
  },
});
</script>
