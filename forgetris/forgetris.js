(() => {
    const COLS = 10;
    const ROWS = 20;
    const CELL = 30;
    const HIGH_SCORE_KEY = "forgetris.highScore";
    const GRID_PREF_KEY = "forgetris.showGrid";
    const MUSIC_PREF_KEY = "forgetris.musicEnabled";

    const SHAPES = {
        I: [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ],
        O: [
            [1, 1],
            [1, 1]
        ],
        T: [
            [0, 1, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        S: [
            [0, 1, 1],
            [1, 1, 0],
            [0, 0, 0]
        ],
        Z: [
            [1, 1, 0],
            [0, 1, 1],
            [0, 0, 0]
        ],
        J: [
            [1, 0, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        L: [
            [0, 0, 1],
            [1, 1, 1],
            [0, 0, 0]
        ]
    };

    const COLORS = {
        I: "#00e5ff",
        O: "#ffd500",
        T: "#c04dff",
        S: "#00ff41",
        Z: "#ff3860",
        J: "#3b82f6",
        L: "#ff8c00"
    };

    const LINE_POINTS = [0, 100, 300, 500, 800];

    const boardCanvas = document.getElementById("board");
    const ctx = boardCanvas.getContext("2d");
    const nextCanvas = document.getElementById("next-canvas");
    const nextCtx = nextCanvas.getContext("2d");

    const scoreEl = document.getElementById("score");
    const highScoreEl = document.getElementById("high-score");
    const levelEl = document.getElementById("level");
    const linesEl = document.getElementById("lines");
    const gridToggle = document.getElementById("grid-toggle");
    const musicToggle = document.getElementById("music-toggle");
    const overlay = document.getElementById("overlay");
    const overlaySubtitle = document.getElementById("overlay-subtitle");
    const finalStats = document.getElementById("final-stats");
    const finalScoreEl = document.getElementById("final-score");
    const startBtn = document.getElementById("start-btn");
    const pauseBtn = document.getElementById("pause-btn");
    const restartBtn = document.getElementById("restart-btn");

    // Pre-build a subtle 4x4 dithered pattern canvas per color for ghost piece rendering
    const ditherPatterns = {};
    function getDitherPattern(color) {
        if (ditherPatterns[color]) return ditherPatterns[color];
        const pCanvas = document.createElement("canvas");
        pCanvas.width = 4;
        pCanvas.height = 4;
        const pCtx = pCanvas.getContext("2d");
        pCtx.fillStyle = color;
        pCtx.globalAlpha = 0.45;
        // Checkerboard dither
        pCtx.fillRect(0, 0, 2, 2);
        pCtx.fillRect(2, 2, 2, 2);
        pCtx.globalAlpha = 0.14;
        pCtx.fillRect(2, 0, 2, 2);
        pCtx.fillRect(0, 2, 2, 2);
        ditherPatterns[color] = ctx.createPattern(pCanvas, "repeat");
        return ditherPatterns[color];
    }

    let board = createEmptyBoard();
    let bag = [];
    let current = null;
    let nextType = null;
    let score = 0;
    let highScore = Number(localStorage.getItem(HIGH_SCORE_KEY)) || 0;
    let lines = 0;
    let level = 1;
    let showGrid = localStorage.getItem(GRID_PREF_KEY) !== "false";
    let musicEnabled = localStorage.getItem(MUSIC_PREF_KEY) !== "false";
    let gameState = "idle"; // idle | playing | paused | gameover
    let lastTime = 0;
    let dropCounter = 0;
    let animId = null;

    gridToggle.checked = showGrid;
    musicToggle.checked = musicEnabled;
    if (window.ForgetrisAudio) {
        window.ForgetrisAudio.setEnabled(musicEnabled);
    }
    highScoreEl.textContent = highScore;

    function createEmptyBoard() {
        return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    }

    function refillBag() {
        const types = Object.keys(SHAPES);
        for (let i = types.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [types[i], types[j]] = [types[j], types[i]];
        }
        bag.push(...types);
    }

    function pullType() {
        if (bag.length === 0) refillBag();
        return bag.pop();
    }

    function createPiece(type) {
        const matrix = SHAPES[type].map((row) => [...row]);
        return {
            type,
            matrix,
            color: COLORS[type],
            x: Math.floor((COLS - matrix[0].length) / 2),
            y: 0
        };
    }

    function getDropInterval() {
        return Math.max(85, Math.round(800 * Math.pow(0.86, level - 1)));
    }

    function collides(piece, offsetX = 0, offsetY = 0, testMatrix = piece.matrix) {
        for (let r = 0; r < testMatrix.length; r++) {
            for (let c = 0; c < testMatrix[r].length; c++) {
                if (!testMatrix[r][c]) continue;
                const nx = piece.x + c + offsetX;
                const ny = piece.y + r + offsetY;
                if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
                if (ny >= 0 && board[ny][nx]) return true;
            }
        }
        return false;
    }

    function rotateMatrix(matrix, dir = 1) {
        const size = matrix.length;
        const rotated = Array.from({ length: size }, () => Array(size).fill(0));
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (dir > 0) {
                    rotated[c][size - 1 - r] = matrix[r][c];
                } else {
                    rotated[size - 1 - c][r] = matrix[r][c];
                }
            }
        }
        return rotated;
    }

    function tryRotate(dir = 1) {
        if (!current) return;
        const rotated = rotateMatrix(current.matrix, dir);
        const kicks = [0, -1, 1, -2, 2];
        for (const kick of kicks) {
            if (!collides(current, kick, 0, rotated)) {
                current.matrix = rotated;
                current.x += kick;
                return;
            }
        }
    }

    function move(dx) {
        if (!current) return false;
        if (!collides(current, dx, 0)) {
            current.x += dx;
            return true;
        }
        return false;
    }

    function getGhostY() {
        let dy = 0;
        while (!collides(current, 0, dy + 1)) {
            dy++;
        }
        return current.y + dy;
    }

    function lockPiece() {
        for (let r = 0; r < current.matrix.length; r++) {
            for (let c = 0; c < current.matrix[r].length; c++) {
                if (!current.matrix[r][c]) continue;
                const by = current.y + r;
                const bx = current.x + c;
                if (by < 0) {
                    triggerGameOver();
                    return;
                }
                board[by][bx] = current.color;
            }
        }
        clearLines();
        spawnNext();
    }

    function clearLines() {
        let cleared = 0;
        for (let r = ROWS - 1; r >= 0; r--) {
            if (board[r].every((cell) => cell !== null)) {
                board.splice(r, 1);
                board.unshift(Array(COLS).fill(null));
                cleared++;
                r++;
            }
        }
        if (cleared > 0) {
            score += LINE_POINTS[cleared] * level;
            lines += cleared;
            level = Math.floor(lines / 10) + 1;
            if (window.ForgetrisAudio) {
                window.ForgetrisAudio.setLevel(level);
            }
            updateHUD();
        }
    }

    function spawnNext() {
        current = createPiece(nextType);
        nextType = pullType();
        drawNext();
        if (collides(current, 0, 0)) {
            triggerGameOver();
        }
    }

    function softDrop() {
        if (!current) return;
        if (!collides(current, 0, 1)) {
            current.y++;
            score += 1;
            updateHUD();
            dropCounter = 0;
        } else {
            lockPiece();
            dropCounter = 0;
        }
    }

    function hardDrop() {
        if (!current) return;
        const ghostY = getGhostY();
        const dropped = ghostY - current.y;
        current.y = ghostY;
        if (dropped > 0) {
            score += dropped * 2;
            updateHUD();
        }
        lockPiece();
        dropCounter = 0;
    }

    function updateHUD() {
        scoreEl.textContent = score;
        linesEl.textContent = lines;
        levelEl.textContent = level;
        if (score > highScore) {
            highScore = score;
            highScoreEl.textContent = highScore;
            localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
        }
    }

    function drawBlock(targetCtx, x, y, size, color) {
        const px = x * size;
        const py = y * size;
        targetCtx.fillStyle = color;
        targetCtx.fillRect(px + 1, py + 1, size - 2, size - 2);

        // Subtle top-left highlight and bottom-right shadow for crisp definition
        targetCtx.fillStyle = "rgba(255, 255, 255, 0.25)";
        targetCtx.fillRect(px + 1, py + 1, size - 2, 3);
        targetCtx.fillRect(px + 1, py + 1, 3, size - 2);

        targetCtx.fillStyle = "rgba(0, 0, 0, 0.35)";
        targetCtx.fillRect(px + 1, py + size - 4, size - 2, 3);
        targetCtx.fillRect(px + size - 4, py + 1, 3, size - 2);
    }

    function drawGhostBlock(x, y, color) {
        const px = x * CELL;
        const py = y * CELL;
        ctx.fillStyle = getDitherPattern(color);
        ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);

        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 1.5, py + 1.5, CELL - 3, CELL - 3);
        ctx.globalAlpha = 1;
    }

    function drawGrid() {
        if (!showGrid) return;
        ctx.strokeStyle = "rgba(0, 255, 65, 0.12)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let c = 1; c < COLS; c++) {
            const x = c * CELL + 0.5;
            ctx.moveTo(x, 0);
            ctx.lineTo(x, ROWS * CELL);
        }
        for (let r = 1; r < ROWS; r++) {
            const y = r * CELL + 0.5;
            ctx.moveTo(0, y);
            ctx.lineTo(COLS * CELL, y);
        }
        ctx.stroke();
    }

    function drawBoard() {
        ctx.fillStyle = "#020502";
        ctx.fillRect(0, 0, boardCanvas.width, boardCanvas.height);

        drawGrid();

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (board[r][c]) {
                    drawBlock(ctx, c, r, CELL, board[r][c]);
                }
            }
        }

        if (current && gameState !== "idle") {
            const ghostY = getGhostY();
            for (let r = 0; r < current.matrix.length; r++) {
                for (let c = 0; c < current.matrix[r].length; c++) {
                    if (!current.matrix[r][c]) continue;
                    const gx = current.x + c;
                    const gy = ghostY + r;
                    if (gy >= 0) {
                        drawGhostBlock(gx, gy, current.color);
                    }
                }
            }

            for (let r = 0; r < current.matrix.length; r++) {
                for (let c = 0; c < current.matrix[r].length; c++) {
                    if (!current.matrix[r][c]) continue;
                    const py = current.y + r;
                    if (py >= 0) {
                        drawBlock(ctx, current.x + c, py, CELL, current.color);
                    }
                }
            }
        }
    }

    function drawNext() {
        nextCtx.fillStyle = "#020502";
        nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
        if (!nextType) return;

        const matrix = SHAPES[nextType];
        const color = COLORS[nextType];
        const previewCell = 22;

        // Compute bounding box of filled cells to center accurately
        let minR = matrix.length, maxR = -1, minC = matrix[0].length, maxC = -1;
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
                if (matrix[r][c]) {
                    if (r < minR) minR = r;
                    if (r > maxR) maxR = r;
                    if (c < minC) minC = c;
                    if (c > maxC) maxC = c;
                }
            }
        }

        const shapeW = (maxC - minC + 1) * previewCell;
        const shapeH = (maxR - minR + 1) * previewCell;
        const offsetX = (nextCanvas.width - shapeW) / 2;
        const offsetY = (nextCanvas.height - shapeH) / 2;

        for (let r = minR; r <= maxR; r++) {
            for (let c = minC; c <= maxC; c++) {
                if (!matrix[r][c]) continue;
                const px = offsetX + (c - minC) * previewCell;
                const py = offsetY + (r - minR) * previewCell;
                nextCtx.fillStyle = color;
                nextCtx.fillRect(px + 1, py + 1, previewCell - 2, previewCell - 2);
                nextCtx.fillStyle = "rgba(255, 255, 255, 0.25)";
                nextCtx.fillRect(px + 1, py + 1, previewCell - 2, 2);
            }
        }
    }

    function loop(timestamp) {
        if (gameState !== "playing") return;
        const delta = timestamp - lastTime;
        lastTime = timestamp;
        dropCounter += delta;

        if (dropCounter >= getDropInterval()) {
            if (!collides(current, 0, 1)) {
                current.y++;
            } else {
                lockPiece();
            }
            dropCounter = 0;
        }

        drawBoard();
        animId = requestAnimationFrame(loop);
    }

    function startGame() {
        if (animId) cancelAnimationFrame(animId);
        board = createEmptyBoard();
        bag = [];
        score = 0;
        lines = 0;
        level = 1;
        dropCounter = 0;
        nextType = pullType();
        spawnNext();
        updateHUD();

        gameState = "playing";
        overlay.classList.add("hidden");
        finalStats.classList.add("d-none");
        pauseBtn.disabled = false;
        pauseBtn.innerHTML = '<i class="bi bi-pause-fill"></i> Pause';

        lastTime = performance.now();
        drawBoard();
        if (window.ForgetrisAudio) {
            window.ForgetrisAudio.setLevel(level);
            window.ForgetrisAudio.start(true);
        }
        animId = requestAnimationFrame(loop);
    }

    function togglePause() {
        if (gameState === "playing") {
            gameState = "paused";
            if (animId) cancelAnimationFrame(animId);
            if (window.ForgetrisAudio) window.ForgetrisAudio.pause();
            overlaySubtitle.textContent = "Game Paused";
            finalStats.classList.add("d-none");
            startBtn.innerHTML = '<i class="bi bi-play-fill"></i> Resume';
            overlay.classList.remove("hidden");
            pauseBtn.innerHTML = '<i class="bi bi-play-fill"></i> Resume';
        } else if (gameState === "paused") {
            gameState = "playing";
            overlay.classList.add("hidden");
            pauseBtn.innerHTML = '<i class="bi bi-pause-fill"></i> Pause';
            if (window.ForgetrisAudio) window.ForgetrisAudio.start(false);
            lastTime = performance.now();
            animId = requestAnimationFrame(loop);
        }
    }

    function triggerGameOver() {
        gameState = "gameover";
        if (animId) cancelAnimationFrame(animId);
        if (window.ForgetrisAudio) window.ForgetrisAudio.stop();
        overlaySubtitle.textContent = "Game Over";
        finalScoreEl.textContent = score;
        finalStats.classList.remove("d-none");
        startBtn.innerHTML = '<i class="bi bi-arrow-counterclockwise"></i> Play Again';
        overlay.classList.remove("hidden");
        pauseBtn.disabled = true;
    }

    function handleAction(action) {
        if (gameState !== "playing") return;
        switch (action) {
            case "left":
                move(-1);
                break;
            case "right":
                move(1);
                break;
            case "down":
                softDrop();
                break;
            case "rotate":
                tryRotate(1);
                break;
            case "rotateCCW":
                tryRotate(-1);
                break;
            case "hardDrop":
                hardDrop();
                break;
        }
        drawBoard();
    }

    function toggleMusic(nextVal) {
        musicEnabled = typeof nextVal === "boolean" ? nextVal : !musicEnabled;
        musicToggle.checked = musicEnabled;
        localStorage.setItem(MUSIC_PREF_KEY, String(musicEnabled));
        if (window.ForgetrisAudio) {
            window.ForgetrisAudio.setEnabled(musicEnabled);
            if (musicEnabled && gameState === "playing") {
                window.ForgetrisAudio.start(false);
            }
        }
    }

    document.addEventListener("keydown", (e) => {
        if (e.key === "m" || e.key === "M") {
            e.preventDefault();
            toggleMusic();
            return;
        }
        if (e.key === "p" || e.key === "P" || e.key === "Escape") {
            if (gameState === "playing" || gameState === "paused") {
                e.preventDefault();
                togglePause();
            }
            return;
        }
        if (e.key === "r" || e.key === "R") {
            if (gameState !== "idle") {
                e.preventDefault();
                startGame();
            }
            return;
        }

        if (gameState !== "playing") return;

        switch (e.key) {
            case "ArrowLeft":
            case "a":
            case "A":
                e.preventDefault();
                handleAction("left");
                break;
            case "ArrowRight":
            case "d":
            case "D":
                e.preventDefault();
                handleAction("right");
                break;
            case "ArrowDown":
            case "s":
            case "S":
                e.preventDefault();
                handleAction("down");
                break;
            case "ArrowUp":
            case "w":
            case "W":
            case "x":
            case "X":
                e.preventDefault();
                handleAction("rotate");
                break;
            case "z":
            case "Z":
                e.preventDefault();
                handleAction("rotateCCW");
                break;
            case " ":
                e.preventDefault();
                handleAction("hardDrop");
                break;
        }
    });

    document.querySelectorAll(".ctrl-btn").forEach((btn) => {
        btn.addEventListener("click", () => handleAction(btn.dataset.action));
    });

    gridToggle.addEventListener("change", () => {
        showGrid = gridToggle.checked;
        localStorage.setItem(GRID_PREF_KEY, String(showGrid));
        drawBoard();
    });

    musicToggle.addEventListener("change", () => {
        toggleMusic(musicToggle.checked);
    });

    startBtn.addEventListener("click", () => {
        if (gameState === "paused") {
            togglePause();
        } else {
            startGame();
        }
    });

    pauseBtn.addEventListener("click", togglePause);
    restartBtn.addEventListener("click", startGame);

    // Initial render
    drawBoard();
    drawNext();
})();
