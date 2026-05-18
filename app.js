"use strict";

const STORAGE_KEY = "vocabTrainerData";
const PRESET_VERSION = 6;
const SMART_LIMIT = 20;
const TODAY_LABEL = new Date().toLocaleDateString("cs-CZ", {
  day: "numeric",
  month: "numeric",
  year: "numeric",
});

const IMPORT_TEMPLATE = `deck;tags;en;pronounce;cz;example;note
Lekce 2;cestování, fráze;go away;gou əwéj;odjet pryč;We went away for the weekend.;
Lekce 2;jídlo;a picky eater;ə pyki ítr;vybíravý v jídle;My son is a picky eater.;`;

const IRREGULAR_VERBS = [
  ["be", "bí", "was / were", "woz / wér", "být", "I am at home.", "I was at home yesterday.", "been"],
  ["become", "bikam", "became", "bikejm", "stát se", "She wants to become a doctor.", "She became a doctor.", "become"],
  ["begin", "bigin", "began", "bigen", "začít", "The lesson begins at nine.", "The lesson began at nine.", "begun"],
  ["break", "brejk", "broke", "brouk", "rozbít, zlomit", "Please do not break it.", "He broke his phone.", "broken"],
  ["bring", "bring", "brought", "brót", "přinést", "Please bring your book.", "She brought a cake.", "brought"],
  ["buy", "baj", "bought", "bót", "koupit", "I want to buy a ticket.", "I bought a ticket.", "bought"],
  ["come", "kam", "came", "kejm", "přijít", "They often come late.", "They came late.", "come"],
  ["do", "dú", "did", "did", "dělat", "I do my homework.", "I did my homework.", "done"],
  ["drink", "drink", "drank", "drenk", "pít", "She drinks water.", "She drank water.", "drunk"],
  ["drive", "drajv", "drove", "drouv", "řídit", "He can drive a car.", "He drove to Prague.", "driven"],
  ["eat", "ít", "ate", "ejt", "jíst", "We eat dinner at seven.", "We ate dinner.", "eaten"],
  ["find", "fajnd", "found", "faund", "najít", "I need to find my keys.", "I found my keys.", "found"],
  ["get", "get", "got", "got", "dostat, získat", "I get a lot of emails.", "I got a message.", "got/gotten"],
  ["give", "giv", "gave", "gejv", "dát", "She gives good advice.", "She gave me advice.", "given"],
  ["go", "gou", "went", "went", "jít, jet", "We go away every summer.", "We went away for the weekend.", "gone"],
  ["have", "hev", "had", "hed", "mít", "I have a good idea.", "I had a good idea.", "had"],
  ["know", "nou", "knew", "ňú", "vědět, znát", "I know the answer.", "I knew the answer.", "known"],
  ["make", "mejk", "made", "mejd", "udělat, vyrobit", "They make mistakes.", "They made a mistake.", "made"],
  ["meet", "mít", "met", "met", "potkat", "We meet every Monday.", "We met yesterday.", "met"],
  ["read", "ríd", "read", "red", "číst", "I read every evening.", "I read the article yesterday.", "read"],
  ["see", "sí", "saw", "só", "vidět", "I see him every day.", "I saw him yesterday.", "seen"],
  ["speak", "spík", "spoke", "spouk", "mluvit", "She speaks English.", "She spoke English.", "spoken"],
  ["take", "tejk", "took", "tuk", "vzít", "He takes photos.", "He took a photo.", "taken"],
  ["write", "rajt", "wrote", "rout", "psát", "I write short notes.", "I wrote a note.", "written"],
];

const app = document.querySelector("#app");

const state = {
  words: loadWords(),
  view: "home",
  params: {},
  importText: "",
  importResult: null,
  practice: null,
};

function createId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function loadWords() {
  let words = [];
  let presetVersion = 0;

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      words = Array.isArray(parsed.words) ? parsed.words : [];
      presetVersion = Number(parsed.presetVersion || 0);
    }
  } catch (error) {
    console.warn("Uložená data se nepodařilo načíst.", error);
  }

  words = normalizeWords(words);
  if (presetVersion < PRESET_VERSION) {
    words = mergeWords(words, buildIrregularVerbs()).words;
  }

  saveWords(words);
  return words;
}

function saveWords(words = state.words) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    presetVersion: PRESET_VERSION,
    words: normalizeWords(words),
  }));
}

function normalizeWords(words) {
  return words.map((word) => {
    const deck = normalize(word.deck || word.decks?.[0] || "Bez lekce");
    const decks = uniqueList([...(Array.isArray(word.decks) ? word.decks : []), deck]);
    let tags = uniqueList(Array.isArray(word.tags) ? word.tags : splitTags(word.tags));
    if (decks.includes("Nepravidelná slovesa")) {
      tags = tags.filter((tag) => tag.toLocaleLowerCase("cs-CZ") !== "nepravidelná slovesa");
    }

    return {
      id: word.id || createId(),
      deck,
      decks,
      tags,
      en: normalize(word.en),
      pronounce: normalize(word.pronounce),
      cz: normalize(word.cz),
      example: normalize(word.example),
      note: normalize(word.note),
      mistakes: Number(word.mistakes || 0),
      correct: Number(word.correct || 0),
      seenCount: Number(word.seenCount || 0),
      streak: Number(word.streak || 0),
      lastPracticedAt: word.lastPracticedAt || "",
      lastWrongAt: word.lastWrongAt || "",
      createdAt: word.createdAt || new Date().toISOString(),
    };
  }).filter((word) => word.en && word.cz);
}

function makeIrregularWord(en, pronounce, cz, example, note, tags) {
  return {
    id: createId(),
    deck: "Nepravidelná slovesa",
    decks: ["Nepravidelná slovesa"],
    tags,
    en,
    pronounce,
    cz,
    example,
    note,
    mistakes: 0,
    correct: 0,
    seenCount: 0,
    streak: 0,
    lastPracticedAt: "",
    lastWrongAt: "",
    createdAt: new Date().toISOString(),
  };
}

function buildIrregularVerbs() {
  const words = [];

  IRREGULAR_VERBS.forEach(([base, basePronounce, past, pastPronounce, cz, baseExample, pastExample, participle]) => {
    words.push(makeIrregularWord(
      base,
      basePronounce,
      cz,
      baseExample,
      `past simple: ${past}, past participle: ${participle}`,
      ["slovesa", "infinitiv"]
    ));

    words.push(makeIrregularWord(
      past,
      pastPronounce,
      `${cz} - minulý čas`,
      pastExample,
      `past simple od slovesa ${base}; past participle: ${participle}`,
      ["slovesa", "past simple"]
    ));
  });

  return words;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalize(value) {
  return String(value ?? "").trim();
}

function uniqueList(values) {
  const seen = new Set();
  return values
    .map(normalize)
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLocaleLowerCase("cs-CZ");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function splitTags(value) {
  if (Array.isArray(value)) return value;
  return String(value || "").split(",").map(normalize).filter(Boolean);
}

function identityKey(word) {
  return `${word.en.toLocaleLowerCase("en-US")}::${word.cz.toLocaleLowerCase("cs-CZ")}`;
}

function mergeWords(existingWords, incomingWords) {
  const words = normalizeWords(existingWords);
  const index = new Map(words.map((word) => [identityKey(word), word]));
  let added = 0;
  let merged = 0;

  normalizeWords(incomingWords).forEach((incoming) => {
    const current = index.get(identityKey(incoming));

    if (!current) {
      words.push(incoming);
      index.set(identityKey(incoming), incoming);
      added += 1;
      return;
    }

    current.decks = uniqueList([...current.decks, ...incoming.decks]);
    current.deck = current.decks[0];
    current.tags = uniqueList([...current.tags, ...incoming.tags]);
    current.pronounce = current.pronounce || incoming.pronounce;
    current.example = current.example || incoming.example;
    current.note = uniqueList([current.note, incoming.note]).join(" | ");
    merged += 1;
  });

  return { words, added, merged };
}

function parseImport(text) {
  const lines = String(text || "").split(/\r?\n/);
  const first = lines.find((line) => line.trim())?.trim().toLowerCase() || "";
  if (first.startsWith("deck;")) return parseCsvImport(lines);
  return parseSmartImport(lines);
}

function parseSmartImport(lines) {
  const words = [];
  const errors = [];
  const now = new Date().toISOString();
  let currentDeck = `Import ${TODAY_LABEL}`;
  let currentTags = [];
  let lastWord = null;

  lines.forEach((rawLine, index) => {
    const original = rawLine;
    let line = normalize(rawLine).replace(/^[•*-]\s*/, "");
    if (!line || /^slovíčka:?$/i.test(line)) return;

    const deckMatch = line.match(/^deck\s*:\s*(.+)$/i);
    if (deckMatch) {
      currentDeck = normalize(deckMatch[1]);
      lastWord = null;
      return;
    }

    const tagsMatch = line.match(/^tags\s*:\s*(.+)$/i);
    if (tagsMatch) {
      currentTags = splitTags(tagsMatch[1]);
      lastWord = null;
      return;
    }

    const sentenceMatch = line.match(/^(sentence|věta)\s*:\s*(.+)$/i);
    if (sentenceMatch) {
      if (!lastWord) return addImportError(errors, index, original, "Věta nemá slovíčko nad sebou.");
      lastWord.example = normalize(sentenceMatch[2]);
      return;
    }

    const noteMatch = line.match(/^(note|poznámka)\s*:\s*(.+)$/i);
    if (noteMatch) {
      if (!lastWord) return addImportError(errors, index, original, "Poznámka nemá slovíčko nad sebou.");
      lastWord.note = normalize(noteMatch[2]);
      return;
    }

    const wordMatch = line.match(/^(.+?)\s*(?:\[([^\]]*)\])?\s*=\s*(.+)$/);
    if (!wordMatch) {
      addImportError(errors, index, original, "Řádek není ve formátu slovíčko [výslovnost] = překlad.");
      return;
    }

    const en = normalize(wordMatch[1]);
    const pronounce = normalize(wordMatch[2] || "");
    const cz = normalize(wordMatch[3]);

    if (!currentDeck || !en || !cz) {
      addImportError(errors, index, original, "Chybí lekce, anglický výraz nebo český překlad.");
      return;
    }

    lastWord = {
      id: createId(),
      deck: currentDeck,
      decks: [currentDeck],
      tags: currentTags,
      en,
      pronounce,
      cz,
      example: "",
      note: "",
      mistakes: 0,
      correct: 0,
      createdAt: now,
    };
    words.push(lastWord);
  });

  return { words, errors };
}

function parseCsvImport(lines) {
  const words = [];
  const errors = [];
  const now = new Date().toISOString();
  const headers = splitCsvLine(lines[0]).map((header) => header.toLowerCase());

  lines.slice(1).forEach((line, offset) => {
    if (!line.trim()) return;
    const columns = splitCsvLine(line);
    const value = (name, fallbackIndex) => {
      const headerIndex = headers.indexOf(name);
      return normalize(columns[headerIndex >= 0 ? headerIndex : fallbackIndex]);
    };

    const deckValue = value("deck", 0);
    const decks = splitTags(deckValue);
    const deck = decks[0] || deckValue;
    const tags = headers.includes("tags") ? splitTags(value("tags", 1)) : [];
    const en = headers.includes("tags") ? value("en", 2) : value("en", 1);
    const pronounce = headers.includes("tags") ? value("pronounce", 3) : value("pronounce", 2);
    const cz = headers.includes("tags") ? value("cz", 4) : value("cz", 3);
    const example = headers.includes("tags") ? value("example", 5) : value("example", 4);
    const note = headers.includes("tags") ? value("note", 6) : value("note", 5);

    if (!deck || !en || !cz) {
      addImportError(errors, offset + 1, line, "Chybí deck, en nebo cz.");
      return;
    }

    words.push({
      id: createId(),
      deck,
      decks: decks.length ? decks : [deck],
      tags,
      en,
      pronounce,
      cz,
      example,
      note,
      mistakes: 0,
      correct: 0,
      createdAt: now,
    });
  });

  return { words, errors };
}

function splitCsvLine(line) {
  const cells = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ";" && !quoted) {
      cells.push(cell);
      cell = "";
    } else {
      cell += char;
    }
  }

  cells.push(cell);
  return cells.map(normalize);
}

function addImportError(errors, index, text, message) {
  errors.push({ line: index + 1, text, message });
}

function getDeckNames(word) {
  return uniqueList(Array.isArray(word.decks) && word.decks.length ? word.decks : [word.deck]);
}

function getDecks(words = state.words) {
  const decks = new Map();
  words.forEach((word) => {
    getDeckNames(word).forEach((name) => {
      if (!decks.has(name)) decks.set(name, { name, count: 0, problemCount: 0 });
      const deck = decks.get(name);
      deck.count += 1;
      if (word.mistakes > 0) deck.problemCount += 1;
    });
  });
  return Array.from(decks.values()).sort((a, b) => a.name.localeCompare(b.name, "cs"));
}

function getTags(words = state.words) {
  const tags = new Map();
  words.forEach((word) => {
    word.tags.forEach((name) => {
      if (!tags.has(name)) tags.set(name, { name, count: 0, problemCount: 0 });
      const tag = tags.get(name);
      tag.count += 1;
      if (word.mistakes > 0) tag.problemCount += 1;
    });
  });
  return Array.from(tags.values()).sort((a, b) => a.name.localeCompare(b.name, "cs"));
}

function getWordsForDeck(deck) {
  return state.words.filter((word) => getDeckNames(word).includes(deck));
}

function getWordsForTag(tag) {
  return state.words.filter((word) => word.tags.includes(tag));
}

function getProblemWords() {
  return state.words
    .filter((word) => Number(word.mistakes) > 0)
    .sort((a, b) => b.mistakes - a.mistakes || a.en.localeCompare(b.en));
}

function daysSince(isoDate) {
  if (!isoDate) return 999;
  const time = new Date(isoDate).getTime();
  if (Number.isNaN(time)) return 999;
  return Math.max(0, Math.floor((Date.now() - time) / 86400000));
}

function smartScore(word) {
  const mistakes = Number(word.mistakes || 0);
  const correct = Number(word.correct || 0);
  const seenCount = Number(word.seenCount || 0);
  const streak = Number(word.streak || 0);
  const daysFromPractice = daysSince(word.lastPracticedAt || word.createdAt);
  const daysFromWrong = daysSince(word.lastWrongAt);

  let score = 0;
  if (!seenCount) score += 120;
  score += mistakes * 14;
  score -= correct * 2;
  score -= streak * 8;
  score += Math.min(daysFromPractice, 30);
  if (word.lastWrongAt) score += Math.max(0, 18 - daysFromWrong);
  return score;
}

function selectSmartWords(words, limit = SMART_LIMIT) {
  return [...words]
    .sort((a, b) => smartScore(b) - smartScore(a) || a.en.localeCompare(b.en, "en"))
    .slice(0, limit);
}

function navigate(view, params = {}) {
  state.view = view;
  state.params = params;
  state.importResult = view === "import" ? state.importResult : null;
  render();
}

function goBack() {
  if (state.view === "home") return;
  if (state.view === "wordList") return navigate(state.params.type === "tag" ? "tags" : "decks");
  if (state.view === "practice") {
    if (state.practice?.source === "tag") return navigate("tags");
    if (state.practice?.source === "tag-short") return navigate("tags");
    if (state.practice?.source === "problems") return navigate("problems");
    if (state.practice?.source === "smart") return navigate("home");
    return navigate("decks");
  }
  navigate("home");
}

function header(title, back = true) {
  return `
    <div class="topbar">
      ${back ? `<button class="back-button" type="button" data-action="back" aria-label="Zpět">‹</button>` : ""}
      <h1>${escapeHtml(title)}</h1>
    </div>
  `;
}

function render() {
  const views = {
    home: renderHome,
    decks: renderDecks,
    tags: renderTags,
    import: renderImport,
    wordList: renderWordList,
    practice: renderPractice,
    problems: renderProblems,
    export: renderExport,
    audio: renderAudio,
  };
  app.innerHTML = (views[state.view] || renderHome)();
}

function renderHome() {
  const allCount = state.words.length;
  const deckCount = getDecks().length;
  const tagCount = getTags().length;
  const problemCount = getProblemWords().length;

  return `
    ${header("Moje slovíčka", false)}
    <section class="stack">
      <div class="stats-grid stats-grid-four" aria-label="Souhrn slovíček">
        <div class="stat"><strong>${allCount}</strong><span>slovíček</span></div>
        <div class="stat"><strong>${deckCount}</strong><span>lekcí</span></div>
        <div class="stat"><strong>${tagCount}</strong><span>štítků</span></div>
        <div class="stat"><strong>${problemCount}</strong><span>problémových</span></div>
      </div>
      <div class="notice">
        Výchozí aplikace obsahuje jen nepravidelná slovesa. Ostatní lekce si přidávej importem z GPT přímo v telefonu.
      </div>
      <div class="button-grid">
        <button class="btn wide" type="button" data-action="smart-practice">Chytrý trénink</button>
        <button class="btn" type="button" data-action="decks">Lekce</button>
        <button class="btn secondary" type="button" data-action="tags">Štítky</button>
        <button class="btn secondary" type="button" data-action="import">Import</button>
        <button class="btn secondary" type="button" data-action="audio">Poslech</button>
        <button class="btn secondary" type="button" data-action="problems">Problémová slovíčka</button>
        <button class="btn secondary" type="button" data-action="export">Export/Záloha</button>
        <button class="btn danger wide" type="button" data-action="delete-all">Smazat všechna data</button>
      </div>
    </section>
  `;
}

function renderDecks() {
  const decks = getDecks();
  return `
    ${header("Lekce")}
    <section class="stack">
      ${decks.length ? decks.map((deck) => renderCollectionRow(deck, "deck")).join("") : `<div class="empty-state">Zatím tu nejsou žádné lekce.</div>`}
    </section>
  `;
}

function renderTags() {
  const tags = getTags();
  return `
    ${header("Štítky")}
    <section class="stack">
      ${tags.length ? tags.map((tag) => renderCollectionRow(tag, "tag")).join("") : `<div class="empty-state">Zatím tu nejsou žádné štítky.</div>`}
    </section>
  `;
}

function renderCollectionRow(item, type) {
  const actionPrefix = type === "tag" ? "tag" : "deck";
  const label = type === "tag" ? "štítek" : "lekce";
  return `
    <article class="deck-row">
      <div>
        <h2>${escapeHtml(item.name)}</h2>
        <div class="row-meta">
          <span class="pill">${item.count} slovíček</span>
          <span class="pill">${item.problemCount} problémových</span>
          <span class="pill">${label}</span>
        </div>
      </div>
      <div class="row-actions">
        <button class="btn" type="button" data-action="practice-${actionPrefix}-short" data-name="${escapeHtml(item.name)}">Krátký trénink</button>
        <button class="btn secondary" type="button" data-action="practice-${actionPrefix}" data-name="${escapeHtml(item.name)}">Všechna</button>
        <button class="btn secondary" type="button" data-action="word-list" data-type="${type}" data-name="${escapeHtml(item.name)}">Seznam</button>
      </div>
    </article>
  `;
}

function renderImport() {
  const result = state.importResult;
  return `
    ${header("Import")}
    <section class="stack">
      <div class="panel stack">
        <div class="import-help">
          <strong>Import na tomto zařízení</strong>
          <p class="muted">Vložená slovíčka se uloží jen tady. Nepravidelná slovesa už jsou v aplikaci napevno, běžné lekce vkládej jako CSV z GPT.</p>
        </div>
        <textarea class="textarea" id="importText" spellcheck="false" placeholder="${escapeHtml(IMPORT_TEMPLATE)}">${escapeHtml(state.importText)}</textarea>
      </div>
      <button class="btn" type="button" data-action="do-import">Importovat</button>
      ${result ? renderImportResult(result) : ""}
    </section>
  `;
}

function renderImportResult(result) {
  const errors = result.errors || [];
  return `
    <div class="notice ${errors.length ? "danger" : "success"}">
      <strong>Přidáno: ${result.added} · Sloučeno: ${result.merged}</strong>
      ${errors.length ? `
        <p>Chybné řádky:</p>
        <ul class="error-list">
          ${errors.map((error) => `<li>Řádek ${error.line}: ${escapeHtml(error.message)} <span class="muted">${escapeHtml(error.text)}</span></li>`).join("")}
        </ul>
      ` : `<p>Import proběhl v pořádku.</p>`}
    </div>
  `;
}

function renderWordList() {
  const name = state.params.name;
  const type = state.params.type || "deck";
  const words = type === "tag" ? getWordsForTag(name) : getWordsForDeck(name);

  return `
    ${header(name || "Seznam")}
    <section class="stack">
      ${words.map(renderWordRow).join("") || `<div class="empty-state">Tady zatím nejsou žádná slovíčka.</div>`}
    </section>
  `;
}

function renderWordRow(word) {
  return `
    <article class="word-row">
      <div>
        <h2>${escapeHtml(word.en)}</h2>
        <p><strong>${escapeHtml(word.cz)}</strong> ${word.pronounce ? `<span class="muted">[${escapeHtml(word.pronounce)}]</span>` : ""}</p>
        ${word.example ? `<p class="muted">${escapeHtml(word.example)}</p>` : ""}
        ${word.note ? `<p class="muted">${escapeHtml(word.note)}</p>` : ""}
        <div class="row-meta">
          ${getDeckNames(word).map((deck) => `<span class="pill">Lekce: ${escapeHtml(deck)}</span>`).join("")}
          ${word.tags.map((tag) => `<span class="pill">#${escapeHtml(tag)}</span>`).join("")}
          <span class="pill">${word.mistakes} chyb</span>
          <span class="pill">${word.correct} správně</span>
          <span class="pill">${word.seenCount ? `${word.seenCount}× procvičeno` : "ještě neprocvičeno"}</span>
        </div>
      </div>
      <button class="btn danger" type="button" data-action="delete-word" data-id="${escapeHtml(word.id)}">Smazat slovíčko</button>
    </article>
  `;
}

function createPractice(words, label, source, mode = "en-cz", restart = {}) {
  return {
    label,
    source,
    mode,
    queue: shuffle(words.map((word) => word.id)),
    total: words.length,
    roundMistakes: 0,
    flipped: false,
    done: false,
    restart,
  };
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getCurrentPracticeWord() {
  return state.words.find((word) => word.id === state.practice?.queue[0]);
}

function renderPractice() {
  const practice = state.practice;
  if (!practice) return `${header("Procvičování")}<div class="empty-state">Procvičování není spuštěné.</div>`;

  if (practice.done) {
    return `
      ${header("Hotovo")}
      <section class="stack">
        <div class="summary-card">
          <h2>Hotovo</h2>
          <p>Procvičeno slovíček: <strong>${practice.total}</strong></p>
          <p>Chyb v tomto kole: <strong>${practice.roundMistakes}</strong></p>
        </div>
        <button class="btn" type="button" data-action="restart-practice">Spustit znovu</button>
      </section>
    `;
  }

  const word = getCurrentPracticeWord();
  if (!word) return `${header("Procvičování")}<div class="empty-state">Slovíčko se nepodařilo najít.</div>`;

  const isReverse = practice.mode === "cz-en";
  const frontMain = isReverse ? word.cz : word.en;
  const frontSub = isReverse ? "" : bracketPronounce(word.pronounce);
  const backMain = isReverse ? word.en : word.cz;
  const backSub = isReverse ? bracketPronounce(word.pronounce) : word.example;
  const detail = isReverse ? [word.example, word.note].filter(Boolean).join(" ") : word.note;

  return `
    ${header(practice.label)}
    <section class="practice-head">
      <div class="progress-line">
        <span>Zbývá ${practice.queue.length} z ${practice.total}</span>
        <span>Chyby v kole: ${practice.roundMistakes}</span>
      </div>
      <div class="mode-toggle" role="group" aria-label="Režim procvičování">
        <button type="button" class="${practice.mode === "en-cz" ? "active" : ""}" data-action="set-mode" data-mode="en-cz">EN → CZ</button>
        <button type="button" class="${practice.mode === "cz-en" ? "active" : ""}" data-action="set-mode" data-mode="cz-en">CZ → EN</button>
      </div>
    </section>
    <button class="flashcard" type="button" data-action="flip-card" aria-label="Otočit kartu">
      <p class="card-main">${escapeHtml(practice.flipped ? backMain : frontMain)}</p>
      ${practice.flipped
        ? `${backSub ? `<p class="card-sub">${escapeHtml(backSub)}</p>` : ""}${detail ? `<p class="card-detail">${escapeHtml(detail)}</p>` : ""}`
        : `${frontSub ? `<p class="card-sub">${escapeHtml(frontSub)}</p>` : ""}`
      }
    </button>
    <div class="practice-actions">
      <button class="btn secondary" type="button" data-action="speak-word">🔊 Slovo</button>
      <button class="btn secondary" type="button" data-action="speak-example" ${word.example ? "" : "disabled"}>🔊 Věta</button>
      <button class="btn danger" type="button" data-action="mark-wrong">❌ Neumím</button>
      <button class="btn success" type="button" data-action="mark-right">✅ Umím</button>
    </div>
  `;
}

function bracketPronounce(pronounce) {
  return pronounce ? `[${pronounce}]` : "";
}

function renderProblems() {
  const words = getProblemWords();
  return `
    ${header("Problémová slovíčka")}
    <section class="stack">
      <button class="btn" type="button" data-action="practice-problems" ${words.length ? "" : "disabled"}>Procvičovat problémová</button>
      ${words.map(renderWordRow).join("") || `<div class="empty-state">Žádná problémová slovíčka.</div>`}
    </section>
  `;
}

function renderExport() {
  return `
    ${header("Export/Záloha")}
    <section class="stack">
      <div class="notice">
        Tohle je záloha slovíček z tohoto zařízení. Pokud chceš slovíčka dostat do telefonu, zkopíruj text níže a vlož ho v telefonu do Importu.
      </div>
      <textarea class="textarea export-box" id="exportText" readonly>${escapeHtml(toCsv(state.words))}</textarea>
      <button class="btn" type="button" data-action="copy-export">Kopírovat do schránky</button>
      <button class="btn secondary" type="button" data-action="download-export">Stáhnout zálohu</button>
    </section>
  `;
}

function renderAudio() {
  return `
    ${header("Poslech")}
    <section class="stack">
      <div class="notice">
        Dvě poslechové stopy pro past simple. Každá věta zazní dvakrát anglicky, potom je pauza a český překlad.
      </div>
      <article class="audio-card">
        <h2>Nepravidelná slovesa 1</h2>
        <p class="muted">be až find · přibližně 7 minut</p>
        <audio controls preload="metadata" src="audio/nepravidelna-slovesa-1.wav"></audio>
        <a class="btn secondary" href="audio/nepravidelna-slovesa-1.wav" target="_blank" rel="noopener">Otevřít stopu</a>
      </article>
      <article class="audio-card">
        <h2>Nepravidelná slovesa 2</h2>
        <p class="muted">get až write · přibližně 7 minut</p>
        <audio controls preload="metadata" src="audio/nepravidelna-slovesa-2.wav"></audio>
        <a class="btn secondary" href="audio/nepravidelna-slovesa-2.wav" target="_blank" rel="noopener">Otevřít stopu</a>
      </article>
    </section>
  `;
}

function toCsv(words) {
  const rows = ["deck;tags;en;pronounce;cz;example;note"];
  words.forEach((word) => {
    rows.push([
      getDeckNames(word).join(", "),
      word.tags.join(", "),
      word.en,
      word.pronounce,
      word.cz,
      word.example,
      word.note,
    ].map(csvCell).join(";"));
  });
  return rows.join("\n");
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[;\n"]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function speak(text) {
  if (!("speechSynthesis" in window) || !text) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  speechSynthesis.speak(utterance);
}

function importWords() {
  const textarea = document.querySelector("#importText");
  state.importText = textarea ? textarea.value : state.importText;
  const parsed = parseImport(state.importText);
  const merged = mergeWords(state.words, parsed.words);
  state.words = merged.words;
  saveWords();
  state.importResult = { added: merged.added, merged: merged.merged, errors: parsed.errors };
  if (merged.added || merged.merged) state.importText = "";
  render();
}

function deleteAll() {
  if (!confirm("Opravdu smazat všechna uložená slovíčka? Pevná nepravidelná slovesa se znovu připraví při dalším načtení.")) return;
  state.words = mergeWords([], buildIrregularVerbs()).words;
  state.practice = null;
  saveWords();
  navigate("home");
}

function deleteWord(id) {
  if (!confirm("Smazat toto slovíčko?")) return;
  state.words = state.words.filter((word) => word.id !== id);
  saveWords();
  render();
}

function startPractice(words, label, source, restart) {
  if (!words.length) {
    alert("Tady zatím nejsou žádná slovíčka k procvičování.");
    return;
  }

  state.practice = createPractice(words, label, source, state.practice?.mode || "en-cz", restart);
  navigate("practice");
}

function startSmartPractice() {
  const words = selectSmartWords(state.words, SMART_LIMIT);
  startPractice(words, `Chytrý trénink (${words.length})`, "smart", { type: "smart" });
}

function startDeckPractice(deck, limit = null) {
  const allWords = getWordsForDeck(deck);
  const words = limit ? selectSmartWords(allWords, limit) : allWords;
  const label = limit ? `${deck} · ${words.length} slovíček` : deck;
  startPractice(words, label, limit ? "deck-short" : "deck", { type: "deck", name: deck, limit });
}

function startTagPractice(tag, limit = null) {
  const allWords = getWordsForTag(tag);
  const words = limit ? selectSmartWords(allWords, limit) : allWords;
  const label = limit ? `#${tag} · ${words.length} slovíček` : tag;
  startPractice(words, label, limit ? "tag-short" : "tag", { type: "tag", name: tag, limit });
}

function startProblemPractice() {
  const words = getProblemWords();
  startPractice(words, "Problémová slovíčka", "problems", { type: "problems" });
}

function restartPractice() {
  if (!state.practice) return;
  const restart = state.practice.restart || {};
  if (restart.type === "smart") return startSmartPractice();
  if (restart.type === "tag") return startTagPractice(restart.name, restart.limit || null);
  if (restart.type === "problems") return startProblemPractice();
  if (restart.type === "deck") return startDeckPractice(restart.name, restart.limit || null);
  startSmartPractice();
}

function markCurrent(isCorrect) {
  const practice = state.practice;
  const word = getCurrentPracticeWord();
  if (!practice || !word) return;
  const now = new Date().toISOString();

  word.seenCount = Number(word.seenCount || 0) + 1;
  word.lastPracticedAt = now;

  if (isCorrect) {
    word.correct = Number(word.correct || 0) + 1;
    word.streak = Number(word.streak || 0) + 1;
    practice.queue.shift();
  } else {
    word.mistakes = Number(word.mistakes || 0) + 1;
    word.streak = 0;
    word.lastWrongAt = now;
    practice.roundMistakes += 1;
    practice.queue.push(practice.queue.shift());
  }

  practice.flipped = false;
  practice.done = practice.queue.length === 0;
  saveWords();
  render();
}

async function copyExport() {
  const text = toCsv(state.words);
  try {
    await navigator.clipboard.writeText(text);
    alert("Záloha je zkopírovaná do schránky.");
  } catch (error) {
    const box = document.querySelector("#exportText");
    if (box) {
      box.focus();
      box.select();
    }
    alert("Kopírování se nepovedlo. Text je označený, můžete ho zkopírovat ručně.");
  }
}

function downloadExport() {
  const blob = new Blob([toCsv(state.words)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `slovicka-zaloha-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

app.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;

  const action = target.dataset.action;
  const name = target.dataset.name || target.dataset.deck;
  const id = target.dataset.id;

  if (action === "back") goBack();
  if (action === "decks") navigate("decks");
  if (action === "tags") navigate("tags");
  if (action === "import") navigate("import");
  if (action === "audio") navigate("audio");
  if (action === "smart-practice") startSmartPractice();
  if (action === "problems") navigate("problems");
  if (action === "export") navigate("export");
  if (action === "delete-all") deleteAll();
  if (action === "do-import") importWords();
  if (action === "word-list") navigate("wordList", { type: target.dataset.type || "deck", name });
  if (action === "delete-word") deleteWord(id);
  if (action === "practice-deck") startDeckPractice(name);
  if (action === "practice-deck-short") startDeckPractice(name, SMART_LIMIT);
  if (action === "practice-tag") startTagPractice(name);
  if (action === "practice-tag-short") startTagPractice(name, SMART_LIMIT);
  if (action === "practice-problems") startProblemPractice();
  if (action === "restart-practice") restartPractice();
  if (action === "flip-card") {
    state.practice.flipped = !state.practice.flipped;
    render();
  }
  if (action === "set-mode") {
    state.practice.mode = target.dataset.mode;
    state.practice.flipped = false;
    render();
  }
  if (action === "speak-word") speak(getCurrentPracticeWord()?.en);
  if (action === "speak-example") speak(getCurrentPracticeWord()?.example);
  if (action === "mark-wrong") markCurrent(false);
  if (action === "mark-right") markCurrent(true);
  if (action === "copy-export") copyExport();
  if (action === "download-export") downloadExport();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch((error) => {
      console.warn("Offline režim se nepodařilo připravit.", error);
    });
  });
}

render();
