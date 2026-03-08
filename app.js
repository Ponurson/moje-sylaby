const dane = [
    { grupa: "M", sylaby: ["MA", "MO", "MU", "ME", "MI", "MY"] },
    { grupa: "T", sylaby: ["TA", "TO", "TU", "TE", "TY"] },
    { grupa: "L", sylaby: ["LA", "LO", "LU", "LE", "LI"] },
    { grupa: "P", sylaby: ["PA", "PO", "PU", "PE", "PI", "PY"] }
];

const MODE_INSTANT = "instant";
const MODE_COMPOSE = "compose";
const MODE_COMPOSE_TREE = "compose-tree";
const MODE_TEXT = "text";
const CASE_UPPER = "upper";
const CASE_LOWER = "lower";

const LIBRARY_DATA_URL = "syllables_pl_dict_12k.json";
const SPACE_TOKEN = "__SPACE__";
const MAX_PENDING_SYLLABLES = 2;

const POLISH_VOWELS = new Set(["a", "ą", "e", "ę", "i", "o", "u", "y", "ó"]);
const POLISH_ENDING_DIGRAPHS = new Set(["rz", "sz", "cz", "ch", "dz", "dź", "dż"]);

const subtitle = document.getElementById("subtitle");
const container = document.getElementById("app");
const resetButton = document.getElementById("reset-btn");

const modeInstantButton = document.getElementById("mode-instant");
const modeComposeButton = document.getElementById("mode-compose");
const modeComposeTreeButton = document.getElementById("mode-compose-tree");
const modeTextButton = document.getElementById("mode-text");
const caseUpperButton = document.getElementById("case-upper");
const caseLowerButton = document.getElementById("case-lower");

const builderPanel = document.getElementById("builder-panel");
const builderSequence = document.getElementById("builder-sequence");
const builderEmpty = document.getElementById("builder-empty");
const playSequenceButton = document.getElementById("play-sequence-btn");
const insertSpaceButton = document.getElementById("insert-space-btn");
const undoSequenceButton = document.getElementById("undo-sequence-btn");
const clearSequenceButton = document.getElementById("clear-sequence-btn");

const libraryPanel = document.getElementById("library-panel");
const libraryTree = document.getElementById("library-tree");
const libraryNote = document.querySelector(".library-note");

const textPanel = document.getElementById("text-panel");
const textStatus = document.getElementById("text-status");
const textSource = document.getElementById("text-source");
const textConvertButton = document.getElementById("text-convert-btn");

const synth = window.speechSynthesis;

const pendingSyllables = [];
const sequence = [];

let isQueueSpeaking = false;
let selectedVoice = null;
let currentMode = MODE_INSTANT;
let currentLetterCase = CASE_UPPER;
let libraryLoading = false;
let libraryLoaded = false;
let librarySyllables = [];

const FALLBACK_SYLLABLES = Array.from(new Set(dane.flatMap((item) => item.sylaby))).sort((a, b) => a.localeCompare(b, "pl"));

const isPolishVoice = (voice) => Boolean(voice.lang) && voice.lang.toLowerCase().startsWith("pl");

const selectVoice = () => {
    if (!synth) {
        return;
    }

    const voices = synth.getVoices();
    selectedVoice = voices.find((voice) => isPolishVoice(voice) && voice.localService)
        || voices.find(isPolishVoice)
        || null;
};

const createUtterance = (text, rate) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pl-PL";
    utterance.rate = rate;

    if (selectedVoice) {
        utterance.voice = selectedVoice;
    }

    return utterance;
};

const stopSpeech = () => {
    pendingSyllables.length = 0;
    isQueueSpeaking = false;

    if (synth) {
        synth.cancel();
    }
};

const speakNextSyllable = () => {
    if (!synth || isQueueSpeaking || pendingSyllables.length === 0) {
        return;
    }

    const utterance = createUtterance(pendingSyllables.shift(), 0.95);

    isQueueSpeaking = true;
    utterance.onend = () => {
        isQueueSpeaking = false;
        speakNextSyllable();
    };
    utterance.onerror = () => {
        isQueueSpeaking = false;
        speakNextSyllable();
    };

    synth.speak(utterance);
};

const queueSyllable = (sylaba) => {
    if (!synth) {
        return;
    }

    if (synth.speaking && !isQueueSpeaking) {
        synth.cancel();
    }

    if (pendingSyllables.length >= MAX_PENDING_SYLLABLES) {
        pendingSyllables.shift();
    }

    pendingSyllables.push(sylaba);

    if (synth.paused) {
        synth.resume();
    }

    speakNextSyllable();
};

const setTextStatus = (message) => {
    if (textStatus) {
        textStatus.textContent = message;
    }
};

const formatWithLetterCase = (value) => {
    const text = String(value || "");
    return currentLetterCase === CASE_LOWER
        ? text.toLocaleLowerCase("pl-PL")
        : text.toLocaleUpperCase("pl-PL");
};

const updateCaseButtons = () => {
    caseUpperButton.classList.toggle("active", currentLetterCase === CASE_UPPER);
    caseLowerButton.classList.toggle("active", currentLetterCase === CASE_LOWER);
};

const applyCaseToVisibleElements = () => {
    document.querySelectorAll(".letter-group[data-group]").forEach((groupLabel) => {
        groupLabel.textContent = `Litera ${formatWithLetterCase(groupLabel.dataset.group)}`;
    });

    document.querySelectorAll(".sylaba[data-syllable]").forEach((button) => {
        button.textContent = formatWithLetterCase(button.dataset.syllable);
    });

    document.querySelectorAll(".library-syllable-btn[data-syllable]").forEach((button) => {
        button.textContent = formatWithLetterCase(button.dataset.syllable);
    });

    document.querySelectorAll(".library-summary[data-label][data-count]").forEach((summary) => {
        const label = summary.dataset.label || "";
        const count = summary.dataset.count || "0";
        summary.textContent = `${formatWithLetterCase(label)} (${count})`;
    });
};

const setLetterCase = (nextCase) => {
    if (nextCase !== CASE_UPPER && nextCase !== CASE_LOWER) {
        return;
    }

    currentLetterCase = nextCase;
    updateCaseButtons();
    applyCaseToVisibleElements();
    renderSequence();
};

const normalizeSequence = () => {
    const normalized = [];

    sequence.forEach((token) => {
        if (token !== SPACE_TOKEN) {
            normalized.push(token);
            return;
        }

        if (normalized.length === 0 || normalized[normalized.length - 1] === SPACE_TOKEN) {
            return;
        }

        normalized.push(token);
    });

    if (normalized[normalized.length - 1] === SPACE_TOKEN) {
        normalized.pop();
    }

    sequence.splice(0, sequence.length, ...normalized);
};

const buildSpeechTextFromSequence = () => {
    normalizeSequence();

    const words = [];
    let currentWord = "";

    sequence.forEach((token) => {
        if (token === SPACE_TOKEN) {
            if (currentWord) {
                words.push(currentWord);
                currentWord = "";
            }
            return;
        }

        currentWord += token.toLowerCase();
    });

    if (currentWord) {
        words.push(currentWord);
    }

    return words.join(" ");
};

const renderSequence = () => {
    normalizeSequence();
    builderSequence.textContent = "";

    sequence.forEach((token, index) => {
        const isSpace = token === SPACE_TOKEN;
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = isSpace ? "sequence-chip space-chip" : "sequence-chip";
        const displayToken = formatWithLetterCase(token);
        chip.textContent = isSpace ? "" : displayToken;
        chip.title = isSpace ? "Spacja" : displayToken;
        chip.setAttribute("aria-label", isSpace ? "Usun spacje" : `Usun sylabe ${displayToken}`);

        chip.addEventListener("click", () => {
            sequence.splice(index, 1);
            renderSequence();
        });

        builderSequence.appendChild(chip);
    });

    const hasSequence = sequence.length > 0;
    const hasSpeechText = buildSpeechTextFromSequence().length > 0;

    builderEmpty.classList.toggle("hidden", hasSequence);
    playSequenceButton.disabled = !hasSpeechText;
    insertSpaceButton.disabled = !hasSequence || sequence[sequence.length - 1] === SPACE_TOKEN;
    undoSequenceButton.disabled = !hasSequence;
    clearSequenceButton.disabled = !hasSequence;
};

const appendToSequence = (token) => {
    if (token === SPACE_TOKEN && (sequence.length === 0 || sequence[sequence.length - 1] === SPACE_TOKEN)) {
        return;
    }

    sequence.push(token);
    renderSequence();
};

const clearSequence = () => {
    sequence.length = 0;
    renderSequence();
};

const playBuiltSequence = () => {
    const speechText = buildSpeechTextFromSequence();

    if (!synth || speechText.length === 0) {
        return;
    }

    stopSpeech();
    synth.speak(createUtterance(speechText, 0.9));
};

const normalizeInputText = (text) => String(text || "")
    .toLocaleLowerCase("pl-PL")
    .replace(/[^a-ząćęłńóśżź\s-]/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const hasPolishVowel = (text) => [...text].some((char) => POLISH_VOWELS.has(char));

const splitWordIntoSyllables = (word) => {
    if (!word || !hasPolishVowel(word)) {
        return [];
    }

    const chars = [...word];
    const vowelPositions = [];

    chars.forEach((char, index) => {
        if (POLISH_VOWELS.has(char)) {
            vowelPositions.push(index);
        }
    });

    if (vowelPositions.length <= 1) {
        return [word];
    }

    const boundaries = [];
    for (let i = 0; i < vowelPositions.length - 1; i += 1) {
        const left = vowelPositions[i];
        const right = vowelPositions[i + 1];
        const clusterLength = right - left - 1;
        let cut = left + 1;

        if (clusterLength === 2) {
            cut = right - 1;
        } else if (clusterLength > 2) {
            const middle = chars.slice(left + 1, right).join("");
            const ending = middle.slice(-2);
            cut = POLISH_ENDING_DIGRAPHS.has(ending) ? right - 2 : right - 1;
        }

        boundaries.push(cut);
    }

    const syllables = [];
    let start = 0;

    boundaries.forEach((cut) => {
        if (cut <= start) {
            return;
        }

        syllables.push(chars.slice(start, cut).join(""));
        start = cut;
    });

    syllables.push(chars.slice(start).join(""));

    return syllables.filter((syllable) => syllable.length > 0 && hasPolishVowel(syllable));
};

const textToSequenceTokens = (inputText) => {
    const normalized = normalizeInputText(inputText);
    if (!normalized) {
        return { normalized, tokens: [] };
    }

    const tokens = [];

    normalized.split(" ").forEach((word) => {
        const syllables = splitWordIntoSyllables(word);

        if (syllables.length === 0) {
            return;
        }

        syllables.forEach((syllable) => {
            tokens.push(syllable.toLocaleUpperCase("pl-PL"));
        });
        tokens.push(SPACE_TOKEN);
    });

    if (tokens[tokens.length - 1] === SPACE_TOKEN) {
        tokens.pop();
    }

    return { normalized, tokens };
};

const applyTextInputToSequence = () => {
    const { normalized, tokens } = textToSequenceTokens(textSource.value);

    if (!normalized) {
        setTextStatus("Wpisz slowo albo zdanie do podzialu na sylaby.");
        return;
    }

    if (tokens.length === 0) {
        setTextStatus("Nie udalo sie podzielic podanego tekstu na sylaby.");
        return;
    }

    sequence.splice(0, sequence.length, ...tokens);
    renderSequence();
    setTextStatus("Tekst podzielono na sylaby i dodano do gornego paska.");
};

const createTreeIndex = (syllables) => {
    const letterMap = new Map();

    syllables.forEach((syllable) => {
        const letterKey = syllable.slice(0, 1);
        const prefixKey = syllable.slice(0, Math.min(2, syllable.length));

        if (!letterMap.has(letterKey)) {
            letterMap.set(letterKey, new Map());
        }

        const prefixMap = letterMap.get(letterKey);
        if (!prefixMap.has(prefixKey)) {
            prefixMap.set(prefixKey, []);
        }

        prefixMap.get(prefixKey).push(syllable);
    });

    return letterMap;
};

const createSummary = (label, count) => {
    const summary = document.createElement("summary");
    summary.className = "library-summary";
    summary.dataset.label = label;
    summary.dataset.count = String(count);
    summary.textContent = `${formatWithLetterCase(label)} (${count})`;
    return summary;
};

const renderLibraryTree = (syllables) => {
    libraryTree.textContent = "";

    if (!Array.isArray(syllables) || syllables.length === 0) {
        return;
    }

    const treeIndex = createTreeIndex(syllables);
    const sortedLetters = Array.from(treeIndex.keys()).sort((a, b) => a.localeCompare(b, "pl"));

    sortedLetters.forEach((letter) => {
        const prefixMap = treeIndex.get(letter);
        const sortedPrefixes = Array.from(prefixMap.keys()).sort((a, b) => a.localeCompare(b, "pl"));
        const letterTotal = sortedPrefixes.reduce((sum, prefix) => sum + prefixMap.get(prefix).length, 0);

        const letterNode = document.createElement("details");
        letterNode.appendChild(createSummary(letter, letterTotal));

        const prefixWrapper = document.createElement("div");
        prefixWrapper.className = "library-prefix";

        letterNode.addEventListener("toggle", () => {
            if (!letterNode.open || letterNode.dataset.loaded === "1") {
                return;
            }

            sortedPrefixes.forEach((prefix) => {
                const prefixSyllables = prefixMap.get(prefix);
                const prefixNode = document.createElement("details");
                prefixNode.appendChild(createSummary(prefix, prefixSyllables.length));

                const syllableContainer = document.createElement("div");
                syllableContainer.className = "library-syllables";
                prefixNode.appendChild(syllableContainer);

                prefixNode.addEventListener("toggle", () => {
                    if (!prefixNode.open || prefixNode.dataset.loaded === "1") {
                        return;
                    }

                    const fragment = document.createDocumentFragment();

                    prefixSyllables.forEach((syllable) => {
                        const syllableButton = document.createElement("button");
                        syllableButton.type = "button";
                        syllableButton.className = "library-syllable-btn";
                        syllableButton.dataset.syllable = syllable;
                        syllableButton.textContent = formatWithLetterCase(syllable);
                        syllableButton.addEventListener("click", () => {
                            appendToSequence(syllable);
                        });
                        fragment.appendChild(syllableButton);
                    });

                    syllableContainer.appendChild(fragment);
                    prefixNode.dataset.loaded = "1";
                });

                prefixWrapper.appendChild(prefixNode);
            });

            letterNode.dataset.loaded = "1";
        });

        letterNode.appendChild(prefixWrapper);
        libraryTree.appendChild(letterNode);
    });
};

const applyLibrarySyllables = (syllables, messagePrefix) => {
    const prepared = Array.from(new Set(
        syllables
            .filter((item) => typeof item === "string")
            .map((item) => item.trim().toUpperCase())
            .filter((item) => item.length > 0)
    )).sort((a, b) => a.localeCompare(b, "pl"));

    librarySyllables = prepared;
    renderLibraryTree(librarySyllables);
    libraryLoaded = true;

    if (libraryNote) {
        libraryNote.textContent = `${messagePrefix} Baza: ${librarySyllables.length} sylab.`;
    }
};

const ensureLibraryTree = async () => {
    if (libraryLoaded || libraryLoading) {
        return;
    }

    libraryLoading = true;

    if (libraryNote) {
        libraryNote.textContent = "Ladowanie bazy slownikowej sylab...";
    }

    try {
        const response = await fetch(LIBRARY_DATA_URL, { cache: "no-store" });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const payload = await response.json();
        const syllables = Array.isArray(payload?.syllables) ? payload.syllables : [];

        if (syllables.length === 0) {
            throw new Error("Empty syllable list");
        }

        applyLibrarySyllables(syllables, "Wybierz litere, potem podgrupe i sylabe.");
    } catch (_error) {
        applyLibrarySyllables(FALLBACK_SYLLABLES, "Nie udalo sie zaladowac slownika. Uzyto bazy zapasowej.");
    } finally {
        libraryLoading = false;
    }
};

const updateSubtitle = () => {
    const subtitleByMode = {
        [MODE_INSTANT]: "Kliknij sylabe, aby od razu ja uslyszec.",
        [MODE_COMPOSE]: "Klikaj sylaby, buduj ciag i odtworz go przyciskiem Play.",
        [MODE_COMPOSE_TREE]: "Tryb drzewiasty: baza slownikowa 10 000+ sylab do skladania.",
        [MODE_TEXT]: "Tryb tekstu: wpisz zdanie i podziel je na sylaby."
    };

    subtitle.textContent = subtitleByMode[currentMode] || subtitleByMode[MODE_INSTANT];
};

const setMode = (mode) => {
    if (mode !== MODE_INSTANT && mode !== MODE_COMPOSE && mode !== MODE_COMPOSE_TREE && mode !== MODE_TEXT) {
        return;
    }

    currentMode = mode;

    modeInstantButton.classList.toggle("active", mode === MODE_INSTANT);
    modeComposeButton.classList.toggle("active", mode === MODE_COMPOSE);
    modeComposeTreeButton.classList.toggle("active", mode === MODE_COMPOSE_TREE);
    modeTextButton.classList.toggle("active", mode === MODE_TEXT);

    const isComposeMode = mode === MODE_COMPOSE || mode === MODE_COMPOSE_TREE || mode === MODE_TEXT;
    builderPanel.classList.toggle("hidden", !isComposeMode);
    libraryPanel.classList.toggle("hidden", mode !== MODE_COMPOSE_TREE);
    textPanel.classList.toggle("hidden", mode !== MODE_TEXT);

    if (mode === MODE_INSTANT || mode === MODE_COMPOSE) {
        container.style.display = "block";
    } else {
        container.style.display = "none";
    }

    if (mode === MODE_COMPOSE_TREE) {
        ensureLibraryTree();
    }

    if (mode === MODE_TEXT) {
        setTextStatus("Wpisz tekst i kliknij przycisk podzialu.");
    }

    updateSubtitle();
};

const activateSyllable = (sylaba) => {
    if (currentMode === MODE_INSTANT) {
        queueSyllable(sylaba);
        return;
    }

    appendToSequence(sylaba);
};

const addSyllableHandlers = (btn, sylaba) => {
    btn.addEventListener("pointerdown", (event) => {
        if (!event.isPrimary || event.button !== 0) {
            return;
        }

        event.preventDefault();
        activateSyllable(sylaba);
    });

    btn.addEventListener("keydown", (event) => {
        if (event.repeat) {
            return;
        }

        if (event.key !== "Enter" && event.key !== " " && event.key !== "Spacebar") {
            return;
        }

        event.preventDefault();
        activateSyllable(sylaba);
    });
};

const buildApp = () => {
    dane.forEach((item) => {
        const groupDiv = document.createElement("div");
        groupDiv.className = "letter-group";
        groupDiv.dataset.group = item.grupa;
        groupDiv.textContent = `Litera ${formatWithLetterCase(item.grupa)}`;

        const rowDiv = document.createElement("div");
        rowDiv.className = "row";

        item.sylaby.forEach((sylaba) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "sylaba";
            btn.dataset.syllable = sylaba;
            btn.textContent = formatWithLetterCase(sylaba);

            addSyllableHandlers(btn, sylaba);
            rowDiv.appendChild(btn);
        });

        container.appendChild(groupDiv);
        container.appendChild(rowDiv);
    });
};

const resetProgress = () => {
    clearSequence();
    stopSpeech();

    if (textSource) {
        textSource.value = "";
    }

    if (currentMode === MODE_TEXT) {
        setTextStatus("Wpisz tekst i kliknij przycisk podzialu.");
    }
};

if (synth) {
    selectVoice();
    synth.addEventListener("voiceschanged", selectVoice);
}

modeInstantButton.addEventListener("click", () => {
    setMode(MODE_INSTANT);
});

modeComposeButton.addEventListener("click", () => {
    setMode(MODE_COMPOSE);
});

modeComposeTreeButton.addEventListener("click", () => {
    setMode(MODE_COMPOSE_TREE);
});

modeTextButton.addEventListener("click", () => {
    setMode(MODE_TEXT);
});

caseUpperButton.addEventListener("click", () => {
    setLetterCase(CASE_UPPER);
});

caseLowerButton.addEventListener("click", () => {
    setLetterCase(CASE_LOWER);
});

playSequenceButton.addEventListener("click", playBuiltSequence);

insertSpaceButton.addEventListener("click", () => {
    appendToSequence(SPACE_TOKEN);
});

undoSequenceButton.addEventListener("click", () => {
    if (sequence.length === 0) {
        return;
    }

    sequence.pop();
    renderSequence();
});

clearSequenceButton.addEventListener("click", clearSequence);

textConvertButton.addEventListener("click", applyTextInputToSequence);

textSource.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        applyTextInputToSequence();
    }
});

resetButton.addEventListener("click", resetProgress);

buildApp();
setLetterCase(CASE_UPPER);
setMode(MODE_INSTANT);
