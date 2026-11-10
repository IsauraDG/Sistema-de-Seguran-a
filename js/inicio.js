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

        // Toca um bipe duplo para avisar que o sistema está ativado / testar o buzzer
        function testarBuzzer() {
            emitirBeep(880, 150);
            setTimeout(() => emitirBeep(880, 150), 200);
            alert("Sinal de teste enviado! (Buzzer ativado)");
            enviarComandoESP32("BUZZER_TEST");
        }

        // Atualiza a hora atual e valida o Timer configurado
        function verificarHorarioAtivo() {
            const agora = new Date();
            document.getElementById('currentTime').innerText = agora.toLocaleTimeString('pt-BR');

            const horaAtual = agora.getHours() * 60 + agora.getMinutes();

            const [hIni, mIni] = document.getElementById('startTime').value.split(':').map(Number);
            const [hFim, mFim] = document.getElementById('endTime').value.split(':').map(Number);

            const minInicio = hIni * 60 + mIni;
            const minFim = hFim * 60 + mFim;

            let monitoramentoAtivo = false;

            // Tratamento caso o horário passe da meia-noite (ex: 18:00 até 06:00)
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

        // Atualiza o painel com base na distância lida e no status do Timer
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

            // Se a distância for menor que o limite definido pelo usuário
            if (distanciaCm < limite) {
                alertCard.className = "card status-card alert";
                statusText.innerText = "ALERTA: PRESENÇA DETECTADA!";
                buzzerText.innerText = "Buzzer: TOCANDO!";
                
                // Emite som no navegador se habilitado
                if (document.getElementById('enableAudioBrowser').checked) {
                    emitirBeep(950, 400);
                }

                // Envia comando para o ESP32 ligar o Buzzer físico
                enviarComandoESP32("BUZZER_ON");
                adicionarLog(distanciaCm, "Alerta / Buzzer Acionado");
            } else {
                alertCard.className = "card status-card clear";
                statusText.innerText = "ÁREA LIVRE";
                buzzerText.innerText = "Buzzer: Em espera";
                enviarComandoESP32("BUZZER_OFF");
            }
        }

        // Função de comunicação fictícia para ser conectada à API do ESP32 (HTTP/WebSocket)
        function enviarComandoESP32(comando) {
            // Exemplo de integração:
            // fetch(`http://192.168.1.100/control?cmd=${comando}`);
            console.log("Comando enviado ao ESP32:", comando);
        }

        // Adiciona registro na tabela de histórico
        function adicionarLog(distancia, acao) {
            const table = document.getElementById('historyLog');
            const agora = new Date().toLocaleString('pt-BR');
            
            // Limita histórico em até 10 entradas para não poluir
            if(table.children.length > 10) table.removeChild(table.lastChild);

            const row = `<tr>
                <td>${agora}</td>
                <td>${distancia} cm</td>
                <td>${acao}</td>
            </tr>`;
            table.insertAdjacentHTML('afterbegin', row);
        }

        // Executa a checagem do relógio a cada 1 segundo
        setInterval(verificarHorarioAtivo, 1000);

        // --- SIMULAÇÃO PARA TESTE (Remover quando integrar com o ESP32 real) ---
        // Simula leituras do sensor recebidas a cada 4 segundos
        setInterval(() => {
            const leituraSimulada = Math.floor(Math.random() * 180) + 20; // 20cm a 200cm
            processarLeituraSensor(leituraSimulada);
        }, 4000);