document.addEventListener('DOMContentLoaded', () => {
    // --- Caricamento Navbar e Footer ---
    const navPlaceholder = document.getElementById('nav-placeholder');
    const footerPlaceholder = document.getElementById('footer-placeholder');

    if (navPlaceholder) {
        fetch('navbar.html')
            .then(response => response.ok ? response.text() : Promise.reject('Navbar not found'))
            .then(html => navPlaceholder.innerHTML = html)
            .catch(error => console.error('Error loading navbar:', error));
    }
    if (footerPlaceholder) {
        fetch('footer.html')
            .then(response => response.ok ? response.text() : Promise.reject('Footer not found'))
            .then(html => footerPlaceholder.innerHTML = html)
            .catch(error => console.error('Error loading footer:', error));
    }

    // --- Posizionamento Dinamico Timeline ---
    function positionTimelineElements() {
        const buttonsColumn = document.querySelector('#section-corsi .year-buttons-column');
        const buttons = buttonsColumn ? buttonsColumn.querySelectorAll('.year-button:not(.game-button-square)') : []; // Escludi bottoni gioco se necessario
        const timelineContainer = buttonsColumn ? buttonsColumn.querySelector('.timeline-container') : null;
        const dots = timelineContainer ? timelineContainer.querySelectorAll('.timeline-dot') : [];
        const line = timelineContainer ? timelineContainer.querySelector('.timeline-line-element') : null;

        if (!buttons.length || !dots.length || !line || !timelineContainer || getComputedStyle(timelineContainer).display === 'none') {
             if(timelineContainer) timelineContainer.style.visibility = 'hidden';
             return;
        }

        timelineContainer.style.visibility = 'visible';

        let firstButtonCenterY = null;
        let lastButtonCenterY = null;
        const linePadding = 22;

        dots.forEach(dot => {
            dot.style.top = '';
            dot.style.visibility = 'hidden';
        });
        line.style.top = '';
        line.style.height = '';
        line.style.visibility = 'hidden';

        buttons.forEach((button, index) => {
            if (dots[index]) {
                const buttonRect = button.getBoundingClientRect();
                const columnRect = buttonsColumn.getBoundingClientRect();
                const offsetTop = button.offsetTop;
                const buttonCenterY = offsetTop + (buttonRect.height / 2);

                dots[index].style.top = `${buttonCenterY}px`;
                dots[index].style.visibility = 'visible';

                if (index === 0) {
                    firstButtonCenterY = buttonCenterY;
                }
                lastButtonCenterY = buttonCenterY;
            }
        });

        if (firstButtonCenterY !== null && lastButtonCenterY !== null) {
            const lineTop = firstButtonCenterY - linePadding;
            const lineHeight = (lastButtonCenterY + linePadding) - lineTop;

            line.style.top = `${lineTop}px`;
            line.style.height = `${lineHeight}px`;
            line.style.visibility = 'visible';
        } else {
             line.style.visibility = 'hidden';
        }
    }

    positionTimelineElements();
    window.addEventListener('resize', positionTimelineElements);

    // --- Animazione Hover Pulsanti Anno / Timeline ---
    const yearButtons = document.querySelectorAll('#section-corsi .year-button:not(.game-button-square)'); // Escludi bottoni gioco
    const timelineDots = document.querySelectorAll('#section-corsi .timeline-dot');

    if (yearButtons.length === timelineDots.length) {
        yearButtons.forEach((button, index) => {
            const correspondingDot = timelineDots[index];

            button.addEventListener('mouseover', () => {
                if (correspondingDot) {
                    correspondingDot.classList.add('dot-active');
                }
            });

            button.addEventListener('mouseout', () => {
                if (correspondingDot) {
                    correspondingDot.classList.remove('dot-active');
                }
            });
        });
    } else if (yearButtons.length > 0 && timelineDots.length > 0) { // Aggiunto controllo per evitare warning se timeline nascosta
        console.warn("Mismatch between number of year buttons and timeline dots. Hover effect potentially disabled.");
    }


    // --- Animazione Scrittura Citazione Jung ---
    const quoteElement = document.querySelector('.jung-quote');
    if (quoteElement) {
        const fullText = quoteElement.getAttribute('data-fulltext') || "";
        quoteElement.style.visibility = 'hidden';
        quoteElement.textContent = fullText;
        const fixedWidth = quoteElement.offsetWidth;
        const fixedHeight = quoteElement.offsetHeight;
        quoteElement.style.minWidth = fixedWidth + "px";
        quoteElement.style.minHeight = fixedHeight + "px";
        quoteElement.textContent = "";
        quoteElement.style.visibility = 'visible';

        const typingSpeed = 100;
        const readDelay = 2000;
        const restartDelay = 1000;
        let currentIndex = 0;
        let animationTimeout; // Per poter cancellare i timeout se necessario

        function typeText() {
            if (currentIndex < fullText.length) {
                quoteElement.textContent += fullText[currentIndex];
                currentIndex++;
                animationTimeout = setTimeout(typeText, typingSpeed);
            } else {
                animationTimeout = setTimeout(clearText, readDelay);
            }
        }

        function clearText() {
            quoteElement.textContent = "";
            currentIndex = 0;
            animationTimeout = setTimeout(startAnimation, restartDelay);
        }

        function startAnimation() {
             clearTimeout(animationTimeout); // Cancella timeout precedenti
             if (quoteElement.textContent !== "") {
                 quoteElement.textContent = "";
                 currentIndex = 0;
            }
            typeText();
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    startAnimation();
                } else {
                    clearTimeout(animationTimeout);
                    quoteElement.textContent = "";
                    currentIndex = 0;
                }
            });
        }, { threshold: 0.1 });

        observer.observe(quoteElement);
    }


    // --- NUOVO: Gestione Modal Video (AGGIORNATO) ---
    const videoButton = document.querySelector('.video-button');
    const videoModalOverlay = document.getElementById('video-modal-overlay');
    const closeVideoButton = document.querySelector('.modal-close-button');
    const freudVideo = document.getElementById('freud-video');

    // Funzione per chiudere il modal
    function closeModal() {
        if (videoModalOverlay) {
            videoModalOverlay.classList.remove('modal-visible');
        }
        if (freudVideo) {
            freudVideo.pause(); // Metti in pausa il video
            freudVideo.currentTime = 0; // Riporta il video all'inizio
            freudVideo.controls = false; // <<< NASCONDI I CONTROLLI
        }
    }

    // Aggiungi listener solo se tutti gli elementi esistono
    if (videoButton && videoModalOverlay && closeVideoButton && freudVideo) {

        // Apri modal al click sul bottone "Videomessaggio"
        videoButton.addEventListener('click', () => {
            videoModalOverlay.classList.add('modal-visible');
            freudVideo.controls = true; // <<< MOSTRA I CONTROLLI
            freudVideo.play().catch(error => {
                 // L'autoplay potrebbe fallire se l'utente non ha interagito con la pagina
                 console.log("Autoplay video bloccato dal browser:", error);
                 // I controlli sono comunque visibili, l'utente può premere play
            });
        });

        // Chiudi modal al click sul bottone 'X'
        closeVideoButton.addEventListener('click', closeModal);

        // Chiudi modal cliccando sull'overlay (sfondo scuro)
        videoModalOverlay.addEventListener('click', (event) => {
            // Controlla se il click è avvenuto direttamente sull'overlay e non sul suo contenuto o sul bottone
            if (event.target === videoModalOverlay) {
                closeModal();
            }
        });

        // Chiudi modal premendo il tasto 'Escape'
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && videoModalOverlay.classList.contains('modal-visible')) {
                closeModal();
            }
        });

    } else {
        console.warn("Elementi del modal video non trovati. Funzionalità disabilitata.");
        if (!videoButton) console.warn("Bottone '.video-button' non trovato.");
        if (!videoModalOverlay) console.warn("Overlay '#video-modal-overlay' non trovato.");
        if (!closeVideoButton) console.warn("Bottone '.modal-close-button' non trovato.");
        if (!freudVideo) console.warn("Video '#freud-video' non trovato.");
    }

}); // Fine DOMContentLoaded