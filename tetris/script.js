// ============ 俄罗斯方块 ============

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayMessage = document.getElementById('overlayMessage');
const restartBtn = document.getElementById('restartBtn');

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = canvas.width / COLS;
const NEXT_SIZE = 24;

const SHAPES = {
    I: [
        [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
        [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
        [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
        [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]],
    ],
    O: [ [[1,1],[1,1]] ],
    T: [
        [[0,1,0],[1,1,1],[0,0,0]],
        [[0,1,0],[0,1,1],[0,1,0]],
        [[0,0,0],[1,1,1],[0,1,0]],
        [[0,1,0],[1,1,0],[0,1,0]],
    ],
    S: [
        [[0,1,1],[1,1,0],[0,0,0]],
        [[0,1,0],[0,1,1],[0,0,1]],
        [[0,0,0],[0,1,1],[1,1,0]],
        [[1,0,0],[1,1,0],[0,1,0]],
    ],
    Z: [
        [[1,1,0],[0,1,1],[0,0,0]],
        [[0,0,1],[0,1,1],[0,1,0]],
        [[0,0,0],[1,1,0],[0,1,1]],
        [[0,1,0],[1,1,0],[1,0,0]],
    ],
    J: [
        [[1,0,0],[1,1,1],[0,0,0]],
        [[0,1,1],[0,1,0],[0,1,0]],
        [[0,0,0],[1,1,1],[0,0,1]],
        [[0,1,0],[0,1,0],[1,1,0]],
    ],
    L: [
        [[0,0,1],[1,1,1],[0,0,0]],
        [[0,1,0],[0,1,0],[0,1,1]],
        [[0,0,0],[1,1,1],[1,0,0]],
        [[1,1,0],[0,1,0],[0,1,0]],
    ],
};

const COLORS = {
    I: '#06b6d4', O: '#facc15', T: '#a855f7',
    S: '#22c55e', Z: '#ef4444', J: '#3b82f6', L: '#f97316',
};

let board = [];
let currentPiece = null;
let nextPiece = null;
let score = 0;
let lines = 0;
let level = 1;
let gameRunning = false;
let gamePaused = false;
let gameLoop = null;
let dropInterval = 500;

function createBoard() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function randomPiece() {
    const types = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    const type = types[Math.floor(Math.random() * types.length)];
    return {
        type,
        shape: SHAPES[type][0],
        rotation: 0,
        x: Math.floor((COLS - SHAPES[type][0][0].length) / 2),
        y: 0,
    };
}

function initGame() {
    createBoard();
    currentPiece = randomPiece();
    nextPiece = randomPiece();
    score = 0; lines = 0; level = 1;
    dropInterval = 500;
    scoreEl.textContent = '0';
    linesEl.textContent = '0';
    levelEl.textContent = '1';
    overlay.classList.add('hidden');
    draw();
    drawNext();
}

function isValid(piece, boardRef) {
    const { shape, x, y } = piece;
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c]) {
                const nx = x + c;
                const ny = y + r;
                if (nx < 0 || nx >= COLS || ny >= ROWS) return false;
                if (ny >= 0 && boardRef[ny][nx]) return false;
            }
        }
    }
    return true;
}

function lockPiece() {
    const { shape, x, y, type } = currentPiece;
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c]) {
                const ny = y + r;
                const nx = x + c;
                if (ny >= 0) board[ny][nx] = type;
            }
        }
    }
    clearLines();
    spawnPiece();
}

function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r].every(cell => cell !== 0)) {
            board.splice(r, 1);
            board.unshift(Array(COLS).fill(0));
            cleared++;
            r++;
        }
    }
    if (cleared > 0) {
        const points = [0, 100, 300, 500, 800];
        score += points[cleared] * level;
        lines += cleared;
        level = Math.floor(lines / 10) + 1;
        dropInterval = Math.max(80, 500 - (level - 1) * 30);
        scoreEl.textContent = score;
        linesEl.textContent = lines;
        levelEl.textContent = level;
        if (gameLoop) {
            clearInterval(gameLoop);
            gameLoop = setInterval(gameTick, dropInterval);
        }
    }
}

function spawnPiece() {
    currentPiece = nextPiece;
    currentPiece.x = Math.floor((COLS - currentPiece.shape[0].length) / 2);
    currentPiece.y = 0;
    nextPiece = randomPiece();
    drawNext();
    if (!isValid(currentPiece, board)) {
        gameOver();
    }
}

function drawBlock(ctx, x, y, color, size, ghost = false) {
    const pad = 1;
    if (ghost) {
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = 2;
        ctx.strokeRect(x * size + pad + 1, y * size + pad + 1, size - pad * 2 - 2, size - pad * 2 - 2);
        ctx.globalAlpha = 1;
    } else {
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 4;
        const r = 3;
        const bx = x * size + pad;
        const by = y * size + pad;
        const bw = size - pad * 2;
        const bh = size - pad * 2;
        ctx.beginPath();
        ctx.moveTo(bx + r, by);
        ctx.lineTo(bx + bw - r, by);
        ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
        ctx.lineTo(bx + bw, by + bh - r);
        ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - r, by + bh);
        ctx.lineTo(bx + r, by + bh);
        ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - r);
        ctx.lineTo(bx, by + r);
        ctx.quadraticCurveTo(bx, by, bx + r, by);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(bx + 3, by + 3, bw - 6, 3);
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 0.5;
    for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * BLOCK_SIZE);
        ctx.lineTo(canvas.width, r * BLOCK_SIZE);
        ctx.stroke();
    }
    for (let c = 0; c <= COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(c * BLOCK_SIZE, 0);
        ctx.lineTo(c * BLOCK_SIZE, canvas.height);
        ctx.stroke();
    }

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c]) {
                drawBlock(ctx, c, r, COLORS[board[r][c]], BLOCK_SIZE);
            }
        }
    }

    if (!currentPiece) return;

    const ghostY = getGhostY();
    const { shape, x, type } = currentPiece;
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c] && ghostY + r >= 0) {
                drawBlock(ctx, x + c, ghostY + r, COLORS[type], BLOCK_SIZE, true);
            }
        }
    }

    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c] && currentPiece.y + r >= 0) {
                drawBlock(ctx, currentPiece.x + c, currentPiece.y + r, COLORS[type], BLOCK_SIZE);
            }
        }
    }
}

function drawNext() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (!nextPiece) return;
    const shape = nextPiece.shape;
    const rows = shape.length;
    const cols = shape[0].length;
    const offX = (nextCanvas.width - cols * NEXT_SIZE) / 2;
    const offY = (nextCanvas.height - rows * NEXT_SIZE) / 2;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (shape[r][c]) {
                const pad = 2;
                nextCtx.fillStyle = COLORS[nextPiece.type];
                nextCtx.shadowColor = COLORS[nextPiece.type];
                nextCtx.shadowBlur = 4;
                const rx = offX + c * NEXT_SIZE + pad;
                const ry = offY + r * NEXT_SIZE + pad;
                const rw = NEXT_SIZE - pad * 2;
                const rh = NEXT_SIZE - pad * 2;
                nextCtx.beginPath();
                nextCtx.roundRect(rx, ry, rw, rh, 3);
                nextCtx.fill();
                nextCtx.shadowBlur = 0;
            }
        }
    }
}

function getGhostY() {
    if (!currentPiece) return 0;
    let gy = currentPiece.y;
    while (isValid({ ...currentPiece, y: gy + 1 }, board)) {
        gy++;
    }
    return gy;
}

function moveLeft() {
    if (!currentPiece || !gameRunning || gamePaused) return;
    const moved = { ...currentPiece, x: currentPiece.x - 1 };
    if (isValid(moved, board)) {
        currentPiece.x--;
        draw();
    }
}

function moveRight() {
    if (!currentPiece || !gameRunning || gamePaused) return;
    const moved = { ...currentPiece, x: currentPiece.x + 1 };
    if (isValid(moved, board)) {
        currentPiece.x++;
        draw();
    }
}

function rotate() {
    if (!currentPiece || !gameRunning || gamePaused) return;
    const type = currentPiece.type;
    if (type === 'O') return;
    const newRotation = (currentPiece.rotation + 1) % SHAPES[type].length;
    const newShape = SHAPES[type][newRotation];
    const rotated = { ...currentPiece, shape: newShape, rotation: newRotation };

    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
        const kicked = { ...rotated, x: rotated.x + kick };
        if (isValid(kicked, board)) {
            currentPiece.shape = newShape;
            currentPiece.rotation = newRotation;
            currentPiece.x += kick;
            draw();
            return;
        }
    }
}

function softDrop() {
    if (!currentPiece || !gameRunning || gamePaused) return;
    const moved = { ...currentPiece, y: currentPiece.y + 1 };
    if (isValid(moved, board)) {
        currentPiece.y++;
        draw();
    }
}

function hardDrop() {
    if (!currentPiece || !gameRunning || gamePaused) return;
    currentPiece.y = getGhostY();
    lockPiece();
    draw();
}

function gameTick() {
    if (!gameRunning || gamePaused || !currentPiece) return;
    const moved = { ...currentPiece, y: currentPiece.y + 1 };
    if (isValid(moved, board)) {
        currentPiece.y++;
        draw();
    } else {
        lockPiece();
        draw();
    }
}

function gameOver() {
    gameRunning = false;
    if (gameLoop) {
        clearInterval(gameLoop);
        gameLoop = null;
    }
    overlay.classList.remove('hidden');
    overlayTitle.textContent = '💀 游戏结束';
    overlayTitle.style.color = '#f87171';
    overlayMessage.textContent = `得分: ${score}`;
}

function handleKeyDown(e) {
    const key = e.key;
    if (key === 'p' || key === 'P') {
        if (!gameRunning) return;
        gamePaused = !gamePaused;
        return;
    }
    switch (key) {
        case 'ArrowLeft':  moveLeft(); break;
        case 'ArrowRight': moveRight(); break;
        case 'ArrowUp':    rotate(); break;
        case 'ArrowDown':  softDrop(); break;
        case ' ': case 'Space':
            e.preventDefault();
            hardDrop();
            break;
        default: return;
    }
    e.preventDefault();
}

function startGame() {
    if (gameLoop) clearInterval(gameLoop);
    initGame();
    gameRunning = true;
    gamePaused = false;
    gameLoop = setInterval(gameTick, dropInterval);
}

document.addEventListener('keydown', handleKeyDown);
restartBtn.addEventListener('click', startGame);
startGame();
