import html2canvas from "html2canvas";
import { computed, nextTick, reactive, ref } from "vue";
import { generateFortune, todayKeyLocal } from "../utils/fortune_optimized";

function ymdLabel(ymd) {
  const match = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  return `${match[1]}年${Number(match[2])}月${Number(match[3])}日`;
}

function isValidYmd(ymd) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false;
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() + 1 === m && date.getDate() === d;
}

function isValidHm(hm) {
  if (!hm) return true;
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(hm);
}

function isValidLongitude(value) {
  if (value === "" || value === null || value === undefined) return true;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= -180 && numeric <= 180;
}

function buildCopyText({ form, result }) {
  const lines = [];
  lines.push(`姓名：${form.name}`);
  lines.push(`生日：${form.birth}${form.birthTime ? ` ${form.birthTime}` : ""}`);
  if (form.birthLongitude) {
    lines.push(`经度：${form.birthLongitude}`);
  }

  lines.push(`手气指数：${result.score}（${result.level}）`);
  lines.push(`字诀：${result.mahjong.word} · ${result.mahjong.wordJoke}`);
  lines.push(`打法：${result.mahjong.strategy.title} · ${result.mahjong.strategy.desc}`);
  lines.push(`三门：旺${result.mahjong.suits.favored} 平${result.mahjong.suits.neutral} 忌${result.mahjong.suits.avoid}`);
  lines.push(`五行关系：${result.wuxingRelation.text}`);

  const gods = result.wuxingRelation || {};
  lines.push(
    `用神喜忌：用${(gods.useGods || []).join("、") || "无"} 喜${(gods.joyGods || []).join("、") || "无"} 忌${(gods.avoidGods || []).join("、") || "无"}${
      (gods.enemyGods || []).length ? ` 仇${(gods.enemyGods || []).join("、")}` : ""
    }`
  );

  lines.push(`断语：${result.mahjong.reading}`);
  lines.push(`贴士：${result.mahjong.tip}`);

  return lines.join("\n");
}

function resolveCaptureScale() {
  const dpr = window.devicePixelRatio || 1;
  const isMobile = /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent);
  const cap = isMobile ? 1.5 : 2;
  return Math.max(1, Math.min(dpr, cap));
}

export function useFortuneState() {
  const view = ref("home");
  const resultRef = ref(null);
  const form = reactive({
    name: "",
    birth: "",
    birthTime: "",
    birthLongitude: "",
  });

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

  function start() {
    if (!form.name.trim()) {
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

    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    const node = resultRef.value || document.body;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    const width = Math.ceil(Math.max(rect.width, node.scrollWidth || 0));
    const height = Math.ceil(Math.max(rect.height, node.scrollHeight || 0));
    const scale = resolveCaptureScale();

    try {
      const canvas = await html2canvas(node, {
        backgroundColor: "#140707",
        scale,
        useCORS: true,
        width,
        height,
        windowWidth: width,
        windowHeight: height,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
        removeContainer: true,
        onclone: (doc) => {
          doc.documentElement.classList.add("capture-mode");
        },
      });

      const link = document.createElement("a");
      link.download = `mahjong-${todayKey.value}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      alert("截图失败，请稍后重试。");
    }
  }

  async function onCopy() {
    const content = buildCopyText({ form, result: result.value });

    try {
      if (navigator.clipboard?.writeText) {
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

  return {
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
  };
}
