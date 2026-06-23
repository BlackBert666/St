// ============ 贪吃蛇游戏 ============

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayMessage = document.getElementById('overlayMessage');
const restartBtn = document.getElementById('restartBtn');

// 游戏配置
const GRID_SIZE = 20;       // 20x20 网格
const CELL_SIZE = canvas.width / GRID_SIZE;

// 游戏状态
let snake = [];
let food = {};
let direction = 'RIGHT';
let nextDirection = 'RIGHT';
let score = 0;
let highScore = parseInt(localStorage.getItem('snakeHighScore')) || 0;
let gameRunning = false;
let gamePaused = false;
let gameLoop = null;
let speed = 150;

// 初始化最高分显示
highScoreEl.textContent = highScore;

// ============ 蛇与食物 ============

function initGame() {
    const startX = Math.floor(GRID_SIZE / 2);
    const startY = Math.floor(GRID_SIZE / 2);
    snake = [
        { x: startX, y: startY },
        { x: startX - 1, y: startY },
        { x: startX - 2, y: startY }
    ];
    direction = 'RIGHT';
    nextDirection = 'RIGHT';
    score = 0;
    scoreEl.textContent = '0';
    overlay.classList.add('hidden');
    spawnFood();
}

function spawnFood() {
    const totalCells = GRID_SIZE * GRID_SIZE;
    if (snake.length >= totalCells) {
        gameOver(true);
        return;
    }

    const snakeSet = new Set(snake.map(s => `${s.x},${s.y}`));
    const freeCells = [];
    for (let x = 0; x < GRID_SIZE; x++) {
        for (let y = 0; y < GRID_SIZE; y++) {
            if (!snakeSet.has(`${x},${y}`)) {
                freeCells.push({ x, y });
            }
        }
    }
    food = freeCells[Math.floor(Math.random() * freeCells.length)];
}

// ============ 绘制 ============

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(canvas.width, i * CELL_SIZE);
        ctx.stroke();
    }

    const fx = food.x * CELL_SIZE;
    const fy = food.y * CELL_SIZE;
    const padding = 2;

    ctx.shadowColor = '#4ade80';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#f87171';
    ctx.beginPath();
    ctx.arc(fx + CELL_SIZE / 2, fy + CELL_SIZE / 2, CELL_SIZE / 2 - padding, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#fca5a5';
    ctx.beginPath();
    ctx.arc(fx + CELL_SIZE / 2 - 2, fy + CELL_SIZE / 2 - 2, CELL_SIZE / 4, 0, Math.PI * 2);
    ctx.fill();

    snake.forEach((segment, index) => {
        const sx = segment.x * CELL_SIZE;
        const sy = segment.y * CELL_SIZE;

        const ratio = index / snake.length;
        const green = Math.floor(222 - ratio * 80);
        const blue = Math.floor(128 - ratio * 80);
        const red = Math.floor(74 - ratio * 30);

        ctx.shadowColor = 'rgba(74, 222, 128, 0.3)';
        ctx.shadowBlur = index === 0 ? 16 : 6;
        ctx.fillStyle = index === 0
            ? '#4ade80'
            : `rgb(${red}, ${green}, ${blue})`;

        const r = 4;
        const x = sx + 1;
        const y = sy + 1;
        const w = CELL_SIZE - 2;
        const h = CELL_SIZE - 2;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;

        if (index === 0) {
            ctx.fillStyle = '#fff';
            const eyeR = 2.5;
            let ex1, ey1, ex2, ey2;
            switch (direction) {
                case 'RIGHT':
                    ex1 = sx + CELL_SIZE - 5; ey1 = sy + 4;
                    ex2 = sx + CELL_SIZE - 5; ey2 = sy + CELL_SIZE - 4;
                    break;
                case 'LEFT':
                    ex1 = sx + 5; ey1 = sy + 4;
                    ex2 = sx + 5; ey2 = sy + CELL_SIZE - 4;
                    break;
                case 'UP':
                    ex1 = sx + 4; ey1 = sy + 5;
                    ex2 = sx + CELL_SIZE - 4; ey2 = sy + 5;
                    break;
                case 'DOWN':
                    ex1 = sx + 4; ey1 = sy + CELL_SIZE - 5;
                    ex2 = sx + CELL_SIZE - 4; ey2 = sy + CELL_SIZE - 5;
                    break;
            }
            ctx.beginPath();
            ctx.arc(ex1, ey1, eyeR, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(ex2, ey2, eyeR, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#111';
            ctx.beginPath();
            ctx.arc(ex1, ey1, 1.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(ex2, ey2, 1.2, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

// ============ 游戏逻辑 ============

function update() {
    if (gamePaused) return;
    direction = nextDirection;

    const head = snake[0];
    let newHead = { ...head };
    switch (direction) {
        case 'RIGHT': newHead.x++; break;
        case 'LEFT':  newHead.x--; break;
        case 'UP':    newHead.y--; break;
        case 'DOWN':  newHead.y++; break;
    }

    if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        gameOver(false);
        return;
    }

    const bodyCollision = snake.some((seg, i) =>
        i !== snake.length - 1 && seg.x === newHead.x && seg.y === newHead.y
    );
    if (bodyCollision) {
        gameOver(false);
        return;
    }

    snake.unshift(newHead);

    if (newHead.x === food.x && newHead.y === food.y) {
        score++;
        scoreEl.textContent = score;
        if (score > highScore) {
            highScore = score;
            highScoreEl.textContent = highScore;
            localStorage.setItem('snakeHighScore', highScore);
        }
        spawnFood();
        if (speed > 80) speed -= 2;
    } else {
        snake.pop();
    }

    draw();
}

function gameOver(won = false) {
    gameRunning = false;
    clearInterval(gameLoop);
    gameLoop = null;

    overlay.classList.remove('hidden');
    if (won) {
        overlayTitle.textContent = '🎉 你赢了！';
        overlayTitle.style.color = '#4ade80';
        overlayMessage.textContent = `完美通关！得分: ${score}`;
    } else {
        overlayTitle.textContent = '💀 游戏结束';
        overlayTitle.style.color = '#f87171';
        overlayMessage.textContent = `得分: ${score}`;
    }
}

// ============ 控制 ============

function handleKeyDown(e) {
    const key = e.key;

    if (key === ' ' || key === 'Space') {
        e.preventDefault();
        if (!gameRunning) return;
        gamePaused = !gamePaused;
        return;
    }

    const keyMap = {
        'ArrowUp': 'UP',
        'ArrowDown': 'DOWN',
        'ArrowLeft': 'LEFT',
        'ArrowRight': 'RIGHT',
        'w': 'UP',
        's': 'DOWN',
        'a': 'LEFT',
        'd': 'RIGHT',
    };

    const newDir = keyMap[key];
    if (!newDir) return;
    e.preventDefault();

    const opposites = { 'UP': 'DOWN', 'DOWN': 'UP', 'LEFT': 'RIGHT', 'RIGHT': 'LEFT' };
    if (newDir !== opposites[direction]) {
        nextDirection = newDir;
    }
}

// ============ 启动/重启 ============

function startGame() {
    if (gameLoop) clearInterval(gameLoop);
    speed = 150;
    initGame();
    draw();
    gameRunning = true;
    gamePaused = false;
    gameLoop = setInterval(update, speed);
}

document.addEventListener('keydown', handleKeyDown);
restartBtn.addEventListener('click', startGame);

startGame();
