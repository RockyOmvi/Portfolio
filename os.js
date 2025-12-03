/* --- SYSTEM CORE --- */
const bootScreen = document.getElementById('boot-screen');
const loginScreen = document.getElementById('login-screen');
const desktop = document.getElementById('desktop');
const taskbar = document.getElementById('taskbar');
const bootText = document.getElementById('boot-text');
const startMenu = document.getElementById('start-menu');
const screensaver = document.getElementById('screensaver');
const bsod = document.getElementById('bsod');

// BOOT SEQUENCE
const bootLines = [
    "BIOS Date 01/01/25 14:22:55 Ver: 1.0.2",
    "CPU: Quantum Core i9-9900K @ 5.00GHz",
    "Memory Test: 65536K OK",
    "Detecting Primary Master ... PK_DRIVE_01",
    "Detecting Primary Slave ... DATA_ARCHIVE",
    "Loading Kernel ...",
    "Verifying System Integrity ... 100%",
    "Initializing Graphic Interface ...",
    "Welcome to PK_OS v3.0"
];

async function bootSystem() {
    for (let line of bootLines) {
        const p = document.createElement('div');
        p.className = 'boot-line';
        p.innerText = line;
        bootText.appendChild(p);
        await new Promise(r => setTimeout(r, Math.random() * 300 + 100));
    }
    await new Promise(r => setTimeout(r, 1000));
    bootScreen.style.display = 'none';
    loginScreen.style.display = 'flex';
}

// LOGIN SYSTEM
function attemptLogin() {
    const pass = document.getElementById('password-input').value;
    const msg = document.getElementById('login-msg');
    if (pass === '1234') {
        msg.innerText = "ACCESS GRANTED";
        msg.className = "text-xs text-green-500 mt-2 h-4";
        setTimeout(() => {
            loginScreen.style.display = 'none';
            desktop.style.display = 'block';
            taskbar.style.display = 'flex';
            initOS();
        }, 1000);
    } else {
        msg.innerText = "ACCESS DENIED";
        document.getElementById('password-input').value = '';
    }
}

// STARTUP
window.onload = () => {
    lucide.createIcons();
    bootSystem();
    startClock();
    initMatrix();
    initVisualizer();
    initCursor();
    initScreensaver();

    // Login Enter Key
    document.getElementById('password-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') attemptLogin();
    });

    // Load High Score
    document.getElementById('snake-high').innerText = localStorage.getItem('snakeHighScore') || 0;

    // Load Notepad
    const savedNote = localStorage.getItem('notepadContent');
    if (savedNote) document.getElementById('notepad-area').value = savedNote;

    // Notepad Auto-save
    document.getElementById('notepad-area').addEventListener('input', (e) => {
        localStorage.setItem('notepadContent', e.target.value);
        document.getElementById('notepad-status').innerText = "SAVING...";
        setTimeout(() => document.getElementById('notepad-status').innerText = "SAVED", 500);
    });

    initSysMonitor();
};

function initCursor() {
    const cursor = document.getElementById('cursor');
    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    });

    // Hover effects
    document.addEventListener('mouseover', (e) => {
        if (e.target.matches('button, a, .desktop-icon, .window-header, .taskbar-item, input, .start-item')) {
            cursor.classList.add('hovered');
        } else {
            cursor.classList.remove('hovered');
        }
    });
}

/* --- WINDOW MANAGEMENT --- */
let zIndex = 100;

function openWindow(id) {
    const win = document.getElementById(id);
    if (!win) return;

    win.classList.remove('minimized');
    win.classList.add('open');
    win.style.zIndex = ++zIndex;

    // Add to taskbar if not exists
    addToTaskbar(id);

    // Refresh File Explorer if opened
    if (id === 'win-explorer' && typeof refreshExplorer === 'function') {
        refreshExplorer();
    }
}

function closeWindow(id) {
    const win = document.getElementById(id);
    win.classList.remove('open');
    removeFromTaskbar(id);

    // Stop Snake if closed
    if (id === 'win-snake' && snakeGame) {
        clearInterval(snakeGame);
    }
}

function minimizeWindow(id) {
    const win = document.getElementById(id);
    win.classList.add('minimized');
    win.classList.remove('open');
}

function addToTaskbar(id) {
    const taskbarApps = document.getElementById('taskbar-apps');
    if (document.getElementById(`task-${id}`)) return;

    const winName = document.querySelector(`#${id} .window-header span`).innerText;
    const btn = document.createElement('div');
    btn.id = `task-${id}`;
    btn.className = 'taskbar-item active';
    btn.innerText = winName;
    btn.onclick = () => openWindow(id);
    taskbarApps.appendChild(btn);
}

function removeFromTaskbar(id) {
    const btn = document.getElementById(`task-${id}`);
    if (btn) btn.remove();
}

// DRAGGABLE WINDOWS
document.querySelectorAll('.window').forEach(win => {
    const header = win.querySelector('.window-header');
    let isDragging = false;
    let offsetX, offsetY;

    win.addEventListener('mousedown', () => {
        win.style.zIndex = ++zIndex;
    });

    header.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) return;
        isDragging = true;
        offsetX = e.clientX - win.offsetLeft;
        offsetY = e.clientY - win.offsetTop;
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            win.style.left = `${e.clientX - offsetX}px`;
            win.style.top = `${e.clientY - offsetY}px`;
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
});

/* --- START MENU --- */
function toggleStartMenu() {
    if (startMenu.style.display === 'flex') {
        startMenu.style.display = 'none';
    } else {
        startMenu.style.display = 'flex';
        startMenu.style.zIndex = ++zIndex;
    }
}

// Close start menu when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('#start-menu') && !e.target.closest('#start-btn')) {
        startMenu.style.display = 'none';
    }
});

/* --- APPS --- */

// TERMINAL
const termInput = document.getElementById('term-input');
const termOutput = document.getElementById('term-output');

termInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const cmd = termInput.value;
        printTerm(`> ${cmd}`);
        handleCmd(cmd);
        termInput.value = '';
    }
});

function printTerm(text) {
    const div = document.createElement('div');
    div.innerText = text;
    termOutput.appendChild(div);
    termOutput.scrollTop = termOutput.scrollHeight;
}

/* --- FILE SYSTEM --- */
// MISSION REGISTRY
const MISSIONS = {
    "alpha": { id: "alpha", ip: "192.168.0.99", domain: "secure.alpha", score: 0, reward: "payload.txt", theme: "blue", title: "SECURE SERVER (ALPHA)" },
    "gamma": { id: "gamma", ip: "192.168.0.55", domain: "gamma.net", score: 10, reward: "gamma_intel.txt", theme: "purple", title: "GAMMA NETWORKS" },
    "delta": { id: "delta", ip: "192.168.0.101", domain: "delta.sys", score: 20, reward: "delta_plans.pdf", theme: "yellow", title: "DELTA SYSTEMS" },
    "epsilon": { id: "epsilon", ip: "192.168.0.44", domain: "epsilon.io", score: 30, reward: "epsilon_key.key", theme: "orange", title: "EPSILON IO" },
    "zeta": { id: "zeta", ip: "192.168.0.77", domain: "zeta.org", score: 40, reward: "zeta_coords.csv", theme: "cyan", title: "ZETA ORG" },
    "omega": { id: "omega", ip: "192.168.0.200", domain: "target.corp", score: 50, reward: "encrypted_payload.dat", theme: "red", title: "SECURE SERVER (OMEGA)" },
    "eta": { id: "eta", ip: "192.168.0.88", domain: "eta.edu", score: 60, reward: "eta_virus.exe", theme: "pink", title: "ETA RESEARCH" },
    "theta": { id: "theta", ip: "192.168.0.33", domain: "theta.gov", score: 70, reward: "theta_logs.log", theme: "brown", title: "THETA GOV" },
    "iota": { id: "iota", ip: "192.168.0.11", domain: "iota.mil", score: 80, reward: "iota_blueprint.cad", theme: "gray", title: "IOTA MILITARY" },
    "kappa": { id: "kappa", ip: "192.168.0.66", domain: "kappa.xyz", score: 90, reward: "kappa_source.js", theme: "white", title: "KAPPA LABS" }
};

// ADVANCED MISSION ENGINE
const MissionEngine = {
    active: false,
    currentOp: null,
    stage: 0,
    timer: 0,
    interval: null,
    traceLevel: 0,
    objective: "",

    start: function (opId) {
        if (this.active) return "Operation already in progress.";

        this.active = true;
        this.currentOp = opId;
        this.stage = 1;
        this.traceLevel = 0;

        if (opId === 'deep_web') {
            this.timer = 300; // 5 minutes
            this.objective = "Scan network for entry point.";
        }

        this.interval = setInterval(() => this.tick(), 1000);
        this.renderHUD();
        return `OPERATION ${opId.toUpperCase()} INITIATED. GOOD LUCK.`;
    },

    stop: function (success) {
        this.active = false;
        clearInterval(this.interval);
        const hud = document.getElementById('mission-hud');
        if (hud) hud.remove();

        if (success) {
            return "OPERATION COMPLETE. SYSTEM WIPE INITIATED...";
        } else {
            return "OPERATION FAILED. CONNECTION TERMINATED.";
        }
    },

    tick: function () {
        this.timer--;
        if (this.timer <= 0) {
            this.stop(false);
            alert("MISSION FAILED: TIME EXPIRED");
            location.reload();
        }
        this.renderHUD();
    },

    renderHUD: function () {
        let hud = document.getElementById('mission-hud');
        if (!hud) {
            hud = document.createElement('div');
            hud.id = 'mission-hud';
            hud.style.position = 'fixed';
            hud.style.top = '20px';
            hud.style.right = '20px';
            hud.style.background = 'rgba(0, 20, 0, 0.9)';
            hud.style.border = '1px solid #00FF41';
            hud.style.padding = '15px';
            hud.style.color = '#00FF41';
            hud.style.fontFamily = 'monospace';
            hud.style.zIndex = '10000';
            hud.style.width = '250px';
            document.body.appendChild(hud);
        }

        const min = Math.floor(this.timer / 60);
        const sec = this.timer % 60;
        const timeStr = `${min}:${sec < 10 ? '0' : ''}${sec}`;

        hud.innerHTML = `
            <div style="border-bottom: 1px solid #00FF41; margin-bottom: 10px; font-weight:bold;">OPERATION: ${this.currentOp.toUpperCase()}</div>
            <div style="font-size: 24px; margin-bottom: 10px;">${timeStr}</div>
            <div style="font-size: 12px; margin-bottom: 5px;">OBJ: ${this.objective}</div>
            <div style="font-size: 12px;">TRACE: ${this.traceLevel}%</div>
            <div style="width: 100%; background: #003300; height: 5px; margin-top: 5px;">
                <div style="width: ${this.traceLevel}%; background: red; height: 100%;"></div>
            </div>
        `;
    }
};

const FileSystem = {
    structure: {
        "root": {
            type: "dir",
            children: {
                "about.txt": { type: "file", content: "Identity: Purushottam Kumar\nRole: Data Scientist\nLoc: India" },
                "skills.md": { type: "file", content: "# Capabilities\n- Python\n- SQL\n- C++\n- Generative AI\n- Deep Learning" },
                "projects": {
                    type: "dir",
                    children: {
                        "ibm_analysis.py": { type: "file", content: "import pandas as pd\n# Advanced Data Analysis Logic" },
                        "drug_discovery.doc": { type: "file", content: "Computational Drug Discovery Pipeline..." },
                        "usb_toolkit.cpp": { type: "file", content: "#include <iostream>\n// Portable Tools" }
                    }
                },
                "system": {
                    type: "dir",
                    children: {
                        "config.sys": { type: "file", content: "THEME=GREEN\nAUDIO=ON" },
                        "kernel.log": { type: "file", content: "System booted successfully.\nAll modules loaded." },
                        "network.log": { type: "file", content: "DHCP: 192.168.0.105\nGATEWAY: 192.168.0.1\n\nKNOWN TARGETS:\n192.168.0.99  [ALPHA]\n192.168.0.55  [GAMMA]\n192.168.0.101 [DELTA]\n192.168.0.44  [EPSILON]\n192.168.0.77  [ZETA]\n192.168.0.200 [OMEGA]\n192.168.0.88  [ETA]\n192.168.0.33  [THETA]\n192.168.0.11  [IOTA]\n192.168.0.66  [KAPPA]" }
                    }
                },
                "secret.txt": { type: "file", content: "The cake is a lie." },
                "mission_brief.txt": { type: "file", content: "DECA-HEIST CAMPAIGN CONTRACTS:\n\n[1] ALPHA (Legacy)\nTarget: 192.168.0.99\nScore: >0\n\n[2] GAMMA\nTarget: gamma.net\nScore: >10\n\n[3] DELTA\nTarget: delta.sys\nScore: >20\n\n[4] EPSILON\nTarget: epsilon.io\nScore: >30\n\n[5] ZETA\nTarget: zeta.org\nScore: >40\n\n[6] OMEGA (Heist)\nTarget: target.corp\nScore: >50\n\n[7] ETA\nTarget: eta.edu\nScore: >60\n\n[8] THETA\nTarget: theta.gov\nScore: >70\n\n[9] IOTA\nTarget: iota.mil\nScore: >80\n\n[10] KAPPA\nTarget: kappa.xyz\nScore: >90" }
            }
        }
    },
    currentPath: ["root"],

    getDir(path = this.currentPath) {
        let current = this.structure.root;
        // Skip root in path traversal as we start there
        for (let i = 1; i < path.length; i++) {
            if (current.children && current.children[path[i]]) {
                current = current.children[path[i]];
            } else {
                return null;
            }
        }
        return current;
    },

    ls() {
        const dir = this.getDir();
        if (!dir || dir.type !== 'dir') return "Error: Invalid directory";
        return Object.keys(dir.children).map(name => {
            const isDir = dir.children[name].type === 'dir';
            return isDir ? `<span style="color: #ffff00">${name}/</span>` : name;
        }).join('  ');
    },

    cd(name) {
        if (name === "..") {
            if (this.currentPath.length > 1) this.currentPath.pop();
            return "";
        }
        if (name === "/") {
            this.currentPath = ["root"];
            return "";
        }

        const dir = this.getDir();
        if (dir.children[name] && dir.children[name].type === 'dir') {
            this.currentPath.push(name);
            return "";
        }
        return `cd: ${name}: No such directory`;
    },

    cat(name) {
        const dir = this.getDir();
        if (dir.children[name] && dir.children[name].type === 'file') {
            return dir.children[name].content;
        }
        return `cat: ${name}: No such file`;
    },

    mkdir(name) {
        const dir = this.getDir();
        if (dir.children[name]) return `mkdir: ${name}: File exists`;
        dir.children[name] = { type: "dir", children: {} };
        refreshExplorer(); // Update UI if open
        return "";
    },

    touch(name) {
        const dir = this.getDir();
        if (dir.children[name]) return ""; // Update timestamp in real OS
        dir.children[name] = { type: "file", content: "" };
        refreshExplorer();
        return "";
    },

    rm(name) {
        const dir = this.getDir();
        if (!dir.children[name]) return `rm: ${name}: No such file`;
        delete dir.children[name];
        refreshExplorer();
        return "";
    }
};

function handleCmd(cmd) {
    const args = cmd.trim().split(' ');
    const c = args[0].toLowerCase();
    const arg = args[1];

    if (c === 'help') printTerm("cmds: ls, cd, cat, mkdir, touch, rm, clear, reboot, snake, matrix, del system32");
    else if (c === 'clear') termOutput.innerHTML = '';
    else if (c === 'reboot') location.reload();
    else if (c === 'snake') openWindow('win-snake');
    else if (c === 'ls') printTerm(FileSystem.ls());
    else if (c === 'cd') {
        const err = FileSystem.cd(arg);
        if (err) printTerm(err);
        else printTerm(`/${FileSystem.currentPath.slice(1).join('/')}`);
    }
    else if (c === 'cat') printTerm(FileSystem.cat(arg));
    else if (c === 'mkdir') printTerm(FileSystem.mkdir(arg));
    else if (c === 'touch') printTerm(FileSystem.touch(arg));
    else if (c === 'rm') printTerm(FileSystem.rm(arg));
    else if (c === 'delete' && args[1] === 'system32' || c === 'del' && args[1] === 'system32') triggerBSOD();
    else if (c === 'rm') printTerm(FileSystem.rm(arg));
    else if (c === 'delete' && args[1] === 'system32' || c === 'del' && args[1] === 'system32') triggerBSOD();
    else if (c === 'ping') {
        const mission = Object.values(MISSIONS).find(m => m.domain === arg);
        if (mission) {
            printTerm(`Pinging ${arg} [${mission.ip}] with 32 bytes of data:`);
            setTimeout(() => printTerm(`Reply from ${mission.ip}: bytes=32 time=12ms TTL=54`), 500);
            setTimeout(() => printTerm(`Reply from ${mission.ip}: bytes=32 time=15ms TTL=54`), 1000);
            setTimeout(() => printTerm(`Reply from ${mission.ip}: bytes=32 time=11ms TTL=54`), 1500);
        } else {
            printTerm(`Ping request could not find host ${arg}. Please check the name and try again.`);
        }
    }
    else if (c === 'connect') {
        const mission = Object.values(MISSIONS).find(m => m.ip === arg);
        if (mission) {
            printTerm(`Initiating secure connection to ${mission.domain.toUpperCase()}...`);
            setTimeout(() => {
                document.getElementById('browser-url').value = mission.domain;
                openWindow('win-browser');
                browserGo();
            }, 1000);
        } else {
            printTerm(`Connection to ${arg} failed. Target unreachable.`);
        }
    }
    else if (c === 'decrypt') {
        if (!arg) {
            printTerm("Usage: decrypt <file> <password>");
            return;
        }
        const file = arg;
        const pass = args[2];

        const dir = FileSystem.getDir();
        if (dir.children[file]) {
            if (file === 'encrypted_payload.dat') {
                if (pass && pass.toLowerCase() === 'india') {
                    printTerm("Verifying key...");
                    setTimeout(() => {
                        printTerm("KEY ACCEPTED.");
                        printTerm("Decryption Successful.");
                        printTerm("Output: payload_decrypted.txt");
                        FileSystem.structure.root.children['payload_decrypted.txt'] = {
                            type: "file",
                            content: "PROJECT OMEGA-9\n\nUPLOAD CODE: OMEGA-9\n\nWARNING: UPLOADING THIS CODE WILL TRIGGER A SYSTEM WIPE TO COVER TRACKS."
                        };
                        refreshExplorer();
                        // Auto-open for convenience
                        setTimeout(() => openFile('payload_decrypted.txt'), 1000);
                    }, 800);
                } else {
                    printTerm("Error: Incorrect Password.");
                    printTerm("Hint: The Creator's Location (Check Identity)");
                }
            } else {
                printTerm("Error: File is not encrypted.");
            }
        } else {
            printTerm(`decrypt: ${file}: No such file`);
        }
    }
    else if (c === 'upload') {
        if (arg === 'OMEGA-9') {
            printTerm("Uploading Project OMEGA-9...");
            let p = 0;
            const interval = setInterval(() => {
                p += 10;
                printTerm(`Progress: ${p}%`);
                if (p >= 100) {
                    clearInterval(interval);
                    printTerm("UPLOAD COMPLETE.");
                    printTerm("INITIATING TRACE CLEANUP...");
                    setTimeout(triggerBSOD, 2000);
                }
            }, 200);
        }
        else if (arg === 'GENESIS' && MissionEngine.active && MissionEngine.currentOp === 'deep_web') {
            printTerm("Uploading PROJECT GENESIS...");
            let p = 0;
            const interval = setInterval(() => {
                p += 5; // Slower upload
                printTerm(`Progress: ${p}%`);
                MissionEngine.traceLevel += 2; // Trace increases during upload
                MissionEngine.renderHUD();

                if (p >= 100) {
                    clearInterval(interval);
                    printTerm(MissionEngine.stop(true));
                    setTimeout(triggerBSOD, 3000);
                }
            }, 500);
        }
        else {
            printTerm("Error: Invalid Upload Code.");
        }
    }
    else if (c === 'start_op') {
        if (arg === 'deep_web') {
            printTerm(MissionEngine.start('deep_web'));
        } else {
            printTerm("Usage: start_op <operation_id>");
            printTerm("Available Operations: deep_web");
        }
    }
    else if (c === 'scan_network') {
        printTerm("Scanning local subnet...");
        setTimeout(() => {
            printTerm("Found: 192.168.0.1 (Gateway)");
            printTerm("Found: 192.168.0.105 (Self)");
            if (MissionEngine.active && MissionEngine.currentOp === 'deep_web' && MissionEngine.stage === 1) {
                printTerm("Found: 10.0.0.66 (HIDDEN) - PORT 80 OPEN");
                printTerm("Resolving hostname... portal.dark.net");
                MissionEngine.stage = 2;
                MissionEngine.objective = "Hack Employee Portal (portal.dark.net)";
                MissionEngine.renderHUD();
            }
        }, 2000);
    }
    else printTerm(`Unknown command: ${c}`);
}

function triggerBSOD() {
    bsod.style.display = 'block';
    setTimeout(() => location.reload(), 5000);
}

// SNAKE GAME
let snakeGame;
const canvas = document.getElementById('snake-canvas');
const ctx = canvas.getContext('2d');
const gridSize = 20;
let snake = [{ x: 10, y: 10 }];
let food = { x: 5, y: 5 }; // Start within bounds
let dx = 0, dy = 0;
let score = 0;

function startSnake() {
    if (snakeGame) clearTimeout(snakeGame);
    document.getElementById('snake-overlay').style.display = 'none';
    snake = [{ x: 5, y: 5 }]; // Start safely
    score = 0;
    dx = 1; dy = 0; // Move right
    document.getElementById('snake-score').innerText = score;
    spawnFood(); // Randomize food start
    gameLoop();
}

function spawnFood() {
    food = {
        x: Math.floor(Math.random() * (canvas.width / gridSize)),
        y: Math.floor(Math.random() * (canvas.height / gridSize))
    };
    // Ensure food doesn't spawn on snake
    if (snake.some(p => p.x === food.x && p.y === food.y)) {
        spawnFood();
    }
}

function gameLoop() {
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    snake.unshift(head);

    // Eat food
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        document.getElementById('snake-score').innerText = score;
        spawnFood(); // New food
    } else {
        snake.pop();
    }

    // Collision
    if (head.x < 0 || head.x >= canvas.width / gridSize || head.y < 0 || head.y >= canvas.height / gridSize || snake.slice(1).some(p => p.x === head.x && p.y === head.y)) {
        gameOver();
        return;
    }

    // Draw
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--theme-color');
    snake.forEach(part => ctx.fillRect(part.x * gridSize, part.y * gridSize, gridSize - 2, gridSize - 2));

    ctx.fillStyle = 'red';
    ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize - 2, gridSize - 2);

    // Dynamic Speed: Start at 200ms, decrease by 1ms per point (10ms per food). Min speed 50ms.
    const speed = Math.max(50, 200 - score);
    snakeGame = setTimeout(gameLoop, speed);
}

function gameOver() {
    clearTimeout(snakeGame);
    document.getElementById('snake-overlay').style.display = 'flex';
    document.getElementById('final-score').innerText = score;

    // High Score
    const currentHigh = localStorage.getItem('snakeHighScore') || 0;
    if (score > currentHigh) {
        localStorage.setItem('snakeHighScore', score);
        document.getElementById('snake-high').innerText = score;
    }
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' && dy === 0) { dx = 0; dy = -1; e.preventDefault(); }
    if (e.key === 'ArrowDown' && dy === 0) { dx = 0; dy = 1; e.preventDefault(); }
    if (e.key === 'ArrowLeft' && dx === 0) { dx = -1; dy = 0; e.preventDefault(); }
    if (e.key === 'ArrowRight' && dx === 0) { dx = 1; dy = 0; e.preventDefault(); }
});

// SCREENSAVER
let idleTime = 0;
function initScreensaver() {
    // Increment idle time every second
    setInterval(() => {
        idleTime++;
        if (idleTime >= 60) { // 60 seconds
            screensaver.style.display = 'block';
            // Reuse matrix canvas logic for screensaver if desired, 
            // or just let the transparent background show the body matrix
        }
    }, 1000);

    // Reset idle time on activity
    ['mousemove', 'keydown', 'click', 'scroll'].forEach(evt => {
        document.addEventListener(evt, () => {
            idleTime = 0;
            screensaver.style.display = 'none';
        });
    });
}

// SETTINGS (THEME)
function setTheme(theme) {
    document.body.className = `theme-${theme}`;
}

// CHAT
function sendChat(e) {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const history = document.getElementById('chat-history');
    const msg = input.value;
    if (!msg) return;

    const div = document.createElement('div');
    div.className = 'chat-msg sent';
    div.innerText = msg;
    history.appendChild(div);
    input.value = '';

    setTimeout(() => {
        const reply = document.createElement('div');
        reply.className = 'chat-msg received';
        reply.innerText = "Message encrypted and sent to server.";
        history.appendChild(reply);
        history.scrollTop = history.scrollHeight;
    }, 1000);
}

/* --- UTILS --- */
function startClock() {
    setInterval(() => {
        const now = new Date();
        document.getElementById('clock').innerText = now.toLocaleTimeString();
    }, 1000);
}

function initMatrix() {
    const canvas = document.getElementById('matrixCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const chars = '0123456789ABCDEF';
    const drops = Array(Math.floor(canvas.width / 14)).fill(1);

    setInterval(() => {
        ctx.fillStyle = 'rgba(0,0,0,0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--theme-color');

        drops.forEach((y, i) => {
            const text = chars[Math.floor(Math.random() * chars.length)];
            ctx.fillText(text, i * 14, y * 14);
            if (y * 14 > canvas.height && Math.random() > 0.975) drops[i] = 0;
            drops[i]++;
        });
    }, 33);
}

function initVisualizer() {
    const container = document.getElementById('visualizer');
    for (let i = 0; i < 10; i++) {
        const bar = document.createElement('div');
        bar.className = 'visualizer-bar';
        bar.style.height = '10px';
        container.appendChild(bar);
    }

    setInterval(() => {
        document.querySelectorAll('.visualizer-bar').forEach(bar => {
            bar.style.height = Math.random() * 20 + 5 + 'px';
        });
    }, 100);
}

/* --- SOUND SYSTEM --- */
const SoundManager = {
    ctx: null,
    muted: false,

    init: function () {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
    },

    toggleMute: function () {
        this.muted = !this.muted;
        const btn = document.getElementById('mute-btn');
        if (this.muted) {
            btn.innerText = "UNMUTE";
            btn.style.opacity = "0.5";
        } else {
            btn.innerText = "MUTE";
            btn.style.opacity = "1";
            this.playClick(); // Feedback
        }
    },

    playTone: function (freq, type, duration, vol = 0.1) {
        if (this.muted || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },

    playBoot: function () {
        if (this.muted || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 1.5);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 2);
    },

    playClick: function () {
        this.playTone(1200, 'square', 0.05, 0.05);
    },

    playHover: function () {
        this.playTone(400, 'sine', 0.03, 0.02);
    },

    playType: function () {
        if (this.muted || !this.ctx) return;
        const bufferSize = this.ctx.sampleRate * 0.01; // 10ms
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.value = 0.05;
        noise.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start();
    }
};

function initOS() {
    setTimeout(() => openWindow('win-about'), 500);
    SoundManager.playBoot(); // Play boot sound on OS init
}

// Global Click Sound
document.addEventListener('mousedown', () => {
    if (!SoundManager.ctx) SoundManager.init(); // Init context on first interaction
    SoundManager.playClick();
});

// Global Hover Sound
document.addEventListener('mouseover', (e) => {
    if (e.target.matches('button, a, .desktop-icon, .window-header, .taskbar-item, input, .start-item')) {
        SoundManager.playHover();
    }
});

// Global Typing Sound
document.addEventListener('keydown', () => {
    if (!SoundManager.ctx) SoundManager.init();
    SoundManager.playType();
});

/* --- FILE EXPLORER --- */
function refreshExplorer() {
    const grid = document.getElementById('explorer-grid');
    const pathSpan = document.getElementById('explorer-path');
    if (!grid) return;

    grid.innerHTML = '';
    pathSpan.innerText = '/' + FileSystem.currentPath.slice(1).join('/');

    const dir = FileSystem.getDir();
    if (!dir) return;

    Object.keys(dir.children).forEach(name => {
        const item = dir.children[name];
        const div = document.createElement('div');
        div.className = 'file-item';
        div.onclick = () => openFile(name);

        const icon = document.createElement('i');
        icon.setAttribute('data-lucide', item.type === 'dir' ? 'folder' : 'file-text');
        div.appendChild(icon);

        const span = document.createElement('span');
        span.innerText = name;
        span.className = "text-xs mt-1 text-center break-all";
        div.appendChild(span);

        grid.appendChild(div);
    });
    lucide.createIcons();
}

function explorerUp() {
    FileSystem.cd('..');
    refreshExplorer();
}

function openFile(name) {
    const dir = FileSystem.getDir();
    const item = dir.children[name];
    if (item.type === 'dir') {
        FileSystem.cd(name);
        refreshExplorer();
    } else {
        // Open file content in Notepad
        document.getElementById('notepad-area').value = item.content;
        openWindow('win-notepad');
    }
}

/* --- CYBERDECK BROWSER --- */
function browserGo() {
    let url = document.getElementById('browser-url').value;
    const frame = document.getElementById('browser-frame');
    const error = document.getElementById('browser-error');

    // 1. Protocol Handler
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }

    // 2. Smart URL Rewrites for Iframe Compatibility

    // Google: Use the /webhp?igu=1 hack which often allows embedding
    if (url.includes('google.com') && !url.includes('igu=1')) {
        if (url.includes('?')) url += '&igu=1';
        else url += '/webhp?igu=1';
    }

    // YouTube: Convert standard watch URLs to embed URLs
    if (url.includes('youtube.com/watch')) {
        const videoId = new URL(url).searchParams.get('v');
        if (videoId) {
            url = `https://www.youtube.com/embed/${videoId}`;
        }
    } else if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1];
        if (videoId) {
            url = `https://www.youtube.com/embed/${videoId}`;
        }
    }

    // Wikipedia: Mobile version often looks better in small windows
    if (url.includes('wikipedia.org') && !url.includes('.m.wikipedia.org')) {
        url = url.replace('wikipedia.org', '.m.wikipedia.org');
    }

    // Update input to show what we're actually loading (optional, maybe keep user input)
    // document.getElementById('browser-url').value = url; 

    // Simulate loading
    frame.style.opacity = '0.5';
    error.classList.add('hidden'); // Reset error state

    setTimeout(() => {
        frame.style.opacity = '1';

        // DEEP WEB PORTAL (Advanced Op)
        if (url.includes('portal.dark.net')) {
            const html = `
                <body style="background:#1a1a1a; color:#ccc; font-family:sans-serif; padding:20px;">
                    <div style="background:#333; padding:10px; border-bottom:2px solid #555;">
                        <h2 style="margin:0; color:#fff;">DarkCorp Employee Portal</h2>
                    </div>
                    <div style="margin-top:20px;">
                        <div style="background:#222; padding:10px; margin-bottom:10px;">
                            <h3 style="margin:0; color:#aaa;">Login</h3>
                            <input type="text" id="u" placeholder="Username" style="width:100%; margin:5px 0; padding:5px;">
                            <input type="password" id="p" placeholder="Password" style="width:100%; margin:5px 0; padding:5px;">
                            <button onclick="login()" style="width:100%; padding:5px; background:#444; color:#fff; border:none; cursor:pointer;">Sign In</button>
                            <p id="msg" style="color:red; font-size:12px;"></p>
                        </div>
                        <div style="background:#222; padding:10px;">
                            <h3 style="margin:0; color:#aaa;">Recent Announcements</h3>
                            <p style="font-size:12px;"><strong>From: IT Support</strong><br>Reminder: Password rotation is mandatory. Do not use pet names!</p>
                            <hr style="border-color:#444;">
                            <p style="font-size:12px;"><strong>From: jdoe</strong><br>Ugh, I hate these new rules. I just set mine to 'Fluffy123' so I don't forget it again.</p>
                        </div>
                    </div>
                    <script>
                        function login() {
                            const u = document.getElementById('u').value;
                            const p = document.getElementById('p').value;
                            const msg = document.getElementById('msg');
                            
                            // SQL Injection Check
                            if (u.includes("' OR '1'='1") || p.includes("' OR '1'='1")) {
                                document.body.innerHTML = \`
                                    <body style="background:black; color:#00FF41; font-family:monospace; padding:20px;">
                                        <h1>SQL INJECTION SUCCESSFUL</h1>
                                        <p>Dumping User Database...</p>
                                        <pre>
ID | USER | ROLE
1  | admin| SYSADMIN
2  | jdoe | USER
3  | root | SUPERUSER
                                        </pre>
                                        <p><strong>VAULT IP FOUND: 10.0.0.99</strong></p>
                                        <p>Project Genesis is stored in the Vault.</p>
                                    </body>
                                \`;
                                window.parent.postMessage('deep_web_sqli', '*');
                                return;
                            }
                            
                            // Standard Login
                            if (u === 'jdoe' && p === 'Fluffy123') {
                                msg.style.color = 'green';
                                msg.innerText = "Login Successful. Welcome, John.";
                                setTimeout(() => {
                                    document.body.innerHTML = '<h1 style="color:white;">Welcome to Intranet</h1><p style="color:#ccc;">Search the database for files.</p><input placeholder="Search..." style="padding:5px;"><button>Search</button>';
                                }, 1000);
                            } else {
                                msg.innerText = "Invalid Credentials.";
                            }
                        }
                    </script>
                </body>
             `;
            frame.srcdoc = html;
            return;
        }

        // MISSION LOGIC: Dynamic Registry Lookup
        const mission = Object.values(MISSIONS).find(m => url.includes(m.domain) || url.includes(m.ip));

        if (mission) {
            const highScore = localStorage.getItem('snakeHighScore') || 0;
            const requiredScore = mission.score;
            const html = `
                <body style="background:black; color:#00FF41; font-family:monospace; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; margin:0;">
                    <h1 style="border-bottom: 2px solid #00FF41; padding-bottom: 10px;">${mission.title}</h1>
                    <p>BIOMETRIC VERIFICATION REQUIRED</p>
                    <p>REQUIRED REFLEX SCORE: ${requiredScore}</p>
                    <p>Please enter your reflex synchronization score:</p>
                    <input type="number" id="pass" style="background:black; border:1px solid #00FF41; color:#00FF41; padding:5px; outline:none;">
                    <button onclick="check()" style="background:#00FF41; color:black; border:none; padding:5px 10px; margin-top:10px; cursor:pointer; font-weight:bold;">AUTHENTICATE</button>
                    <p id="msg" style="margin-top:20px;"></p>
                    <script>
                        function check() {
                            try {
                                console.log("Authenticating ${mission.id}...");
                                const val = document.getElementById('pass').value;
                                const required = parseInt('${highScore}') || 0;
                                const requiredScore = ${requiredScore};
                                const msg = document.getElementById('msg');
                                
                                console.log("Input:", val, "Required:", required, "Min:", requiredScore);

                                if (val == required && required >= requiredScore) {
                                    msg.style.color = '#00FF41';
                                    msg.innerText = "ACCESS GRANTED. DOWNLOADING PAYLOAD...";
                                    setTimeout(() => {
                                        console.log("Posting success message...");
                                        window.parent.postMessage('mission_success_${mission.id}', '*');
                                        msg.innerText = "DOWNLOAD COMPLETE. CHECK YOUR FILES.";
                                    }, 1500);
                                } else if (required < requiredScore) {
                                    msg.style.color = 'red';
                                    msg.innerText = "ACCESS DENIED. REFLEX SCORE TOO LOW (" + required + "/" + requiredScore + ").";
                                } else {
                                    msg.style.color = 'red';
                                    msg.innerText = "ACCESS DENIED. BIOMETRIC MISMATCH.";
                                }
                            } catch (e) {
                                console.error("Auth Error:", e);
                                alert("System Error: " + e.message);
                            }
                        }
                    </script>
                </body>
            `;
            frame.srcdoc = html;
            return;
        }

        try {
            frame.removeAttribute('srcdoc'); // Clear srcdoc if navigating away
            frame.src = url;
        } catch (e) {
            console.error("Load error:", e);
            error.classList.remove('hidden');
        }
    }, 500);
}

function browserBack() {
    try { document.getElementById('browser-frame').contentWindow.history.back(); } catch (e) { }
}

function browserForward() {
    try { document.getElementById('browser-frame').contentWindow.history.forward(); } catch (e) { }
}

function browserReload() {
    const frame = document.getElementById('browser-frame');
    frame.src = frame.src;
}

document.getElementById('browser-url').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') browserGo();
});

/* --- WINDOW RESIZING --- */
document.querySelectorAll('.window').forEach(win => {
    const handle = win.querySelector('.resize-handle');
    if (!handle) return;

    let isResizing = false;
    let originalWidth, originalHeight, originalX, originalY;

    handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent drag
        isResizing = true;
        originalWidth = parseFloat(getComputedStyle(win, null).getPropertyValue('width').replace('px', ''));
        originalHeight = parseFloat(getComputedStyle(win, null).getPropertyValue('height').replace('px', ''));
        originalX = e.clientX;
        originalY = e.clientY;
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const width = originalWidth + (e.clientX - originalX);
        const height = originalHeight + (e.clientY - originalY);

        if (width > 200) win.style.width = width + 'px';
        if (height > 150) win.style.height = height + 'px';
    });

    document.addEventListener('mouseup', () => {
        isResizing = false;
    });
});

/* --- UTILS --- */
function toggleMute() {
    if (!SoundManager.ctx) SoundManager.init();
    SoundManager.toggleMute();
}

// Listen for mission success message from iframe
// Listen for mission success message from iframe
window.addEventListener('message', (e) => {
    console.log("Received message:", e.data);

    if (typeof e.data === 'string' && e.data.startsWith('mission_success_')) {
        const missionId = e.data.replace('mission_success_', '');
        const mission = MISSIONS[missionId];

        if (mission) {
            // Unlock payload
            const dir = FileSystem.structure.root.children;
            if (!dir[mission.reward]) {
                dir[mission.reward] = {
                    type: "file",
                    content: `MISSION COMPLETE: ${mission.title}\n\nREWARD DATA: [${mission.reward.toUpperCase()}]\n\nACCESS GRANTED.`
                };

                // Special content for Omega (Encrypted)
                if (mission.id === 'omega') {
                    dir[mission.reward].content = "ENCRYPTED DATA\n\n[LOCKED]\n\nHint: The Creator's Location (Check Identity)";
                }

                refreshExplorer();
            }

            const term = document.getElementById('term-output');
            if (term) {
                term.innerHTML += `<div>> [SYSTEM] ${mission.reward.toUpperCase()} DOWNLOADED.</div>`;
                term.scrollTop = term.scrollHeight;
            }

            // Visual Feedback (Always Run)
            // Fallback to blue/red or just flash green
            let themeClass = 'theme-green';
            if (mission.theme === 'red') themeClass = 'theme-red';
            if (mission.theme === 'blue') themeClass = 'theme-blue';

            document.body.className = themeClass;
            setTimeout(() => document.body.className = 'theme-green', 3000);

            // Always open file
            setTimeout(() => {
                openWindow('win-explorer');
                openFile(mission.reward);
            }, 1000);
        }
    }
});
