const dane = [
    { grupa: "M", sylaby: ["MA", "MO", "MU", "ME", "MI", "MY"] },
    { grupa: "T", sylaby: ["TA", "TO", "TU", "TE", "TY"] },
    { grupa: "L", sylaby: ["LA", "LO", "LU", "LE", "LI"] },
    { grupa: "P", sylaby: ["PA", "PO", "PU", "PE", "PI", "PY"] }
];

const container = document.getElementById("app");
const resetButton = document.getElementById("reset-btn");

const speakSyllable = (sylaba) => {
    if (!window.speechSynthesis) {
        return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(sylaba);
    utterance.lang = "pl-PL";
    utterance.rate = 0.7;
    window.speechSynthesis.speak(utterance);
};

const buildApp = () => {
    dane.forEach((item) => {
        const groupDiv = document.createElement("div");
        groupDiv.className = "letter-group";
        groupDiv.textContent = `Litera ${item.grupa}`;

        const rowDiv = document.createElement("div");
        rowDiv.className = "row";

        item.sylaby.forEach((sylaba) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "sylaba";
            btn.textContent = sylaba;

            btn.addEventListener("click", () => {
                speakSyllable(sylaba);
                btn.classList.toggle("clicked");
            });

            rowDiv.appendChild(btn);
        });

        container.appendChild(groupDiv);
        container.appendChild(rowDiv);
    });
};

const resetProgress = () => {
    document.querySelectorAll(".sylaba").forEach((element) => {
        element.classList.remove("clicked");
    });
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
};

resetButton.addEventListener("click", resetProgress);
buildApp();
