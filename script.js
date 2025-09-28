let participants = [];
let isSpinning = false;
let audioContext;
let winner = null;
let rouletteColors = [ // Paleta de colores compartida
    '#8e44ad', '#3498db', '#2ecc71', '#f1c40f', 
    '#e67e22', '#e74c3c', '#1abc9c', '#d35400',
    '#27ae60', '#c0392b', '#2980b9', '#f39c12'
];


// --- Selectores del DOM ---
const participantsListEl = document.getElementById('participantsList');
const participantInput = document.getElementById('participantInput');
const rouletteWheel = document.getElementById('rouletteWheel');
const spinButton = document.getElementById('spinButton');
const wheelCenter = document.getElementById('wheelCenter'); // Seleccionamos el botón central
const winnerDisplay = document.getElementById('winnerDisplay');
const removeWinnerBtn = document.getElementById('removeWinnerBtn');
const emptyState = document.querySelector('.empty-state');
const winnerModal = document.getElementById('winnerModal');
const modalWinnerName = document.getElementById('modalWinnerName');
const modalRemoveWinnerBtn = document.getElementById('modalRemoveWinnerBtn');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const importFileInput = document.getElementById('importFile');
const modalConfettiContainer = document.getElementById('modalConfettiContainer');


// Inicializar AudioContext (debe ser llamado desde una interacción del usuario)
function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}   

// --- Generación de Sonidos ---

let tickTimer = null; // Para controlar el temporizador de los ticks

// Genera un único sonido de "tick"
function playTick() {
    if (!audioContext) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0.8, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    oscillator.frequency.setValueAtTime(1000, now);
    oscillator.type = 'triangle';
    oscillator.start(now);
    oscillator.stop(now + 0.08);
}

// Gestiona la secuencia de "ticks" para simular el giro
function playSpinSound(duration, totalRotation, segmentCount) {
    initAudio();
    clearTimeout(tickTimer); // Limpiar cualquier temporizador anterior

    if (segmentCount === 0) return;

    const anglePerSegment = 360 / segmentCount;
    const totalTicks = Math.floor(totalRotation / anglePerSegment) + 1; // Añadimos un tick extra para el aterrizaje
    const durationMs = duration * 1000;

    // Función de easing que imita la curva CSS `cubic-bezier(0.1, 0.7, 0.3, 1)`.
    // Esta función mapea el progreso lineal del TIEMPO (de 0 a 1)
    // a un progreso no lineal de la ROTACIÓN.
    const easeOut = (time) => {
        return 1 - Math.pow(1 - time, 4); // Usamos una curva ease-out (potencia 4)
    };

    // Generamos los ticks a lo largo del tiempo
    for (let i = 0; i < durationMs; i += 10) { // Revisamos cada 10ms
        const timeProgress = i / durationMs; // Progreso lineal del tiempo
        const rotationProgress = easeOut(timeProgress); // Progreso no lineal de la rotación

        // Calculamos cuántos ticks deberían haber sonado hasta este momento
        const ticksSoFar = Math.floor(rotationProgress * totalTicks);
        // Calculamos cuántos ticks deberían haber sonado en el paso anterior
        const prevTicks = Math.floor(easeOut((i - 10) / durationMs) * totalTicks);

        // Si el número de ticks ha aumentado, significa que hemos cruzado un segmento
        if (ticksSoFar > prevTicks) {
            setTimeout(playTick, i);
        }
    }
}

// Generar sonido de celebración
function playCelebrationSound() {
    initAudio();
    const frequencies = [523.25, 659.25, 783.99, 1046.50];
    frequencies.forEach((freq, index) => {
        setTimeout(() => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        }, index * 100);
    });
}

// --- Efectos Visuales ---
function createConfetti() {
    for (let i = 0; i < 200; i++) { // Duplicamos la cantidad para un efecto más denso
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.background = rouletteColors[Math.floor(Math.random() * rouletteColors.length)];
            confetti.style.left = Math.random() * 100 + 'vw'; // Usamos vw para ancho de viewport
            confetti.style.top = '-20px';
            confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
            document.body.appendChild(confetti); // Añadimos el confeti al body
            confetti.animate([
                { transform: `translateY(0) rotate(${Math.random() * 360}deg)`, opacity: 1 },
                { transform: `translateY(100vh) rotate(${Math.random() * 720}deg)`, opacity: 0 } // Usamos vh para altura de viewport
            ], {
                duration: Math.random() * 2000 + 2000,
                easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            }).onfinish = () => confetti.remove();
        }, Math.random() * 1000);
    }
}

// --- Gestión de Almacenamiento Local ---
function saveParticipants() {
    localStorage.setItem('rouletteParticipants', JSON.stringify(participants));
}

function loadParticipants() {
    const savedParticipants = localStorage.getItem('rouletteParticipants');
    if (savedParticipants) {
        participants = JSON.parse(savedParticipants);
    }
}

// --- Gestión de Participantes (Compatible con el HTML) ---

function addParticipant() {
    const name = participantInput.value.trim();
    if (name && !participants.includes(name)) {
        participants.push(name);
        participantInput.value = '';
        saveParticipants();
        updateParticipantsList();
        updateRoulette();
    } else if (participants.includes(name)) {
        alert('Este participante ya ha sido agregado.');
    }
}

participantInput.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
        addParticipant();
    }
});

function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target.result;
        const names = text.split('\n').map(name => name.trim()).filter(name => name.length > 0);
        
        let addedCount = 0;
        names.forEach(name => {
            if (name && !participants.includes(name)) {
                participants.push(name);
                addedCount++;
            }
        });

        saveParticipants();
        updateParticipantsList();
        updateRoulette();
        alert(`${addedCount} participante(s) importado(s) con éxito.`);
    };
    reader.readAsText(file);
    event.target.value = ''; // Resetear el input para poder cargar el mismo archivo de nuevo
}

function removeParticipant(nameToRemove) {
    participants = participants.filter(p => p !== nameToRemove);
    saveParticipants();
    updateParticipantsList();
    updateRoulette();
}

function clearAllParticipants() {
    participants = [];
    saveParticipants();
    updateParticipantsList();
    updateRoulette();
}

function updateParticipantsList() {
    participantsListEl.innerHTML = '';
    if (participants.length === 0) {
        const emptyEl = document.createElement('div');
        emptyEl.className = 'empty-state';
        emptyEl.textContent = 'No hay participantes agregados';
        participantsListEl.appendChild(emptyEl);
    } else {
        participants.forEach(name => {
            const item = document.createElement('div');
            item.className = 'participant-item';
            item.innerHTML = `
                <span class="participant-name">${name}</span>
                <button class="btn-remove" onclick="removeParticipant('${name}')">✖</button>
            `;
            participantsListEl.appendChild(item);
        });
    }
}
 
// --- Lógica de la Ruleta ---

function updateRoulette() {
    const center = rouletteWheel.querySelector('.wheel-center');
    rouletteWheel.innerHTML = ''; // Limpiar segmentos
    if (center) {
        rouletteWheel.appendChild(center); // Re-agregar el centro
    }

    const segmentCount = participants.length;
    spinButton.disabled = segmentCount < 1;
    removeWinnerBtn.style.display = 'none';

    if (segmentCount === 0) {
        winnerDisplay.firstChild.textContent = 'Agrega participantes para comenzar';
        // Establecer un fondo para la ruleta vacía
        rouletteWheel.style.background = '#e2e8f0';
        return;
    }

    // --- 1. Generar el fondo con conic-gradient ---
    const anglePerSegment = 360 / segmentCount;

    let gradientParts = [];
    participants.forEach((name, index) => {
        const color = rouletteColors[index % rouletteColors.length];
        const startAngle = index * anglePerSegment;
        const endAngle = (index + 1) * anglePerSegment;
        gradientParts.push(`${color} ${startAngle}deg ${endAngle}deg`);
    });
    rouletteWheel.style.background = `conic-gradient(${gradientParts.join(', ')})`;

    // --- 2. Crear y posicionar las etiquetas de texto ---
    participants.forEach((name, index) => {
        // Contenedor para el texto que rotará
        const textContainer = document.createElement('div');
        textContainer.className = 'segment-text-container';
        
        // El elemento de texto en sí
        const text = document.createElement('div');
        text.className = 'segment-text';
        text.textContent = name;

        // Calcular el ángulo para centrar el texto en el segmento
        const textAngle = (index * anglePerSegment) + (anglePerSegment / 2);
        textContainer.style.transform = `rotate(${textAngle}deg)`;

        textContainer.appendChild(text);
        rouletteWheel.appendChild(textContainer);
    });
}

function spinWheel() {
    if (isSpinning || participants.length < 1) return;

    initAudio();
    isSpinning = true;
    spinButton.disabled = true;
    spinButton.textContent = 'Girando...';
    winnerDisplay.firstChild.textContent = 'Girando...';
    removeWinnerBtn.style.display = 'none';

    const spinDuration = 7; // Aumentamos la duración para más suspenso

    const winnerIndex = Math.floor(Math.random() * participants.length);
    winner = participants[winnerIndex];
    const segmentAngle = 360 / participants.length;
    const targetRotation = 360 - (winnerIndex * segmentAngle) - (segmentAngle / 2);
    const randomSpins = Math.floor(Math.random() * 5) + 5;
    const totalRotation = (360 * randomSpins) + targetRotation;

    // Iniciar el sonido de los ticks sincronizado con la animación
    playSpinSound(spinDuration, totalRotation, participants.length);

    rouletteWheel.style.transition = `transform ${spinDuration}s cubic-bezier(0.1, 0.7, 0.3, 1)`; // Curva de animación para un final lento
    rouletteWheel.style.transform = `rotate(${totalRotation}deg)`;

    setTimeout(() => {
        showWinnerModal(winner);

        setTimeout(() => {
            spinButton.disabled = false;
            spinButton.textContent = '¡Girar Ruleta!';
            isSpinning = false;
        }, 1000);

        // Resetear la transición para futuros giros
        rouletteWheel.style.transition = 'none';
        const finalRotation = totalRotation % 360;
        rouletteWheel.style.transform = `rotate(${finalRotation}deg)`;

    }, spinDuration * 1000);
}

function removeWinner() {
    if (winner) {
        removeParticipant(winner);
        winner = null;
        winnerDisplay.firstChild.textContent = '¡Listo para el siguiente giro!';
        winnerDisplay.style.display = 'flex';
        removeWinnerBtn.style.display = 'none';
    }
}

// --- Lógica de la Ventana Modal ---
function showWinnerModal(winnerName) {
    modalWinnerName.textContent = winnerName;
    winnerModal.classList.add('active');
    playCelebrationSound();
    createConfetti(); // Ya no necesita el contenedor

    // Ocultar el display de ganador anterior
    winnerDisplay.style.display = 'none';
}

function hideWinnerModal() {
    winnerModal.classList.remove('active');
    // Ya no es necesario limpiar el contenedor, los confetis se auto-eliminan
}

modalRemoveWinnerBtn.addEventListener('click', () => {
    removeWinner();
    hideWinnerModal();
});

modalCloseBtn.addEventListener('click', hideWinnerModal);

// --- Inicialización ---
loadParticipants();
updateParticipantsList();
updateRoulette();
document.addEventListener('click', initAudio, { once: true });
importFileInput.addEventListener('change', handleImportFile);
wheelCenter.addEventListener('click', spinWheel); // Le asignamos la función de girar
removeWinnerBtn.addEventListener('click', removeWinner); // Re-asignamos por si acaso