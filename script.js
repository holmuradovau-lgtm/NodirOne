"use strict";

// ===============================
// NODIR HUB v1.1
// script.js
// ===============================

// -------------------------------
// State
// -------------------------------
const state = {
    opens: Number(localStorage.getItem("opens")) || 0,
    xp: Number(localStorage.getItem("xp")) || 0,
    level: Number(localStorage.getItem("level")) || 1,
    achievements: JSON.parse(localStorage.getItem("achievements") || "[]"),
    soundOn: localStorage.getItem("soundOn") === "true"
};

// -------------------------------
// Utilities
// -------------------------------
function $(id) { return document.getElementById(id); }

function notify(text) {
    const n = document.createElement("div");
    n.className = "notify";
    n.textContent = text;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 2500);
}

function playClickSound() {
    if (!state.soundOn) return;
    // Lightweight beep using WebAudio, no external asset needed.
    try {
        const ctx = playClickSound.ctx || (playClickSound.ctx = new (window.AudioContext || window.webkitAudioContext)());
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 440;
        gain.gain.value = 0.04;
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
    } catch (e) { /* audio unsupported, ignore */ }
}

// -------------------------------
// Clock
// -------------------------------
const timeEl = $("time");
const dateEl = $("date");

function updateClock() {
    const now = new Date();
    timeEl.textContent = now.toLocaleTimeString();
    dateEl.textContent = now.toDateString();
}
updateClock();
setInterval(updateClock, 1000);

// -------------------------------
// Modal system (generic, data-driven)
// -------------------------------
const modals = document.querySelectorAll(".modal");

function openModal(id) {
    const modal = $(id);
    if (modal) modal.style.display = "flex";
}

function closeAllModals() {
    modals.forEach(m => (m.style.display = "none"));
}

document.querySelectorAll(".closeModal").forEach(btn => {
    btn.addEventListener("click", closeAllModals);
});

modals.forEach(modal => {
    modal.addEventListener("click", e => {
        if (e.target === modal) closeAllModals();
    });
});

document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeAllModals();
});

// -------------------------------
// Cards: open modal + ripple + XP + haptics
// -------------------------------
const cardModalMap = {
    notes: "notesModal",
    calculator: "calculatorModal",
    weather: "weatherModal",
    news: "newsModal",
    stocks: "stocksModal",
    music: "musicModal",
    games: "gamesModal",
    settings: "settingsModal",
    profile: "profileModal",
    about: "aboutModal"
};

const cards = document.querySelectorAll(".card");

cards.forEach(card => {
    card.addEventListener("click", e => {
        card.animate(
            [{ transform: "scale(1)" }, { transform: "scale(.94)" }, { transform: "scale(1)" }],
            { duration: 220 }
        );

        spawnRipple(card, e);
        navigator.vibrate?.(15);
        playClickSound();
        addXP(5);

        const modalId = cardModalMap[card.id];
        if (modalId) openModal(modalId);
    });
});

function spawnRipple(card, e) {
    const rect = card.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.style.position = "absolute";
    ripple.style.width = "20px";
    ripple.style.height = "20px";
    ripple.style.borderRadius = "50%";
    ripple.style.background = "rgba(255,255,255,.5)";
    ripple.style.left = (e.clientX - rect.left) + "px";
    ripple.style.top = (e.clientY - rect.top) + "px";
    ripple.style.pointerEvents = "none";
    ripple.style.animation = "fade .6s linear";
    card.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
}

// Keyboard shortcuts 1-5 to open cards
const shortcutOrder = ["notes", "calculator", "weather", "games", "profile"];
document.addEventListener("keydown", e => {
    const idx = Number(e.key) - 1;
    if (idx >= 0 && idx < shortcutOrder.length) {
        $(shortcutOrder[idx])?.click();
    }
});

// ===============================
// NOTES
// ===============================
const noteArea = $("noteArea");
const notesCountEl = $("notesCount");

noteArea.value = localStorage.getItem("notes") || "";
notesCountEl.textContent = noteArea.value.length;

function saveNotes() {
    localStorage.setItem("notes", noteArea.value);
    notesCountEl.textContent = noteArea.value.length;
}

noteArea.addEventListener("input", saveNotes);

$("saveNote").addEventListener("click", () => {
    saveNotes();
    notify("✅ Notes Saved");
});

$("deleteNote").addEventListener("click", () => {
    if (confirm("Delete note?")) {
        noteArea.value = "";
        localStorage.removeItem("notes");
        notesCountEl.textContent = 0;
        notify("🗑 Note Deleted");
    }
});

$("downloadNote").addEventListener("click", () => {
    const blob = new Blob([noteArea.value], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "note.txt";
    a.click();
    URL.revokeObjectURL(a.href);
    notify("📥 Note Downloaded");
});

document.addEventListener("keydown", e => {
    if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        saveNotes();
        notify("💾 Saved");
    }
});

// ===============================
// SETTINGS
// ===============================
const darkSwitch = $("darkSwitch");
const animSwitch = $("animSwitch");
const soundSwitch = $("soundSwitch");

darkSwitch.checked = localStorage.getItem("darkMode") === "true";
animSwitch.checked = localStorage.getItem("animations") !== "false";
soundSwitch.checked = state.soundOn;

applyDarkMode(darkSwitch.checked);
applyAnimations(animSwitch.checked);

function applyDarkMode(on) {
    document.body.style.background = on ? "#000814" : "";
    localStorage.setItem("darkMode", on);
}

function applyAnimations(on) {
    document.body.classList.toggle("no-anim", !on);
    localStorage.setItem("animations", on);
}

darkSwitch.addEventListener("change", () => applyDarkMode(darkSwitch.checked));
animSwitch.addEventListener("change", () => applyAnimations(animSwitch.checked));
soundSwitch.addEventListener("change", () => {
    state.soundOn = soundSwitch.checked;
    localStorage.setItem("soundOn", state.soundOn);
});

document.addEventListener("keydown", e => {
    if (e.ctrlKey && e.key === "d") {
        e.preventDefault();
        darkSwitch.checked = !darkSwitch.checked;
        applyDarkMode(darkSwitch.checked);
    }
});

// ===============================
// CALCULATOR (safe expression evaluator, no eval)
// ===============================
const calcDisplay = $("calcDisplay");
const calcButtons = document.querySelectorAll(".calculator button");
let expression = "";

function safeCalculate(expr) {
    // Only allow digits, operators, decimal points and spaces.
    if (!/^[0-9+\-*/. ]+$/.test(expr)) return "Error";
    try {
        const tokens = expr.match(/(\d+\.?\d*|[+\-*/])/g);
        if (!tokens) return "Error";

        // First pass: handle * and /
        const stage1 = [];
        let i = 0;
        stage1.push(parseFloat(tokens[i++]));
        while (i < tokens.length) {
            const op = tokens[i++];
            const num = parseFloat(tokens[i++]);
            if (op === "*") stage1[stage1.length - 1] *= num;
            else if (op === "/") stage1[stage1.length - 1] /= num;
            else stage1.push(op, num);
        }

        // Second pass: handle + and -
        let result = stage1[0];
        for (let j = 1; j < stage1.length; j += 2) {
            const op = stage1[j];
            const num = stage1[j + 1];
            result = op === "+" ? result + num : result - num;
        }

        return Number.isFinite(result) ? Number(result.toFixed(10)) : "Error";
    } catch {
        return "Error";
    }
}

calcButtons.forEach(button => {
    button.addEventListener("click", () => {
        const value = button.textContent;

        if (value === "C") {
            expression = "";
            calcDisplay.value = "";
            return;
        }

        if (value === "=") {
            calcDisplay.value = safeCalculate(expression);
            expression = String(calcDisplay.value);
            return;
        }

        expression += value;
        calcDisplay.value = expression;
    });
});

// ===============================
// WEATHER (OpenWeatherMap)
// ===============================
const weatherSetup = $("weatherSetup");
const weatherApp = $("weatherApp");
const weatherApiKeyInput = $("weatherApiKey");
const weatherResult = $("weatherResult");
const weatherError = $("weatherError");

function getWeatherKey() {
    return localStorage.getItem("owmApiKey") || "";
}

function showWeatherPanel() {
    if (getWeatherKey()) {
        weatherSetup.classList.add("hidden");
        weatherApp.classList.remove("hidden");
    } else {
        weatherSetup.classList.remove("hidden");
        weatherApp.classList.add("hidden");
    }
}
showWeatherPanel();

$("saveWeatherKey").addEventListener("click", () => {
    const key = weatherApiKeyInput.value.trim();
    if (!key) {
        notify("⚠️ Enter a valid API key");
        return;
    }
    localStorage.setItem("owmApiKey", key);
    showWeatherPanel();
    notify("✅ API key saved");
});

$("changeWeatherKey").addEventListener("click", () => {
    localStorage.removeItem("owmApiKey");
    showWeatherPanel();
});

function showWeatherError(msg) {
    weatherResult.classList.add("hidden");
    weatherError.textContent = msg;
    weatherError.classList.remove("hidden");
}

async function fetchWeatherByCity(city) {
    const key = getWeatherKey();
    weatherError.classList.add("hidden");
    try {
        const res = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${key}`
        );
        if (!res.ok) throw new Error(res.status === 401 ? "Invalid API key" : "City not found");
        const data = await res.json();
        renderWeather(data);
    } catch (err) {
        showWeatherError("⚠️ " + err.message);
    }
}

async function fetchWeatherByCoords(lat, lon) {
    const key = getWeatherKey();
    weatherError.classList.add("hidden");
    try {
        const res = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${key}`
        );
        if (!res.ok) throw new Error(res.status === 401 ? "Invalid API key" : "Location not found");
        const data = await res.json();
        renderWeather(data);
    } catch (err) {
        showWeatherError("⚠️ " + err.message);
    }
}

function renderWeather(data) {
    weatherResult.classList.remove("hidden");
    $("weatherIcon").src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
    $("weatherIcon").alt = data.weather[0].description;
    $("weatherTemp").textContent = `${Math.round(data.main.temp)}°C`;
    $("weatherCity").textContent = `${data.name}, ${data.sys.country}`;
    $("weatherDesc").textContent = data.weather[0].description;
    $("weatherFeels").textContent = `Feels like: ${Math.round(data.main.feels_like)}°C`;
    $("weatherHumidity").textContent = `Humidity: ${data.main.humidity}%`;
    $("weatherWind").textContent = `Wind: ${data.wind.speed} m/s`;
}

$("getWeather").addEventListener("click", () => {
    const city = $("cityInput").value.trim();
    if (city) fetchWeatherByCity(city);
});

$("cityInput").addEventListener("keydown", e => {
    if (e.key === "Enter") $("getWeather").click();
});

$("useLocation").addEventListener("click", () => {
    if (!navigator.geolocation) {
        showWeatherError("⚠️ Geolocation not supported");
        return;
    }
    navigator.geolocation.getCurrentPosition(
        pos => fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
        () => showWeatherError("⚠️ Location permission denied")
    );
});

// ===============================
// GAMES CENTER
// ===============================
const gamesMenu = $("gamesMenu");
const gameArea = $("gameArea");
const gameContent = $("gameContent");
let activeGameCleanup = null;

function openGame(renderFn) {
    gamesMenu.classList.add("hidden");
    gameArea.classList.remove("hidden");
    gameContent.innerHTML = "";
    if (activeGameCleanup) { activeGameCleanup(); activeGameCleanup = null; }
    activeGameCleanup = renderFn(gameContent) || null;
}

function backToGamesMenu() {
    if (activeGameCleanup) { activeGameCleanup(); activeGameCleanup = null; }
    gameContent.innerHTML = "";
    gameArea.classList.add("hidden");
    gamesMenu.classList.remove("hidden");
}

$("backToGames").addEventListener("click", backToGamesMenu);
document.getElementById("gamesModal").querySelector(".closeModal").addEventListener("click", backToGamesMenu);

$("ticTacToeGame").addEventListener("click", () => openGame(renderTicTacToe));
$("memoryGame").addEventListener("click", () => openGame(renderMemoryGame));
$("snakeGame").addEventListener("click", () => openGame(renderSnakeGame));
$("sudokuGame").addEventListener("click", () => openGame(renderSudoku));

// --- Tic-Tac-Toe ---
function renderTicTacToe(container) {
    let board = Array(9).fill(null);
    let turn = "❌";
    let over = false;

    const wrap = document.createElement("div");
    const status = document.createElement("p");
    status.className = "ttt-status";
    const boardEl = document.createElement("div");
    boardEl.className = "ttt-board";

    const wins = [
        [0,1,2],[3,4,5],[6,7,8],
        [0,3,6],[1,4,7],[2,5,8],
        [0,4,8],[2,4,6]
    ];

    function checkWinner() {
        for (const [a,b,c] of wins) {
            if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
        }
        return board.every(Boolean) ? "draw" : null;
    }

    function render() {
        boardEl.innerHTML = "";
        board.forEach((val, i) => {
            const cell = document.createElement("div");
            cell.className = "ttt-cell";
            cell.textContent = val || "";
            cell.addEventListener("click", () => {
                if (over || board[i]) return;
                board[i] = turn;
                const result = checkWinner();
                if (result) {
                    over = true;
                    status.textContent = result === "draw" ? "It's a draw!" : `${result} wins!`;
                    if (result !== "draw") addXP(15);
                } else {
                    turn = turn === "❌" ? "⭕" : "❌";
                    status.textContent = `Turn: ${turn}`;
                }
                render();
            });
            boardEl.appendChild(cell);
        });
    }

    status.textContent = `Turn: ${turn}`;
    const resetBtn = document.createElement("button");
    resetBtn.textContent = "Restart";
    resetBtn.className = "btn-secondary";
    resetBtn.addEventListener("click", () => {
        board = Array(9).fill(null);
        turn = "❌";
        over = false;
        status.textContent = `Turn: ${turn}`;
        render();
    });

    wrap.append(boardEl, status, resetBtn);
    container.appendChild(wrap);
    render();
}

// --- Memory Game ---
function renderMemoryGame(container) {
    const icons = ["🐱","🐶","🦊","🐸","🐼","🦁","🐵","🐧"];
    const deck = [...icons, ...icons]
        .map(icon => ({ icon, matched: false }))
        .sort(() => Math.random() - 0.5);

    let flipped = [];
    let lock = false;
    let matches = 0;

    const boardEl = document.createElement("div");
    boardEl.className = "memory-board";
    const status = document.createElement("p");
    status.className = "ttt-status";
    status.textContent = "Find all the pairs!";

    deck.forEach((item, i) => {
        const cell = document.createElement("div");
        cell.className = "memory-card";
        cell.dataset.index = i;
        cell.addEventListener("click", () => {
            if (lock || cell.classList.contains("flipped") || cell.classList.contains("matched")) return;

            cell.textContent = item.icon;
            cell.classList.add("flipped");
            flipped.push({ cell, item });

            if (flipped.length === 2) {
                lock = true;
                const [first, second] = flipped;
                if (first.item.icon === second.item.icon) {
                    first.cell.classList.add("matched");
                    second.cell.classList.add("matched");
                    matches++;
                    flipped = [];
                    lock = false;
                    if (matches === icons.length) {
                        status.textContent = "🎉 You matched them all!";
                        addXP(25);
                    }
                } else {
                    setTimeout(() => {
                        first.cell.classList.remove("flipped");
                        second.cell.classList.remove("flipped");
                        first.cell.textContent = "";
                        second.cell.textContent = "";
                        flipped = [];
                        lock = false;
                    }, 700);
                }
            }
        });
        boardEl.appendChild(cell);
    });

    container.append(boardEl, status);
}

// --- Snake ---
function renderSnakeGame(container) {
    const size = 16;
    const cell = 18;
    const canvas = document.createElement("canvas");
    canvas.id = "snakeCanvas";
    canvas.width = size * cell;
    canvas.height = size * cell;
    const ctx = canvas.getContext("2d");

    const scoreEl = document.createElement("p");
    scoreEl.className = "game-score";
    const hint = document.createElement("p");
    hint.className = "game-hint";
    hint.textContent = "Use arrow keys or swipe to move";

    let snake = [{ x: 8, y: 8 }];
    let dir = { x: 1, y: 0 };
    let nextDir = dir;
    let food = randomFood();
    let score = 0;
    let over = false;

    function randomFood() {
        return { x: Math.floor(Math.random() * size), y: Math.floor(Math.random() * size) };
    }

    function draw() {
        ctx.fillStyle = "#0F172A";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#EF4444";
        ctx.fillRect(food.x * cell, food.y * cell, cell - 2, cell - 2);

        ctx.fillStyle = "#3B82F6";
        snake.forEach((seg, i) => {
            ctx.fillStyle = i === 0 ? "#60A5FA" : "#3B82F6";
            ctx.fillRect(seg.x * cell, seg.y * cell, cell - 2, cell - 2);
        });
    }

    function step() {
        if (over) return;
        dir = nextDir;
        const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

        if (head.x < 0 || head.y < 0 || head.x >= size || head.y >= size ||
            snake.some(s => s.x === head.x && s.y === head.y)) {
            over = true;
            scoreEl.textContent = `Game over — score: ${score}. Click Restart.`;
            addXP(Math.min(score, 20));
            return;
        }

        snake.unshift(head);
        if (head.x === food.x && head.y === food.y) {
            score++;
            scoreEl.textContent = `Score: ${score}`;
            food = randomFood();
        } else {
            snake.pop();
        }
        draw();
    }

    const keyHandler = e => {
        const map = {
            ArrowUp: { x: 0, y: -1 },
            ArrowDown: { x: 0, y: 1 },
            ArrowLeft: { x: -1, y: 0 },
            ArrowRight: { x: 1, y: 0 }
        };
        const next = map[e.key];
        if (!next) return;
        e.preventDefault();
        if (next.x === -dir.x && next.y === -dir.y) return; // no reverse
        nextDir = next;
    };
    document.addEventListener("keydown", keyHandler);

    // basic swipe support
    let touchStart = null;
    canvas.addEventListener("touchstart", e => {
        touchStart = e.touches[0];
    });
    canvas.addEventListener("touchend", e => {
        if (!touchStart) return;
        const dx = e.changedTouches[0].clientX - touchStart.clientX;
        const dy = e.changedTouches[0].clientY - touchStart.clientY;
        if (Math.abs(dx) > Math.abs(dy)) {
            nextDir = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
        } else {
            nextDir = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
        }
        touchStart = null;
    });

    const restartBtn = document.createElement("button");
    restartBtn.textContent = "Restart";
    restartBtn.className = "btn-secondary";
    restartBtn.addEventListener("click", () => {
        snake = [{ x: 8, y: 8 }];
        dir = { x: 1, y: 0 };
        nextDir = dir;
        food = randomFood();
        score = 0;
        over = false;
        scoreEl.textContent = "Score: 0";
        draw();
    });

    scoreEl.textContent = "Score: 0";
    container.append(canvas, scoreEl, restartBtn, hint);
    draw();

    const interval = setInterval(step, 140);

    // cleanup when leaving the game
    return () => {
        clearInterval(interval);
        document.removeEventListener("keydown", keyHandler);
    };
}

// --- Sudoku ---
function generateSudoku() {
    const grid = Array.from({ length: 9 }, () => Array(9).fill(0));

    function isValid(g, row, col, num) {
        for (let i = 0; i < 9; i++) {
            if (g[row][i] === num || g[i][col] === num) return false;
        }
        const br = row - (row % 3), bc = col - (col % 3);
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                if (g[br + r][bc + c] === num) return false;
            }
        }
        return true;
    }

    function fill(g, pos = 0) {
        if (pos === 81) return true;
        const row = Math.floor(pos / 9), col = pos % 9;
        const nums = [1,2,3,4,5,6,7,8,9].sort(() => Math.random() - 0.5);
        for (const num of nums) {
            if (isValid(g, row, col, num)) {
                g[row][col] = num;
                if (fill(g, pos + 1)) return true;
                g[row][col] = 0;
            }
        }
        return false;
    }

    fill(grid);

    const solution = grid.map(r => [...r]);
    const puzzle = grid.map(r => [...r]);
    let toRemove = 40; // difficulty: ~40 of 81 cells removed
    while (toRemove > 0) {
        const r = Math.floor(Math.random() * 9);
        const c = Math.floor(Math.random() * 9);
        if (puzzle[r][c] !== 0) {
            puzzle[r][c] = 0;
            toRemove--;
        }
    }

    return { puzzle, solution };
}

function renderSudoku(container) {
    const { puzzle, solution } = generateSudoku();
    const boardEl = document.createElement("div");
    boardEl.className = "sudoku-board";
    const status = document.createElement("p");
    status.className = "ttt-status";
    status.textContent = "Fill in the missing numbers";

    const inputs = [];

    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const cell = document.createElement("div");
            cell.className = "sudoku-cell";
            if ((r + 1) % 3 === 0 && r !== 8) cell.classList.add("sudoku-row-thick");

            if (puzzle[r][c] !== 0) {
                cell.textContent = puzzle[r][c];
                cell.classList.add("fixed");
            } else {
                const input = document.createElement("input");
                input.maxLength = 1;
                input.inputMode = "numeric";
                input.addEventListener("input", () => {
                    input.value = input.value.replace(/[^1-9]/g, "");
                });
                cell.appendChild(input);
                inputs.push({ r, c, input });
            }
            boardEl.appendChild(cell);
        }
    }

    const checkBtn = document.createElement("button");
    checkBtn.textContent = "Check Solution";

    const newBtn = document.createElement("button");
    newBtn.textContent = "New Puzzle";
    newBtn.className = "btn-secondary";
    newBtn.addEventListener("click", () => {
        container.innerHTML = "";
        renderSudoku(container);
    });

    checkBtn.addEventListener("click", () => {
        let correct = true;
        inputs.forEach(({ r, c, input }) => {
            const val = Number(input.value);
            if (val !== solution[r][c]) {
                correct = false;
                input.style.color = "#F87171";
            } else {
                input.style.color = "#4ADE80";
            }
        });
        status.textContent = correct ? "🎉 Solved correctly!" : "Some numbers are still wrong.";
        if (correct) addXP(30);
    });

    const btnRow = document.createElement("div");
    btnRow.className = "music-controls";
    btnRow.append(checkBtn, newBtn);

    container.append(boardEl, status, btnRow);
}

// ===============================
// NEWS FEED (GNews API)
// ===============================
const newsSetup = $("newsSetup");
const newsApp = $("newsApp");
const newsList = $("newsList");
const newsError = $("newsError");

function getNewsKey() { return localStorage.getItem("gnewsApiKey") || ""; }

function showNewsPanel() {
    if (getNewsKey()) {
        newsSetup.classList.add("hidden");
        newsApp.classList.remove("hidden");
    } else {
        newsSetup.classList.remove("hidden");
        newsApp.classList.add("hidden");
    }
}
showNewsPanel();

$("saveNewsKey").addEventListener("click", () => {
    const key = $("newsApiKey").value.trim();
    if (!key) { notify("⚠️ Enter a valid API key"); return; }
    localStorage.setItem("gnewsApiKey", key);
    showNewsPanel();
    notify("✅ API key saved");
});

$("changeNewsKey").addEventListener("click", () => {
    localStorage.removeItem("gnewsApiKey");
    showNewsPanel();
});

async function fetchNews(topic) {
    const key = getNewsKey();
    newsError.classList.add("hidden");
    newsList.innerHTML = "";
    try {
        const q = topic ? `&q=${encodeURIComponent(topic)}` : "";
        const res = await fetch(`https://gnews.io/api/v4/top-headlines?lang=en${q}&token=${key}`);
        if (!res.ok) throw new Error(res.status === 401 || res.status === 403 ? "Invalid API key" : "Could not load news");
        const data = await res.json();
        renderNews(data.articles || []);
    } catch (err) {
        newsError.textContent = "⚠️ " + err.message;
        newsError.classList.remove("hidden");
    }
}

function renderNews(articles) {
    newsList.innerHTML = "";
    if (!articles.length) {
        newsError.textContent = "No articles found.";
        newsError.classList.remove("hidden");
        return;
    }
    articles.forEach(a => {
        const item = document.createElement("a");
        item.className = "news-item";
        item.href = a.url;
        item.target = "_blank";
        item.rel = "noopener noreferrer";

        const img = document.createElement("img");
        img.src = a.image || "";
        img.alt = "";
        img.onerror = () => { img.style.display = "none"; };

        const body = document.createElement("div");
        body.className = "news-item-body";
        const h4 = document.createElement("h4");
        h4.textContent = a.title;
        const span = document.createElement("span");
        span.textContent = a.source?.name || "";

        body.append(h4, span);
        item.append(img, body);
        newsList.appendChild(item);
    });
}

$("getNews").addEventListener("click", () => fetchNews($("newsQuery").value.trim()));
$("newsQuery").addEventListener("keydown", e => { if (e.key === "Enter") $("getNews").click(); });

// ===============================
// STOCK TRACKER (Finnhub API)
// ===============================
const stocksSetup = $("stocksSetup");
const stocksApp = $("stocksApp");
const stocksList = $("stocksList");
const stocksError = $("stocksError");
let trackedStocks = JSON.parse(localStorage.getItem("trackedStocks") || "[]");
let stocksTimer = null;

function getStocksKey() { return localStorage.getItem("finnhubApiKey") || ""; }

function showStocksPanel() {
    if (getStocksKey()) {
        stocksSetup.classList.add("hidden");
        stocksApp.classList.remove("hidden");
        refreshAllStocks();
    } else {
        stocksSetup.classList.remove("hidden");
        stocksApp.classList.add("hidden");
    }
}
showStocksPanel();

$("saveStocksKey").addEventListener("click", () => {
    const key = $("stocksApiKey").value.trim();
    if (!key) { notify("⚠️ Enter a valid API key"); return; }
    localStorage.setItem("finnhubApiKey", key);
    showStocksPanel();
    notify("✅ API key saved");
});

$("changeStocksKey").addEventListener("click", () => {
    localStorage.removeItem("finnhubApiKey");
    showStocksPanel();
});

async function fetchQuote(symbol) {
    const key = getStocksKey();
    const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${key}`);
    if (!res.ok) throw new Error(res.status === 401 || res.status === 403 ? "Invalid API key" : "Request failed");
    return res.json();
}

async function refreshAllStocks() {
    stocksError.classList.add("hidden");
    stocksList.innerHTML = "";
    if (!trackedStocks.length) {
        stocksList.innerHTML = "<p class='hint'>No stocks tracked yet — add a symbol above.</p>";
        return;
    }
    for (const symbol of trackedStocks) {
        try {
            const data = await fetchQuote(symbol);
            renderStock(symbol, data);
        } catch (err) {
            stocksError.textContent = "⚠️ " + err.message;
            stocksError.classList.remove("hidden");
        }
    }
}

function renderStock(symbol, data) {
    const price = data.c;
    const change = data.d;
    const pct = data.dp;
    const item = document.createElement("div");
    item.className = "stock-item";

    const isUp = change >= 0;
    item.innerHTML = `
        <div>
            <span class="stock-symbol">${symbol}</span>
            <span class="stock-change ${isUp ? "up" : "down"}">${isUp ? "▲" : "▼"} ${change?.toFixed(2)} (${pct?.toFixed(2)}%)</span>
        </div>
        <div>
            <span class="stock-price">$${price?.toFixed(2)}</span>
            <button class="stock-remove" data-symbol="${symbol}">✕</button>
        </div>
    `;
    stocksList.appendChild(item);

    item.querySelector(".stock-remove").addEventListener("click", () => {
        trackedStocks = trackedStocks.filter(s => s !== symbol);
        localStorage.setItem("trackedStocks", JSON.stringify(trackedStocks));
        refreshAllStocks();
    });
}

$("addStock").addEventListener("click", () => {
    const symbol = $("stockSymbol").value.trim().toUpperCase();
    if (!symbol) return;
    if (!trackedStocks.includes(symbol)) {
        trackedStocks.push(symbol);
        localStorage.setItem("trackedStocks", JSON.stringify(trackedStocks));
    }
    $("stockSymbol").value = "";
    refreshAllStocks();
});

$("stockSymbol").addEventListener("keydown", e => { if (e.key === "Enter") $("addStock").click(); });
$("refreshStocks").addEventListener("click", refreshAllStocks);

// Auto-refresh tracked stocks every 30s only while the modal is open
document.getElementById("stocksModal").addEventListener("click", e => {
    if (e.target.closest(".closeModal") || e.target.id === "stocksModal") {
        clearInterval(stocksTimer);
        stocksTimer = null;
    }
});
$("stocks").addEventListener("click", () => {
    if (getStocksKey() && !stocksTimer) {
        stocksTimer = setInterval(refreshAllStocks, 30000);
    }
});

// ===============================
// MUSIC PLAYER (local files only)
// ===============================
const audioPlayer = $("audioPlayer");
const seekBar = $("seekBar");
const volumeBar = $("volumeBar");
const playPauseBtn = $("playPauseTrack");
const nowPlaying = $("nowPlaying");
const playlistEl = $("playlist");
let tracks = [];
let currentTrack = -1;

$("musicFiles").addEventListener("change", e => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
        tracks.push({ name: file.name, url: URL.createObjectURL(file) });
    });
    renderPlaylist();
    if (currentTrack === -1 && tracks.length) loadTrack(0);
});

function renderPlaylist() {
    playlistEl.innerHTML = "";
    tracks.forEach((track, i) => {
        const item = document.createElement("div");
        item.className = "playlist-item" + (i === currentTrack ? " active" : "");
        item.textContent = track.name;
        item.addEventListener("click", () => loadTrack(i));
        playlistEl.appendChild(item);
    });
}

function loadTrack(i) {
    if (i < 0 || i >= tracks.length) return;
    currentTrack = i;
    audioPlayer.src = tracks[i].url;
    nowPlaying.textContent = tracks[i].name;
    audioPlayer.play();
    playPauseBtn.textContent = "⏸ Pause";
    renderPlaylist();
}

playPauseBtn.addEventListener("click", () => {
    if (!tracks.length) { notify("⚠️ Add some tracks first"); return; }
    if (audioPlayer.paused) {
        audioPlayer.play();
        playPauseBtn.textContent = "⏸ Pause";
    } else {
        audioPlayer.pause();
        playPauseBtn.textContent = "▶ Play";
    }
});

$("nextTrack").addEventListener("click", () => loadTrack((currentTrack + 1) % tracks.length));
$("prevTrack").addEventListener("click", () => loadTrack((currentTrack - 1 + tracks.length) % tracks.length));

audioPlayer.addEventListener("timeupdate", () => {
    if (audioPlayer.duration) {
        seekBar.value = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    }
});

seekBar.addEventListener("input", () => {
    if (audioPlayer.duration) {
        audioPlayer.currentTime = (seekBar.value / 100) * audioPlayer.duration;
    }
});

volumeBar.addEventListener("input", () => {
    audioPlayer.volume = Number(volumeBar.value);
});

audioPlayer.addEventListener("ended", () => {
    if (currentTrack + 1 < tracks.length) loadTrack(currentTrack + 1);
    else playPauseBtn.textContent = "▶ Play";
});

// ===============================
// XP / LEVEL / ACHIEVEMENTS
// ===============================
const levelCountEl = $("levelCount");
const profileLevelEl = $("profileLevel");

function refreshProfileUI() {
    levelCountEl.textContent = state.level;
    profileLevelEl.textContent = `Level ${state.level} · ${state.xp} XP`;
}

function unlock(name) {
    if (!state.achievements.includes(name)) {
        state.achievements.push(name);
        localStorage.setItem("achievements", JSON.stringify(state.achievements));
        notify("🏅 Achievement: " + name);
    }
}

function addXP(amount) {
    state.xp += amount;
    if (state.xp >= 100) {
        state.xp -= 100;
        state.level++;
        notify("🏆 Level Up! Level " + state.level);
        if (state.level >= 5) unlock("Experienced");
    }
    localStorage.setItem("xp", state.xp);
    localStorage.setItem("level", state.level);
    refreshProfileUI();
}

refreshProfileUI();

// ===============================
// OPEN COUNTER + DAILY BONUS
// ===============================
state.opens++;
localStorage.setItem("opens", state.opens);
$("openCount").textContent = state.opens;
if (state.opens >= 10) unlock("Open App 10 Times");
if (noteArea.value.length >= 100) unlock("Writer");

const todayKey = new Date().toDateString();
if (localStorage.getItem("dailyBonus") !== todayKey) {
    localStorage.setItem("dailyBonus", todayKey);
    setTimeout(() => {
        notify("🎁 Daily Bonus +20 XP");
        addXP(20);
    }, 600);
}

// ===============================
// FOOTER YEAR
// ===============================
document.querySelector("footer p").textContent =
    `© ${new Date().getFullYear()} Nodir Hub | Version 1.1`;

// ===============================
// GREETING
// ===============================
window.addEventListener("load", () => {
    document.body.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600, fill: "forwards" });

    const hour = new Date().getHours();
    const greeting = hour < 12 ? "☀ Good Morning" : hour < 18 ? "🌤 Good Afternoon" : "🌙 Good Evening";
    setTimeout(() => notify(greeting), 800);
});

console.log("%cNODIR HUB", "font-size:24px;color:#3B82F6;font-weight:bold;");
console.log("Version 1.1 — loaded", state);
