const SPIN_MS = 1000;
const CYCLE_MS = 60;

const HIRAGANA_POOL = [
  "あ", "い", "う", "え", "お",
  "か", "き", "く", "け", "こ",
  "さ", "し", "す", "せ", "そ",
  "た", "ち", "つ", "て", "と",
  "な", "に", "ぬ", "ね", "の",
  "は", "ひ", "ふ", "へ", "ほ",
  "ま", "み", "む", "め", "も",
  "や", "ゆ", "よ",
  "ら", "り", "る", "れ", "ろ",
  "わ", "を", "ん",
];

const dice = Array.from(document.querySelectorAll(".die"));
const charEls = dice.map((die) => die.querySelector(".die-char"));
let spinning = false;
let cycleTimer = null;

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function pickWord() {
  return randomItem(WORDS);
}

function startCycle() {
  cycleTimer = window.setInterval(() => {
    charEls.forEach((el) => {
      el.textContent = randomItem(HIRAGANA_POOL);
    });
  }, CYCLE_MS);
}

function stopCycle(finalChars) {
  window.clearInterval(cycleTimer);
  cycleTimer = null;
  charEls.forEach((el, index) => {
    el.textContent = finalChars[index];
  });
}

function roll() {
  if (spinning) {
    return;
  }

  spinning = true;
  const word = pickWord();
  const finalChars = [word[0], word[1], word[2]];

  dice.forEach((die) => die.classList.add("spinning"));
  startCycle();

  window.setTimeout(() => {
    dice.forEach((die) => die.classList.remove("spinning"));
    stopCycle(finalChars);
    spinning = false;
  }, SPIN_MS);
}

function handleTap(event) {
  event.preventDefault();
  roll();
}

document.getElementById("app").addEventListener("click", handleTap);

window.addEventListener("load", () => {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // Offline support is optional when SW registration fails (e.g. file://).
    });
  }
});
