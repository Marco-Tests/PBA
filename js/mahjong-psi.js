document.addEventListener('DOMContentLoaded', () => {
    // --- Riferimenti Elementi DOM ---
    const gameBoard = document.getElementById('game-board');
    const hintButton = document.getElementById('hint-button');
    const shuffleButton = document.getElementById('shuffle-button');
    const gamesPlayedDisplay = document.getElementById('games-played-count');
    const shufflesUsedDisplay = document.getElementById('shuffles-used');
    const totalScoreDisplay = document.getElementById('total-score');
    const messageArea = document.getElementById('message-area');
    const criticalErrorArea = document.getElementById('critical-error-area');

    // Verifica esistenza elementi prima di procedere
    if (!gameBoard || !hintButton || !shuffleButton || !gamesPlayedDisplay || !shufflesUsedDisplay || !totalScoreDisplay || !messageArea || !criticalErrorArea) {
        console.error("Mahjong PSI: Impossibile trovare uno o più elementi DOM necessari. Il gioco non può avviarsi.");
        if (criticalErrorArea) criticalErrorArea.textContent = "ERRORE CRITICO: Elementi dell'interfaccia mancanti.";
        return; // Interrompi l'esecuzione dello script
    }

    // --- Configurazione Costanti di Gioco ---
    // --- MODIFICATO: Usa i nomi file delle tue immagini ---
    const IMAGE_PATH = 'assets/tessere-mahjong/'; // Assicurati che questa cartella sia accessibile dal browser
    const TILE_SYMBOLS_BASE = [
        IMAGE_PATH + 'Archetipi.png', IMAGE_PATH + 'Attaccamento.png', IMAGE_PATH + 'Aula-universitaria.png',
        IMAGE_PATH + 'Bambola-Bobo.png', IMAGE_PATH + 'Cella-carceraria.png', IMAGE_PATH + 'Cervello-anatomico.png',
        IMAGE_PATH + 'Comportamento.png', IMAGE_PATH + 'Condizionamento.png', IMAGE_PATH + 'Diario.png',
        IMAGE_PATH + 'EEG.png', IMAGE_PATH + 'Ego-Es-Super-Io.png', IMAGE_PATH + 'Erikson.png',
        IMAGE_PATH + 'Freud.png', IMAGE_PATH + 'Fromm.png', IMAGE_PATH + 'Gabbia-di-Skinner.png',
        IMAGE_PATH + 'Gruppo-di-terapia.png', IMAGE_PATH + 'Inconscio.png', IMAGE_PATH + 'Jung.png',
        IMAGE_PATH + 'Labirinto.png', IMAGE_PATH + 'Lacan.png', IMAGE_PATH + 'Mandala.png',
        IMAGE_PATH + 'Maschera.png', IMAGE_PATH + 'Maslow.png', IMAGE_PATH + 'Ombra.png',
        IMAGE_PATH + 'Orologio-ipnotico.png', IMAGE_PATH + 'Pavlov.png', IMAGE_PATH + 'Piaget.png',
        IMAGE_PATH + 'Psicoanalisi.png', IMAGE_PATH + 'Resilienza.png', IMAGE_PATH + 'Rimozione.png',
        IMAGE_PATH + 'Sala-studio.png', IMAGE_PATH + 'Skinner.png', IMAGE_PATH + 'Specchio.png',
        IMAGE_PATH + 'Test-di-Rorschach.png'
    ];
    // --- Fine Modifica ---

    const NUM_COPIES = 4;
    const TOTAL_TILES = TILE_SYMBOLS_BASE.length * NUM_COPIES; // 34 * 4 = 144
    const BASE_SCORE_PER_WIN = 1000;
    const SHUFFLE_PENALTY = 50;
    const MIN_SCORE_PER_WIN = 100;
    const MAX_SHUFFLE_ATTEMPTS = 50;

    // --- Dimensioni e Spaziatura Tessere (Usate per calcoli logici) ---
    const TILE_WIDTH_LOGIC = 45;
    const TILE_HEIGHT_LOGIC = 65;
    const TILE_H_SPACING_LOGIC = TILE_WIDTH_LOGIC * 0.85; // 38.25
    const TILE_V_SPACING_LOGIC = TILE_HEIGHT_LOGIC * 0.75; // 48.75
    const TILE_DEPTH_X_OFFSET_LOGIC = 6; // Offset orizzontale per livello Z
    const TILE_DEPTH_Y_OFFSET_LOGIC = 6; // Offset verticale per livello Z

    // --- Stato del Gioco ---
    let currentLayoutData = []; let layoutMap = {}; let tileDataMap = {}; let selectedTiles = [];
    let gamesPlayed = 0;
    let totalScore = 0; let shufflesUsedThisGame = 0; let tileIdCounter = 0;
    let currentLayoutIndex = -1; // Indice del layout attualmente visualizzato (-1 all'inizio)
    let isShuffling = false;
    let boardCenterX = 0;
    let boardCenterY = 0;

    // --- DEFINIZIONE LAYOUTS (144 tessere) ---
    // Assicurarsi che ogni layout definito qui contenga ESATTAMENTE 144 posizioni {x, y, z}
    // (Layouts invariati, riportati per completezza del file)
    const layouts = [
        // Layout 1: Piramide Riadattata (144 tessere)
        (() => {
            const l = []; let id = 0;
            // Livello 0: Base 12x8 meno alcuni bordi = 84
            for(let y=0; y<8; y++) for(let x=0; x<12; x++) {
                 if(!((x===0||x===11) && (y===0||y===7)) &&
                    !((x===1||x===10) && (y===0||y===7)) &&
                    !((x===0||x===11) && (y===1||y===6)))
                 l.push({ x, y, z: 0, id: id++ });
            } // 84 tessere
             // Livello 1: Interno 8x6 offset x=2, y=1 = 48
            const l1 = [];
            for (let y = 1; y < 7; y++) for (let x = 2; x < 10; x++) l1.push({ x, y, z: 1, id: id++ }); // 48 tessere -> Totale 132
             // Livello 2: Interno 6x2 offset x=3, y=3 = 12
            const l2 = [];
            for (let y = 3; y < 5; y++) for (let x = 3; x < 9; x++) l2.push({ x, y, z: 2, id: id++ }); // 12 tessere -> Totale 144

            const finalLayout = [...l, ...l1, ...l2];
            if (finalLayout.length !== TOTAL_TILES) console.warn(`Layout 1 (Piramide) ha ${finalLayout.length} tessere! Richiesto: ${TOTAL_TILES}`);
            return finalLayout.slice(0, TOTAL_TILES); // Assicura 144
        })(),

        // Layout 2: Turtle (Classico, 144 tessere)
        (() => { // Questa definizione è standard e corretta per 144
            const l = [
                {x:0,y:0,z:0},{x:2,y:0,z:0},{x:4,y:0,z:0},{x:6,y:0,z:0},{x:8,y:0,z:0},{x:10,y:0,z:0},
                {x:0,y:1,z:0},{x:2,y:1,z:0},{x:4,y:1,z:0},{x:6,y:1,z:0},{x:8,y:1,z:0},{x:10,y:1,z:0},
                {x:0,y:2,z:0},{x:2,y:2,z:0},{x:4,y:2,z:0},{x:6,y:2,z:0},{x:8,y:2,z:0},{x:10,y:2,z:0},{x:11,y:2,z:0},
                {x:0,y:3,z:0},{x:1,y:3,z:0},{x:2,y:3,z:0},{x:3,y:3,z:0},{x:4,y:3,z:0},{x:5,y:3,z:0},{x:6,y:3,z:0},{x:7,y:3,z:0},{x:8,y:3,z:0},{x:9,y:3,z:0},{x:10,y:3,z:0},{x:11,y:3,z:0},{x:12,y:3.5,z:0}, // Punta centrale (x=12, y=3.5)
                {x:0,y:4,z:0},{x:1,y:4,z:0},{x:2,y:4,z:0},{x:3,y:4,z:0},{x:4,y:4,z:0},{x:5,y:4,z:0},{x:6,y:4,z:0},{x:7,y:4,z:0},{x:8,y:4,z:0},{x:9,y:4,z:0},{x:10,y:4,z:0},{x:11,y:4,z:0},{x:13,y:3.5,z:0}, // Punta destra (x=13, y=3.5)
                {x:0,y:5,z:0},{x:2,y:5,z:0},{x:4,y:5,z:0},{x:6,y:5,z:0},{x:8,y:5,z:0},{x:10,y:5,z:0},{x:11,y:5,z:0},
                {x:0,y:6,z:0},{x:2,y:6,z:0},{x:4,y:6,z:0},{x:6,y:6,z:0},{x:8,y:6,z:0},{x:10,y:6,z:0},
                {x:0,y:7,z:0},{x:2,y:7,z:0},{x:4,y:7,z:0},{x:6,y:7,z:0},{x:8,y:7,z:0},{x:10,y:7,z:0},
                // Livello 1
                {x:1,y:1,z:1},{x:3,y:1,z:1},{x:5,y:1,z:1},{x:7,y:1,z:1},{x:9,y:1,z:1},
                {x:1,y:2,z:1},{x:3,y:2,z:1},{x:5,y:2,z:1},{x:7,y:2,z:1},{x:9,y:2,z:1},
                {x:1,y:3,z:1},{x:2,y:3,z:1},{x:3,y:3,z:1},{x:4,y:3,z:1},{x:5,y:3,z:1},{x:6,y:3,z:1},{x:7,y:3,z:1},{x:8,y:3,z:1},{x:9,y:3,z:1},
                {x:1,y:4,z:1},{x:2,y:4,z:1},{x:3,y:4,z:1},{x:4,y:4,z:1},{x:5,y:4,z:1},{x:6,y:4,z:1},{x:7,y:4,z:1},{x:8,y:4,z:1},{x:9,y:4,z:1},
                {x:1,y:5,z:1},{x:3,y:5,z:1},{x:5,y:5,z:1},{x:7,y:5,z:1},{x:9,y:5,z:1},
                {x:1,y:6,z:1},{x:3,y:6,z:1},{x:5,y:6,z:1},{x:7,y:6,z:1},{x:9,y:6,z:1},
                 // Livello 2
                {x:2,y:2,z:2},{x:4,y:2,z:2},{x:6,y:2,z:2},{x:8,y:2,z:2},
                {x:2,y:3,z:2},{x:3,y:3,z:2},{x:4,y:3,z:2},{x:5,y:3,z:2},{x:6,y:3,z:2},{x:7,y:3,z:2},{x:8,y:3,z:2},
                {x:2,y:4,z:2},{x:3,y:4,z:2},{x:4,y:4,z:2},{x:5,y:4,z:2},{x:6,y:4,z:2},{x:7,y:4,z:2},{x:8,y:4,z:2},
                {x:2,y:5,z:2},{x:4,y:5,z:2},{x:6,y:5,z:2},{x:8,y:5,z:2},
                 // Livello 3
                {x:3,y:3,z:3},{x:5,y:3,z:3},{x:7,y:3,z:3},
                {x:3,y:4,z:3},{x:5,y:4,z:3},{x:7,y:4,z:3},
                // Livello 4 (Cima)
                {x:5,y:3.5,z:4}
            ];
            // Correggiamo aggiungendo id univoco e verificando conteggio
            const finalLayout = l.map((p, index) => ({ ...p, id: index }));
            if (finalLayout.length !== TOTAL_TILES) console.error(`Layout 2 (Turtle Definitivo) ha ${finalLayout.length} tessere! Richiesto: ${TOTAL_TILES}`);
            return finalLayout.slice(0, TOTAL_TILES); // Assicura 144
        })(),

        // Layout 3: Gate (Riveduto v2 per evitare bug e avere 144 tessere)
        (() => {
            const l = []; let id = 0;
            // Colonne Laterali (3 largh, 6 alte, z=0,1)
            for (let z = 0; z < 2; z++) {
                for (let y = 1; y < 7; y++) {
                    for (let x = 0; x < 3; x++) l.push({x, y, z, id: id++}); // Sinistra
                    for (let x = 10; x < 13; x++) l.push({x, y, z, id: id++}); // Destra
                }
            } // 3*6*2*2 = 72 tessere
            // Colonne Laterali (3 largh, 4 alte, z=2)
            for (let y = 2; y < 6; y++) { // y da 2 a 5
                for (let x = 0; x < 3; x++) l.push({x, y, z: 2, id: id++}); // Sinistra
                for (let x = 10; x < 13; x++) l.push({x, y, z: 2, id: id++}); // Destra
            } // 3 * 4 * 1 * 2 = 24 tessere -> Totale 96
            // Ponte (7 largh, 2 alte, z=0,1,2)
            for (let z = 0; z < 3; z++) {
                for (let y = 3; y < 5; y++) { // y = 3, 4
                    for (let x = 3; x < 10; x++) l.push({x, y, z, id: id++}); // x = 3 a 9
                }
            } // 7 * 2 * 3 = 42 tessere -> Totale 96 + 42 = 138
            // Ponte Top (3 largh, 2 alte, z=3)
            for (let y = 3; y < 5; y++) {
                for (let x = 5; x < 8; x++) l.push({x, y, z: 3, id: id++}); // x = 5, 6, 7
            } // 3 * 2 * 1 = 6 tessere -> Totale 138 + 6 = 144. OK.

            if (l.length !== TOTAL_TILES) console.warn(`Layout 3 (Gate Riveduto v2) ha ${l.length} tessere! Richiesto: ${TOTAL_TILES}`);
            return l.slice(0, TOTAL_TILES); // Assicura 144
        })(),

        // Layout 4: Stack (ex Layout 5, corretto 144 tessere)
         (() => {
            const l = []; let id = 0;
             for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) l.push({x, y, z:0, id:id++}); //64
             for (let y = 1; y < 7; y++) for (let x = 1; x < 7; x++) l.push({x, y, z:1, id:id++}); //36 -> 100
             for (let y = 2; y < 6; y++) for (let x = 2; x < 6; x++) l.push({x, y, z:2, id:id++}); //16 -> 116
             for (let y = 3; y < 5; y++) for (let x = 3; x < 5; x++) l.push({x, y, z:3, id:id++}); //4 -> 120
             for (let y = 2; y < 6; y++) for (let x = 2; x < 6; x++) l.push({x, y, z:4, id:id++}); //16 -> 136
             for (let y = 3; y < 5; y++) for (let x = 3; x < 5; x++) l.push({x, y, z:5, id:id++}); //4 -> 140
             for (let y = 3; y < 5; y++) for (let x = 3; x < 5; x++) l.push({x, y, z:6, id:id++}); //4 -> 144
            if (l.length !== TOTAL_TILES) console.warn(`Layout 4 (Stack) ha ${l.length} tessere! Richiesto: ${TOTAL_TILES}`);
            return l.slice(0, TOTAL_TILES);
         })(),

        // Layout 5: Bridge (ex Layout 5, corretto 144 tessere)
        (() => {
            const l = []; let id = 0;
            // Base sinistra 4x8 = 32
            for(let y=0; y<8; y++) for(let x=0; x<4; x++) l.push({x,y,z:0, id:id++});
            // Base destra 4x8 = 32 -> 64
            for(let y=0; y<8; y++) for(let x=9; x<13; x++) l.push({x,y,z:0, id:id++});
            // Ponte L0 (5x2) = 10 -> 74
            for(let y=3; y<5; y++) for(let x=4; x<9; x++) l.push({x,y,z:0, id:id++});
            // Ponte L1 (5x2) = 10 -> 84
            for(let y=3; y<5; y++) for(let x=4; x<9; x++) l.push({x,y,z:1, id:id++});
            // Ponte L2 (5x2) = 10 -> 94
            for(let y=3; y<5; y++) for(let x=4; x<9; x++) l.push({x,y,z:2, id:id++});
            // Ponte L3 (5x2) = 10 -> 104. Mancano 40.
            for(let y=3; y<5; y++) for(let x=4; x<9; x++) l.push({x,y,z:3, id:id++});
             // Aggiungiamo strati sopra le basi L1 (2x6 = 12 per lato) = 24 -> 104+24 = 128. Mancano 16.
            for(let y=1; y<7; y++) {
                l.push({x:1, y:y, z:1, id:id++}); l.push({x:2, y:y, z:1, id:id++}); // Sinistra L1
                l.push({x:10, y:y, z:1, id:id++}); l.push({x:11, y:y, z:1, id:id++}); // Destra L1
            }
             // Aggiungiamo strati sopra le basi L2 (2x4 = 8 per lato) = 16 -> 128+16 = 144. OK.
            for(let y=2; y<6; y++) {
                l.push({x:1, y:y, z:2, id:id++}); l.push({x:2, y:y, z:2, id:id++}); // Sinistra L2
                l.push({x:10, y:y, z:2, id:id++}); l.push({x:11, y:y, z:2, id:id++}); // Destra L2
            }
            if (l.length !== TOTAL_TILES) console.warn(`Layout 5 (Bridge) ha ${l.length} tessere! Richiesto: ${TOTAL_TILES}`);
            return l.slice(0, TOTAL_TILES);
        })()
    ];

    // Filtra solo i layout che hanno ESATTAMENTE il numero corretto di tessere
    const validLayouts = layouts.filter(l => l.length === TOTAL_TILES);
    if(validLayouts.length === 0) {
        setCriticalError(`Nessun layout valido con ${TOTAL_TILES} tessere definito! Impossibile avviare.`);
        return; // Stop execution
    } else {
        console.log(`Caricati ${validLayouts.length} layout validi.`);
    }

    // --- Funzioni Ausiliarie ---
    function shuffleArray(array) { for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [array[i], array[j]] = [array[j], array[i]]; } }
    function setCriticalError(message) { criticalErrorArea.textContent = `ERRORE CRITICO: ${message}. Il gioco non può continuare.`; console.error("ERRORE CRITICO:", message); gameBoard.innerHTML = ''; hintButton.disabled = true; shuffleButton.disabled = true; }

    // --- Generazione Struttura Layout (MODIFICATO per non ripetere + LOG) ---
    // (Invariato rispetto alla versione precedente)
    function generateLayoutStructure() {
        let nextLayoutIndex;
        const numLayouts = validLayouts.length; // Numero di layout validi

        console.log(`[Layout Selection] Tentativo selezione. Indice layout precedente: ${currentLayoutIndex}`); // Log indice precedente

        if (numLayouts <= 1) {
            nextLayoutIndex = 0; // Se c'è solo un layout, usa sempre quello
            console.log(`[Layout Selection]   Selezionato unico layout valido: indice 0`);
        } else {
            // Scegli un indice casuale DIVERSO da quello precedente
            let attempts = 0; // Contatore tentativi per sicurezza
            do {
                nextLayoutIndex = Math.floor(Math.random() * numLayouts);
                 //console.log(`[Layout Selection]   ...tentativo indice casuale: ${nextLayoutIndex}`); // Log TENTATIVO (può essere verboso)
                 attempts++;
                 if(attempts > numLayouts * 2 && numLayouts > 1) { // Sicurezza estrema contro loop infiniti
                     console.warn("[Layout Selection]   Troppi tentativi per trovare un layout diverso. Forzo un indice valido.");
                     nextLayoutIndex = (currentLayoutIndex + 1) % numLayouts; // Scegli il successivo in modo ciclico
                     break; // Esci dal loop
                 }
            } while (nextLayoutIndex === currentLayoutIndex); // Continua a ciclare finché non è diverso
            console.log(`[Layout Selection]   Selezionato nuovo layout: indice ${nextLayoutIndex} (diverso da ${currentLayoutIndex})`);
        }

        currentLayoutIndex = nextLayoutIndex; // Aggiorna l'indice corrente *dopo* la selezione
        currentLayoutData = validLayouts[currentLayoutIndex];
        console.log(`1. Caricamento layout ${currentLayoutIndex + 1}/${numLayouts}...`);
        layoutMap = {};

        try {
            currentLayoutData.forEach((pos, index) => {
                const key = `${pos.x}_${pos.y}_${pos.z}`;
                if(layoutMap[key] !== undefined) {
                    console.warn(`Sovrapposizione layout rilevata alla posizione ${key} nel layout ${currentLayoutIndex + 1}. Tessera sovrascritta.`);
                }
                layoutMap[key] = index;
            });
            console.log(`   Struttura layout caricata.`);
            return true;
        } catch (error) {
            console.error(`Errore durante la creazione della mappa layout: ${error.message}`);
            setCriticalError(`Errore caricamento struttura layout: ${error.message}`);
            return false;
        }
    }

    // --- Generazione Semplice (Invariata) ---
    // (Invariato rispetto alla versione precedente)
    function simpleGenerateDeal() {
        console.log("2. Generazione semplice...");
        tileDataMap = {};
        tileIdCounter = 0;
        let symbolsToPlace = [];
        TILE_SYMBOLS_BASE.forEach(symbol => {
            for (let i = 0; i < NUM_COPIES; i++) {
                symbolsToPlace.push(symbol);
            }
        });
        shuffleArray(symbolsToPlace);

        try {
            if (symbolsToPlace.length !== currentLayoutData.length) {
                throw new Error(`Numero simboli (${symbolsToPlace.length}) non corrisponde a posizioni layout (${currentLayoutData.length})! Layout index: ${currentLayoutIndex}`);
            }
            currentLayoutData.forEach((pos, index) => {
                const tileId = tileIdCounter++;
                const tileData = {
                    id: tileId,
                    type: symbolsToPlace[index], // Ora 'type' è il percorso dell'immagine
                    element: null,
                    x: pos.x, y: pos.y, z: pos.z,
                    isSelectable: false,
                    isSelected: false,
                    isRemoved: false
                };
                tileDataMap[tileId] = tileData;
            });
            console.log(`   Generazione completata.`);
            return true;
        } catch (error) {
            console.error(`Errore durante la generazione delle tessere: ${error.message}`);
            setCriticalError(`Errore generazione tessere: ${error.message}`);
            return false;
        }
    }

    // --- Rendering (MODIFICATO per usare immagini) ---
     function renderTiles() {
        console.log("3. Rendering tessere...");
        gameBoard.innerHTML = ''; // Pulisci board precedente
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        let totalWidth_logic = 0, totalHeight_logic = 0;

        // Calcola bounding box logico e dimensioni totali logiche (invariato)
        Object.values(tileDataMap).forEach(td => {
            const px_logic = td.x * TILE_H_SPACING_LOGIC + td.z * TILE_DEPTH_X_OFFSET_LOGIC;
            const py_logic = td.y * TILE_V_SPACING_LOGIC - td.z * TILE_DEPTH_Y_OFFSET_LOGIC;
            minX = Math.min(minX, px_logic);
            maxX = Math.max(maxX, px_logic);
            minY = Math.min(minY, py_logic);
            maxY = Math.max(maxY, py_logic);
        });
        totalWidth_logic = maxX - minX + TILE_WIDTH_LOGIC;
        totalHeight_logic = maxY - minY + TILE_HEIGHT_LOGIC;

        // Calcola offset per centrare (invariato)
        const boardContainerWidth = gameBoard.clientWidth;
        const boardContainerHeight = gameBoard.clientHeight;
        const computedStyle = getComputedStyle(gameBoard);
        const transformMatrix = new DOMMatrix(computedStyle.transform);
        const scaleFactor = transformMatrix.a; // Scala X (assumendo scala uniforme)
        const offsetX = (boardContainerWidth / scaleFactor - totalWidth_logic) / 2 - minX;
        const offsetY = (boardContainerHeight / scaleFactor - totalHeight_logic) / 2 - minY;

        try {
            if (Object.keys(tileDataMap).length === 0 || Object.keys(tileDataMap).length < TOTAL_TILES) {
                 throw new Error("Mappa dati tessere (tileDataMap) vuota o incompleta prima del rendering.");
            }

            Object.values(tileDataMap).forEach(tileData => {
                if (tileData.isRemoved) return;

                const tileElement = document.createElement('div');
                tileElement.classList.add('tile');
                tileElement.dataset.tileId = tileData.id;
                //tileElement.textContent = tileData.type; // Rimosso: non usiamo più testo

                // --- MODIFICATO: Imposta l'immagine di sfondo ---
                tileElement.style.backgroundImage = `url('${tileData.type}')`; // Usa il percorso salvato in tileData.type
                // --- Fine Modifica ---


                // Posizionamento e z-index (invariato)
                const pixelX_logic = tileData.x * TILE_H_SPACING_LOGIC + tileData.z * TILE_DEPTH_X_OFFSET_LOGIC;
                const pixelY_logic = tileData.y * TILE_V_SPACING_LOGIC - tileData.z * TILE_DEPTH_Y_OFFSET_LOGIC;
                const finalX = pixelX_logic + offsetX;
                const finalY = pixelY_logic + offsetY;

                tileElement.style.left = `${finalX}px`;
                tileElement.style.top = `${finalY}px`;
                const zIndex = 10 + Math.floor(tileData.z * 15) + Math.floor(tileData.y * 0.5);
                tileElement.style.zIndex = zIndex;

                tileData.element = tileElement;
                gameBoard.appendChild(tileElement);
                tileElement.addEventListener('click', () => handleTileClick(tileData));
            });
            console.log(`   Rendering completato.`);
            return true;
        } catch (error) {
            console.error(`Errore durante il rendering delle tessere: ${error.message}`, error.stack);
            setCriticalError(`Errore rendering tessere: ${error.message}`);
            return false;
        }
    }

    // --- Logica di Gioco Attivo (Invariata) ---
    // (Funzione isTileBlockedDuringPlay invariata)
     function isTileBlockedDuringPlay(tile, currentTileData) {
        const targetMap = currentTileData || tileDataMap;
        if (!tile || tile.isRemoved) return true;

        const x = tile.x;
        const y = tile.y;
        const z = tile.z;
        const tileId = tile.id;

        // 1. Bloccato dall'alto?
        for (const otherId in targetMap) {
            if (otherId == tileId) continue;
            const otherTile = targetMap[otherId];
            if (!otherTile.isRemoved && otherTile.z > z) {
                const otherPixelX = otherTile.x * TILE_H_SPACING_LOGIC + otherTile.z * TILE_DEPTH_X_OFFSET_LOGIC;
                const otherPixelY = otherTile.y * TILE_V_SPACING_LOGIC - otherTile.z * TILE_DEPTH_Y_OFFSET_LOGIC;
                const currentPixelX = x * TILE_H_SPACING_LOGIC + z * TILE_DEPTH_X_OFFSET_LOGIC;
                const currentPixelY = y * TILE_V_SPACING_LOGIC - z * TILE_DEPTH_Y_OFFSET_LOGIC;
                if (Math.abs(otherPixelX - currentPixelX) < TILE_WIDTH_LOGIC * 0.75 &&
                    Math.abs(otherPixelY - currentPixelY) < TILE_HEIGHT_LOGIC * 0.75)
                { return true; }
            }
        }

        // 2. Bloccato lateralmente?
        let isLeftBlocked = false;
        let isRightBlocked = false;
        for (const otherId in targetMap) {
             if (otherId == tileId) continue;
             const otherTile = targetMap[otherId];
             if (!otherTile.isRemoved && otherTile.z === z) {
                 const otherPixelX = otherTile.x * TILE_H_SPACING_LOGIC + otherTile.z * TILE_DEPTH_X_OFFSET_LOGIC;
                 const otherPixelY = otherTile.y * TILE_V_SPACING_LOGIC - otherTile.z * TILE_DEPTH_Y_OFFSET_LOGIC;
                 const currentPixelX = x * TILE_H_SPACING_LOGIC + z * TILE_DEPTH_X_OFFSET_LOGIC;
                 const currentPixelY = y * TILE_V_SPACING_LOGIC - z * TILE_DEPTH_Y_OFFSET_LOGIC;
                 if (otherPixelX < currentPixelX && Math.abs(otherPixelY - currentPixelY) < TILE_HEIGHT_LOGIC * 0.8 && (currentPixelX - otherPixelX) < TILE_WIDTH_LOGIC * 0.9) { isLeftBlocked = true; }
                 if (otherPixelX > currentPixelX && Math.abs(otherPixelY - currentPixelY) < TILE_HEIGHT_LOGIC * 0.8 && (otherPixelX - currentPixelX) < TILE_WIDTH_LOGIC * 0.9) { isRightBlocked = true; }
                 if(isLeftBlocked && isRightBlocked) break; // Ottimizzazione: se bloccato da entrambi i lati, inutile continuare
             }
        }
        return isLeftBlocked && isRightBlocked;
    }

    // --- Funzioni updateSelectableStatus, handleTileClick, checkForMatch, removeTileWithAnimation, checkWinCondition (Invariate) ---
    // (Queste funzioni non necessitano di modifiche perché operano sugli stati isSelectable, isSelected, isRemoved e sull'ID/tipo,
    // e la logica di confronto tipo (ora percorso immagine) rimane valida. Le classi CSS gestiscono l'aspetto.)
    function updateSelectableStatus() {
        let selectableChanged = false;
        for (const tileId in tileDataMap) {
            const tile = tileDataMap[tileId];
            if (!tile || tile.isRemoved) { if(tile) tile.isSelectable = false; continue; }
            const wasSelectable = tile.isSelectable;
            tile.isSelectable = !isTileBlockedDuringPlay(tile);
            if (tile.isSelectable !== wasSelectable) {
                selectableChanged = true;
                if (tile.element) {
                    // --- MODIFICA MINIMA: Rimuovi il filtro quando diventa selezionabile ---
                    if (tile.isSelectable) {
                        tile.element.classList.add('selectable');
                        tile.element.style.filter = ''; // Rimuove il filtro grayscale/opacity
                    } else {
                        tile.element.classList.remove('selectable');
                        // Ri-applica il filtro se non è selezionabile (gestito da CSS con :not(.selectable), ma più esplicito qui)
                        tile.element.style.filter = 'grayscale(80%) opacity(70%)';
                        if (tile.isSelected) {
                            tile.isSelected = false; tile.element.classList.remove('selected');
                            selectedTiles = selectedTiles.filter(t => t.id !== tile.id);
                        }
                    }
                    // --- Fine Modifica ---
                }
            } else if (!tile.element && !tile.isRemoved) { console.warn(`WARN: Tile ${tile.id} non rimossa ma senza elemento DOM durante updateSelectableStatus!`); }
        }
        const remainingTilesCount = Object.values(tileDataMap).filter(t => t && !t.isRemoved).length;
        const gameInProgress = remainingTilesCount > 0;
        hintButton.disabled = !gameInProgress || isShuffling;
        shuffleButton.disabled = !gameInProgress || isShuffling;

        // Applica lo stile non selezionabile iniziale a tutte le tessere non selezionabili
        Object.values(tileDataMap).forEach(tile => {
            if (tile.element && !tile.isSelectable && !tile.isRemoved) {
                 tile.element.style.filter = 'grayscale(80%) opacity(70%)';
            } else if (tile.element && tile.isSelectable) {
                 tile.element.style.filter = ''; // Assicurati che sia rimosso se selezionabile
            }
        });
    }

    function handleTileClick(tileData) {
        if (isShuffling || !tileData || tileData.isRemoved || !tileData.isSelectable) return;
        document.querySelectorAll('.tile.hint').forEach(el => el.classList.remove('hint'));
        if (tileData.isSelected) {
            tileData.isSelected = false; if(tileData.element) tileData.element.classList.remove('selected');
            selectedTiles = selectedTiles.filter(t => t.id !== tileData.id);
        } else if (selectedTiles.length < 2) {
            tileData.isSelected = true; if(tileData.element) tileData.element.classList.add('selected');
            selectedTiles.push(tileData);
            if (selectedTiles.length === 2) checkForMatch();
        }
    }

    function checkForMatch() {
        if (isShuffling || selectedTiles.length !== 2) return;
        const [tile1, tile2] = selectedTiles;
        if (tile1.type === tile2.type && tile1.id !== tile2.id) { // Il confronto tile1.type === tile2.type funziona anche con i percorsi delle immagini
            setMessage("Coppia trovata!", false);
            removeTileWithAnimation(tile1); removeTileWithAnimation(tile2);
            selectedTiles = [];
            setTimeout(() => { updateSelectableStatus(); checkWinCondition(); }, 350);
        } else {
            setMessage("Non compatibili.", true);
            setTimeout(() => {
                if(tile1 && tile1.element) { tile1.isSelected = false; tile1.element.classList.remove('selected'); }
                if(tile2 && tile2.element) { tile2.isSelected = false; tile2.element.classList.remove('selected'); }
                selectedTiles = [];
            }, 400);
        }
    }

    function removeTileWithAnimation(tileData) {
        if (!tileData || tileData.isRemoved) return;
        tileData.isRemoved = true; tileData.isSelectable = false; tileData.isSelected = false;
        if (tileData.element) {
            tileData.element.classList.remove('selected', 'selectable', 'hint');
            tileData.element.classList.add('removing');
            // Rimuovi anche il filtro esplicitamente
            tileData.element.style.filter = '';
            setTimeout(() => {
                if (tileData.element && tileData.element.parentNode) {
                    tileData.element.parentNode.removeChild(tileData.element);
                }
            }, 300);
        }
    }

     function checkWinCondition() {
         const remainingCount = Object.values(tileDataMap).filter(tile => tile && !tile.isRemoved).length;
         if (remainingCount === 0) {
             const scoreThisGame = Math.max(MIN_SCORE_PER_WIN, BASE_SCORE_PER_WIN - shufflesUsedThisGame * SHUFFLE_PENALTY);
             totalScore += scoreThisGame; totalScoreDisplay.textContent = totalScore;
             setMessage(`Hai vinto! Punti: ${scoreThisGame} (Shuffle: ${shufflesUsedThisGame}). Prossima partita...`, false);
             hintButton.disabled = true; shuffleButton.disabled = true;
             setTimeout(initGame, 4000);
         }
    }

    // --- Funzioni Hint e Shuffle (Modificato Shuffle per aggiornare immagini) ---
    // (findAllValidPairs, countValidPairs, findValidPair e listener hintButton invariati)
     function findAllValidPairs(currentTileData) {
        const targetMap = currentTileData || tileDataMap;
        const validPairs = []; const selectableTiles = [];
        for (const tileId in targetMap) {
            const tile = targetMap[tileId];
            if(tile && !tile.isRemoved && !isTileBlockedDuringPlay(tile, targetMap)) { selectableTiles.push(tile); }
        }
        const typeMap = {};
        selectableTiles.forEach(tile => { if (!typeMap[tile.type]) typeMap[tile.type] = []; typeMap[tile.type].push(tile); });
        for (const type in typeMap) {
            if (typeMap[type].length >= 2) {
                const tilesOfType = typeMap[type];
                for(let i = 0; i < tilesOfType.length - 1; i++) {
                    for(let j = i + 1; j < tilesOfType.length; j++) { validPairs.push([tilesOfType[i], tilesOfType[j]]); }
                }
            }
        }
        return validPairs;
    }
     function countValidPairs(currentTileData) { return findAllValidPairs(currentTileData).length; }
     function findValidPair(showHint = true) {
        if (isShuffling) return null;
        const possiblePairs = findAllValidPairs();
        if (possiblePairs.length === 0) { setMessage("Nessuna coppia disponibile! Prova a mescolare.", true); return null; }
        const randomPair = possiblePairs[Math.floor(Math.random() * possiblePairs.length)];
        if (showHint && randomPair[0].element && randomPair[1].element) {
            document.querySelectorAll('.tile.hint').forEach(el => el.classList.remove('hint'));
            randomPair[0].element.classList.add('hint'); randomPair[1].element.classList.add('hint');
            setTimeout(() => {
                if (randomPair[0].element) randomPair[0].element.classList.remove('hint');
                if (randomPair[1].element) randomPair[1].element.classList.remove('hint');
            }, 1500);
        }
        return randomPair;
    }
    hintButton.addEventListener('click', () => { if (!hintButton.disabled) findValidPair(true); });

    function handleShuffleClick() {
        if (shuffleButton.disabled || isShuffling) return;
        isShuffling = true; shuffleButton.disabled = true; hintButton.disabled = true;
        console.log("--- Tentativo Mescolamento Garantito ---");
        setMessage("Mescolando...", false);
        document.querySelectorAll('.tile.selected, .tile.hint').forEach(el => el.classList.remove('selected', 'hint'));
        selectedTiles = [];
        const remainingTiles = Object.values(tileDataMap).filter(t => t && !t.isRemoved);
        if (remainingTiles.length < 2) { setMessage("Errore: Meno di 2 tessere rimaste.", true); isShuffling = false; updateSelectableStatus(); return; }
        shufflesUsedThisGame++; shufflesUsedDisplay.textContent = shufflesUsedThisGame;
        const originalSymbols = remainingTiles.map(t => t.type); // 'type' è ora il percorso immagine
        let shuffledSymbols = [...originalSymbols]; let foundValidShuffle = false; let attempts = 0;

        // Logica shuffle garantito (invariata)
        while (attempts < MAX_SHUFFLE_ATTEMPTS && !foundValidShuffle) {
            attempts++; shuffleArray(shuffledSymbols);
            const simulatedTileData = {};
            remainingTiles.forEach((tile, index) => { simulatedTileData[tile.id] = { ...tile, type: shuffledSymbols[index], isRemoved: false, isSelectable: false }; });
            Object.values(tileDataMap).forEach(tile => { if (tile.isRemoved) simulatedTileData[tile.id] = tile; });
            if (countValidPairs(simulatedTileData) > 0) { foundValidShuffle = true; console.log(`   Shuffle valido trovato al tentativo ${attempts}.`); }
        }

        // --- MODIFICATO: Aggiorna l'immagine di sfondo delle tessere ---
        remainingTiles.forEach((tile, index) => {
            tile.type = shuffledSymbols[index];
            if (tile.element) {
                //tile.element.textContent = tile.type; // Rimosso
                tile.element.style.backgroundImage = `url('${tile.type}')`; // Aggiorna l'immagine di sfondo
                tile.element.classList.remove('selected', 'hint'); // Rimuovi stati visivi
            }
            tile.isSelected = false; // Aggiorna stato logico
        });
        // --- Fine Modifica ---

        selectedTiles = []; // Svuota selezione logica
        if (!foundValidShuffle) { console.warn(`ATTENZIONE: Nessuno shuffle GARANTITO trovato dopo ${MAX_SHUFFLE_ATTEMPTS} tentativi!`); setMessage("Mescolato (nessuna garanzia di mosse).", true); }
        else { setMessage("Mescolato!", false); }
        console.log("--- Mescolamento Completato ---");
        isShuffling = false;
        updateSelectableStatus(); // Aggiorna la selezionabilità (e l'aspetto) dopo lo shuffle
    }
    shuffleButton.addEventListener('click', handleShuffleClick);

    // --- Gestione Messaggi (Invariata) ---
    let messageTimeout = null;
    function setMessage(msg, isError = false) {
        clearTimeout(messageTimeout);
        messageArea.textContent = msg;
        messageArea.style.color = isError ? '#dc3545' : '#28a745';
        const persistentMessages = ["vinto", "Mescolando"];
        const isPersistent = persistentMessages.some(substring => msg.includes(substring));
        if (!isPersistent) {
            messageTimeout = setTimeout(() => { if (messageArea.textContent === msg) messageArea.textContent = ''; }, 3000);
        }
    }

    // --- Inizializzazione e Avvio Gioco (Invariata) ---
    function initGame() {
        console.log("--- Inizializzazione Nuova Partita ---");
        isShuffling = false; criticalErrorArea.textContent = ''; setMessage(''); selectedTiles = [];
        shufflesUsedThisGame = 0; shufflesUsedDisplay.textContent = shufflesUsedThisGame;
        if (gamesPlayed > 0) gamesPlayed++; else gamesPlayed = 1;
        gamesPlayedDisplay.textContent = gamesPlayed;
        gameBoard.innerHTML = '<p class="loading-message">Generazione layout...</p>';
        hintButton.disabled = true; shuffleButton.disabled = true;

        setTimeout(() => {
            if (!generateLayoutStructure()) return;
            gameBoard.innerHTML = '<p class="loading-message">Distribuzione tessere...</p>';
            setTimeout(() => {
                if (!simpleGenerateDeal()) return;
                gameBoard.innerHTML = '<p class="loading-message">Rendering tessere...</p>';
                 setTimeout(() => {
                    if (!renderTiles()) return;
                    updateSelectableStatus(); // Chiamata qui dopo il rendering
                    setMessage("Pronto!", false);
                    console.log(`--- Partita ${gamesPlayed} Pronta (Layout ${currentLayoutIndex + 1}/${validLayouts.length}) ---`);
                     if (countValidPairs() === 0 && Object.values(tileDataMap).filter(id => !tileDataMap[id].isRemoved).length > 0) {
                         console.warn("ATTENZIONE: La disposizione iniziale non ha mosse valide!");
                         setMessage("Nessuna mossa iniziale! Prova a mescolare.", true);
                     }
                 }, 50); // Leggero ritardo per permettere il rendering iniziale prima di updateSelectableStatus
            }, 50);
        }, 50);
    }

    // --- Avvio Iniziale (Invariato) ---
    try {
        console.log("Avvio Mahjong PSI...");
        initGame();
    } catch (error) {
        setCriticalError(`Errore imprevisto avvio: ${error.message}`);
        console.error("Errore avvio globale:", error, error.stack);
    }

}); // Fine wrapper DOMContentLoaded