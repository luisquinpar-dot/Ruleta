let participants = [];
let isSpinning = false;
let audioContext;
let winner = null;

// --- Selectores del DOM ---
const participantsListEl = document.getElementById('participantsList');
const participantInput = document.getElementById('participantInput');
const rouletteWheel = document.getElementById('rouletteWheel');
const spinButton = document.getElementById('spinButton');
const winnerDisplay = document.getElementById('winnerDisplay');
const removeWinnerBtn = document.getElementById('removeWinnerBtn');
const emptyState = document.querySelector('.empty-state');

// Inicializar AudioContext (debe ser llamado desde una interacción del usuario)
function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}   

// Generar sonido de ruleta girando.
function playSpinSound(duration) {
    initAudio();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.setValueAtTime(100, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + duration);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    oscillator.type = 'sawtooth';
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
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
    const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7'];
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.top = '-20px';
            confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
            document.body.appendChild(confetti);
            confetti.animate([
                { transform: `translateY(0) rotate(0deg)`, opacity: 1 },
                { transform: `translateY(100vh) rotate(${Math.random() * 720}deg)`, opacity: 0 }
            ], {
                duration: Math.random() * 2000 + 2000,
                easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            }).onfinish = () => confetti.remove();
        }, Math.random() * 1000);
    }
}

// --- Gestión de Participantes (Compatible con el HTML) ---

function addParticipant() {
    const name = participantInput.value.trim();
    if (name && !participants.includes(name)) {
        participants.push(name);
        participantInput.value = '';
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

function removeParticipant(nameToRemove) {
    participants = participants.filter(p => p !== nameToRemove);
    updateParticipantsList();
    updateRoulette();
}

function clearAllParticipants() {
    participants = [];
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
        return;
    }

    // --- 1. Generar el fondo con conic-gradient ---
    const anglePerSegment = 360 / segmentCount;
    const colors = [
        '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7',
        '#fd79a8', '#fdcb6e', '#6c5ce7', '#a29bfe', '#e17055',
        '#00b894', '#e84393', '#0984e3', '#00cec9', '#fdcb6e'
    ];

    let gradientParts = [];
    participants.forEach((name, index) => {
        const color = colors[index % colors.length];
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

    const spinDuration = 4;
    playSpinSound(spinDuration);

    const winnerIndex = Math.floor(Math.random() * participants.length);
    winner = participants[winnerIndex];
    const segmentAngle = 360 / participants.length;
    const targetRotation = 360 - (winnerIndex * segmentAngle) - (segmentAngle / 2);
    const randomSpins = Math.floor(Math.random() * 5) + 5;
    const totalRotation = (360 * randomSpins) + targetRotation;

    rouletteWheel.style.transition = 'transform 4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    rouletteWheel.style.transform = `rotate(${totalRotation}deg)`;

    setTimeout(() => {
        winnerDisplay.firstChild.nodeValue = ''; // Limpiar texto "Girando..."
        winnerDisplay.insertAdjacentHTML('afterbegin', `🎉 <strong>¡GANADOR: ${winner}!</strong> 🎉`);
        removeWinnerBtn.style.display = 'inline-block';

        playCelebrationSound();
        createConfetti();

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
        removeWinnerBtn.style.display = 'none';
    }
}

// --- Inicialización ---
updateParticipantsList();
updateRoulette();
document.addEventListener('click', initAudio, { once: true });