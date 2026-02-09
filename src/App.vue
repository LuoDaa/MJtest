<template>
  <div class="page">
    <FortuneHeader :today-label="todayLabel" />

    <main class="content">
      <FortuneForm
        v-if="view === 'home'"
        :form="form"
        :today-key="todayKey"
        @start="start"
      />

      <section v-else ref="resultRef" class="capture-root">
        <FortuneResult
          :form="form"
          :result="result"
          @share="onShare"
          @copy="onCopy"
          @retry="backHome"
        />
      </section>
    </main>
  </div>
</template>

<script setup>
import FortuneForm from "./components/FortuneForm.vue";
import FortuneHeader from "./components/FortuneHeader.vue";
import FortuneResult from "./components/FortuneResult.vue";
import { useFortuneState } from "./composables/useFortuneState";
import "./assets/fortune-page.css";

const {
  view,
  form,
  resultRef,
  todayKey,
  todayLabel,
  result,
  start,
  backHome,
  onShare,
  onCopy,
} = useFortuneState();
</script>
