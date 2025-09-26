        // Cargar nombres desde localStorage o usar valores por defecto
        const savedNames = localStorage.getItem('rouletteNames');
        let names = savedNames ? JSON.parse(savedNames) : ['Participante 1', 'Participante 2', 'Participante 3', 'Participante 4'];
        let isSpinning = false;
        let currentWinner = '';
        
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
            '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
            '#F8C471', '#82E0AA', '#F1948A', '#85C1E9'
        ];

        // --- Efectos de Sonido ---
        // Asegúrate de tener una carpeta 'sounds' con estos archivos.
        const spinningSound = new Audio('sounds/spinning.mp3'); // Sonido de la ruleta girando
        spinningSound.loop = true; // El sonido se repetirá mientras gira

        const winnerSound = new Audio('sounds/winner.mp3');   // Sonido al anunciar el ganador

        // Función para guardar los nombres en localStorage
        function saveNamesToStorage() {
            localStorage.setItem('rouletteNames', JSON.stringify(names));
        }

        // Función para hacer anuncios a lectores de pantalla
        function announceToSR(message) {
            document.getElementById('sr-announcer').textContent = message;
        }

        function updateWheel() {
            const wheel = document.getElementById('wheel');
            const namesList = document.getElementById('namesList');
            
            // Actualizar la ruleta
            wheel.innerHTML = '';
            
            if (names.length === 0) {
                wheel.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; color: #666;">Agrega nombres para comenzar</div>';
                namesList.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">No hay participantes</div>';
                return;
            }
            
            const segmentAngle = 360 / names.length;
            
            names.forEach((name, index) => {
                const segment = document.createElement('div');
                segment.className = 'wheel-segment';
                segment.style.background = colors[index % colors.length];
                segment.style.transform = `rotate(${index * segmentAngle}deg)`;

                // --- Lógica para ajustar el tamaño de la fuente ---
                let fontSize = 14; // Tamaño base
                if (name.length > 10) {
                    fontSize = 12; // Reducir para nombres largos
                }
                if (name.length > 15) {
                    fontSize = 10; // Reducir aún más para nombres muy largos
                }
                segment.innerHTML = `<span style="font-size: ${fontSize}px; transform: rotate(90deg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 80px;">${name}</span>`;
                wheel.appendChild(segment);
            });
            
            // Actualizar la lista
            namesList.innerHTML = '';
            names.forEach((name, index) => {
                const nameItem = document.createElement('div');
                nameItem.className = 'name-item';
                nameItem.innerHTML = `
                    <span class="name-text">${name}</span>
                    <button class="btn-danger" style="padding: 5px 10px; font-size: 12px;" onclick="removeName(${index})" aria-label="Eliminar a ${name}">×</button>
                `;
                namesList.appendChild(nameItem);
            });

            // Guardar los cambios en localStorage cada vez que se actualiza la UI
            saveNamesToStorage();
        }

        function addName() {
            const input = document.getElementById('nameInput');
            const name = input.value.trim();
            
            if (name && !names.includes(name)) {
                names.push(name);
                input.value = '';
                updateWheel();
            } else if (names.includes(name)) {
                alert('Este nombre ya existe en la lista');
            } else {
                alert('Por favor ingresa un nombre válido');
            }
        }

        function removeName(index) {
            names.splice(index, 1);
            updateWheel();
        }

        function clearAll() {
            if (confirm('¿Estás seguro de que quieres eliminar todos los nombres?')) {
                names = [];
                updateWheel();
            }
        }

        function spinWheel() {
            if (names.length < 2) {
                alert('Necesitas al menos 2 participantes para girar la ruleta');
                return;
            }
            
            if (isSpinning) return;
            
            isSpinning = true;
            const wheel = document.getElementById('wheel');
            const spinBtn = document.getElementById('spinBtn');
            
            spinBtn.textContent = 'Girando...';
            spinBtn.disabled = true;
            
            // Iniciar sonido de giro
            spinningSound.play();

            // Anunciar al lector de pantalla
            announceToSR('La ruleta está girando.');

            // Resetea la transición para un giro limpio
            wheel.style.transition = 'none';
            const currentRotation = Math.random() * 360; // Posición inicial aleatoria para que no se vea el "salto"
            wheel.style.transform = `rotate(${currentRotation}deg)`;

            // Generar rotación aleatoria
            const extraSpins = 1440; // Al menos 4 vueltas completas
            const finalAngle = Math.floor(Math.random() * 360);
            const totalRotation = extraSpins + finalAngle;
            
            // Forzar un reflow del navegador y aplicar la nueva animación.
            // Usamos un timeout anidado para separar la lógica de la animación de la lógica del resultado.
            setTimeout(() => {
                wheel.style.transition = 'transform 4s ease-out';
                wheel.style.transform = `rotate(${totalRotation}deg)`;

                // Esperar a que la animación termine para anunciar el ganador
                setTimeout(() => {
                    // Detener sonido de giro y reproducir sonido de ganador
                    spinningSound.pause();
                    spinningSound.currentTime = 0; // Reiniciar para la próxima vez

                    // Calcular ganador
                    const segmentAngle = 360 / names.length;
                    const normalizedRotation = totalRotation % 360;
                    const winnerIndex = Math.floor((360 - normalizedRotation + (segmentAngle / 2)) / segmentAngle) % names.length;
                    
                    currentWinner = names[winnerIndex];
                    showWinnerModal(currentWinner);
                    
                    isSpinning = false;
                    spinBtn.textContent = '¡GIRAR RULETA!';
                    spinBtn.disabled = false;
                }, 4000); // Este tiempo debe coincidir con la duración de la transición en CSS
            }, 10); // Pequeño delay para asegurar el reseteo de la animación
        }

        function showWinnerModal(winner) {
            const winnerModal = document.getElementById('winnerModal');
            const winnerNameEl = document.getElementById('winnerName');

            winnerNameEl.textContent = winner;
            document.getElementById('overlay').style.display = 'block';
            winnerModal.style.display = 'block';
            winnerModal.querySelector('button').focus(); // Mover foco al primer botón del modal

            // Reproducir sonido de ganador junto con el confeti
            winnerSound.play();
            // Anunciar al ganador
            announceToSR(`El ganador es ${winner}`);

            // ¡Lanzar confeti!
            confetti({
                particleCount: 150, // Número de partículas de confeti
                spread: 90,         // Qué tan disperso sale el confeti
                origin: { y: 0.6 }, // Origen del confeti (un poco por debajo del centro vertical)
                zIndex: 1001        // Asegurarse de que esté por encima del modal
            });
        }

        function closeModal() {
            document.getElementById('overlay').style.display = 'none';
            document.getElementById('winnerModal').style.display = 'none';
        }

        function removeWinner() {
            const winnerIndex = names.indexOf(currentWinner);
            if (winnerIndex > -1) {
                names.splice(winnerIndex, 1);
                updateWheel();
            }
            closeModal();
        }

        // Permitir agregar nombres con Enter
        document.getElementById('nameInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addName();
            }
        });

        // Inicializar la ruleta
        updateWheel();