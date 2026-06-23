var SIZE = 8;
var BASE_TYPES = 6;
var MAX_TYPES = 8;
var TARGET_START = 300;
var TARGET_STEP = 120;
var MOVES_START = 20;
var MOVES_STEP = 5;

var SYMBOLS = ["✖", "▶", "◆", "✦", "◼", "❤", "★", "⬢"];

var SWIPE_THRESHOLD = 22;
var TAP_THRESHOLD = 8;

var FALL_BASE_DELAY = 60;
var FALL_DELAY_PER_STEP = 55;
var FALL_MAX_DELAY = 240;

var STORAGE_KEYS = {
  locale: "match3.locale",
  progress: "match3.progress.v1",
  tutorial: "match3.tutorial.v1",
  achievements: "match3.achievements.v1",
  inputMode: "match3.input-mode.v1",
};
