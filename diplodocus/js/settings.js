/**
 * settings.js — Playback settings (voice, rate, pitch).
 *
 * Persisted in localStorage under KEY. Changes apply immediately to the
 * TTSEngine instance; the engine picks them up on the next utterance.
 */

const KEY = 'ereader-settings';
const DEFAULTS = { rate: 1.0, pitch: 1.0, voiceURI: null };

export function loadSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { ...DEFAULTS, ...stored };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(patch) {
  const current = loadSettings();
  localStorage.setItem(KEY, JSON.stringify({ ...current, ...patch }));
}

export function resolveVoice(voiceURI) {
  if (!voiceURI) return null;
  return speechSynthesis.getVoices().find(v => v.voiceURI === voiceURI) ?? null;
}

/**
 * Populates the settings panel controls and wires them to the engine.
 * Safe to call multiple times (re-renders in place).
 */
export function renderSettingsPanel(panelEl, engine) {
  const voiceSelect = panelEl.querySelector('#settings-voice');
  const rateInput   = panelEl.querySelector('#settings-rate');
  const pitchInput  = panelEl.querySelector('#settings-pitch');
  const rateVal     = panelEl.querySelector('#settings-rate-val');
  const pitchVal    = panelEl.querySelector('#settings-pitch-val');

  const s = loadSettings();

  // ── Sliders ──────────────────────────────────────────────────
  rateInput.value  = s.rate;
  pitchInput.value = s.pitch;
  rateVal.textContent  = `${Number(s.rate).toFixed(1)}×`;
  pitchVal.textContent = Number(s.pitch).toFixed(1);

  rateInput.addEventListener('input', () => {
    const v = parseFloat(rateInput.value);
    rateVal.textContent = `${v.toFixed(1)}×`;
    engine.rate = v;
    saveSettings({ rate: v });
  });

  pitchInput.addEventListener('input', () => {
    const v = parseFloat(pitchInput.value);
    pitchVal.textContent = v.toFixed(1);
    engine.pitch = v;
    saveSettings({ pitch: v });
  });

  // ── Voice list ────────────────────────────────────────────────
  function populateVoices() {
    const voices = speechSynthesis.getVoices()
      .slice()
      .sort((a, b) => a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name));

    voiceSelect.innerHTML = '<option value="">System default</option>';
    for (const v of voices) {
      const opt = document.createElement('option');
      opt.value = v.voiceURI;
      opt.textContent = `${v.name} (${v.lang})`;
      if (v.voiceURI === s.voiceURI) opt.selected = true;
      voiceSelect.appendChild(opt);
    }
  }

  populateVoices();
  speechSynthesis.addEventListener('voiceschanged', populateVoices);

  voiceSelect.addEventListener('change', () => {
    const uri = voiceSelect.value || null;
    engine.voice = resolveVoice(uri);
    saveSettings({ voiceURI: uri });
  });
}
