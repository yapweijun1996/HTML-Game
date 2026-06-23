var I18N = {
  en: {
    "title": "Match-3",
    "subtitle": "Tap first, then tap a neighbor to swap. Drag mode works for touch too.",
    "subtitle-goal": "Goal: reach the target score before moves run out.",
    "locale-label": "Language",
    "interaction-label": "Input mode",
    "input-mode-drag": "Drag",
    "input-mode-tap": "Tap",
    "level-label": "Level",
    "moves-left": "Moves",
    "target-score": "Target",
    "goal-progress-label": "Score",
    "score-label": "Score",
    "restart": "Replay Level",
    "next-level": "Next Level",
    "main-menu": "Main Menu",
    "hint-button": "Hint",
    "hint": "Tip: install to home screen for instant play, even offline.",
    "status-no-match": "No chain formed.",
    "goal-success": "Level clear!",
    "goal-fail": "No moves left.",
    "move-result": "+{score} ({chains}x)",
    "chain-preview": "+{score} x{chains}",
    "tutorial-step1": "Step 1: tap or drag a tile, then swap to neighbor.",
    "tutorial-step2": "Step 2: watch swap feedback: green glow means valid, red shake means invalid.",
    "hint-used": "Hint used for this level.",
    "hint-empty": "No immediate hint available.",
    "achievement-title": "Achievements",
    "achievement-first-3-chain": "Clear 1st 3-chain",
    "achievement-best-chain": "Best chain: {count}",
    "achievement-no-invalid-20": "No invalid in 20 moves",
    "cell-label": "Tile",
    "board-label": "Game board",
    "aria-selected": "Selected",
    "loading": "Loading"
  },
  zh: {
    "title": "三消",
    "subtitle": "先点选，再点或拖拽相邻方块交换。",
    "subtitle-goal": "每关目标：在规定步数内达到目标分数。",
    "locale-label": "语言",
    "interaction-label": "操作模式",
    "input-mode-drag": "拖拽",
    "input-mode-tap": "点按",
    "level-label": "关",
    "moves-left": "步",
    "target-score": "标",
    "goal-progress-label": "分",
    "score-label": "得分",
    "restart": "重开本关",
    "next-level": "下一关",
    "main-menu": "主菜单",
    "hint-button": "提示",
    "hint": "提示：安装到主屏后可离线快速启动。",
    "status-no-match": "未形成连锁。",
    "goal-success": "通过本关！",
    "goal-fail": "步数已用完。",
    "move-result": "+{score}（{chains}连）",
    "chain-preview": "+{score} x{chains}",
    "tutorial-step1": "步骤 1：先点选格子，再点或拖拽相邻格交换。",
    "tutorial-step2": "步骤 2：绿色/亮色光表示有效交换，红色抖动表示无效交换。",
    "hint-used": "本局已使用一次提示。",
    "hint-empty": "当前暂无可用提示。",
    "achievement-title": "成就",
    "achievement-first-3-chain": "完成第一段 3 链",
    "achievement-best-chain": "历史最高连锁：{count}",
    "achievement-no-invalid-20": "20 步内无错误交换",
    "cell-label": "方块",
    "board-label": "游戏棋盘",
    "aria-selected": "已选中",
    "loading": "加载中"
  },
  ms: {
    "title": "Match-3",
    "subtitle": "Tekan satu jubin, kemudian ketuk jiran untuk ditukar. Mod seret juga boleh digunakan.",
    "subtitle-goal": "Matlamat: capai sasaran sebelum langkah habis.",
    "locale-label": "Bahasa",
    "interaction-label": "Mod input",
    "input-mode-drag": "Seret",
    "input-mode-tap": "Ketik",
    "level-label": "Lv",
    "moves-left": "Langkah",
    "target-score": "Sasar",
    "goal-progress-label": "Markah",
    "score-label": "Markah",
    "restart": "Main Semula",
    "next-level": "Tahap Seterusnya",
    "main-menu": "Menu Utama",
    "hint-button": "Bantuan",
    "hint": "Petua: pasang ke skrin utama untuk main terus walaupun luar talian.",
    "status-no-match": "Tiada rantaian dibentuk.",
    "goal-success": "Tahap tamat!",
    "goal-fail": "Langkah habis.",
    "move-result": "+{score} ({chains} rantai)",
    "chain-preview": "+{score} x{chains}",
    "tutorial-step1": "Langkah 1: ketuk satu jubin, kemudian ketuk jiran untuk menukar.",
    "tutorial-step2": "Langkah 2: kenali respons: cahaya hijau bermakna sah, gegaran merah bermakna tidak sah.",
    "hint-used": "Petua digunakan sekali untuk tahap ini.",
    "hint-empty": "Tiada petua semasa ini.",
    "achievement-title": "Pencapaian",
    "achievement-first-3-chain": "Bersihkan rantai 3 pertama",
    "achievement-best-chain": "Rantai terbaik: {count}",
    "achievement-no-invalid-20": "Tiada ralat dalam 20 gerak",
    "cell-label": "Jubin",
    "board-label": "Papan permainan",
    "aria-selected": "Dipilih",
    "loading": "Memuatkan"
  }
};

var SUPPORTED_LOCALES = Object.keys(I18N);

function resolveLocale() {
  const saved = localStorage.getItem(STORAGE_KEYS.locale);
  const nav = (navigator.language || "en").toLowerCase();
  if (saved && SUPPORTED_LOCALES.includes(saved)) return saved;
  if (nav.startsWith("zh")) return "zh";
  if (nav.startsWith("ms") || nav.startsWith("id")) return "ms";
  return "en";
}

function t(key, vars = {}) {
  let value = I18N[currentLocale] && I18N[currentLocale][key] ? I18N[currentLocale][key] : I18N.en[key] || key;
  Object.entries(vars).forEach(([name, val]) => {
    value = value.replaceAll(`{${name}}`, String(val));
  });
  return value;
}
