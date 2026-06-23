var FB_I18N = {
  en: {
    "title": "Flappy Bird",
    "subtitle": "Tap or press Space to flap. Avoid the pipes!",
    "score-label": "Score",
    "best-label": "Best",
    "tap-to-start": "Tap to Start",
    "play-again": "Play Again",
    "main-menu": "Main Menu",
    "game-over": "Game Over",
    "locale-label": "Language",
    "hint": "Tip: install to home screen for instant play, even offline."
  },
  zh: {
    "title": "飞翔的小鸟",
    "subtitle": "点击或按空格键拍翅。避开管道！",
    "score-label": "分数",
    "best-label": "最佳",
    "tap-to-start": "点击开始",
    "play-again": "再来一局",
    "main-menu": "主菜单",
    "game-over": "游戏结束",
    "locale-label": "语言",
    "hint": "提示：安装到主屏后可离线快速启动。"
  },
  ms: {
    "title": "Burung Terbang",
    "subtitle": "Ketik atau tekan Ruang untuk mengepak. Elak paip!",
    "score-label": "Markah",
    "best-label": "Terbaik",
    "tap-to-start": "Ketik untuk Mula",
    "play-again": "Main Lagi",
    "main-menu": "Menu Utama",
    "game-over": "Permainan Tamat",
    "locale-label": "Bahasa",
    "hint": "Petua: pasang ke skrin utama untuk main terus walaupun luar talian."
  }
};

var FB_SUPPORTED_LOCALES = Object.keys(FB_I18N);

var fbCurrentLocale = (function () {
  var saved = localStorage.getItem(STORAGE_KEY_LOCALE);
  if (saved && FB_SUPPORTED_LOCALES.indexOf(saved) !== -1) return saved;
  var nav = (navigator.language || 'en').toLowerCase();
  if (nav.indexOf('zh') === 0) return 'zh';
  if (nav.indexOf('ms') === 0 || nav.indexOf('id') === 0) return 'ms';
  return 'en';
})();

function ft(key) {
  return (FB_I18N[fbCurrentLocale] && FB_I18N[fbCurrentLocale][key]) || FB_I18N.en[key] || key;
}
