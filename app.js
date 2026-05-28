"use strict";

const STORAGE_KEY = "vocabTrainerData";
const LISTEN_STORAGE_KEY = "vocabTrainerListenText";
const READER_STORAGE_KEY = "vocabTrainerReaderText";
const READER_HISTORY_KEY = "vocabTrainerReaderHistory";
const VOICE_SETTINGS_KEY = "vocabTrainerVoiceSettings";
const PRESET_VERSION = 12;
const SMART_LIMIT = 20;
const DEFAULT_WORDS = Array.isArray(window.DEFAULT_VOCABULARY) ? window.DEFAULT_VOCABULARY : [];
const TODAY_LABEL = new Date().toLocaleDateString("cs-CZ", {
  day: "numeric",
  month: "numeric",
  year: "numeric",
});

const IMPORT_TEMPLATE = `deck;tags;en;pronounce;cz;example;note
Lekce 2;cestování, fráze;go away;gou əwéj;odjet pryč;We went away for the weekend.;
Lekce 2;jídlo;a picky eater;ə pyki ítr;vybíravý v jídle;My son is a picky eater.;`;

const GPT_IMPORT_PROMPT = `Připrav mi slovíčka pro import do mé aplikace.

Výstup musí být pouze CSV se středníkem, bez komentářů okolo.

Formát:
deck;tags;en;pronounce;cz;example;note

Pravidla:
- deck = název lekce, například Lekce 3
- tags = krátké štítky oddělené čárkou, například cestování, fráze, jídlo
- en = anglické slovíčko nebo fráze
- pronounce = jednoduchý český fonetický přepis
- cz = český překlad
- example = krátká anglická věta
- note = jen pokud je potřeba vysvětlení, jinak prázdné
- nevkládej nepravidelná slovesa, ta už jsou v aplikaci
- když jde o frázi, dej štítek fráze
- když jde o slovíčko, které mi nejde, přidej štítek neznám
- pokud stejné slovíčko patří do více lekcí, napiš lekce do deck oddělené čárkou, například Lekce 1, Lekce 2
- nepoužívej středník uvnitř hodnot
- každý řádek musí mít přesně 7 sloupců
- ponech hlavičku jako první řádek

Tady jsou moje slovíčka / poznámky:
[vložím text]`;

const LISTEN_TEMPLATE = `title: Past simple - moje věty
repeat: 2
pauseAfterEnglish: 2
pauseBeforeCzech: 3

bought = koupil
EN: I bought a new phone.
CZ: Koupil jsem si nový telefon.

went = šel / jel
EN: We went to Prague yesterday.
CZ: Včera jsme jeli do Prahy.`;

const GPT_LISTEN_PROMPT = `Připrav mi podklad pro poslech do mé aplikace na učení angličtiny.

Výstup musí být pouze čistý text v tomto formátu, bez komentářů okolo:

title: Název poslechu
repeat: 2
pauseAfterEnglish: 2
pauseBeforeCzech: 3

anglické slovo nebo fráze = český překlad
EN: krátká anglická věta
CZ: český překlad věty

Když je v české větě anglické slovo nebo fráze, označ ho takto:
CZ: Sloveso [EN:bought] znamená koupil.

Pravidla:
- EN věta má být přirozená, krátká a vhodná pro poslech.
- CZ věta musí přesně odpovídat anglické větě.
- Každý blok musí mít řádek EN a hned pod ním řádek CZ.
- Pokud procvičujeme slovesa v minulém čase, dej na řádek nad větou tvar v past simple, například bought = koupil.
- Pokud se v českém textu objeví anglické slovo nebo fráze, vždy ho označ značkou [EN:...].
- Značku [EN:...] používej jen v českých řádcích CZ, ne v anglických řádcích EN.
- Připrav zhruba 10 minut poslechu.
- Raději používej kratší věty než dlouhé souvětí.
- Nepiš odrážky, číslování ani vysvětlení.
- Nepoužívej středníky jako oddělovače, toto není CSV.

Téma / moje poznámky:
[vložím text]`;

const READER_TEMPLATE = `title: Holiday story

TEXT:
Last summer, we went to Italy. We stayed in a small hotel near the beach. The hotel was basic, but the staff were friendly. One day, we hired a car and went sightseeing.

VOCAB:
last summer = minulé léto
went to = jeli do
stayed in = bydleli v
basic = jednoduchý
staff = personál
friendly = přátelský
hired a car = půjčili jsme si auto
went sightseeing = šli jsme poznávat památky

SENTENCES:
Last summer, we went to Italy. = Minulé léto jsme jeli do Itálie.
We stayed in a small hotel near the beach. = Bydleli jsme v malém hotelu blízko pláže.
The hotel was basic, but the staff were friendly. = Hotel byl jednoduchý, ale personál byl přátelský.
One day, we hired a car and went sightseeing. = Jeden den jsme si půjčili auto a šli poznávat památky.`;

const GPT_READER_PROMPT = `Připrav mi podklad pro čtení anglického textu do mé aplikace.

Výstup musí být pouze čistý text v tomto formátu, bez komentářů okolo:

title: Krátký název textu

TEXT:
Anglický text rozdělený do krátkých vět. Text má být přirozený a vhodný pro čtení.

VOCAB:
anglické slovo nebo fráze = český překlad
další fráze = český překlad

SENTENCES:
Celá anglická věta. = Český překlad celé věty.
Další anglická věta. = Český překlad celé věty.

Pravidla:
- Připrav anglický text podle tématu, které zadám.
- Věty udržuj krátké a čitelné.
- Do VOCAB vlož všechny významové výrazy z textu: podstatná jména, slovesa, přídavná jména, příslovce, důležité předložkové vazby a fráze.
- Do VOCAB vždy vlož všechna slovesa přesně v tom tvaru, ve kterém jsou v textu, hlavně tvary minulého času, například was, were, went, gave, became, worked, painted.
- U pravidelných sloves v minulém čase napiš překlad minulého času, například worked = pracoval, moved = přestěhoval se, wanted = chtěl.
- U nepravidelných sloves v minulém čase napiš překlad minulého času, například was = byl, went = šel / jel, gave = dal, became = stal se.
- Pokud je důležitá fráze, dej ji do VOCAB jako celou frázi, například hired a car = půjčil si auto.
- Fráze mají přednost před jednotlivými slovy.
- Každá věta z TEXT musí být také v SENTENCES se svým českým překladem.
- Nepiš vysvětlení, odrážky ani markdown.
- Nepoužívej středník jako oddělovač.

Téma / moje poznámky:
[vložím text]`;

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
  customListen: {
    text: loadListenText(),
    parsed: null,
    index: 0,
    playing: false,
    currentStep: "",
  },
  reader: {
    text: loadReaderText(),
    parsed: null,
    selectedToken: "",
    selectedSentence: "",
    history: loadReaderHistory(),
    speaking: false,
  },
  passiveListen: {
    playing: false,
    label: "",
    currentStep: "",
  },
  voiceSettings: loadVoiceSettings(),
};

let listenRunId = 0;
const listenTimers = new Set();

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
    const previousBuiltins = words.filter((word) => word.source === "builtin");
    words = words.filter((word) => word.source !== "builtin");
    words = mergeWords(words, [...buildDefaultVocabularyWords(), ...buildIrregularVerbs()]).words;
    preservePracticeProgress(words, previousBuiltins);
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

function preservePracticeProgress(words, previousWords) {
  const previousIndex = new Map(previousWords.map((word) => [identityKey(word), word]));
  words.filter((word) => word.source === "builtin").forEach((word) => {
    const previous = previousIndex.get(identityKey(word));
    if (!previous) return;
    word.mistakes = previous.mistakes;
    word.correct = previous.correct;
    word.isProblem = previous.isProblem;
    word.problemHits = previous.problemHits;
    word.knownStreak = previous.knownStreak;
    word.seenCount = previous.seenCount;
    word.streak = previous.streak;
    word.lastPracticedAt = previous.lastPracticedAt;
    word.lastWrongAt = previous.lastWrongAt;
  });
}

function loadListenText() {
  try {
    return localStorage.getItem(LISTEN_STORAGE_KEY) || LISTEN_TEMPLATE;
  } catch (error) {
    console.warn("Text poslechu se nepodařilo načíst.", error);
    return LISTEN_TEMPLATE;
  }
}

function saveListenText(text) {
  try {
    localStorage.setItem(LISTEN_STORAGE_KEY, text);
  } catch (error) {
    console.warn("Text poslechu se nepodařilo uložit.", error);
  }
}

function loadReaderText() {
  try {
    return localStorage.getItem(READER_STORAGE_KEY) || READER_TEMPLATE;
  } catch (error) {
    console.warn("Text pro čtení se nepodařilo načíst.", error);
    return READER_TEMPLATE;
  }
}

function saveReaderText(text) {
  try {
    localStorage.setItem(READER_STORAGE_KEY, text);
  } catch (error) {
    console.warn("Text pro čtení se nepodařilo uložit.", error);
  }
}

function loadReaderHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(READER_HISTORY_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    console.warn("Historie čtení se nepodařila načíst.", error);
    return [];
  }
}

function saveReaderHistory(history = state.reader.history) {
  try {
    localStorage.setItem(READER_HISTORY_KEY, JSON.stringify(history.slice(0, 20)));
  } catch (error) {
    console.warn("Historie čtení se nepodařila uložit.", error);
  }
}

function loadVoiceSettings() {
  try {
    return {
      enVoice: "",
      csVoice: "",
      rate: 0.86,
      ...JSON.parse(localStorage.getItem(VOICE_SETTINGS_KEY) || "{}"),
    };
  } catch (error) {
    console.warn("Nastavení hlasu se nepodařilo načíst.", error);
    return { enVoice: "", csVoice: "", rate: 0.86 };
  }
}

function saveVoiceSettings() {
  try {
    localStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(state.voiceSettings));
  } catch (error) {
    console.warn("Nastavení hlasu se nepodařilo uložit.", error);
  }
}

function getSpeechRate() {
  return clampNumber(state.voiceSettings.rate, 0.65, 1.05, 0.86);
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
      type: normalize(word.type || (String(word.en || "").includes(" ") ? "phrase" : "word")),
      source: normalize(word.source || ""),
      mistakes: Number(word.mistakes || 0),
      correct: Number(word.correct || 0),
      isProblem: Boolean(word.isProblem || false),
      problemHits: Number(word.problemHits || 0),
      knownStreak: Number(word.knownStreak || 0),
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
      type: "irregular",
      source: "builtin",
      mistakes: 0,
      correct: 0,
      isProblem: false,
      problemHits: 0,
      knownStreak: 0,
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

    if (participle && participle !== past && participle !== base && !participle.includes("/")) {
      words.push(makeIrregularWord(
        participle,
        "",
        `${cz} - příčestí minulé`,
        `I have ${participle}.`,
        `past participle od slovesa ${base}; past simple: ${past}`,
        ["slovesa", "past participle"]
      ));
    }
  });

  return words;
}

function buildDefaultVocabularyWords() {
  return DEFAULT_WORDS.map((item) => ({
    id: `ef-${readerKey(item.deck)}-${readerKey(item.en)}-${readerKey(item.cz).slice(0, 24)}`,
    deck: item.deck || "Lekce",
    decks: [item.deck || "Lekce"],
    tags: uniqueList([...(Array.isArray(item.tags) ? item.tags : []), item.type === "phrase" ? "fráze" : "slovíčka"]),
    en: item.en,
    pronounce: item.pronounce || "",
    cz: item.cz,
    example: item.example || "",
    note: item.pos ? `English File: ${item.pos}` : "English File",
    type: item.type || "word",
    source: "builtin",
    mistakes: 0,
    correct: 0,
    isProblem: false,
    problemHits: 0,
    knownStreak: 0,
    seenCount: 0,
    streak: 0,
    lastPracticedAt: "",
    lastWrongAt: "",
    createdAt: new Date().toISOString(),
  }));
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

function parseListenText(text) {
  const lines = String(text || "").split(/\r?\n/);
  const result = {
    title: "Vlastní poslech",
    repeat: 2,
    pauseAfterEnglish: 2,
    pauseBeforeCzech: 3,
    items: [],
    errors: [],
  };
  let currentWord = null;
  let pendingItem = null;

  lines.forEach((rawLine, index) => {
    const original = rawLine;
    const line = normalize(rawLine);
    if (!line) return;

    const settingMatch = line.match(/^(title|repeat|pauseAfterEnglish|pauseBeforeCzech)\s*:\s*(.+)$/i);
    if (settingMatch) {
      const key = settingMatch[1].toLowerCase();
      const value = normalize(settingMatch[2]);
      if (key === "title") result.title = value || result.title;
      if (key === "repeat") result.repeat = clampNumber(value, 1, 4, 2);
      if (key === "pauseafterenglish") result.pauseAfterEnglish = clampNumber(value, 0, 10, 2);
      if (key === "pausebeforeczech") result.pauseBeforeCzech = clampNumber(value, 0, 12, 3);
      return;
    }

    const enMatch = line.match(/^EN\s*:\s*(.+)$/i);
    if (enMatch) {
      if (pendingItem && !pendingItem.cz) {
        result.errors.push({ line: index + 1, text: original, message: "Předchozí EN věta nemá český řádek CZ." });
      }
      pendingItem = {
        wordEn: currentWord?.en || "",
        wordCz: currentWord?.cz || "",
        en: normalize(enMatch[1]),
        cz: "",
      };
      result.items.push(pendingItem);
      return;
    }

    const czMatch = line.match(/^CZ\s*:\s*(.+)$/i);
    if (czMatch) {
      if (!pendingItem || pendingItem.cz) {
        result.errors.push({ line: index + 1, text: original, message: "Řádek CZ nemá nad sebou odpovídající EN." });
        return;
      }
      pendingItem.cz = normalize(czMatch[1]);
      return;
    }

    const wordMatch = line.match(/^(.+?)\s*=\s*(.+)$/);
    if (wordMatch) {
      currentWord = {
        en: normalize(wordMatch[1]),
        cz: normalize(wordMatch[2]),
      };
      pendingItem = null;
      return;
    }

    result.errors.push({ line: index + 1, text: original, message: "Řádek není nastavení, slovíčko ani EN/CZ věta." });
  });

  result.items = result.items.filter((item) => {
    if (item.en && item.cz) return true;
    result.errors.push({ line: "-", text: item.en, message: "EN věta nemá český překlad CZ." });
    return false;
  });

  return result;
}

function clampNumber(value, min, max, fallback) {
  const number = Number(String(value).replace(",", "."));
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function parseReaderText(text) {
  const lines = String(text || "").split(/\r?\n/);
  const result = {
    title: "Čtení textu",
    text: "",
    vocab: [],
    sentenceTranslations: new Map(),
    errors: [],
  };
  let section = "";
  const textLines = [];

  lines.forEach((rawLine, index) => {
    const original = rawLine;
    const line = normalize(rawLine);
    if (!line) {
      if (section === "text") textLines.push("");
      return;
    }

    const titleMatch = line.match(/^title\s*:\s*(.+)$/i);
    if (titleMatch) {
      result.title = normalize(titleMatch[1]) || result.title;
      return;
    }

    const sectionMatch = line.match(/^(TEXT|VOCAB|SENTENCES)\s*:$/i);
    if (sectionMatch) {
      section = sectionMatch[1].toLowerCase();
      return;
    }

    if (section === "text") {
      textLines.push(original);
      return;
    }

    if (section === "vocab") {
      const match = line.match(/^(.+?)\s*=\s*(.+)$/);
      if (!match) {
        result.errors.push({ line: index + 1, text: original, message: "Řádek slovníku není ve formátu výraz = překlad." });
        return;
      }
      result.vocab.push({ en: normalize(match[1]), cz: normalize(match[2]) });
      return;
    }

    if (section === "sentences") {
      const match = line.match(/^(.+?)\s*=\s*(.+)$/);
      if (!match) {
        result.errors.push({ line: index + 1, text: original, message: "Řádek věty není ve formátu anglická věta = překlad." });
        return;
      }
      result.sentenceTranslations.set(sentenceKey(match[1]), normalize(match[2]));
      return;
    }

    result.errors.push({ line: index + 1, text: original, message: "Text musí být v sekci TEXT, VOCAB nebo SENTENCES." });
  });

  result.text = textLines.join("\n").trim();
  if (!result.text) result.errors.push({ line: "-", text: "", message: "Chybí sekce TEXT s anglickým textem." });
  result.vocab = mergeReaderVocab(result.vocab, state.words);
  return result;
}

function mergeReaderVocab(vocab, words) {
  const map = new Map();
  [...vocab, ...words.map((word) => ({ en: word.en, cz: word.cz }))].forEach((item) => {
    const en = normalize(item.en);
    const cz = normalize(item.cz);
    if (!en || !cz) return;
    const key = readerKey(en);
    if (!map.has(key)) map.set(key, { en, cz });
  });
  return Array.from(map.values()).sort((a, b) => b.en.length - a.en.length || a.en.localeCompare(b.en, "en"));
}

function readerKey(value) {
  return normalize(value).toLocaleLowerCase("en-US");
}

function sentenceKey(value) {
  return normalize(value)
    .replace(/\s+/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .toLocaleLowerCase("en-US");
}

function splitReaderSentences(text) {
  return String(text || "")
    .replace(/\n+/g, " ")
    .match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map(normalize).filter(Boolean) || [];
}

function findReaderMatches(sentence, vocab) {
  const matches = [];
  const occupied = Array(sentence.length).fill(false);
  const vocabMap = new Map(vocab.map((item) => [readerKey(item.en), item.cz]));

  vocab.forEach((item) => {
    if (!item.en.includes(" ")) return;
    const escaped = item.en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(^|[^A-Za-z])(${escaped})(?=$|[^A-Za-z])`, "gi");
    let match;

    while ((match = pattern.exec(sentence)) !== null) {
      const start = match.index + match[1].length;
      const end = start + match[2].length;
      if (occupied.slice(start, end).some(Boolean)) continue;
      for (let i = start; i < end; i += 1) occupied[i] = true;
      matches.push({ start, end, en: sentence.slice(start, end), cz: item.cz, type: "phrase" });
    }
  });

  const wordPattern = /[A-Za-z]+(?:['-][A-Za-z]+)*/g;
  let wordMatch;
  while ((wordMatch = wordPattern.exec(sentence)) !== null) {
    const start = wordMatch.index;
    const end = start + wordMatch[0].length;
    if (occupied.slice(start, end).some(Boolean)) continue;

    const text = sentence.slice(start, end);
    const translation = findReaderWordTranslation(text, vocabMap);
    for (let i = start; i < end; i += 1) occupied[i] = true;
    matches.push({
      start,
      end,
      en: text,
      cz: translation || `Chybí překlad: ${text}`,
      missing: !translation,
      type: "word",
    });
  }

  return matches.sort((a, b) => a.start - b.start);
}

function findReaderWordTranslation(word, vocabMap) {
  const forms = readerWordForms(word);
  for (const form of forms) {
    const translation = vocabMap.get(readerKey(form));
    if (translation) return translation;
  }
  return "";
}

function readerWordForms(word) {
  const value = normalize(word).toLocaleLowerCase("en-US");
  const forms = [value];

  if (value.endsWith("ied") && value.length > 4) forms.push(`${value.slice(0, -3)}y`);
  if (value.endsWith("ed") && value.length > 3) {
    forms.push(value.slice(0, -2));
    forms.push(value.slice(0, -1));
  }
  if (value.endsWith("ing") && value.length > 5) {
    forms.push(value.slice(0, -3));
    forms.push(`${value.slice(0, -3)}e`);
  }
  if (value.endsWith("ies") && value.length > 4) forms.push(`${value.slice(0, -3)}y`);
  if (value.endsWith("es") && value.length > 3) forms.push(value.slice(0, -2));
  if (value.endsWith("s") && value.length > 3) forms.push(value.slice(0, -1));

  return uniqueList(forms);
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
      if (word.isProblem) deck.problemCount += 1;
    });
  });
  return Array.from(decks.values()).sort((a, b) => compareDeckNames(a.name, b.name));
}

function compareDeckNames(a, b) {
  const lessonA = lessonNumber(a);
  const lessonB = lessonNumber(b);
  if (lessonA !== null && lessonB !== null) return lessonA - lessonB;
  if (lessonA !== null) return -1;
  if (lessonB !== null) return 1;
  return a.localeCompare(b, "cs", { numeric: true, sensitivity: "base" });
}

function lessonNumber(name) {
  const match = String(name || "").match(/^Lekce\s+(\d+)$/i);
  return match ? Number(match[1]) : null;
}

function getTags(words = state.words) {
  const tags = new Map();
  words.forEach((word) => {
    word.tags.forEach((name) => {
      if (!tags.has(name)) tags.set(name, { name, count: 0, problemCount: 0 });
      const tag = tags.get(name);
      tag.count += 1;
      if (word.isProblem) tag.problemCount += 1;
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
    .filter((word) => word.isProblem)
    .sort((a, b) => b.problemHits - a.problemHits || b.mistakes - a.mistakes || a.en.localeCompare(b.en));
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
  if (state.view === "reader" && view !== "reader") stopReaderSpeech(false);
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
  if (state.view === "listenPrompt") return navigate("customListen");
  if (state.view === "readerPrompt") return navigate("reader");
  navigate("home");
}

function header(title, back = true, extra = "") {
  return `
    <div class="topbar">
      ${back ? `<button class="back-button" type="button" data-action="back" aria-label="Zpět">‹</button>` : ""}
      <h1>${escapeHtml(title)}</h1>
      ${extra}
    </div>
  `;
}

function render() {
  const views = {
    home: renderHome,
    settings: renderSettings,
    phrases: renderPhrases,
    listeningHub: renderListeningHub,
    irregulars: renderIrregulars,
    grammar: renderGrammar,
    decks: renderDecks,
    tags: renderTags,
    import: renderImport,
    wordList: renderWordList,
    practice: renderPractice,
    problems: renderProblems,
    export: renderExport,
    audio: renderAudio,
    gptPrompt: renderGptPrompt,
    customListen: renderCustomListen,
    listenPrompt: renderListenPrompt,
    reader: renderReader,
    readerPrompt: renderReaderPrompt,
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
        English File slovíčka jsou připravená po lekcích. Vlastní slovíčka i texty se ukládají jen v tomto zařízení.
      </div>
      <div class="button-grid">
        <button class="btn wide" type="button" data-action="decks">Lekce</button>
        <button class="btn secondary" type="button" data-action="irregulars">Nepravidelná slovesa</button>
        <button class="btn secondary" type="button" data-action="phrases">Fráze</button>
        <button class="btn secondary" type="button" data-action="listening-hub">Poslech</button>
        <button class="btn secondary" type="button" data-action="reader">Čtení textu</button>
        <button class="btn secondary" type="button" data-action="grammar">Časy</button>
        <button class="btn secondary" type="button" data-action="settings">Nastavení</button>
        <button class="btn secondary" type="button" data-action="smart-practice">Chytrý trénink</button>
        <button class="btn secondary" type="button" data-action="problems">Problémová slovíčka</button>
      </div>
    </section>
  `;
}

function renderDecks() {
  const decks = getDecks().filter((deck) => deck.name !== "Nepravidelná slovesa");
  return `
    ${header("Lekce")}
    <section class="stack">
      ${decks.length ? decks.map((deck) => renderCollectionRow(deck, "deck")).join("") : `<div class="empty-state">Zatím tu nejsou žádné lekce.</div>`}
    </section>
  `;
}

function renderSettings() {
  return `
    ${header("Nastavení")}
    <section class="stack">
      <article class="panel stack">
        <h2>Hlasy pro poslech</h2>
        <label class="field-label">
          Angličtina
          ${renderVoiceSelect("enVoice", "en")}
        </label>
        <label class="field-label">
          Čeština
          ${renderVoiceSelect("csVoice", "cs")}
        </label>
        <label class="field-label">
          Rychlost: <span class="voice-rate-value">${getSpeechRate().toFixed(2)}</span>
          <input type="range" min="0.65" max="1.05" step="0.01" value="${escapeHtml(state.voiceSettings.rate || 0.86)}" data-action="voice-rate">
        </label>
        <div class="listen-controls">
          <button class="btn secondary" type="button" data-action="test-en-voice">Test EN</button>
          <button class="btn secondary" type="button" data-action="test-cs-voice">Test CZ</button>
        </div>
      </article>
      <button class="btn" type="button" data-action="import">Import vlastních slovíček</button>
      <button class="btn secondary" type="button" data-action="export">Export/Záloha</button>
      <button class="btn secondary" type="button" data-action="gpt-prompt">Prompt pro slovíčka</button>
      <button class="btn secondary" type="button" data-action="listen-prompt">Prompt pro poslech</button>
      <button class="btn secondary" type="button" data-action="reader-prompt">Prompt pro čtení</button>
      <button class="btn danger" type="button" data-action="delete-all">Smazat všechna data</button>
    </section>
  `;
}

function renderVoiceSelect(settingKey, languagePrefix) {
  const voices = getAvailableVoices();
  const selected = state.voiceSettings[settingKey] || "";
  const preferred = voices.filter((voice) => voice.lang.toLowerCase().startsWith(languagePrefix));
  const other = voices.filter((voice) => !voice.lang.toLowerCase().startsWith(languagePrefix));
  const options = [...preferred, ...other];

  return `
    <select class="select" data-action="voice-select" data-setting="${settingKey}">
      <option value="">Automaticky podle jazyka</option>
      ${options.map((voice) => `<option value="${escapeHtml(voice.name)}" ${voice.name === selected ? "selected" : ""}>${escapeHtml(voice.name)} (${escapeHtml(voice.lang)})</option>`).join("")}
    </select>
  `;
}

function renderPhrases() {
  const decks = getDecks(state.words.filter((word) => word.type === "phrase" && !getDeckNames(word).includes("Nepravidelná slovesa")));
  return `
    ${header("Fráze")}
    <section class="stack">
      ${decks.length ? decks.map((deck) => renderCollectionRow(deck, "phraseDeck")).join("") : `<div class="empty-state">Zatím tu nejsou žádné fráze.</div>`}
    </section>
  `;
}

function renderIrregulars() {
  const words = getWordsForDeck("Nepravidelná slovesa");
  return `
    ${header("Nepravidelná slovesa")}
    <section class="stack">
      <div class="notice">Infinitiv, past simple i past participle držíme pohromadě. V kartičkách i poslechu se procvičují i minulé tvary.</div>
      <button class="btn" type="button" data-action="practice-deck" data-name="Nepravidelná slovesa">Kartičky</button>
      <button class="btn secondary" type="button" data-action="listen-deck" data-name="Nepravidelná slovesa">Poslech</button>
      <button class="btn secondary" type="button" data-action="word-list" data-type="deck" data-name="Nepravidelná slovesa">Seznam (${words.length})</button>
    </section>
  `;
}

function renderListeningHub() {
  const lessonDecks = getDecks().filter((deck) => deck.name !== "Nepravidelná slovesa");
  const phraseDecks = getDecks(state.words.filter((word) => word.type === "phrase"));
  return `
    ${header("Poslech")}
    <section class="stack">
      <div class="notice">Pasivní poslech čte 2× anglicky a 1× česky. Angličtina i čeština se posílají do správného hlasu.</div>
      ${state.passiveListen.playing ? `
        <div class="listen-status">
          <div class="row-meta">
            <span class="pill">Přehrávám</span>
            <span class="pill">${escapeHtml(state.passiveListen.label)}</span>
          </div>
          <h2>${escapeHtml(state.passiveListen.currentStep || "Připraveno")}</h2>
          <button class="btn danger" type="button" data-action="stop-passive-listen">Zastavit</button>
        </div>
      ` : ""}
      <article class="panel stack">
        <h2>Slovíčka z lekce</h2>
        ${lessonDecks.map((deck) => `<button class="btn secondary" type="button" data-action="listen-deck-words" data-name="${escapeHtml(deck.name)}">${escapeHtml(deck.name)} · slovíčka</button>`).join("")}
      </article>
      <article class="panel stack">
        <h2>Fráze</h2>
        ${phraseDecks.map((deck) => `<button class="btn secondary" type="button" data-action="listen-deck-phrases" data-name="${escapeHtml(deck.name)}">${escapeHtml(deck.name)} · fráze</button>`).join("")}
      </article>
      <button class="btn secondary" type="button" data-action="audio">Pevné audio stopy</button>
      <button class="btn secondary" type="button" data-action="custom-listen">Vlastní poslech z GPT</button>
    </section>
  `;
}

function renderGrammar() {
  return `
    ${header("Časy")}
    <section class="stack">
      <article class="panel stack">
        <h2>Rychlá časová osa</h2>
        <div class="timeline" aria-label="Časová osa anglických časů">
          <div><strong>Minulost</strong><span>Past simple</span></div>
          <div><strong>Teď</strong><span>Present continuous</span></div>
          <div><strong>Běžně</strong><span>Present simple</span></div>
          <div><strong>Výsledek</strong><span>Present perfect</span></div>
        </div>
      </article>
      ${renderTenseCard("Present simple", "Zvyky, fakta, opakované věci.", "I work every day.", "do / does", "every day, usually, often, sometimes")}
      ${renderTenseCard("Present continuous", "Děje právě teď nebo dočasně kolem současnosti.", "I am working now.", "am / is / are + -ing", "now, at the moment, today")}
      ${renderTenseCard("Past simple", "Ukončený děj v minulosti. Víme kdy nebo je to jasné z kontextu.", "I bought a ticket yesterday.", "sloveso + -ed / 2. tvar", "yesterday, last week, in 2020, ago")}
      ${renderTenseCard("Present perfect", "Minulost má dopad na současnost. Důležitý je výsledek, ne přesný čas.", "I have finished my homework.", "have / has + 3. tvar", "already, yet, just, ever, never")}
      <article class="panel stack">
        <h2>Jak se rychle rozhodnout</h2>
        <p><strong>Je tam přesný minulý čas?</strong> Použij Past simple.</p>
        <p><strong>Děje se to právě teď?</strong> Použij Present continuous.</p>
        <p><strong>Je to zvyk nebo fakt?</strong> Použij Present simple.</p>
        <p><strong>Jde o výsledek do teď?</strong> Použij Present perfect.</p>
      </article>
    </section>
  `;
}

function renderTenseCard(title, usage, example, formula, signals) {
  return `
    <article class="panel tense-card">
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(usage)}</p>
      <div class="formula">${escapeHtml(formula)}</div>
      <p><strong>${escapeHtml(example)}</strong></p>
      <p class="muted">Signály: ${escapeHtml(signals)}</p>
    </article>
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
  const actionPrefix = type === "tag" ? "tag" : type === "phraseDeck" ? "phrase-deck" : "deck";
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
      <button class="btn secondary" type="button" data-action="gpt-prompt">Zobrazit prompt pro GPT</button>
      ${result ? renderImportResult(result) : ""}
    </section>
  `;
}

function renderGptPrompt() {
  return `
    ${header("Prompt pro GPT")}
    <section class="stack">
      <div class="notice">
        Tenhle text vlož do GPT spolu se svými poznámkami. Výsledek potom zkopíruj do obrazovky Import.
      </div>
      <textarea class="textarea prompt-box" id="gptPromptText" readonly>${escapeHtml(GPT_IMPORT_PROMPT)}</textarea>
      <button class="btn" type="button" data-action="copy-gpt-prompt">Kopírovat prompt</button>
      <button class="btn secondary" type="button" data-action="import">Přejít na Import</button>
    </section>
  `;
}

function renderListenPrompt() {
  return `
    ${header("Prompt pro poslech")}
    <section class="stack">
      <div class="notice">
        Tenhle prompt použij v GPT, když chceš připravit věty k poslechu. Výsledek vlož do obrazovky Vlastní poslech.
      </div>
      <textarea class="textarea prompt-box" id="listenPromptText" readonly>${escapeHtml(GPT_LISTEN_PROMPT)}</textarea>
      <button class="btn" type="button" data-action="copy-listen-prompt">Kopírovat prompt</button>
      <button class="btn secondary" type="button" data-action="custom-listen">Přejít na Vlastní poslech</button>
    </section>
  `;
}

function renderReaderPrompt() {
  return `
    ${header("Prompt pro čtení")}
    <section class="stack">
      <div class="notice">
        Tenhle prompt použij v GPT, když chceš připravit anglický text se slovníkem frází a překlady vět.
      </div>
      <textarea class="textarea prompt-box" id="readerPromptText" readonly>${escapeHtml(GPT_READER_PROMPT)}</textarea>
      <button class="btn" type="button" data-action="copy-reader-prompt">Kopírovat prompt</button>
      <button class="btn secondary" type="button" data-action="reader">Přejít na Čtení textu</button>
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
  const words = type === "tag"
    ? getWordsForTag(name)
    : type === "phraseDeck"
      ? getWordsForDeck(name).filter((word) => word.type === "phrase")
      : getWordsForDeck(name);

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
      ${words.map(renderProblemRow).join("") || `<div class="empty-state">Žádná problémová slovíčka.</div>`}
    </section>
  `;
}

function renderProblemRow(word) {
  return `
    <article class="word-row">
      <div>
        <h2>${escapeHtml(word.en)}</h2>
        <p><strong>${escapeHtml(word.cz)}</strong> ${word.pronounce ? `<span class="muted">[${escapeHtml(word.pronounce)}]</span>` : ""}</p>
        ${word.example ? `<p class="muted">${escapeHtml(word.example)}</p>` : ""}
        <div class="row-meta">
          ${getDeckNames(word).map((deck) => `<span class="pill">${escapeHtml(deck)}</span>`).join("")}
          <span class="pill">${word.problemHits || word.mistakes}× problém</span>
          <span class="pill">${word.knownStreak || 0}/2 umím</span>
        </div>
      </div>
      <button class="btn secondary" type="button" data-action="remove-problem" data-id="${escapeHtml(word.id)}">Už umím</button>
    </article>
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
      <button class="btn" type="button" data-action="custom-listen">Vlastní poslech z textu</button>
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

function renderCustomListen() {
  const listen = state.customListen;
  const parsed = listen.parsed || parseListenText(listen.text);
  const current = parsed.items[listen.index];
  const progress = parsed.items.length ? `${Math.min(listen.index + 1, parsed.items.length)} / ${parsed.items.length}` : "0 / 0";

  return `
    ${header("Vlastní poslech")}
    <section class="stack">
      <div class="notice">
        Vlož text z GPT ve formátu EN/CZ. Aplikace bude číst anglickou větu, pauzu, anglickou větu znovu, delší pauzu a český překlad.
      </div>
      <div class="panel stack">
        <div class="import-help">
          <strong>${escapeHtml(parsed.title)}</strong>
          <p class="muted">${parsed.items.length} vět · opakování EN: ${parsed.repeat}× · pauzy ${parsed.pauseAfterEnglish}s / ${parsed.pauseBeforeCzech}s</p>
        </div>
        <textarea class="textarea listen-box" id="customListenText" spellcheck="false" placeholder="${escapeHtml(LISTEN_TEMPLATE)}">${escapeHtml(listen.text)}</textarea>
      </div>
      <div class="listen-controls">
        <button class="btn" type="button" data-action="load-custom-listen">Načíst poslech</button>
        <button class="btn secondary" type="button" data-action="listen-prompt">Prompt pro GPT</button>
      </div>
      <div class="listen-controls">
        <button class="btn success" type="button" data-action="play-custom-listen" ${parsed.items.length && !listen.playing ? "" : "disabled"}>Přehrát</button>
        <button class="btn danger" type="button" data-action="stop-custom-listen" ${listen.playing ? "" : "disabled"}>Zastavit</button>
        <button class="btn secondary" type="button" data-action="restart-custom-listen" ${parsed.items.length ? "" : "disabled"}>Od začátku</button>
        <button class="btn secondary" type="button" data-action="next-custom-listen" ${parsed.items.length ? "" : "disabled"}>Další věta</button>
      </div>
      <article class="listen-status">
        <div class="row-meta">
          <span class="pill">${listen.playing ? "Přehrávám" : "Zastaveno"}</span>
          <span class="pill">${progress}</span>
        </div>
        <h2>${escapeHtml(listen.currentStep || "Připraveno")}</h2>
        ${current ? `
          ${current.wordEn ? `<p class="muted">${escapeHtml(current.wordEn)} = ${escapeHtml(current.wordCz)}</p>` : ""}
          <p><strong>EN:</strong> ${escapeHtml(current.en)}</p>
          <p><strong>CZ:</strong> ${escapeHtml(displayListenText(current.cz))}</p>
        ` : `<p class="muted">Načti text a spusť poslech.</p>`}
      </article>
      ${parsed.errors.length ? `
        <div class="notice danger">
          <strong>Našel jsem chyby ve formátu:</strong>
          <ul class="error-list">
            ${parsed.errors.map((error) => `<li>Řádek ${escapeHtml(error.line)}: ${escapeHtml(error.message)} <span class="muted">${escapeHtml(error.text)}</span></li>`).join("")}
          </ul>
        </div>
      ` : ""}
    </section>
  `;
}

function renderReader() {
  const reader = state.reader;
  const parsed = reader.parsed || parseReaderText(reader.text);
  const sentences = splitReaderSentences(parsed.text);
  const history = reader.history || [];

  return `
    ${header("Čtení textu", true, `<button class="icon-button" type="button" data-action="speak-reader-text" aria-label="${reader.speaking ? "Zastavit čtení" : "Přečíst text"}">${reader.speaking ? "■" : "🔊"}</button>`)}
    <section class="stack">
      <article class="panel reader-summary">
        <div class="section-head">
          <div>
            <h2>${escapeHtml(parsed.title)}</h2>
            <p class="muted">${sentences.length} vět · ${parsed.vocab.length} slov/frází ve slovníku</p>
          </div>
        </div>
        <p class="muted">Kliknutí na slovo/frázi zobrazí překlad. Dvojklik na větu zobrazí překlad celé věty.</p>
      </article>
      <article class="reader-card">
        ${sentences.length ? sentences.map((sentence, index) => renderReaderSentence(sentence, index, parsed)).join(" ") : `<p class="muted">Načti text pro čtení.</p>`}
      </article>
      <div class="panel stack">
        <div class="import-help">
          <strong>Vložený podklad</strong>
          <p class="muted">Kliknutí na slovo/frázi zobrazí překlad. Dvojklik na větu zobrazí překlad celé věty.</p>
        </div>
        <textarea class="textarea reader-box" id="readerText" spellcheck="false" placeholder="${escapeHtml(READER_TEMPLATE)}">${escapeHtml(reader.text)}</textarea>
      </div>
      <div class="listen-controls">
        <button class="btn" type="button" data-action="load-reader">Načíst text</button>
        <button class="btn secondary" type="button" data-action="reader-prompt">Prompt pro GPT</button>
      </div>
      <label class="file-picker">
        <span>Nahrát .txt soubor</span>
        <input type="file" accept=".txt,text/plain" data-action="reader-file">
      </label>
      ${parsed.errors.length ? `
        <div class="notice danger">
          <strong>Našel jsem chyby ve formátu:</strong>
          <ul class="error-list">
            ${parsed.errors.map((error) => `<li>Řádek ${escapeHtml(error.line)}: ${escapeHtml(error.message)} <span class="muted">${escapeHtml(error.text)}</span></li>`).join("")}
          </ul>
        </div>
      ` : ""}
      ${history.length ? `
        <details class="panel">
          <summary>Historie čtení (${history.length})</summary>
          <div class="stack history-list">
            ${history.map((item) => `<button class="btn secondary" type="button" data-action="open-reader-history" data-id="${escapeHtml(item.id)}">${escapeHtml(item.title)}</button>`).join("")}
          </div>
        </details>
      ` : ""}
    </section>
  `;
}

function renderReaderSentence(sentence, sentenceIndex, parsed) {
  const sentenceId = String(sentenceIndex);
  const sentenceTranslation = parsed.sentenceTranslations.get(sentenceKey(sentence)) || "Překlad této věty není v podkladu.";
  const showSentence = state.reader.selectedSentence === sentenceId;
  const matches = findReaderMatches(sentence, parsed.vocab);
  let cursor = 0;
  let tokenIndex = 0;
  const parts = [];

  matches.forEach((match) => {
    if (match.start > cursor) parts.push(escapeHtml(sentence.slice(cursor, match.start)));
    const tokenId = `${sentenceIndex}-${tokenIndex}`;
    const selected = state.reader.selectedToken === tokenId;
    parts.push(`
      <span class="reader-token ${selected ? "active" : ""} ${match.missing ? "missing" : ""} ${match.type === "phrase" ? "phrase" : ""}" data-action="reader-token" data-token="${tokenId}" data-sentence="${sentenceId}" data-translation="${escapeHtml(match.cz)}">
        ${selected ? `<span class="reader-bubble">${escapeHtml(match.cz)}</span>` : ""}
        ${escapeHtml(match.en)}
      </span>
    `);
    cursor = match.end;
    tokenIndex += 1;
  });

  if (cursor < sentence.length) parts.push(escapeHtml(sentence.slice(cursor)));

  return `
    <span class="reader-sentence ${showSentence ? "active" : ""}" data-action="reader-sentence" data-sentence="${sentenceId}" data-translation="${escapeHtml(sentenceTranslation)}">
      ${showSentence ? `<span class="reader-sentence-translation">${escapeHtml(sentenceTranslation)}</span>` : ""}
      ${parts.join("")}
    </span>
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
  speakByLanguage(text, "en-US");
}

function speakByLanguage(text, lang, cancel = true) {
  if (!("speechSynthesis" in window) || !text) return;
  if (cancel) speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.voice = getVoiceForLang(lang);
  utterance.rate = getSpeechRate();
  speechSynthesis.speak(utterance);
}

function speakText(text, lang, runId) {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window) || !text || runId !== listenRunId) {
      resolve();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.voice = getVoiceForLang(lang);
    utterance.rate = getSpeechRate();
    utterance.onend = resolve;
    utterance.onerror = resolve;
    speechSynthesis.speak(utterance);
  });
}

function getAvailableVoices() {
  if (!("speechSynthesis" in window)) return [];
  return speechSynthesis.getVoices().slice().sort((a, b) => {
    const langCompare = a.lang.localeCompare(b.lang, "cs-CZ");
    return langCompare || a.name.localeCompare(b.name, "cs-CZ");
  });
}

function getVoiceForLang(lang) {
  if (!("speechSynthesis" in window)) return null;
  const voices = getAvailableVoices();
  const settingKey = lang.toLowerCase().startsWith("cs") ? "csVoice" : "enVoice";
  const selected = state.voiceSettings[settingKey];
  if (selected) {
    const selectedVoice = voices.find((voice) => voice.name === selected);
    if (selectedVoice) return selectedVoice;
  }

  const prefix = lang.split("-")[0].toLowerCase();
  return voices.find((voice) => voice.lang.toLowerCase() === lang.toLowerCase())
    || voices.find((voice) => voice.lang.toLowerCase().startsWith(`${prefix}-`))
    || null;
}

async function speakMixedText(text, defaultLang, runId) {
  const parts = splitMixedLanguageText(text, defaultLang);
  for (const part of parts) {
    if (runId !== listenRunId || !state.customListen.playing) break;
    await speakText(part.text, part.lang, runId);
  }
}

function splitMixedLanguageText(text, defaultLang) {
  const parts = [];
  const pattern = /\[EN:([^\]]+)\]/gi;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index).trim();
    if (before) parts.push({ text: before, lang: defaultLang });

    const english = normalize(match[1]);
    if (english) parts.push({ text: english, lang: "en-US" });
    lastIndex = pattern.lastIndex;
  }

  const after = text.slice(lastIndex).trim();
  if (after) parts.push({ text: after, lang: defaultLang });
  return parts.length ? parts : [{ text, lang: defaultLang }];
}

function displayListenText(text) {
  return String(text || "").replace(/\[EN:([^\]]+)\]/gi, "$1");
}

function waitForListen(seconds, runId) {
  return new Promise((resolve) => {
    if (!seconds || runId !== listenRunId) {
      resolve();
      return;
    }

    const timer = window.setTimeout(() => {
      listenTimers.delete(timer);
      resolve();
    }, seconds * 1000);
    listenTimers.add(timer);
  });
}

function clearListenTimers() {
  listenTimers.forEach((timer) => window.clearTimeout(timer));
  listenTimers.clear();
}

async function playPassiveWords(words, label) {
  if (!("speechSynthesis" in window)) {
    alert("Tento prohlížeč neumí hlasové čtení.");
    return;
  }
  if (!words.length) {
    alert("Tady zatím nejsou žádná slovíčka k poslechu.");
    return;
  }
  stopPassiveListen(false);
  const runId = listenRunId + 1;
  listenRunId = runId;
  state.passiveListen = { playing: true, label, currentStep: "Připravuji poslech" };
  render();

  for (const word of words) {
    if (runId !== listenRunId || !state.passiveListen.playing) break;
    state.passiveListen.currentStep = `EN 1/2: ${word.en}`;
    render();
    await speakText(word.en, "en-US", runId);
    await waitForListen(1, runId);
    if (runId !== listenRunId || !state.passiveListen.playing) break;
    state.passiveListen.currentStep = `EN 2/2: ${word.en}`;
    render();
    await speakText(word.en, "en-US", runId);
    await waitForListen(1, runId);
    if (runId !== listenRunId || !state.passiveListen.playing) break;
    state.passiveListen.currentStep = `CZ: ${word.cz}`;
    render();
    await speakText(word.cz, "cs-CZ", runId);
    await waitForListen(1, runId);
  }

  if (runId === listenRunId) {
    state.passiveListen = { playing: false, label: "", currentStep: "" };
    render();
  }
}

function stopPassiveListen(shouldRender = true) {
  listenRunId += 1;
  clearListenTimers();
  state.passiveListen = { playing: false, label: "", currentStep: "" };
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  if (shouldRender) render();
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

function loadCustomListen() {
  stopCustomListen(false);
  const textarea = document.querySelector("#customListenText");
  state.customListen.text = textarea ? textarea.value : state.customListen.text;
  state.customListen.parsed = parseListenText(state.customListen.text);
  state.customListen.index = 0;
  state.customListen.currentStep = state.customListen.parsed.items.length ? "Připraveno" : "V textu nejsou žádné věty.";
  state.customListen.playing = false;
  saveListenText(state.customListen.text);
  render();
}

async function playCustomListen() {
  if (!("speechSynthesis" in window)) {
    alert("Tento prohlížeč neumí hlasové čtení.");
    return;
  }

  const textarea = document.querySelector("#customListenText");
  if (textarea) {
    state.customListen.text = textarea.value;
    saveListenText(state.customListen.text);
  }

  const parsed = parseListenText(state.customListen.text);
  state.customListen.parsed = parsed;
  if (!parsed.items.length) {
    state.customListen.currentStep = "V textu nejsou žádné věty.";
    render();
    return;
  }

  if (state.customListen.index >= parsed.items.length) state.customListen.index = 0;
  clearListenTimers();
  speechSynthesis.cancel();
  const runId = listenRunId + 1;
  listenRunId = runId;
  state.customListen.playing = true;
  render();

  while (state.customListen.playing && runId === listenRunId && state.customListen.index < parsed.items.length) {
    const item = parsed.items[state.customListen.index];
    state.customListen.currentStep = item.wordEn ? `${item.wordEn} = ${item.wordCz}` : `Věta ${state.customListen.index + 1}`;
    render();

    if (item.wordEn) await speakText(item.wordEn, "en-US", runId);
    if (!state.customListen.playing || runId !== listenRunId) break;
    if (item.wordCz) await speakText(item.wordCz, "cs-CZ", runId);
    if (!state.customListen.playing || runId !== listenRunId) break;

    for (let repeat = 1; repeat <= parsed.repeat; repeat += 1) {
      state.customListen.currentStep = `EN ${repeat}/${parsed.repeat}: ${item.en}`;
      render();
      await speakText(item.en, "en-US", runId);
      if (!state.customListen.playing || runId !== listenRunId) break;
      await waitForListen(repeat < parsed.repeat ? parsed.pauseAfterEnglish : parsed.pauseBeforeCzech, runId);
    }

    if (!state.customListen.playing || runId !== listenRunId) break;
    state.customListen.currentStep = `CZ: ${item.cz}`;
    render();
    await speakMixedText(item.cz, "cs-CZ", runId);
    if (!state.customListen.playing || runId !== listenRunId) break;
    await waitForListen(1, runId);
    state.customListen.index += 1;
  }

  if (runId === listenRunId) {
    state.customListen.playing = false;
    state.customListen.currentStep = state.customListen.index >= parsed.items.length ? "Hotovo" : "Zastaveno";
    render();
  }
}

function stopCustomListen(shouldRender = true) {
  listenRunId += 1;
  clearListenTimers();
  state.customListen.playing = false;
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  if (state.customListen.currentStep !== "Hotovo") state.customListen.currentStep = "Zastaveno";
  if (shouldRender) render();
}

function restartCustomListen() {
  stopCustomListen(false);
  state.customListen.index = 0;
  state.customListen.currentStep = "Připraveno";
  render();
}

function nextCustomListen() {
  stopCustomListen(false);
  const parsed = state.customListen.parsed || parseListenText(state.customListen.text);
  state.customListen.parsed = parsed;
  if (parsed.items.length) {
    state.customListen.index = Math.min(state.customListen.index + 1, parsed.items.length - 1);
    state.customListen.currentStep = "Připraveno";
  }
  render();
}

function loadReader() {
  const textarea = document.querySelector("#readerText");
  state.reader.text = textarea ? textarea.value : state.reader.text;
  state.reader.parsed = parseReaderText(state.reader.text);
  state.reader.selectedToken = "";
  state.reader.selectedSentence = "";
  saveReaderText(state.reader.text);
  addReaderHistory(state.reader.text, state.reader.parsed.title);
  render();
}

function addReaderHistory(text, title) {
  const cleanText = String(text || "").trim();
  if (!cleanText) return;
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const entry = {
    id,
    title: title || `Text ${new Date().toLocaleDateString("cs-CZ")}`,
    text: cleanText,
    createdAt: new Date().toISOString(),
  };
  state.reader.history = [entry, ...(state.reader.history || []).filter((item) => item.text !== cleanText)].slice(0, 20);
  saveReaderHistory();
}

function openReaderHistory(id) {
  const entry = (state.reader.history || []).find((item) => item.id === id);
  if (!entry) return;
  state.reader.text = entry.text;
  state.reader.parsed = parseReaderText(entry.text);
  state.reader.selectedToken = "";
  state.reader.selectedSentence = "";
  saveReaderText(entry.text);
  render();
}

function toggleReaderToken(token) {
  state.reader.selectedSentence = "";
  state.reader.selectedToken = state.reader.selectedToken === token ? "" : token;
  render();
}

function toggleReaderSentence(sentence) {
  state.reader.selectedToken = "";
  state.reader.selectedSentence = state.reader.selectedSentence === sentence ? "" : sentence;
  render();
}

function loadReaderFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    state.reader.text = String(reader.result || "");
    state.reader.parsed = parseReaderText(state.reader.text);
    state.reader.selectedToken = "";
    state.reader.selectedSentence = "";
    saveReaderText(state.reader.text);
    addReaderHistory(state.reader.text, state.reader.parsed.title);
    navigate("reader");
  };
  reader.onerror = () => alert("Soubor se nepodařilo načíst.");
  reader.readAsText(file);
}

function deleteAll() {
  if (!confirm("Opravdu smazat všechna vlastní data? Výchozí lekce a nepravidelná slovesa se znovu připraví.")) return;
  state.words = mergeWords([], [...buildDefaultVocabularyWords(), ...buildIrregularVerbs()]).words;
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

function startPhraseDeckPractice(deck, limit = null) {
  const allWords = getWordsForDeck(deck).filter((word) => word.type === "phrase");
  const words = limit ? selectSmartWords(allWords, limit) : allWords;
  const label = limit ? `${deck} · fráze · ${words.length}` : `${deck} · fráze`;
  startPractice(words, label, limit ? "phrase-short" : "phrase", { type: "phraseDeck", name: deck, limit });
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
  if (restart.type === "phraseDeck") return startPhraseDeckPractice(restart.name, restart.limit || null);
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
    if (word.isProblem) {
      word.knownStreak = Number(word.knownStreak || 0) + 1;
      if (word.knownStreak >= 2) word.isProblem = false;
    }
    practice.queue.shift();
  } else {
    word.mistakes = Number(word.mistakes || 0) + 1;
    word.isProblem = true;
    word.problemHits = Number(word.problemHits || 0) + 1;
    word.knownStreak = 0;
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

function removeProblem(id) {
  const word = state.words.find((item) => item.id === id);
  if (!word) return;
  word.isProblem = false;
  word.knownStreak = 2;
  saveWords();
  render();
}

function stopReaderSpeech(shouldRender = true) {
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  state.reader.speaking = false;
  if (shouldRender && state.view === "reader") render();
}

function speakReaderText() {
  const parsed = state.reader.parsed || parseReaderText(state.reader.text);
  if (!parsed.text) return;
  if (!("speechSynthesis" in window)) return;

  if (state.reader.speaking) {
    stopReaderSpeech();
    return;
  }

  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(parsed.text);
  utterance.lang = "en-US";
  utterance.voice = getVoiceForLang("en-US");
  utterance.rate = getSpeechRate();
  utterance.onend = () => {
    state.reader.speaking = false;
    if (state.view === "reader") render();
  };
  utterance.onerror = utterance.onend;
  state.reader.speaking = true;
  speechSynthesis.speak(utterance);
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

async function copyGptPrompt() {
  try {
    await navigator.clipboard.writeText(GPT_IMPORT_PROMPT);
    alert("Prompt pro GPT je zkopírovaný.");
  } catch (error) {
    const box = document.querySelector("#gptPromptText");
    if (box) {
      box.focus();
      box.select();
    }
    alert("Kopírování se nepovedlo. Text je označený, můžete ho zkopírovat ručně.");
  }
}

async function copyListenPrompt() {
  try {
    await navigator.clipboard.writeText(GPT_LISTEN_PROMPT);
    alert("Prompt pro poslech je zkopírovaný.");
  } catch (error) {
    const box = document.querySelector("#listenPromptText");
    if (box) {
      box.focus();
      box.select();
    }
    alert("Kopírování se nepovedlo. Text je označený, můžete ho zkopírovat ručně.");
  }
}

async function copyReaderPrompt() {
  try {
    await navigator.clipboard.writeText(GPT_READER_PROMPT);
    alert("Prompt pro čtení je zkopírovaný.");
  } catch (error) {
    const box = document.querySelector("#readerPromptText");
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
  if (action === "gpt-prompt") navigate("gptPrompt");
  if (action === "audio") navigate("audio");
  if (action === "custom-listen") navigate("customListen");
  if (action === "listen-prompt") navigate("listenPrompt");
  if (action === "reader") navigate("reader");
  if (action === "reader-prompt") navigate("readerPrompt");
  if (action === "settings") navigate("settings");
  if (action === "phrases") navigate("phrases");
  if (action === "listening-hub") navigate("listeningHub");
  if (action === "irregulars") navigate("irregulars");
  if (action === "grammar") navigate("grammar");
  if (action === "smart-practice") startSmartPractice();
  if (action === "problems") navigate("problems");
  if (action === "export") navigate("export");
  if (action === "delete-all") deleteAll();
  if (action === "do-import") importWords();
  if (action === "load-custom-listen") loadCustomListen();
  if (action === "play-custom-listen") playCustomListen();
  if (action === "stop-custom-listen") stopCustomListen();
  if (action === "restart-custom-listen") restartCustomListen();
  if (action === "next-custom-listen") nextCustomListen();
  if (action === "load-reader") loadReader();
  if (action === "speak-reader-text") speakReaderText();
  if (action === "open-reader-history") openReaderHistory(id);
  if (action === "reader-token") {
    if (event.detail >= 2) {
      toggleReaderSentence(target.dataset.sentence);
    } else {
      toggleReaderToken(target.dataset.token);
    }
  }
  if (action === "reader-sentence") {
    if (event.detail >= 2) toggleReaderSentence(target.dataset.sentence);
  }
  if (action === "word-list") navigate("wordList", { type: target.dataset.type || "deck", name });
  if (action === "delete-word") deleteWord(id);
  if (action === "remove-problem") removeProblem(id);
  if (action === "practice-deck") startDeckPractice(name);
  if (action === "practice-deck-short") startDeckPractice(name, SMART_LIMIT);
  if (action === "practice-tag") startTagPractice(name);
  if (action === "practice-tag-short") startTagPractice(name, SMART_LIMIT);
  if (action === "practice-phrase-deck") startPhraseDeckPractice(name);
  if (action === "practice-phrase-deck-short") startPhraseDeckPractice(name, SMART_LIMIT);
  if (action === "listen-deck" || action === "listen-deck-words") playPassiveWords(getWordsForDeck(name).filter((word) => word.type !== "phrase"), `${name} · slovíčka`);
  if (action === "listen-deck-phrases") playPassiveWords(getWordsForDeck(name).filter((word) => word.type === "phrase"), `${name} · fráze`);
  if (action === "stop-passive-listen") stopPassiveListen();
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
  if (action === "copy-gpt-prompt") copyGptPrompt();
  if (action === "copy-listen-prompt") copyListenPrompt();
  if (action === "copy-reader-prompt") copyReaderPrompt();
  if (action === "download-export") downloadExport();
  if (action === "test-en-voice") speakByLanguage("I bought a ticket yesterday.", "en-US");
  if (action === "test-cs-voice") speakByLanguage("Včera jsem si koupil lístek.", "cs-CZ");
});

app.addEventListener("change", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  if (target.dataset.action === "reader-file") loadReaderFile(target.files?.[0]);
  if (target.dataset.action === "voice-select") {
    state.voiceSettings[target.dataset.setting] = target.value;
    saveVoiceSettings();
  }
});

app.addEventListener("input", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  if (target.dataset.action === "voice-rate") {
    state.voiceSettings.rate = clampNumber(target.value, 0.65, 1.05, 0.86);
    saveVoiceSettings();
    const label = target.closest(".field-label")?.querySelector(".voice-rate-value");
    if (label) label.textContent = state.voiceSettings.rate.toFixed(2);
  }
});

if ("speechSynthesis" in window) {
  speechSynthesis.onvoiceschanged = () => {
    if (state.view === "settings") render();
  };
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch((error) => {
      console.warn("Offline režim se nepodařilo připravit.", error);
    });
  });
}

render();
