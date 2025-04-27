document.addEventListener('DOMContentLoaded', () => {
    // --- Riferimenti Elementi DOM ---
    const canvas = document.getElementById('game-canvas');
    const messageArea = document.getElementById('message-area');
    const criticalErrorArea = document.getElementById('critical-error-area');
    const pauseButton = document.getElementById('pause-button');
    const resumeButton = document.getElementById('resume-button');
    const newGameButtonPause = document.getElementById('new-game-button-pause');
    const newGameButtonGameOver = document.getElementById('new-game-button-gameover');
    const pauseControls = document.getElementById('pause-controls');
    const pauseOverlay = document.getElementById('pause-overlay');
    const gameoverOverlay = document.getElementById('gameover-overlay');
    const finalScoreDisplay = document.getElementById('final-score');
    const startButton = document.getElementById('start-button');
    const gameActiveControls = document.getElementById('game-active-controls');
    const gamesPlayedDisplay = document.getElementById('games-played-count');
    const linesClearedDisplay = document.getElementById('lines-cleared-count');
    // MODIFICA: ID display punteggio corrente
    const currentScoreDisplay = document.getElementById('current-score-display');
    const nextPieceCanvas = document.getElementById('next-piece-canvas');

    // Verifica esistenza elementi critici
    if (!canvas || !messageArea || !criticalErrorArea || !pauseButton || !resumeButton || !newGameButtonPause || !newGameButtonGameOver || !pauseControls || !pauseOverlay || !gameoverOverlay || !finalScoreDisplay || !gamesPlayedDisplay || !linesClearedDisplay || !currentScoreDisplay || !startButton || !gameActiveControls || !nextPieceCanvas) { // Aggiornato check ID punteggio
        console.error("Tetris PSI: Impossibile trovare uno o più elementi DOM necessari. Il gioco non può avviarsi.");
        if (criticalErrorArea) criticalErrorArea.textContent = "ERRORE CRITICO: Elementi dell'interfaccia mancanti.";
        if (startButton) startButton.classList.add('hidden');
        if (gameActiveControls) gameActiveControls.classList.add('hidden');
        const gameWrapper = document.getElementById('game-area-wrapper');
        if(gameWrapper) gameWrapper.classList.add('hidden');
        return;
    }

    const ctx = canvas.getContext('2d');
    const nextCtx = nextPieceCanvas.getContext('2d');

    if (!ctx || !nextCtx) {
        console.error("Tetris PSI: Impossibile ottenere i contesti 2D dai canvas.");
        if (criticalErrorArea) criticalErrorArea.textContent = "ERRORE CRITICO: Il browser non supporta Canvas 2D.";
        startButton.classList.add('hidden');
        const gameWrapper = document.getElementById('game-area-wrapper');
        if(gameWrapper) gameWrapper.classList.add('hidden');
        return;
    }

    // --- Costanti di Gioco ---
    const COLS = 12;
    const ROWS = 18;
    const BLOCK_SIZE = canvas.width / COLS; // 30
    const GRID_LINE_COLOR = '#333';
    const GHOST_ALPHA = 0.3;

    // MODIFICA: Costante per bonus soft drop
    const SCORE_SOFT_DROP = 1; // Punti per ogni riga scesa manualmente

    // MODIFICA: Intervallo accelerato per soft drop (in ms)
    const SOFT_DROP_INTERVAL = 50; // Molto veloce

    // Forme e Colori (invariati)
    const SHAPES = [ [[1, 1, 1, 1]], [[1, 1], [1, 1]], [[0, 1, 0], [1, 1, 1]], [[0, 1, 1], [1, 1, 0]], [[1, 1, 0], [0, 1, 1]], [[1, 0, 0], [1, 1, 1]], [[0, 0, 1], [1, 1, 1]] ];
    const COLORS = [ null, '#00EFFF', '#FFFA00', '#C800FF', '#00F800', '#F80000', '#0060FF', '#FF9800' ];

    // Punteggi per linea (con bonus implicito)
    const SCORE_PER_LINE = [0, 10, 25, 50, 100];

    // Velocità
    const LINES_FOR_SPEED_INCREASE = 10;
    const INITIAL_SPEED_MS = 800;
    const MIN_SPEED_MS = 100;
    const SPEED_MULTIPLIER = 0.9;

    // --- Stato del Gioco ---
    let board = [];
    let currentPiece = null;
    let nextPiece = null;
    let currentScore = 0;
    // let totalScore = 0; // Non più necessario per la UI live, ma utile per sessioni future
    let linesCleared = 0;
    let gamesPlayed = 0;
    let isPaused = false;
    let isGameOver = false;
    let gameLoopTimeout = null;
    let currentSpeed = INITIAL_SPEED_MS;
    let gameStarted = false;
    // MODIFICA: Flag e timer per soft drop continuo
    let softDropActive = false;
    let softDropTimeout = null;

    // --- Funzioni di Disegno ---

    // Disegna blocco (invariato)
    function drawBlock(context, x, y, color, blockSize = BLOCK_SIZE) {
        context.fillStyle = color;
        context.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);
        context.strokeStyle = GRID_LINE_COLOR;
        context.lineWidth = 1.5;
        context.strokeRect(x * blockSize + 1, y * blockSize + 1, blockSize - 2, blockSize - 2);
    }

    // Disegna board (invariato)
    function drawBoard() {
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const colorIndex = board[r][c];
                if (colorIndex) { drawBlock(ctx, c, r, COLORS[colorIndex]); }
            }
        }
    }

    // Disegna pezzo (invariato)
    function drawPiece(piece, context = ctx, alpha = 1.0, offsetX = 0, offsetY = 0, blockSize = BLOCK_SIZE) {
        if (!piece) return;
        const originalAlpha = context.globalAlpha;
        context.globalAlpha = alpha;
        context.fillStyle = piece.color;
        piece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) { drawBlock(context, piece.x + x + offsetX, piece.y + y + offsetY, piece.color, blockSize); }
            });
        });
        context.globalAlpha = originalAlpha;
    }

    // Calcola posizione fantasma (invariato)
    function calculateGhostPosition(piece) {
        if (!piece) return -1;
        let ghostY = piece.y;
        while (isValidMove(piece.x, ghostY + 1, piece.shape)) { ghostY++; }
        return ghostY;
    }

    // Disegna fantasma (invariato)
    function drawGhostPiece(piece) {
        const ghostY = calculateGhostPosition(piece);
        if (ghostY === -1 || ghostY === piece.y) return;
        const ghostPiece = { ...piece, y: ghostY };
        drawPiece(ghostPiece, ctx, GHOST_ALPHA);
    }

    // Disegna pezzo successivo (invariato)
    function drawNextPiece() {
        if (!nextPiece) return;
        nextCtx.fillStyle = 'transparent'; // Usa lo sfondo del parent
        nextCtx.clearRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height); // Pulisci
        const shape = nextPiece.shape;
        const shapeWidth = shape[0].length;
        const shapeHeight = shape.length;
        const previewBlockSize = nextPieceCanvas.width / 4;
        const offsetX = (4 - shapeWidth) / 2;
        const offsetY = (4 - shapeHeight) / 2;
        const previewPiece = { ...nextPiece, x: 0, y: 0 };
        drawPiece(previewPiece, nextCtx, 1.0, offsetX, offsetY, previewBlockSize);
    }

    // Pulisce canvas (invariato)
    function clearCanvas(context = ctx, canvasEl = canvas) {
        context.fillStyle = getComputedStyle(canvasEl.parentElement).backgroundColor || '#1a1a1a';
        context.fillRect(0, 0, canvasEl.width, canvasEl.height);
    }

    // --- Funzioni Logiche di Gioco ---

    // Crea board vuota (invariato)
    function createEmptyBoard() {
        return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    }

    // Genera pezzo random (invariato)
    function generateRandomPiece() {
        const shapeIndex = Math.floor(Math.random() * SHAPES.length);
        const shape = SHAPES[shapeIndex];
        const colorIndex = shapeIndex + 1;
        const color = COLORS[colorIndex];
        return { x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0, shape: shape, shapeIndex: colorIndex, color: color };
    }

    // Spawn con pezzo successivo (invariato)
    function spawnPiece() {
        currentPiece = nextPiece ? { ...nextPiece } : generateRandomPiece();
        currentPiece.x = Math.floor(COLS / 2) - Math.floor(currentPiece.shape[0].length / 2);
        currentPiece.y = 0;
        nextPiece = generateRandomPiece();
        drawNextPiece();
        if (!isValidMove(currentPiece.x, currentPiece.y, currentPiece.shape)) {
            freezePiece(); // Fissa anche se collide subito per mostrare dove
            redrawGame();
            gameOver();
        }
    }

    // Check mossa valida (invariato)
    function isValidMove(newX, newY, shape) {
        if (!shape) return false;
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    const boardX = newX + x;
                    const boardY = newY + y;
                    if (boardX < 0 || boardX >= COLS || boardY >= ROWS) return false;
                    if (boardY >= 0 && board[boardY][boardX] !== 0) return false;
                }
            }
        }
        return true;
    }

    // Muove pezzo (invariato)
    function movePiece(dx, dy) {
        if (!gameStarted || isPaused || isGameOver || !currentPiece) return false;
        const newX = currentPiece.x + dx;
        const newY = currentPiece.y + dy;
        if (isValidMove(newX, newY, currentPiece.shape)) {
            currentPiece.x = newX;
            currentPiece.y = newY;
            return true;
        }
        return false;
    }

    // Ruota pezzo (invariato)
    function rotatePiece() {
        if (!gameStarted || isPaused || isGameOver || !currentPiece) return;
        const originalShape = currentPiece.shape;
        const numRows = originalShape.length;
        const numCols = originalShape[0].length;
        const rotatedShape = [];
        for (let x = 0; x < numCols; x++) { rotatedShape[x] = []; for (let y = 0; y < numRows; y++) { rotatedShape[x][y] = originalShape[numRows - 1 - y][x]; } }
        let kickX = 0;
        if (!isValidMove(currentPiece.x, currentPiece.y, rotatedShape)) {
            if (isValidMove(currentPiece.x + 1, currentPiece.y, rotatedShape)) kickX = 1;
            else if (isValidMove(currentPiece.x - 1, currentPiece.y, rotatedShape)) kickX = -1;
            else if (numCols === 4 && isValidMove(currentPiece.x + 2, currentPiece.y, rotatedShape)) kickX = 2;
            else if (numCols === 4 && isValidMove(currentPiece.x - 2, currentPiece.y, rotatedShape)) kickX = -2;
            else return;
        }
        currentPiece.x += kickX;
        currentPiece.shape = rotatedShape;
        redrawGame();
    }

    // Fissa pezzo (invariato)
    function freezePiece() {
        if (!currentPiece) return;
        let causedGameOver = false;
        currentPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    const boardX = currentPiece.x + x;
                    const boardY = currentPiece.y + y;
                    if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) { board[boardY][boardX] = currentPiece.shapeIndex; }
                    else if (boardY < 0 && !isGameOver) { causedGameOver = true; }
                }
            });
        });
        currentPiece = null;
        if (causedGameOver) { gameOver(); }
    }

    // Pulisci linee (invariato)
    function clearLines() {
        if (isGameOver) return 0;
        let linesToClear = [];
        for (let r = ROWS - 1; r >= 0; r--) { if (board[r].every(cell => cell !== 0)) { linesToClear.push(r); } }
        const numLinesCleared = linesToClear.length;
        if (numLinesCleared > 0) {
            linesToClear.sort((a, b) => b - a);
            linesToClear.forEach(rowIndex => { board.splice(rowIndex, 1); });
            for (let i = 0; i < numLinesCleared; i++) { board.unshift(Array(COLS).fill(0)); }
            linesCleared += numLinesCleared;
            updateScore(numLinesCleared);
            updateSpeed();
            linesClearedDisplay.textContent = linesCleared;
        }
         return numLinesCleared;
    }

    // MODIFICA: Aggiorna punteggio e display live
    function updateScore(linesOrBonusType) {
        let pointsToAdd = 0;
        if (typeof linesOrBonusType === 'number') { // Se è un numero, sono linee
            pointsToAdd = SCORE_PER_LINE[linesOrBonusType] || 0;
        } else if (linesOrBonusType === 'softDrop') { // Se è la stringa 'softDrop'
            pointsToAdd = SCORE_SOFT_DROP;
        }
        // Aggiunge punti solo se il gioco è attivo
         if (gameStarted && !isGameOver && !isPaused) {
             currentScore += pointsToAdd;
             currentScoreDisplay.textContent = currentScore; // Aggiorna UI live
         }
    }

    // Aggiorna velocità (invariato)
    function updateSpeed() {
        const speedIncreases = Math.floor(linesCleared / LINES_FOR_SPEED_INCREASE);
        let newSpeed = INITIAL_SPEED_MS;
        for (let i = 0; i < speedIncreases; i++) { newSpeed *= SPEED_MULTIPLIER; }
        currentSpeed = Math.max(MIN_SPEED_MS, newSpeed);
    }

    // Game Over (MODIFICA: Non aggiorna più totalScore UI)
    function gameOver() {
        if(isGameOver) return;
        console.log("--- Game Over ---");
        isGameOver = true;
        gameStarted = false;
        clearTimeout(gameLoopTimeout);
        clearTimeout(softDropTimeout); // Assicura stop soft drop timer
        softDropActive = false;

        // totalScore += currentScore; // Logica per punteggio totale sessione (non mostrato live)
        finalScoreDisplay.textContent = currentScore; // Mostra punteggio partita

        gameoverOverlay.classList.remove('hidden');
        setMessage('Game Over!', true);
        pauseButton.disabled = true;
        pauseControls.classList.add('hidden');
        newGameButtonGameOver.classList.remove('hidden');
        currentPiece = null;
    }

    // Ridisegna gioco (invariato)
    function redrawGame() {
        if (!gameStarted && !isGameOver) return;
        clearCanvas();
        drawBoard();
        if (currentPiece) {
            drawGhostPiece(currentPiece);
            drawPiece(currentPiece);
        }
    }

    // --- MODIFICA: Logica Soft Drop Continuo ---
    function continuousSoftDrop() {
        if (!softDropActive || isPaused || isGameOver || !currentPiece) return; // Stop se non attivo o gioco fermo

        if (movePiece(0, 1)) {
            updateScore('softDrop'); // Aggiungi bonus per ogni riga scesa
            redrawGame(); // Ridisegna subito dopo la discesa manuale
            // Pianifica la prossima discesa accelerata
            softDropTimeout = setTimeout(continuousSoftDrop, SOFT_DROP_INTERVAL);
        } else {
            // Se non può più scendere, ferma il drop continuo e forza il game loop
            // per gestire il blocco e la prossima mossa
            softDropActive = false;
            clearTimeout(gameLoopTimeout); // Ferma il loop automatico normale
            gameLoop(); // Esegui subito il game loop per gestire freeze/spawn
        }
    }

    // --- Loop Principale del Gioco ---
    function gameLoop() {
        // MODIFICA: Non eseguire se il soft drop manuale è attivo
        if (!gameStarted || isPaused || isGameOver || softDropActive) return;

        const movedDown = movePiece(0, 1); // Caduta automatica

        if (!movedDown && currentPiece) {
             freezePiece();
             if (isGameOver) return;
             clearLines();
             if (isGameOver) return; // clearLines ora non causa game over, ma controllo precauzionale
             spawnPiece();
             if (isGameOver) { redrawGame(); return; }
        }

        if (!isGameOver) {
            redrawGame();
            gameLoopTimeout = setTimeout(gameLoop, currentSpeed); // Pianifica prossima caduta automatica
        }
    }

    // --- Gestione Input ---
    function handleKeyDown(event) { // Rinominato per chiarezza
        if (!gameStarted && !isPaused) { // Gestisci solo Start se non iniziato
            if (event.key === 'Enter' || event.key === ' ') { // Permetti Start con Enter/Spazio
                 if (!gameStarted) { // Solo se non ancora partito
                     startButton.click(); // Simula click su start
                 }
            }
             return;
        }


        // Pausa/Riprendi con Spazio/Esc (solo se gioco attivo)
        if ((event.key === ' ' || event.key === 'Escape') && gameStarted && !isGameOver) {
             event.preventDefault();
             if (isPaused) resumeGame();
             else pauseGame();
             return;
        }

        if (isPaused || isGameOver) return; // Ignora input di gioco

        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
            event.preventDefault();
        }

        let redrawNeeded = false;
        switch (event.key) {
            case "ArrowLeft": case "a": case "A":
                if (movePiece(-1, 0)) redrawNeeded = true;
                break;
            case "ArrowRight": case "d": case "D":
                if (movePiece(1, 0)) redrawNeeded = true;
                break;
            case "ArrowDown": case "s": case "S":
                // MODIFICA: Attiva soft drop continuo se non già attivo
                if (!softDropActive) {
                    // console.log("Soft Drop START"); // Debug
                    softDropActive = true;
                    clearTimeout(gameLoopTimeout); // Interrompi caduta automatica
                    continuousSoftDrop(); // Avvia la caduta rapida manuale
                }
                break;
            case "ArrowUp": case "w": case "W":
                rotatePiece();
                break;
        }

        if (redrawNeeded) {
            redrawGame();
        }
    }

    // MODIFICA: Gestione Key Up per fermare Soft Drop
    function handleKeyUp(event) {
         if (isPaused || isGameOver || !gameStarted) return;

         switch (event.key) {
             case "ArrowDown": case "s": case "S":
                 // Ferma il soft drop continuo e riavvia il loop automatico
                 if (softDropActive) {
                      // console.log("Soft Drop STOP"); // Debug
                      softDropActive = false;
                      clearTimeout(softDropTimeout); // Ferma il timer del soft drop
                      // Riavvia il loop automatico principale se non è in pausa/gameover
                      if (!isPaused && !isGameOver) {
                         clearTimeout(gameLoopTimeout); // Pulisci eventuali timer precedenti
                         gameLoopTimeout = setTimeout(gameLoop, currentSpeed); // Riprendi caduta normale
                      }
                 }
                 break;
         }
    }


    // --- Funzioni di Controllo Gioco (Pausa, Riprendi, Nuovo) ---
    function pauseGame() {
        if (!gameStarted || isGameOver || isPaused) return;
        console.log("--- Gioco in Pausa ---");
        isPaused = true;
        clearTimeout(gameLoopTimeout);
        clearTimeout(softDropTimeout); // Metti in pausa anche il soft drop
        pauseOverlay.classList.remove('hidden');
        pauseButton.disabled = true;
        pauseControls.classList.remove('hidden');
        setMessage('Gioco in Pausa', false);
    }

    function resumeGame() {
        if (!gameStarted || isGameOver || !isPaused) return;
        console.log("--- Gioco Ripreso ---");
        isPaused = false;
        pauseOverlay.classList.add('hidden');
        pauseButton.disabled = false;
        pauseControls.classList.add('hidden');
        setMessage('');
        // Se il soft drop era attivo prima della pausa, non lo riattiviamo automaticamente
        softDropActive = false;
        clearTimeout(softDropTimeout);
        // Riavvia il loop principale
        clearTimeout(gameLoopTimeout); // Assicura non ci siano loop doppi
        gameLoop();
    }

    // Start Game (MODIFICA: Resetta punteggio UI)
    function startGame() {
        console.log("--- Inizio Nuova Partita ---");
        startButton.classList.add('hidden');
        gameActiveControls.classList.remove('hidden');
        board = createEmptyBoard();
        currentScore = 0;
        linesCleared = 0;
        currentSpeed = INITIAL_SPEED_MS;
        isPaused = false;
        isGameOver = false;
        gameStarted = true;
        clearTimeout(gameLoopTimeout);
        clearTimeout(softDropTimeout);
        softDropActive = false;
        currentPiece = null;
        nextPiece = null;

        gamesPlayed++;
        gamesPlayedDisplay.textContent = gamesPlayed;
        linesClearedDisplay.textContent = linesCleared;
        currentScoreDisplay.textContent = currentScore; // Resetta display punteggio
        setMessage('Pronto!', false);
        criticalErrorArea.textContent = '';
        pauseOverlay.classList.add('hidden');
        gameoverOverlay.classList.add('hidden');
        pauseControls.classList.add('hidden');
        newGameButtonGameOver.classList.add('hidden');
        pauseButton.disabled = false;

        spawnPiece();
        clearCanvas();
        clearCanvas(nextCtx, nextPieceCanvas);
        drawBoard();
        drawNextPiece();
        redrawGame();
        gameLoop();
    }

    // --- Gestione Messaggi (Invariata) ---
    let messageTimeout = null;
    function setMessage(msg, isError = false) { /* ... codice invariato ... */ }

     // --- Funzione Iniziale Setup ---
     function initialSetup() {
         console.log("Setup iniziale Tetris PSI...");
         startButton.classList.remove('hidden');
         gameActiveControls.classList.add('hidden');
         pauseOverlay.classList.add('hidden');
         gameoverOverlay.classList.add('hidden');
         criticalErrorArea.textContent = '';
         clearCanvas();
         clearCanvas(nextCtx, nextPieceCanvas);
         // Mostra 0 come punteggio iniziale
         currentScoreDisplay.textContent = 0;
         gamesPlayedDisplay.textContent = 0;
         linesClearedDisplay.textContent = 0;

         // Listener
         startButton.removeEventListener('click', startGame);
         startButton.addEventListener('click', startGame);
         newGameButtonPause.removeEventListener('click', startGame);
         newGameButtonPause.addEventListener('click', startGame);
         newGameButtonGameOver.removeEventListener('click', startGame);
         newGameButtonGameOver.addEventListener('click', startGame);

         // MODIFICA: Aggiunti listener keydown e keyup
         document.removeEventListener('keydown', handleKeyDown);
         document.addEventListener('keydown', handleKeyDown);
         document.removeEventListener('keyup', handleKeyUp); // Aggiunto KeyUp
         document.addEventListener('keyup', handleKeyUp); // Aggiunto KeyUp

         pauseButton.removeEventListener('click', pauseGame);
         pauseButton.addEventListener('click', pauseGame);
         resumeButton.removeEventListener('click', resumeGame);
         resumeButton.addEventListener('click', resumeGame);

         console.log("Pronto per iniziare. Clicca 'Inizia Partita' o premi Invio/Spazio.");
     }

    // --- Avvio Iniziale ---
    try {
        initialSetup();
    } catch (error) {
        setCriticalError(`Errore imprevisto avvio: ${error.message}`);
        console.error("Errore avvio globale:", error, error.stack);
        if (startButton) startButton.classList.add('hidden');
        if (gameActiveControls) gameActiveControls.classList.add('hidden');
    }

}); // Fine wrapper DOMContentLoaded