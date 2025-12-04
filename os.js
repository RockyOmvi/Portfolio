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
    AchievementSystem.check('boot');
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
    MediaPlayer.init();
    AchievementSystem.init();
};

function initCursor() {
    const cursor = document.getElementById('cursor');
    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    });

    // Hover effects
    document.addEventListener('mouseover', (e) => {
        if (e.target.closest('#win-about')) AchievementSystem.check('check_id');
        if (e.target.closest('#win-skills')) AchievementSystem.check('check_skills');
        if (e.target.closest('#win-projects')) AchievementSystem.check('check_projects');

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
    AchievementSystem.check('window_opened', id);

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

let commandHistory = [];
let historyIndex = -1;

termInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const cmd = termInput.value;
        if (cmd.trim()) {
            commandHistory.push(cmd);
            historyIndex = commandHistory.length;
        }
        printTerm(`> ${cmd}`);
        handleCmd(cmd);
        termInput.value = '';
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (historyIndex > 0) {
            historyIndex--;
            termInput.value = commandHistory[historyIndex];
        }
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex < commandHistory.length - 1) {
            historyIndex++;
            termInput.value = commandHistory[historyIndex];
        } else {
            historyIndex = commandHistory.length;
            termInput.value = '';
        }
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
    "alpha": { id: "alpha", ip: "192.168.0.99", domain: "secure.alpha", score: 0, reward: "payload.txt", theme: "blue", title: "SECURE SERVER (ALPHA)", type: "standard", uploadCode: "ALPHA_KEY" },
    "gamma": { id: "gamma", ip: "192.168.0.55", domain: "gamma.net", score: 10, reward: "gamma_intel.txt", theme: "purple", title: "GAMMA NETWORKS", type: "standard", uploadCode: "GAMMA_KEY" },
    "delta": { id: "delta", ip: "192.168.0.101", domain: "delta.sys", score: 20, reward: "delta_plans.pdf", theme: "yellow", title: "DELTA SYSTEMS", type: "standard", uploadCode: "DELTA_KEY" },
    "epsilon": { id: "epsilon", ip: "192.168.0.44", domain: "epsilon.io", score: 30, reward: "epsilon_key.key", theme: "orange", title: "EPSILON IO", type: "standard", uploadCode: "EPSILON_KEY" },
    "zeta": { id: "zeta", ip: "192.168.0.77", domain: "zeta.org", score: 40, reward: "zeta_coords.csv", theme: "cyan", title: "ZETA ORG", type: "standard", uploadCode: "ZETA_KEY" },
    "omega": { id: "omega", ip: "192.168.0.200", domain: "target.corp", score: 50, reward: "encrypted_payload.dat", theme: "red", title: "SECURE SERVER (OMEGA)", type: "standard", uploadCode: "OMEGA_KEY" },
    "eta": { id: "eta", ip: "192.168.0.88", domain: "eta.edu", score: 60, reward: "eta_virus.exe", theme: "pink", title: "ETA RESEARCH", type: "standard", uploadCode: "ETA_KEY" },
    "theta": { id: "theta", ip: "192.168.0.33", domain: "theta.gov", score: 70, reward: "theta_logs.log", theme: "brown", title: "THETA GOV", type: "standard", uploadCode: "THETA_KEY" },
    "iota": { id: "iota", ip: "192.168.0.11", domain: "iota.mil", score: 80, reward: "iota_blueprint.cad", theme: "gray", title: "IOTA MILITARY", type: "standard", uploadCode: "IOTA_KEY" },
    "kappa": { id: "kappa", ip: "192.168.0.66", domain: "kappa.xyz", score: 90, reward: "kappa_source.js", theme: "white", title: "KAPPA LABS", type: "standard", uploadCode: "KAPPA_KEY" },
    "deep_web": { id: "deep_web", ip: "10.0.0.66", domain: "portal.dark.net", score: 0, reward: "PROJECT_GENESIS.zip", theme: "red", title: "OPERATION DEEP WEB", type: "timed", duration: 300, uploadCode: "GENESIS" }
};

// PROCEDURAL MISSION GENERATOR
const MissionGenerator = {
    adjectives: ['Silent', 'Dark', 'Crimson', 'Neon', 'Cyber', 'Rogue', 'Phantom', 'Steel', 'Iron', 'Glass', 'Void', 'Solar', 'Lunar', 'Nether', 'Hyper'],
    nouns: ['Storm', 'Viper', 'Echo', 'Protocol', 'Citadel', 'Fortress', 'Shadow', 'Dragon', 'Wolf', 'Hawk', 'Core', 'Nexus', 'Gate', 'Grid', 'Pulse'],
    domains: ['.com', '.net', '.org', '.io', '.biz', '.gov', '.mil', '.edu', '.corp', '.xyz'],

    trivia: [
        { q: "What is the default port for SSH?", a: "22", o: ["21", "22", "80", "443"] },
        { q: "Which command lists files in Linux?", a: "ls", o: ["dir", "list", "ls", "show"] },
        { q: "What does HTML stand for?", a: "HyperText Markup Language", o: ["HighText Machine Language", "HyperText Markup Language", "HyperTool Multi Language", "None"] },
        { q: "Who created Linux?", a: "Linus Torvalds", o: ["Steve Jobs", "Bill Gates", "Linus Torvalds", "Ada Lovelace"] },
        { q: "What is a DDoS attack?", a: "Distributed Denial of Service", o: ["Direct Denial of Service", "Distributed Denial of Service", "Data Destruction on Server", "Digital Data on Site"] }
    ],

    init: function () {
        console.log("Generating 1000 missions...");
        for (let i = 0; i < 1000; i++) {
            this.generateOne(i);
        }
    },

    generateOne: function (index) {
        const adj = this.adjectives[Math.floor(Math.random() * this.adjectives.length)];
        const noun = this.nouns[Math.floor(Math.random() * this.nouns.length)];
        const id = `op_${index + 1}`;
        const title = `OPERATION ${adj.toUpperCase()} ${noun.toUpperCase()}`;

        // Unique IP
        let ip;
        do {
            ip = `192.168.${Math.floor(Math.random() * 240) + 10}.${Math.floor(Math.random() * 250)}`;
        } while (Object.values(MISSIONS).some(m => m.ip === ip));

        // Unique Domain
        const domain = `${adj.toLowerCase()}${noun.toLowerCase()}${Math.floor(Math.random() * 999)}${this.domains[Math.floor(Math.random() * this.domains.length)]}`;

        // Mission Type Distribution
        const rand = Math.random();
        let type = 'standard'; // 40%
        if (rand > 0.4) type = 'timed'; // 10% (SQLi)
        if (rand > 0.5) type = 'bruteforce'; // 10%
        if (rand > 0.6) type = 'decipher'; // 10%
        if (rand > 0.7) type = 'frequency'; // 10%
        if (rand > 0.8) type = 'trivia'; // 10%
        if (rand > 0.9) type = 'grid'; // 10%

        const mission = {
            id: id,
            ip: ip,
            domain: domain,
            title: title,
            type: type,
            reward: `loot_${id}.zip`,
            theme: ['red', 'blue', 'green', 'purple', 'yellow', 'orange', 'cyan', 'pink', 'white'][Math.floor(Math.random() * 9)],
            uploadCode: `UP_${Math.floor(Math.random() * 0xFFFFFF).toString(16).toUpperCase().padStart(6, '0')}`
        };

        // Type-Specific Data
        if (type === 'standard') {
            mission.score = Math.floor(Math.random() * 90) + 5;
            mission.reward = `data_${id}.txt`;
        }
        else if (type === 'timed') {
            mission.duration = Math.floor(Math.random() * 480) + 120;
        }
        else if (type === 'bruteforce') {
            mission.pin = Math.floor(1000 + Math.random() * 9000).toString();
        }
        else if (type === 'decipher') {
            const phrases = ["ACCESS GRANTED", "SYSTEM FAILURE", "HELLO WORLD", "PROJECT OMEGA", "SECURITY BREACH"];
            mission.plaintext = phrases[Math.floor(Math.random() * phrases.length)];
            // Simple ROT13 implementation
            mission.ciphertext = mission.plaintext.replace(/[A-Z]/g, c => String.fromCharCode((c.charCodeAt(0) - 65 + 13) % 26 + 65));
        }
        else if (type === 'frequency') {
            mission.targetFreq = Math.floor(Math.random() * 90) + 10; // 10-100 Hz
        }
        else if (type === 'trivia') {
            const t = this.trivia[Math.floor(Math.random() * this.trivia.length)];
            mission.question = t.q;
            mission.answer = t.a;
            mission.options = t.o;
        }
        else if (type === 'grid') {
            mission.pattern = [];
            for (let k = 0; k < 5; k++) mission.pattern.push(Math.floor(Math.random() * 16)); // 5-step pattern
        }

        MISSIONS[id] = mission;
    }
};

// Initialize Generator
setTimeout(() => MissionGenerator.init(), 100);

// BLACK MARKET
const BlackMarket = {
    upgrades: {
        "vpn_proxy": { name: "VPN Proxy", cost: 50, desc: "Reduces trace speed by 20%", owned: false },
        "brute_force_mk2": { name: "Brute Force MkII", cost: 100, desc: "Increases crack speed", owned: false },
        "stealth_kit": { name: "Stealth Kit", cost: 200, desc: "Trace starts at -20%", owned: false }
    },

    buy: function (id) {
        const item = this.upgrades[id];
        if (!item) return "Item not found.";
        if (item.owned) return "Already owned.";

        if (Wallet.credits >= item.cost) {
            Wallet.credits -= item.cost;
            item.owned = true;
            return `Purchased ${item.name}.`;
        } else {
            return `Insufficient credits. Cost: ${item.cost}`;
        }
    }
};

const Wallet = {
    credits: 0
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
    traceRate: 2, // Default

    start: function (opId) {
        if (this.active) return "Operation already in progress.";

        this.active = true;
        this.currentOp = opId;
        this.stage = 1;
        this.traceLevel = 0;

        if (opId === 'deep_web') {
            this.timer = 300; // 5 minutes
            this.objective = "Scan network for entry point.";
        } else {
            const mission = MISSIONS[opId];
            if (mission && mission.type === 'timed') {
                this.timer = mission.duration || 300;
                this.objective = `Scan network to locate ${mission.domain}`;
            }
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
        if (this.timer % 60 === 0) AchievementSystem.check('uptime_tick'); // Check uptime every minute (approx)
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
        AchievementSystem.check('file_deleted');
        refreshExplorer();
        return "";
    }
};

function handleCmd(cmd) {
    const args = cmd.trim().split(' ');
    const c = args[0].toLowerCase();
    const arg = args[1];

    AchievementSystem.check('command_run');
    AchievementSystem.check('spam_check', cmd);

    if (c === 'help') {
        printTerm("cmds: ls, cd, cat, mkdir, touch, rm, clear, reboot, snake, matrix, market, wallet, del system32");
        AchievementSystem.check('sys_admin');
    }
    else if (c === 'clear') {
        termOutput.innerHTML = '';
        AchievementSystem.check('clear_term');
    }
    else if (c === 'reboot') location.reload();
    else if (c === 'snake') openWindow('win-snake');
    else if (c === 'ls') printTerm(FileSystem.ls());
    else if (c === 'cd') {
        const err = FileSystem.cd(arg);
        if (err) printTerm(err);
        else {
            printTerm(`/${FileSystem.currentPath.slice(1).join('/')}`);
            AchievementSystem.check('dir_change', arg);
        }
    }
    else if (c === 'cat') printTerm(FileSystem.cat(arg));
    else if (c === 'mkdir') printTerm(FileSystem.mkdir(arg));
    else if (c === 'touch') {
        printTerm(FileSystem.touch(arg));
        AchievementSystem.check('file_created');
    }
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
        else if (MissionEngine.active && MISSIONS[MissionEngine.currentOp] && arg === MISSIONS[MissionEngine.currentOp].uploadCode) {
            if (MissionEngine.currentOp === 'deep_web') {
                printTerm("Uploading PROJECT GENESIS...");
            } else {
                printTerm("Uploading Mission Loot...");
            }

            let p = 0;
            const interval = setInterval(() => {
                p += 5; // Slower upload
                printTerm(`Progress: ${p}%`);
                // Trace increases during upload (modified by upgrades)
                let traceInc = 2;
                if (BlackMarket.upgrades.vpn_proxy.owned) traceInc = 1;
                MissionEngine.traceLevel += traceInc;
                AchievementSystem.check('trace_check', MissionEngine.traceLevel);
                MissionEngine.renderHUD();

                if (p >= 100) {
                    clearInterval(interval);
                    printTerm(MissionEngine.stop(true));

                    if (MissionEngine.currentOp === 'deep_web') {
                        setTimeout(triggerBSOD, 3000);
                    } else {
                        const m = MISSIONS[MissionEngine.currentOp];
                        Wallet.credits += m.score;
                        printTerm(`MISSION COMPLETE. ${m.score} CREDITS TRANSFERRED.`);
                        AchievementSystem.check('hack_complete');
                        AchievementSystem.check('credits_earned');
                        if (Wallet.credits >= 100) AchievementSystem.check('rich');
                        // Unlock Reward
                        const dir = FileSystem.structure.root.children;
                        if (!dir[m.reward]) {
                            dir[m.reward] = {
                                type: "file",
                                content: `MISSION COMPLETE: ${m.title}\n\nLOOT SECURED.\n\n[DATA ENCRYPTED]`
                            };
                            refreshExplorer();
                        }

                        // Theme Change
                        if (m.theme) {
                            document.body.className = `theme-${m.theme}`;
                            setTimeout(() => document.body.className = 'theme-green', 3000);
                        }
                    }
                }
            }, 500);
        }
        else {
            printTerm("Error: Invalid Upload Code.");
        }
    }
    else if (c === 'start_op') {
        const opId = arg;
        if (MISSIONS[opId]) {
            const m = MISSIONS[opId];
            if (m.type === 'timed') {
                printTerm(MissionEngine.start(opId));
            } else {
                printTerm(`Operation ${m.title} is a ${m.type.toUpperCase()} Mission.`);
                printTerm(`Use 'connect ${m.ip}' or 'connect ${m.domain}' to begin.`);
            }
        } else {
            printTerm("Usage: start_op <operation_id>");
            printTerm("Example: start_op deep_web");
        }
    }
    else if (c === 'random') {
        const keys = Object.keys(MISSIONS).filter(k => k.startsWith('op_'));
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        const m = MISSIONS[randomKey];
        printTerm(`Selecting random target... ${m.title}`);

        if (m.type === 'timed') {
            printTerm(MissionEngine.start(randomKey));
        } else {
            printTerm(`Operation ${m.title} is a ${m.type.toUpperCase()} Mission.`);
            printTerm(`Use 'connect ${m.ip}' or 'connect ${m.domain}' to begin.`);
        }
    }
    else if (c === 'contracts') {
        const page = parseInt(arg) || 1;
        const pageSize = 10;

        // Natural Sort: Alpha/Beta first, then op_1, op_2...
        const allMissions = Object.values(MISSIONS).sort((a, b) => {
            const aNum = parseInt(a.id.replace('op_', ''));
            const bNum = parseInt(b.id.replace('op_', ''));

            if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
            if (!isNaN(aNum)) return 1; // b is static (alpha), comes first
            if (!isNaN(bNum)) return -1; // a is static, comes first
            return a.id.localeCompare(b.id); // Both static, alpha sort
        });

        const totalPages = Math.ceil(allMissions.length / pageSize);

        if (page < 1 || page > totalPages) {
            printTerm(`Page ${page} does not exist. Total pages: ${totalPages}`);
            return;
        }

        printTerm(`--- AVAILABLE CONTRACTS (Page ${page}/${totalPages}) ---`);
        printTerm("ID           | TITLE                          | TARGET          | TYPE");
        printTerm("-".repeat(70));

        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        const slice = allMissions.slice(start, end);

        slice.forEach(m => {
            const id = m.id.padEnd(12);
            const title = m.title.replace('OPERATION ', '').padEnd(30);
            const target = m.ip.padEnd(15);
            const type = m.type.toUpperCase().padEnd(10);
            printTerm(`${id} | ${title} | ${target} | ${type}`);
        });

        printTerm("-".repeat(70));
        printTerm(`Type 'contracts ${page + 1}' for next page.`);
    }
    else if (c === 'wallet') {
        printTerm(`CREDITS: ${Wallet.credits}`);
    }
    else if (c === 'market') {
        if (!arg) {
            printTerm("--- BLACK MARKET ---");
            AchievementSystem.check('check_market');
            Object.entries(BlackMarket.upgrades).forEach(([key, item]) => {
                printTerm(`${key.padEnd(15)} | ${item.cost} CR | ${item.owned ? "[OWNED]" : item.desc}`);
            });
            printTerm("Usage: market buy <item_id>");
        } else if (arg === 'buy' && args[2]) {
            printTerm(BlackMarket.buy(args[2]));
            AchievementSystem.check('item_bought');
        }
    }
    else if (c === 'scan_network') {
        printTerm("Scanning local subnet...");
        setTimeout(() => {
            printTerm("Found: 192.168.0.1 (Gateway)");
            printTerm("Found: 192.168.0.105 (Self)");

            // Check for Deep Web
            if (MissionEngine.active && MissionEngine.currentOp === 'deep_web' && MissionEngine.stage === 1) {
                printTerm("Found: 10.0.0.66 (HIDDEN) - PORT 80 OPEN");
                printTerm("Resolving hostname... portal.dark.net");
                MissionEngine.stage = 2;
                MissionEngine.objective = "Hack Employee Portal (portal.dark.net)";
                MissionEngine.renderHUD();
            }

            // Check for Generated Timed Missions
            if (MissionEngine.active && MISSIONS[MissionEngine.currentOp]) {
                const m = MISSIONS[MissionEngine.currentOp];
                if (m.type === 'timed' && MissionEngine.stage === 1) {
                    printTerm(`Found: ${m.ip} (TARGET) - PORT 80 OPEN`);
                    printTerm(`Resolving hostname... ${m.domain}`);
                    MissionEngine.stage = 2;
                    MissionEngine.objective = `Infiltrate ${m.domain}`;
                    MissionEngine.renderHUD();
                }
            }
        }, 2000);
    }
    else if (c === 'reset_achievements') {
        localStorage.removeItem('achievements');
        location.reload();
    }
    else if (c === 'test_notification') {
        AchievementSystem.notify({ title: "Test Achievement", desc: "This is a test.", icon: "trophy" });
    }
    else printTerm(`Unknown command: ${c}`);
    AchievementSystem.check('invalid_cmd');
}

function triggerBSOD() {
    bsod.style.display = 'block';
    setTimeout(() => location.reload(), 5000);
}

/* --- MEDIA PLAYER --- */
const MediaPlayer = {
    tracks: [
        { title: "Cyber Chase", artist: "Neon Grid", src: "assets/audio/track1.mp3" },
        { title: "Night City", artist: "Synthwave", src: "assets/audio/track2.mp3" },
        { title: "Mainframe", artist: "Hacker", src: "assets/audio/track3.mp3" }
    ],
    currentTrack: 0,
    isPlaying: false,
    visualizerInterval: null,

    init: function () {
        this.renderPlaylist();
        this.updateUI();
    },

    renderPlaylist: function () {
        const list = document.getElementById('media-playlist');
        if (!list) return;
        list.innerHTML = '';
        this.tracks.forEach((track, index) => {
            const div = document.createElement('div');
            div.className = `p-2 text-xs border border-theme-dim hover:bg-theme-dim/20 cursor-pointer ${index === this.currentTrack ? 'text-theme-color bg-theme-dim/10' : 'text-gray-500'}`;
            div.innerText = `${index + 1}. ${track.title} - ${track.artist}`;
            div.onclick = () => this.playTrack(index);
            list.appendChild(div);
        });
    },

    updateUI: function () {
        const title = document.getElementById('media-title');
        const artist = document.getElementById('media-artist');

        if (title) title.innerText = this.tracks[this.currentTrack].title;
        if (artist) artist.innerText = this.tracks[this.currentTrack].artist;

        this.renderPlaylist();
    },

    playTrack: function (index) {
        if (index !== undefined) this.currentTrack = index;
        this.isPlaying = true;
        this.updateUI();
        this.startVisualizer();
        AchievementSystem.check('music_lover');
        AchievementSystem.check('track_played', index);
    },

    pauseTrack: function () {
        this.isPlaying = false;
        this.stopVisualizer();
    },

    toggle: function () {
        if (this.isPlaying) this.pauseTrack();
        else this.playTrack();
    },

    next: function () {
        this.currentTrack = (this.currentTrack + 1) % this.tracks.length;
        this.playTrack();
    },

    prev: function () {
        this.currentTrack = (this.currentTrack - 1 + this.tracks.length) % this.tracks.length;
        this.playTrack();
    },

    startVisualizer: function () {
        if (this.visualizerInterval) clearInterval(this.visualizerInterval);
        const container = document.getElementById('media-visualizer');
        if (!container) return;

        this.visualizerInterval = setInterval(() => {
            container.innerHTML = '';
            for (let i = 0; i < 10; i++) {
                const h = Math.random() * 100;
                const bar = document.createElement('div');
                bar.style.width = '10%';
                bar.style.height = `${h}%`;
                bar.style.background = 'var(--theme-color)';
                container.appendChild(bar);
            }
        }, 100);
    },

    stopVisualizer: function () {
        if (this.visualizerInterval) clearInterval(this.visualizerInterval);
        const container = document.getElementById('media-visualizer');
        if (container) container.innerHTML = '';
    }
};

// Global functions for HTML onclick
function mediaPrev() { MediaPlayer.prev(); }
function mediaNext() { MediaPlayer.next(); }
function mediaPlayPause() { MediaPlayer.toggle(); }

/* --- ACHIEVEMENT SYSTEM --- */
const AchievementSystem = {
    achievements: {
        "hello_world": { id: "hello_world", title: "Hello World", desc: "Boot up the system for the first time.", icon: "power", unlocked: false },
        "script_kiddie": { id: "script_kiddie", title: "Script Kiddie", desc: "Complete your first hack.", icon: "terminal", unlocked: false },
        "master_hacker": { id: "master_hacker", title: "Master Hacker", desc: "Complete 10 hacks.", icon: "skull", unlocked: false, progress: 0, target: 10 },
        "rich": { id: "rich", title: "Crypto Miner", desc: "Earn 100 Credits.", icon: "bitcoin", unlocked: false },
        "snake_score_10": { id: "snake_score_10", title: "Baby Snake", desc: "Score 10 in Snake.", icon: "gamepad-2", unlocked: false },

        "snake_score_50": { id: "snake_score_50", title: "Serpent", desc: "Score 50 in Snake.", icon: "crown", unlocked: false },
        "sys_admin": { id: "sys_admin", title: "System Admin", desc: "Run the 'help' command.", icon: "terminal-square", unlocked: false },
        "explorer": { id: "explorer", title: "Explorer", desc: "Open 5 different applications.", icon: "compass", unlocked: false, progress: 0, target: 5 },
        "music_lover": { id: "music_lover", title: "Music Lover", desc: "Play a track in Media Player.", icon: "headphones", unlocked: false },
        "terminal_junkie": { id: "terminal_junkie", title: "Terminal Junkie", desc: "Run 20 terminal commands.", icon: "keyboard", unlocked: false, progress: 0, target: 20 },
        "glitch_matrix": { id: "glitch_matrix", title: "Glitch in the Matrix", desc: "Find the hidden trigger.", icon: "zap", unlocked: false },

        // Hacking Tiers
        "white_hat": { id: "white_hat", title: "White Hat", desc: "Complete 5 hacks.", icon: "shield", unlocked: false, progress: 0, target: 5 },
        "gray_hat": { id: "gray_hat", title: "Gray Hat", desc: "Complete 10 hacks.", icon: "user-check", unlocked: false, progress: 0, target: 10 },
        "black_hat": { id: "black_hat", title: "Black Hat", desc: "Complete 25 hacks.", icon: "skull", unlocked: false, progress: 0, target: 25 },
        "elite_hacker": { id: "elite_hacker", title: "Elite Hacker", desc: "Complete 50 hacks.", icon: "terminal", unlocked: false, progress: 0, target: 50 },
        "cyber_deity": { id: "cyber_deity", title: "Cyber Deity", desc: "Complete 100 hacks.", icon: "server", unlocked: false, progress: 0, target: 100 },
        "payload_deliverer": { id: "payload_deliverer", title: "Payload Deliverer", desc: "Upload 10 files.", icon: "upload", unlocked: false, progress: 0, target: 10 },
        "trace_buster": { id: "trace_buster", title: "Trace Buster", desc: "Complete hack with >90% trace.", icon: "alert-triangle", unlocked: false },

        // Wealth Tiers
        "freelancer": { id: "freelancer", title: "Freelancer", desc: "Earn 500 Credits.", icon: "dollar-sign", unlocked: false },
        "professional": { id: "professional", title: "Professional", desc: "Earn 1000 Credits.", icon: "briefcase", unlocked: false },
        "tycoon": { id: "tycoon", title: "Tycoon", desc: "Earn 5000 Credits.", icon: "trending-up", unlocked: false },
        "whale": { id: "whale", title: "Whale", desc: "Earn 10000 Credits.", icon: "anchor", unlocked: false },
        "big_spender": { id: "big_spender", title: "Big Spender", desc: "Buy 1 item.", icon: "shopping-cart", unlocked: false },
        "fully_kitted": { id: "fully_kitted", title: "Fully Kitted", desc: "Buy all upgrades.", icon: "package", unlocked: false },

        // Snake Tiers
        "cobra": { id: "cobra", title: "Cobra", desc: "Score 100 in Snake.", icon: "target", unlocked: false },
        "viper": { id: "viper", title: "Viper", desc: "Score 200 in Snake.", icon: "zap", unlocked: false },
        "hydra": { id: "hydra", title: "Hydra", desc: "Score 500 in Snake.", icon: "layers", unlocked: false },
        "survivor": { id: "survivor", title: "Survivor", desc: "Play Snake for 5 mins.", icon: "clock", unlocked: false, progress: 0, target: 300 },
        "game_over": { id: "game_over", title: "Game Over", desc: "Die 10 times in Snake.", icon: "x-circle", unlocked: false, progress: 0, target: 10 },

        // Terminal Mastery
        "novice_term": { id: "novice_term", title: "Novice", desc: "Run 10 commands.", icon: "chevron-right", unlocked: false, progress: 0, target: 10 },
        "user_term": { id: "user_term", title: "User", desc: "Run 50 commands.", icon: "terminal", unlocked: false, progress: 0, target: 50 },
        "power_user": { id: "power_user", title: "Power User", desc: "Run 100 commands.", icon: "cpu", unlocked: false, progress: 0, target: 100 },
        "sys_admin_term": { id: "sys_admin_term", title: "SysAdmin", desc: "Run 500 commands.", icon: "server", unlocked: false, progress: 0, target: 500 },
        "operator": { id: "operator", title: "Operator", desc: "Run 1000 commands.", icon: "globe", unlocked: false, progress: 0, target: 1000 },
        "paranoid": { id: "paranoid", title: "Paranoid", desc: "Clear screen 10 times.", icon: "trash-2", unlocked: false, progress: 0, target: 10 },
        "lost": { id: "lost", title: "Lost", desc: "Enter 5 invalid commands.", icon: "help-circle", unlocked: false, progress: 0, target: 5 },
        "spammer": { id: "spammer", title: "Spammer", desc: "Run same command 5 times.", icon: "repeat", unlocked: false, progress: 0, target: 5 },

        // System & Exploration
        "uptime_1m": { id: "uptime_1m", title: "Warming Up", desc: "1 minute uptime.", icon: "sun", unlocked: false },
        "uptime_5m": { id: "uptime_5m", title: "Stable", desc: "5 minutes uptime.", icon: "battery", unlocked: false },
        "uptime_10m": { id: "uptime_10m", title: "Reliable", desc: "10 minutes uptime.", icon: "battery-charging", unlocked: false },
        "uptime_30m": { id: "uptime_30m", title: "Dedicated", desc: "30 minutes uptime.", icon: "battery-full", unlocked: false },
        "uptime_1h": { id: "uptime_1h", title: "Server Grade", desc: "1 hour uptime.", icon: "database", unlocked: false },
        "file_hoarder": { id: "file_hoarder", title: "File Hoarder", desc: "Create 10 files.", icon: "file-plus", unlocked: false, progress: 0, target: 10 },
        "deleter": { id: "deleter", title: "Deleter", desc: "Delete 10 files.", icon: "file-minus", unlocked: false, progress: 0, target: 10 },
        "navigator": { id: "navigator", title: "Navigator", desc: "Change directory 20 times.", icon: "folder", unlocked: false, progress: 0, target: 20 },
        "identity_theft": { id: "identity_theft", title: "Identity Theft", desc: "Check Identity 5 times.", icon: "user", unlocked: false, progress: 0, target: 5 },
        "narcissist": { id: "narcissist", title: "Narcissist", desc: "Check Skills 5 times.", icon: "star", unlocked: false, progress: 0, target: 5 },
        "developer": { id: "developer", title: "Developer", desc: "Check Projects 5 times.", icon: "code", unlocked: false, progress: 0, target: 5 },
        "audiophile": { id: "audiophile", title: "Audiophile", desc: "Listen to all tracks.", icon: "music", unlocked: false, progress: 0, target: 3 },
        "window_shopper": { id: "window_shopper", title: "Window Shopper", desc: "Check market 5 times.", icon: "eye", unlocked: false, progress: 0, target: 5 },

        // Easter Eggs
        "konami": { id: "konami", title: "Konami Code", desc: "Up, Up, Down, Down...", icon: "gamepad", unlocked: false },
        "bsod_survivor": { id: "bsod_survivor", title: "BSOD Survivor", desc: "Trigger a system crash.", icon: "alert-octagon", unlocked: false },
        "recursion": { id: "recursion", title: "Recursion", desc: "cd . 5 times.", icon: "refresh-cw", unlocked: false, progress: 0, target: 5 },
        "root_access": { id: "root_access", title: "Root Access", desc: "Try sudo or su.", icon: "lock", unlocked: false },
        "hello_again": { id: "hello_again", title: "Hello Again", desc: "Boot system 5 times.", icon: "power", unlocked: false, progress: 0, target: 5 }
    },

    // State Tracking
    openedWindows: new Set(),
    commandCount: 0,
    hackCount: 0,
    uploadCount: 0,
    snakeDeaths: 0,
    snakeTime: 0,
    clearCount: 0,
    invalidCount: 0,
    lastCmd: "",
    spamCount: 0,
    uptime: 0,
    fileCount: 0,
    delCount: 0,
    cdCount: 0,
    idCheck: 0,
    skillCheck: 0,
    projCheck: 0,
    marketCheck: 0,
    tracksPlayed: new Set(),
    bootCount: 0,
    recursionCount: 0,

    init: function () {
        const saved = localStorage.getItem('achievements');
        if (saved) {
            const parsed = JSON.parse(saved);
            // Merge saved data with current structure (to handle updates)
            for (const key in parsed) {
                if (this.achievements[key]) {
                    this.achievements[key].unlocked = parsed[key].unlocked;
                    if (parsed[key].progress) this.achievements[key].progress = parsed[key].progress;
                }
            }
        } else {
            // First boot achievement
            setTimeout(() => this.unlock('hello_world'), 2000);
        }
        this.render();

        // Start Uptime Tracker (Every 1 minute)
        setInterval(() => {
            this.check('uptime_tick');
        }, 60000);
    },

    save: function () {
        localStorage.setItem('achievements', JSON.stringify(this.achievements));
    },

    unlock: function (id) {
        const ach = this.achievements[id];
        if (ach && !ach.unlocked) {
            ach.unlocked = true;
            ach.unlockDate = new Date().toLocaleDateString();
            this.save();
            this.notify(ach);
            this.render();
        }
    },

    check: function (event) {
        if (event === 'hack_complete') {
            this.unlock('script_kiddie');
            this.achievements['master_hacker'].progress++;
            if (this.achievements['master_hacker'].progress >= 10) this.unlock('master_hacker');
            this.save();
        }
        else if (event === 'rich') this.unlock('rich');
        else if (event === 'snake_score_10') this.unlock('snake_score_10');
        else if (event === 'snake_score_50') this.unlock('snake_score_50');
        else if (event === 'sys_admin') this.unlock('sys_admin');
        else if (event === 'music_lover') this.unlock('music_lover');
        else if (event === 'glitch_matrix') this.unlock('glitch_matrix');
        else if (event === 'window_opened') {
            const winId = arguments[1];
            if (winId && !this.openedWindows.has(winId)) {
                this.openedWindows.add(winId);
                this.achievements['explorer'].progress = this.openedWindows.size;
                if (this.openedWindows.size >= 5) this.unlock('explorer');
                this.save(); // Save progress
            }
        }
        else if (event === 'command_run') {
            this.commandCount++;
            this.achievements['terminal_junkie'].progress = this.commandCount;
            if (this.commandCount >= 20) this.unlock('terminal_junkie');

            // Terminal Tiers
            ['novice_term', 'user_term', 'power_user', 'sys_admin_term', 'operator'].forEach(id => {
                const ach = this.achievements[id];
                if (ach) {
                    ach.progress = this.commandCount;
                    if (this.commandCount >= ach.target) this.unlock(id);
                }
            });
            this.save();
        }
        else if (event === 'hack_complete') {
            this.hackCount++;
            ['master_hacker', 'white_hat', 'gray_hat', 'black_hat', 'elite_hacker', 'cyber_deity'].forEach(id => {
                const ach = this.achievements[id];
                if (ach) {
                    ach.progress = this.hackCount;
                    if (this.hackCount >= ach.target) this.unlock(id);
                }
            });
            this.save();
        }
        else if (event === 'upload_complete') {
            this.uploadCount++;
            const ach = this.achievements['payload_deliverer'];
            ach.progress = this.uploadCount;
            if (this.uploadCount >= ach.target) this.unlock('payload_deliverer');
            this.save();
        }
        else if (event === 'trace_check') {
            const trace = arguments[1];
            if (trace > 90) this.unlock('trace_buster');
        }
        else if (event === 'credits_earned') {
            const credits = Wallet.credits;
            if (credits >= 100) this.unlock('rich'); // Legacy
            ['freelancer', 'professional', 'tycoon', 'whale'].forEach(id => {
                const ach = this.achievements[id];
                if (credits >= 500 && id === 'freelancer') this.unlock(id);
                if (credits >= 1000 && id === 'professional') this.unlock(id);
                if (credits >= 5000 && id === 'tycoon') this.unlock(id);
                if (credits >= 10000 && id === 'whale') this.unlock(id);
            });
        }
        else if (event === 'item_bought') {
            this.unlock('big_spender');
            const allOwned = Object.values(BlackMarket.upgrades).every(u => u.owned);
            if (allOwned) this.unlock('fully_kitted');
        }
        else if (event === 'snake_score') {
            const score = arguments[1];
            if (score >= 10) this.unlock('snake_score_10');
            if (score >= 50) this.unlock('snake_score_50');
            if (score >= 100) this.unlock('cobra');
            if (score >= 200) this.unlock('viper');
            if (score >= 500) this.unlock('hydra');
        }
        else if (event === 'snake_death') {
            this.snakeDeaths++;
            const ach = this.achievements['game_over'];
            ach.progress = this.snakeDeaths;
            if (this.snakeDeaths >= ach.target) this.unlock('game_over');
            this.save();
        }
        else if (event === 'snake_time') {
            this.snakeTime++; // Called every second
            const ach = this.achievements['survivor'];
            ach.progress = this.snakeTime;
            if (this.snakeTime >= ach.target) this.unlock('survivor');
            this.save();
        }
        else if (event === 'clear_term') {
            this.clearCount++;
            const ach = this.achievements['paranoid'];
            ach.progress = this.clearCount;
            if (this.clearCount >= ach.target) this.unlock('paranoid');
            this.save();
        }
        else if (event === 'invalid_cmd') {
            this.invalidCount++;
            const ach = this.achievements['lost'];
            ach.progress = this.invalidCount;
            if (this.invalidCount >= ach.target) this.unlock('lost');
            this.save();
        }
        else if (event === 'spam_check') {
            const cmd = arguments[1];
            if (cmd === this.lastCmd) {
                this.spamCount++;
                if (this.spamCount >= 5) this.unlock('spammer');
            } else {
                this.spamCount = 0;
            }
            this.lastCmd = cmd;
        }
        else if (event === 'uptime_tick') {
            this.uptime++; // Minutes
            if (this.uptime >= 1) this.unlock('uptime_1m');
            if (this.uptime >= 5) this.unlock('uptime_5m');
            if (this.uptime >= 10) this.unlock('uptime_10m');
            if (this.uptime >= 30) this.unlock('uptime_30m');
            if (this.uptime >= 60) this.unlock('uptime_1h');
            this.save();
        }
        else if (event === 'file_created') {
            this.fileCount++;
            const ach = this.achievements['file_hoarder'];
            ach.progress = this.fileCount;
            if (this.fileCount >= ach.target) this.unlock('file_hoarder');
            this.save();
        }
        else if (event === 'file_deleted') {
            this.delCount++;
            const ach = this.achievements['deleter'];
            ach.progress = this.delCount;
            if (this.delCount >= ach.target) this.unlock('deleter');
            this.save();
        }
        else if (event === 'dir_change') {
            this.cdCount++;
            const ach = this.achievements['navigator'];
            ach.progress = this.cdCount;
            if (this.cdCount >= ach.target) this.unlock('navigator');

            const path = arguments[1];
            if (path === '.') {
                this.recursionCount++;
                const achRec = this.achievements['recursion'];
                achRec.progress = this.recursionCount;
                if (this.recursionCount >= achRec.target) this.unlock('recursion');
            }
            this.save();
        }
        else if (event === 'check_id') {
            this.idCheck++;
            const ach = this.achievements['identity_theft'];
            ach.progress = this.idCheck;
            if (this.idCheck >= ach.target) this.unlock('identity_theft');
            this.save();
        }
        else if (event === 'check_skills') {
            this.skillCheck++;
            const ach = this.achievements['narcissist'];
            ach.progress = this.skillCheck;
            if (this.skillCheck >= ach.target) this.unlock('narcissist');
            this.save();
        }
        else if (event === 'check_projects') {
            this.projCheck++;
            const ach = this.achievements['developer'];
            ach.progress = this.projCheck;
            if (this.projCheck >= ach.target) this.unlock('developer');
            this.save();
        }
        else if (event === 'check_market') {
            this.marketCheck++;
            const ach = this.achievements['window_shopper'];
            ach.progress = this.marketCheck;
            if (this.marketCheck >= ach.target) this.unlock('window_shopper');
            this.save();
        }
        else if (event === 'track_played') {
            const trackId = arguments[1];
            this.tracksPlayed.add(trackId);
            const ach = this.achievements['audiophile'];
            ach.progress = this.tracksPlayed.size;
            if (this.tracksPlayed.size >= ach.target) this.unlock('audiophile');
            this.save();
        }
        else if (event === 'boot') {
            this.bootCount++;
            const ach = this.achievements['hello_again'];
            ach.progress = this.bootCount;
            if (this.bootCount >= ach.target) this.unlock('hello_again');
            this.save();
        }
    },

    notify: function (ach) {
        const notif = document.getElementById('ach-notification');
        const title = document.getElementById('ach-notify-title');
        if (notif && title) {
            SoundManager.playAchievement();
            title.innerText = ach.title;
            notif.style.right = '20px'; // Slide in
            setTimeout(() => {
                notif.style.right = '-300px'; // Slide out
            }, 4000);
        }
    },

    render: function () {
        const grid = document.getElementById('ach-grid');
        const countEl = document.getElementById('ach-count');
        const totalEl = document.getElementById('ach-total');

        if (!grid) return;

        grid.innerHTML = '';
        let unlockedCount = 0;
        const totalCount = Object.keys(this.achievements).length;

        Object.values(this.achievements).forEach(ach => {
            if (ach.unlocked) unlockedCount++;

            const div = document.createElement('div');
            div.className = `flex items-center gap-4 p-3 border ${ach.unlocked ? 'border-theme-color bg-theme-dim/10' : 'border-theme-dim/30 opacity-50'}`;

            div.innerHTML = `
                <div class="${ach.unlocked ? 'text-theme-color' : 'text-gray-600'}">
                    <i data-lucide="${ach.icon}" class="w-8 h-8"></i>
                </div>
                <div class="flex-grow">
                    <h4 class="font-bold ${ach.unlocked ? 'text-white' : 'text-gray-500'}">${ach.title}</h4>
                    <p class="text-xs text-gray-400">${ach.desc}</p>
                    ${ach.unlocked ? `<p class="text-[10px] text-theme-dim mt-1">Unlocked: ${ach.unlockDate}</p>` : ''}
                    ${ach.progress !== undefined && !ach.unlocked ? `<p class="text-[10px] text-theme-dim mt-1">Progress: ${ach.progress}/${ach.target}</p>` : ''}
                </div>
            `;
            grid.appendChild(div);
        });

        if (countEl) countEl.innerText = unlockedCount;
        if (totalEl) totalEl.innerText = totalCount;

        lucide.createIcons();
    }
};

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
        AchievementSystem.check('snake_score', score);
        if (score >= 10) AchievementSystem.check('snake_score_10');
        if (score >= 50) AchievementSystem.check('snake_score_50');
        spawnFood(); // New food
    } else {
        snake.pop();
    }
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

    canvas.addEventListener('click', () => {
        AchievementSystem.check('glitch_matrix');
    });
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

function initSysMonitor() {
    setInterval(() => {
        const cpu = Math.floor(Math.random() * 30) + 10;
        const ram = (Math.random() * 2 + 2).toFixed(1);

        const cpuVal = document.getElementById('cpu-val');
        const cpuBar = document.getElementById('cpu-bar');
        const ramVal = document.getElementById('ram-val');
        const ramBar = document.getElementById('ram-bar');

        if (cpuVal) cpuVal.innerText = `${cpu}%`;
        if (cpuBar) cpuBar.style.width = `${cpu}%`;
        if (ramVal) ramVal.innerText = `${ram}GB`;
        if (ramBar) ramBar.style.width = `${(ram / 16) * 100}%`;
    }, 2000);
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
    },

    playAchievement: function () {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        // Major Triad Arpeggio (C5, E5, G5, C6)
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, now + i * 0.1);
            gain.gain.setValueAtTime(0.1, now + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.4);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.4);
        });
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

        // MISSION LOGIC: Dynamic Registry Lookup
        const mission = Object.values(MISSIONS).find(m => url.includes(m.domain) || url.includes(m.ip));

        // DEEP WEB PORTAL (Advanced Op) OR Generated Timed Mission
        if (url.includes('portal.dark.net') || (mission && mission.type === 'timed')) {
            const title = mission ? mission.title : "DarkCorp Employee Portal";
            const html = `
                <body style="background:#1a1a1a; color:#ccc; font-family:sans-serif; padding:20px;">
                    <div style="background:#333; padding:10px; border-bottom:2px solid #555;">
                        <h2 style="margin:0; color:#fff;">${title} - Login</h2>
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
                                const rewardName = '${mission ? mission.reward : "PROJECT_GENESIS.zip"}';
                                const uploadCmd = '${mission ? mission.uploadCode : "GENESIS"}';
                                
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
                                        <p>Target File: <strong>\${rewardName}</strong></p>
                                        <p>To Exfiltrate: Run <strong>upload \${uploadCmd}</strong> in Terminal.</p>
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

        if (mission) {
            let html = '';
            const commonStyle = 'background:black; color:#00FF41; font-family:monospace; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; margin:0;';

            if (mission.type === 'standard') {
                const highScore = localStorage.getItem('snakeHighScore') || 0;
                html = `
                    <body style="${commonStyle}">
                        <h1>${mission.title}</h1>
                        <p>BIOMETRIC VERIFICATION REQUIRED</p>
                        <p>REQUIRED SCORE: ${mission.score}</p>
                        <input type="number" id="pass" placeholder="Enter Score" style="background:black; border:1px solid #00FF41; color:#00FF41; padding:5px;">
                        <button onclick="check()" style="margin-top:10px; cursor:pointer;">AUTHENTICATE</button>
                        <p id="msg"></p>
                        <script>
                            function check() {
                                const val = parseInt(document.getElementById('pass').value);
                                const req = parseInt(localStorage.getItem('snakeHighScore') || 0);
                                if (val == req && req >= ${mission.score}) {
                                    window.parent.postMessage('mission_success_${mission.id}', '*');
                                    document.getElementById('msg').innerText = "ACCESS GRANTED.";
                                } else {
                                    document.getElementById('msg').innerText = "ACCESS DENIED.";
                                }
                            }
                        </script>
                    </body>`;
            }
            else if (mission.type === 'bruteforce') {
                html = `
                    <body style="${commonStyle}">
                        <h1>${mission.title}</h1>
                        <p>ENTER 4-DIGIT PIN</p>
                        <div id="display" style="font-size:32px; margin-bottom:20px;">____</div>
                        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px;">
                            ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button onclick="press(${n})" style="padding:10px; background:#003300; color:#00FF41; border:1px solid #00FF41;">${n}</button>`).join('')}
                            <button onclick="clearPin()" style="background:red; color:white;">C</button>
                            <button onclick="press(0)" style="padding:10px; background:#003300; color:#00FF41; border:1px solid #00FF41;">0</button>
                            <button onclick="submit()" style="background:green; color:white;">OK</button>
                        </div>
                        <p id="msg"></p>
                        <script>
                            let pin = "";
                            const target = "${mission.pin}";
                            function press(n) { if(pin.length < 4) { pin += n; update(); } }
                            function clearPin() { pin = ""; update(); }
                            function update() { document.getElementById('display').innerText = pin.padEnd(4, '_'); }
                            function submit() {
                                if (pin === target) {
                                    window.parent.postMessage('mission_success_${mission.id}', '*');
                                    document.getElementById('msg').innerText = "ACCESS GRANTED.";
                                } else {
                                    const hint = pin < target ? "HIGHER" : "LOWER";
                                    document.getElementById('msg').innerText = "ACCESS DENIED. TRY " + hint;
                                    pin = ""; update();
                                }
                            }
                        </script>
                    </body>`;
            }
            else if (mission.type === 'decipher') {
                html = `
                    <body style="${commonStyle}">
                        <h1>${mission.title}</h1>
                        <p>DECRYPT THE MESSAGE</p>
                        <h2 style="color:red;">${mission.ciphertext}</h2>
                        <input type="text" id="ans" placeholder="PLAINTEXT" style="background:black; border:1px solid #00FF41; color:#00FF41; padding:5px; text-transform:uppercase;">
                        <button onclick="check()" style="margin-top:10px;">SUBMIT</button>
                        <p id="msg"></p>
                        <script>
                            function check() {
                                if (document.getElementById('ans').value.toUpperCase() === "${mission.plaintext}") {
                                    window.parent.postMessage('mission_success_${mission.id}', '*');
                                    document.getElementById('msg').innerText = "ACCESS GRANTED.";
                                } else {
                                    document.getElementById('msg').innerText = "INCORRECT.";
                                }
                            }
                        </script>
                    </body>`;
            }
            else if (mission.type === 'frequency') {
                html = `
                    <body style="${commonStyle}">
                        <h1>${mission.title}</h1>
                        <p>MATCH THE FREQUENCY</p>
                        <div style="width:300px; height:100px; border:1px solid #00FF41; position:relative; overflow:hidden;">
                            <canvas id="c" width="300" height="100"></canvas>
                        </div>
                        <input type="range" min="10" max="100" value="50" style="width:300px; margin-top:20px;" oninput="update(this.value)">
                        <p>TARGET: <span id="t">???</span> Hz | CURRENT: <span id="v">50</span> Hz</p>
                        <button onclick="check()" style="margin-top:10px;">LOCK SIGNAL</button>
                        <p id="msg"></p>
                        <script>
                            const ctx = document.getElementById('c').getContext('2d');
                            const target = ${mission.targetFreq};
                            let current = 50;
                            function draw() {
                                ctx.fillStyle = 'black'; ctx.fillRect(0,0,300,100);
                                ctx.strokeStyle = 'red'; ctx.beginPath();
                                for(let x=0; x<300; x++) ctx.lineTo(x, 50 + Math.sin(x * target * 0.01) * 40);
                                ctx.stroke();
                                ctx.strokeStyle = '#00FF41'; ctx.beginPath();
                                for(let x=0; x<300; x++) ctx.lineTo(x, 50 + Math.sin(x * current * 0.01) * 40);
                                ctx.stroke();
                                requestAnimationFrame(draw);
                            }
                            draw();
                            function update(v) { current = v; document.getElementById('v').innerText = v; }
                            function check() {
                                if (Math.abs(current - target) < 5) {
                                    window.parent.postMessage('mission_success_${mission.id}', '*');
                                    document.getElementById('msg').innerText = "SIGNAL LOCKED.";
                                } else {
                                    document.getElementById('msg').innerText = "SIGNAL UNSTABLE.";
                                }
                            }
                        </script>
                    </body>`;
            }
            else if (mission.type === 'trivia') {
                html = `
                    <body style="${commonStyle}">
                        <h1>${mission.title}</h1>
                        <p>SECURITY QUESTION</p>
                        <h3>${mission.question}</h3>
                        <div style="display:flex; flex-direction:column; gap:10px;">
                            ${mission.options.map(o => `<button onclick="check('${o}')" style="padding:10px; background:#003300; color:#00FF41; border:1px solid #00FF41;">${o}</button>`).join('')}
                        </div>
                        <p id="msg"></p>
                        <script>
                            function check(ans) {
                                if (ans === "${mission.answer}") {
                                    window.parent.postMessage('mission_success_${mission.id}', '*');
                                    document.getElementById('msg').innerText = "ACCESS GRANTED.";
                                } else {
                                    document.getElementById('msg').innerText = "ACCESS DENIED. LOCKOUT INITIATED.";
                                    document.body.style.pointerEvents = 'none';
                                }
                            }
                        </script>
                    </body>`;
            }
            else if (mission.type === 'grid') {
                html = `
                    <body style="${commonStyle}">
                        <h1>${mission.title}</h1>
                        <p>REPEAT THE PATTERN</p>
                        <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:5px;">
                            ${Array(16).fill(0).map((_, i) => `<div id="b${i}" onclick="clickB(${i})" style="width:40px; height:40px; border:1px solid #00FF41; cursor:pointer;"></div>`).join('')}
                        </div>
                        <button onclick="play()" style="margin-top:20px;">PLAY PATTERN</button>
                        <p id="msg"></p>
                        <script>
                            const pattern = [${mission.pattern}];
                            let input = [];
                            function flash(i) {
                                const b = document.getElementById('b'+i);
                                b.style.background = '#00FF41';
                                setTimeout(() => b.style.background = 'transparent', 300);
                            }
                            function play() {
                                input = [];
                                let i = 0;
                                const iv = setInterval(() => {
                                    if(i >= pattern.length) clearInterval(iv);
                                    else flash(pattern[i++]);
                                }, 600);
                            }
                            function clickB(i) {
                                flash(i);
                                input.push(i);
                                if (input.length === pattern.length) {
                                    if (JSON.stringify(input) === JSON.stringify(pattern)) {
                                        window.parent.postMessage('mission_success_${mission.id}', '*');
                                        document.getElementById('msg').innerText = "ACCESS GRANTED.";
                                    } else {
                                        document.getElementById('msg').innerText = "PATTERN MISMATCH.";
                                        input = [];
                                    }
                                }
                            }
                        </script>
                    </body>`;
            }

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
            // Dynamic Theme Application
            let themeClass = 'theme-green';
            if (mission.theme) {
                themeClass = `theme-${mission.theme}`;
            }

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

/* --- SHUTDOWN SYSTEM --- */
function shutdownSystem() {
    // Play shutdown sound if available
    if (SoundManager.ctx) {
        const osc = SoundManager.ctx.createOscillator();
        const gain = SoundManager.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, SoundManager.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(55, SoundManager.ctx.currentTime + 1);
        gain.gain.setValueAtTime(0.2, SoundManager.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, SoundManager.ctx.currentTime + 1);
        osc.connect(gain);
        gain.connect(SoundManager.ctx.destination);
        osc.start();
        osc.stop(SoundManager.ctx.currentTime + 1);
    }

    // Create Shutdown Screen
    const div = document.createElement('div');
    div.id = 'shutdown-screen';
    div.style.position = 'fixed';
    div.style.inset = '0';
    div.style.backgroundColor = 'black';
    div.style.zIndex = '99999';
    div.style.display = 'flex';
    div.style.flexDirection = 'column';
    div.style.alignItems = 'center';
    div.style.justifyContent = 'center';
    div.style.color = '#00FF41'; // Matrix Green default
    div.style.opacity = '0';
    div.style.transition = 'opacity 1s ease-in-out';

    div.innerHTML = `
        <div style="font-family: monospace; font-size: 24px; margin-bottom: 20px;">SYSTEM HALTED</div>
        <div style="font-family: monospace; font-size: 14px; margin-bottom: 40px; color: #555;">It is now safe to turn off your computer.</div>
        <button onclick="location.reload()" style="
            background: transparent;
            border: 2px solid #333;
            color: #333;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s;
        " onmouseover="this.style.borderColor='#00FF41'; this.style.color='#00FF41'; this.style.boxShadow='0 0 15px #00FF41'" onmouseout="this.style.borderColor='#333'; this.style.color='#333'; this.style.boxShadow='none'">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
        </button>
    `;

    document.body.appendChild(div);

    // Fade out
    setTimeout(() => {
        div.style.opacity = '1';
    }, 100);
}
