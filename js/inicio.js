const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        function emitirBeep(frequencia = 440, duracaoMs = 200) {
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.value = frequencia;
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            setTimeout(() => osc.stop(), duracaoMs);
        }
        function testarBuzzer() {
            emitirBeep(880, 150);
            setTimeout(() => emitirBeep(880, 150), 200);
            alert("Sinal de teste enviado! (Buzzer ativado)");
            enviarComandoESP32("BUZZER_TEST");
        }
        function verificarHorarioAtivo() {
            const agora = new Date();
            document.getElementById('currentTime').innerText = agora.toLocaleTimeString('pt-BR');
            const horaAtual = agora.getHours() * 60 + agora.getMinutes();
            const [hIni, mIni] = document.getElementById('startTime').value.split(':').map(Number);
            const [hFim, mFim] = document.getElementById('endTime').value.split(':').map(Number);
            const minInicio = hIni * 60 + mIni;
            const minFim = hFim * 60 + mFim;
            let monitoramentoAtivo = false;
            if (minInicio > minFim) {
                monitoramentoAtivo = (horaAtual >= minInicio || horaAtual < minFim);
            } else {
                monitoramentoAtivo = (horaAtual >= minInicio && horaAtual < minFim);
            }
            const scheduleBadge = document.getElementById('scheduleStatusBadge');
            if (monitoramentoAtivo) {
                scheduleBadge.className = "status-badge active-schedule";
                scheduleBadge.innerText = "Monitoramento ATIVO";
            } else {
                scheduleBadge.className = "status-badge inactive-schedule";
                scheduleBadge.innerText = "Fora do Horário";
            }
            return monitoramentoAtivo;
        }
        function processarLeituraSensor(distanciaCm) {
            const monitorAtivo = verificarHorarioAtivo();
            const limite = parseInt(document.getElementById('thresholdDistance').value) || 100;
            const distanceElem = document.getElementById('distanceValue');
            const alertCard = document.getElementById('mainAlertCard');
            const statusText = document.getElementById('statusText');
            const buzzerText = document.getElementById('buzzerStatusText');
            distanceElem.innerText = distanciaCm;
            if (!monitorAtivo) {
                alertCard.className = "card status-card standby";
                statusText.innerText = "MONITORAMENTO DESATIVADO (FORA DO HORÁRIO)";
                buzzerText.innerText = "Buzzer: Desativado pelo Timer";
                return;
            }
            if (distanciaCm < limite) {
                alertCard.className = "card status-card alert";
                statusText.innerText = "ALERTA: PRESENÇA DETECTADA!";
                buzzerText.innerText = "Buzzer: TOCANDO!";
                if (document.getElementById('enableAudioBrowser').checked) {
                    emitirBeep(950, 400);
                }
                enviarComandoESP32("BUZZER_ON");
                adicionarLog(distanciaCm, "Alerta/Algo foi Detectado");
            } else {
                alertCard.className = "card status-card clear";
                statusText.innerText = "ÁREA LIVRE";
                buzzerText.innerText = "Buzzer: Em espera";
                enviarComandoESP32("BUZZER_OFF");
            }
        }
        // Essa linha de código serve para quando tiver o ip do esp
        function enviarComandoESP32(comando) {
            // fetch(`http://192.168.1.100/control?cmd=${comando}`);
            console.log("Comando enviado ao ESP32:", comando);
        }
        function adicionarLog(distancia, acao) {
            const table = document.getElementById('historyLog');
            const agora = new Date().toLocaleString('pt-BR');
            if(table.children.length > 10) table.removeChild(table.lastChild);
            const row = `<tr>
                <td>${agora}</td>
                <td>${distancia} cm</td>
                <td>${acao}</td>
            </tr>`;
            table.insertAdjacentHTML('afterbegin', row);
        }
        function checarConexaoESP32() {
            const espBadge = document.getElementById('espStatusBadge');
                fetch('http://192.168.1.100/status')
            .then(response => {
            if (!response.ok) {
                throw new Error("Erro na rede");
            }
            return response.json();
            })
            .then(data => {
                espBadge.className = "status-badge online";
                espBadge.innerText = "ESP32 Conectado";
                processarLeituraSensor(data.distancia);
            })
            .catch(() => {
                espBadge.className = "status-badge offline";
                espBadge.innerText = "ESP32 Desconectado";
            });
        }
        setInterval(checarConexaoESP32, 5000);
        setInterval(verificarHorarioAtivo, 1000);
        // Essa linha simula como se o esp estivesse conectado
        setInterval(() => {
            const leituraSimulada = Math.floor(Math.random() * 180) + 20; // 20cm a 200cm
            processarLeituraSensor(leituraSimulada);
        }, 4000);