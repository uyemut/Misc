        let isMuted = false;
        let audioCtx = null;

        function playKeyClick(type) {
            if (isMuted) return;
            try {
                if (!audioCtx) {
                    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                }
                
                const osc = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                
                osc.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                
                if (type === 'action') {
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(650, audioCtx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(120, audioCtx.currentTime + 0.08);
                    gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
                } else if (type === 'compute') {
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.12);
                    gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
                } else if (type === 'memory') {
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(520, audioCtx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(620, audioCtx.currentTime + 0.1);
                    gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
                } else {
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(450, audioCtx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.05);
                    gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
                }
                
                gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.12);
                
                osc.start();
                osc.stop(audioCtx.currentTime + 0.13);
            } catch (error) {
                console.warn("Audio Context initialization was deferred due to local browser policies.", error);
            }
        }

        function toggleMute() {
            isMuted = !isMuted;
            const indicator = document.getElementById('sound-indicator');
            if (isMuted) {
                indicator.classList.remove('bg-yellow-500');
                indicator.classList.add('bg-slate-600');
                indicator.setAttribute('title', 'Haptics Muted');
            } else {
                indicator.classList.remove('bg-slate-600');
                indicator.classList.add('bg-yellow-500');
                indicator.setAttribute('title', 'Mute Haptic Sounds');
                playKeyClick('action');
            }
        }

        class CalculatorEngine {
            constructor(previousOperandTextElement, currentOperandTextElement) {
                this.previousOperandTextElement = previousOperandTextElement;
                this.currentOperandTextElement = currentOperandTextElement;
                this.historyLedger = [];
                this.clear();
            }

            clear() {
                this.currentOperand = '0';
                this.previousOperand = '';
                this.operation = undefined;
                this.lastOperation = undefined; // Memory slot operation trace
                this.lastOperand = undefined;   // Memory slot operand value trace
                this.updateDisplay();
                this.updateMemoryIndicator();
            }

            delete() {
                if (this.currentOperand === '0') return;
                this.currentOperand = this.currentOperand.toString().slice(0, -1);
                if (this.currentOperand === '') this.currentOperand = '0';
                this.updateDisplay();
            }

            appendNumber(number) {
                if (number === '.' && this.currentOperand.includes('.')) return;
                
                if (this.currentOperand === '0' && number !== '.') {
                    this.currentOperand = number.toString();
                } else {
                    this.currentOperand = this.currentOperand.toString() + number.toString();
                }
                
                if (this.currentOperand.length > 14) {
                    this.currentOperand = this.currentOperand.slice(0, 14);
                }
                this.updateDisplay();
            }

            chooseOperation(operation) {
                if (this.currentOperand === '' && operation === '−') {
                    this.currentOperand = '-';
                    this.updateDisplay();
                    return;
                }
                if (this.currentOperand === '' && this.previousOperand !== '') {
                    this.operation = operation;
                    this.updateDisplay();
                    return;
                }
                if (this.currentOperand === '') return;
                if (this.previousOperand !== '') {
                    this.compute();
                }
                this.operation = operation;
                this.previousOperand = this.currentOperand;
                this.currentOperand = '';
                this.updateDisplay();
            }

            squareRoot() {
                const current = parseFloat(this.currentOperand);
                if (isNaN(current)) return;
                if (current < 0) {
                    this.showInlineError("Mathematical Error (Negative Root)");
                    this.clear();
                    return;
                }
                const result = Math.sqrt(current);
                const oldOperand = `√(${this.currentOperand})`;
                this.currentOperand = (Math.round(result * 100000000) / 100000000).toString();
                this.previousOperand = '';
                this.operation = undefined;
                this.updateDisplay();
                this.addHistoryEntry(oldOperand, this.currentOperand);
            }

            negate() {
                if (this.currentOperand === '0') return;
                if (this.currentOperand.startsWith('-')) {
                    this.currentOperand = this.currentOperand.slice(1);
                } else {
                    this.currentOperand = '-' + this.currentOperand;
                }
                this.updateDisplay();
            }

            compute() {
                let computation;
                const prev = parseFloat(this.previousOperand);
                const current = parseFloat(this.currentOperand);
                if (isNaN(prev) || isNaN(current)) return;

                switch (this.operation) {
                    case '+': computation = prev + current; break;
                    case '-':
                    case '−': computation = prev - current; break;
                    case '×':
                    case '*': computation = prev * current; break;
                    case '÷': 
                    case '/':
                        if (current === 0) {
                            this.showInlineError("Division Fault (Cannot Divide By 0)");
                            this.clear();
                            return;
                        }
                        computation = prev / current; 
                        break;
                    case '^': computation = Math.pow(prev, current); break;
                    case '%': computation = prev % current; break;
                    default: return;
                }

                const displayComputation = Math.round(computation * 100000000) / 100000000;
                
                // Keep record in volatile memory registry
                this.lastOperation = this.operation;
                this.lastOperand = current;
                this.updateMemoryIndicator();

                const mathExpression = `${this.getDisplayNumber(this.previousOperand)} ${this.operationSymbolMap(this.operation)} ${this.getDisplayNumber(this.currentOperand)}`;
                this.addHistoryEntry(mathExpression, displayComputation);

                this.currentOperand = displayComputation.toString();
                this.operation = undefined;
                this.previousOperand = '';
                this.updateDisplay();
            }

            invokeMemory() {
                if (this.lastOperation === undefined || this.lastOperand === undefined) {
                    this.showInlineError("No mathematical sequence memorized yet");
                    return;
                }
                const current = parseFloat(this.currentOperand);
                if (isNaN(current)) return;

                let computation;
                const operand = this.lastOperand;
                const op = this.lastOperation;

                switch (op) {
                    case '+': computation = current + operand; break;
                    case '-':
                    case '−': computation = current - operand; break;
                    case '×':
                    case '*': computation = current * operand; break;
                    case '÷':
                    case '/':
                        if (operand === 0) {
                            this.showInlineError("Division Fault (Cannot Divide By 0)");
                            return;
                        }
                        computation = current / operand;
                        break;
                    case '^': computation = Math.pow(current, operand); break;
                    case '%': computation = current % operand; break;
                    default: return;
                }

                const displayComputation = Math.round(computation * 100000000) / 100000000;
                
                const mathExpression = `${this.getDisplayNumber(current)} ${this.operationSymbolMap(op)} ${this.getDisplayNumber(operand)}`;
                this.addHistoryEntry(mathExpression, displayComputation);

                this.currentOperand = displayComputation.toString();
                this.updateDisplay();
            }

            showInlineError(msg) {
                const toast = document.getElementById('inline-error-toast');
                const text = document.getElementById('inline-error-text');
                text.innerText = msg;
                toast.style.transform = "translateY(0px)";
                toast.style.opacity = "1";
                
                if (!isMuted && audioCtx) {
                    try {
                        const osc = audioCtx.createOscillator();
                        const gain = audioCtx.createGain();
                        osc.connect(gain);
                        gain.connect(audioCtx.destination);
                        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
                        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
                        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.25);
                        osc.start();
                        osc.stop(audioCtx.currentTime + 0.26);
                    } catch (e) {}
                }

                setTimeout(() => {
                    toast.style.transform = "translateY(-48px)";
                    toast.style.opacity = "0";
                }, 3000);
            }

            operationSymbolMap(op) {
                const maps = {
                    '+': '+',
                    '-': '−',
                    '−': '−',
                    '×': '×',
                    '*': '×',
                    '÷': '÷',
                    '/': '÷',
                    '^': '^',
                    '%': '%'
                };
                return maps[op] || op;
            }

            getDisplayNumber(number) {
                const stringNumber = number.toString();
                if (stringNumber === '-') return '-'; 
                if (stringNumber.includes('e')) return stringNumber; 
                
                const integerDigits = parseFloat(stringNumber.split('.')[0]);
                const decimalDigits = stringNumber.split('.')[1];
                let integerDisplay;
                
                if (isNaN(integerDigits)) {
                    integerDisplay = '';
                } else {
                    integerDisplay = integerDigits.toLocaleString('en', { maximumFractionDigits: 0 });
                }
                
                if (decimalDigits != null) {
                    return `${integerDisplay}.${decimalDigits}`;
                } else {
                    return integerDisplay;
                }
            }

            addHistoryEntry(expression, result) {
                const entry = { expression, result };
                this.historyLedger.unshift(entry);
                
                const emptyState = document.getElementById('history-empty');
                if (emptyState) emptyState.remove();

                const container = document.getElementById('history-items');
                const badge = document.getElementById('history-badge');
                
                if (document.getElementById('history-drawer').classList.contains('translate-x-full')) {
                    badge.classList.remove('hidden');
                }

                const itemHtml = `
                    <div class="p-2 border-b border-slate-900 hover:bg-slate-900/40 rounded-lg cursor-pointer transition-all group" onclick="rehydrateCalculation('${result}')">
                        <div class="text-[10px] text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap group-hover:text-slate-400">${expression}</div>
                        <div class="text-right text-cyan-400 font-bold tracking-wide mt-0.5">${this.getDisplayNumber(result)}</div>
                    </div>
                `;
                container.insertAdjacentHTML('afterbegin', itemHtml);
            }

            updateMemoryIndicator() {
                const indicator = document.getElementById('memory-indicator');
                if (this.lastOperation !== undefined && this.lastOperand !== undefined) {
                    indicator.innerText = `M: ${this.operationSymbolMap(this.lastOperation)} ${this.getDisplayNumber(this.lastOperand)}`;
                    indicator.classList.remove('hidden');
                } else {
                    indicator.classList.add('hidden');
                }
            }

            updateDisplay() {
                if (this.currentOperand === '0') {
                    this.currentOperandTextElement.innerText = '0';
                } else if (this.currentOperand === '-') {
                    this.currentOperandTextElement.innerText = '-';
                } else {
                    this.currentOperandTextElement.innerText = this.getDisplayNumber(this.currentOperand);
                }

                if (this.operation != null) {
                    this.previousOperandTextElement.innerText = `${this.getDisplayNumber(this.previousOperand)} ${this.operationSymbolMap(this.operation)}`;
                } else {
                    this.previousOperandTextElement.innerText = '';
                }
            }
        }

        const previousOperandTextElement = document.getElementById('previous-operand');
        const currentOperandTextElement = document.getElementById('current-operand');
        const calculator = new CalculatorEngine(previousOperandTextElement, currentOperandTextElement);

        function triggerBtn(action, value = '') {
            if (action === 'number') {
                playKeyClick('digit');
                calculator.appendNumber(value);
            } else if (action === 'operation') {
                playKeyClick('action');
                calculator.chooseOperation(value);
            } else if (action === 'sqrt') {
                playKeyClick('action');
                calculator.squareRoot();
            } else if (action === 'negate') {
                playKeyClick('action');
                calculator.negate();
            } else if (action === 'memory') {
                playKeyClick('memory');
                calculator.invokeMemory();
            } else if (action === 'clear') {
                playKeyClick('action');
                calculator.clear();
            } else if (action === 'delete') {
                playKeyClick('action');
                calculator.delete();
            } else if (action === 'compute') {
                playKeyClick('compute');
                calculator.compute();
            }
        }

        function rehydrateCalculation(val) {
            playKeyClick('action');
            calculator.currentOperand = val;
            calculator.updateDisplay();
        }

        let isDarkMode = true;
        function toggleTheme() {
            playKeyClick('action');
            isDarkMode = !isDarkMode;
            
            const body = document.getElementById('theme-body');
            const container = document.getElementById('calc-container');
            const terminal = document.getElementById('terminal-screen');
            const headerBorder = document.getElementById('header-border');
            const currentDisplay = document.getElementById('current-operand');
            const previousDisplay = document.getElementById('previous-operand');
            const themeIcon = document.getElementById('theme-icon');
            const title = document.getElementById('calc-title');
            const footer = document.getElementById('calc-footer');
            const kbdHint = document.getElementById('kbd-r');
            const kbdHintM = document.getElementById('kbd-m');
            const historyDrawer = document.getElementById('history-drawer');
            const memIndicator = document.getElementById('memory-indicator');
            const buttons = document.querySelectorAll('.calc-button');
            
            if (!isDarkMode) {
                // LIGHT THEME CONFIGURATION
                body.className = "min-h-screen flex flex-col items-center justify-center bg-gray-100 text-gray-800 p-4 select-none transition-all duration-300";
                container.className = "relative w-full max-w-md bg-white border border-gray-200 rounded-3xl shadow-xl p-6 glass-panel transition-all duration-300";
                terminal.className = "relative bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-5 flex flex-col items-end justify-center min-h-[110px] overflow-hidden transition-all duration-300";
                headerBorder.className = "flex items-center justify-between mb-5 pb-3 border-b border-gray-200";
                currentDisplay.className = "text-4xl font-bold font-mono tracking-normal text-gray-800 w-full text-right break-all overflow-hidden h-12 flex items-end justify-end px-1 select-text";
                previousDisplay.className = "text-gray-400 text-sm font-mono tracking-wide h-6 w-full text-right overflow-hidden whitespace-nowrap text-ellipsis px-1 transition-all";
                title.className = "text-xs font-semibold tracking-wider text-gray-400 font-mono uppercase";
                footer.className = "text-[10px] text-center text-gray-400 font-mono mt-4 tracking-normal";
                kbdHint.className = "bg-gray-50 border border-gray-200 rounded px-1 text-gray-500 shadow-sm";
                kbdHintM.className = "bg-gray-50 border border-gray-200 rounded px-1 text-gray-500 shadow-sm";
                historyDrawer.className = "absolute inset-y-0 right-0 w-72 bg-gray-50 border-l border-gray-200 rounded-r-3xl flex flex-col p-4 shadow-xl transform translate-x-full transition-transform duration-300 ease-in-out z-20";
                memIndicator.className = "absolute top-2 left-2 bg-purple-50 border border-purple-200 text-purple-600 text-[10px] px-2 py-0.5 rounded-md font-mono hidden transition-all duration-300 select-none";
                
                themeIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />`;
                
                buttons.forEach(btn => {
                    if (btn.classList.contains('bg-cyan-500')) {
                        // Keep Equals key accent intact
                    } else if (btn.classList.contains('bg-red-950/40')) {
                        btn.className = "calc-button bg-red-50 text-red-500 hover:bg-red-100/80 border border-red-200/60 rounded-2xl py-4 font-bold text-sm tracking-wide font-mono shadow-sm";
                    } else if (btn.classList.contains('bg-purple-950/40')) {
                        btn.className = "calc-button bg-purple-50 text-purple-600 hover:bg-purple-100/80 border border-purple-200/60 rounded-2xl py-4 font-bold text-lg font-mono shadow-sm";
                    } else if (btn.classList.contains('bg-cyan-950/40')) {
                        btn.className = "calc-button bg-blue-50 text-blue-600 hover:bg-blue-100/80 border border-blue-200/60 rounded-2xl py-4 font-bold text-xl font-mono shadow-sm";
                    } else if (btn.classList.contains('bg-slate-900/50')) {
                        btn.className = "calc-button bg-gray-100 text-gray-600 hover:bg-gray-200/80 border border-gray-200/60 rounded-2xl py-4 font-bold text-lg font-mono shadow-sm";
                        if (btn.innerText === '√' || btn.innerText === '^') {
                            btn.classList.replace('text-gray-600', 'text-cyan-600');
                        }
                    } else {
                        btn.className = "calc-button bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200/60 rounded-2xl py-4 font-medium text-lg font-mono shadow-sm";
                    }
                });
            } else {
                // DARK THEME CONFIGURATION
                body.className = "min-h-screen flex flex-col items-center justify-center bg-slate-900 text-slate-100 p-4 select-none transition-all duration-300";
                container.className = "relative w-full max-w-md bg-slate-950/90 border border-slate-800 rounded-3xl shadow-2xl p-6 glass-panel transition-all duration-300";
                terminal.className = "relative bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 mb-5 flex flex-col items-end justify-center min-h-[110px] overflow-hidden transition-all duration-300";
                headerBorder.className = "flex items-center justify-between mb-5 pb-3 border-b border-slate-800/80";
                currentDisplay.className = "text-4xl font-bold font-mono tracking-normal text-white w-full text-right break-all overflow-hidden h-12 flex items-end justify-end px-1 select-text";
                previousDisplay.className = "text-slate-500 text-sm font-mono tracking-wide h-6 w-full text-right overflow-hidden whitespace-nowrap text-ellipsis px-1 transition-all";
                title.className = "text-xs font-semibold tracking-wider text-slate-400 font-mono uppercase";
                footer.className = "text-[10px] text-center text-slate-500 font-mono mt-4 tracking-normal";
                kbdHint.className = "bg-slate-900 border border-slate-800 rounded px-1 text-slate-400 shadow-sm";
                kbdHintM.className = "bg-slate-900 border border-slate-800 rounded px-1 text-slate-400 shadow-sm";
                historyDrawer.className = "absolute inset-y-0 right-0 w-72 bg-slate-950 border-l border-slate-800 rounded-r-3xl flex flex-col p-4 shadow-2xl transform translate-x-full transition-transform duration-300 ease-in-out z-20";
                memIndicator.className = "absolute top-2 left-2 bg-purple-950/60 border border-purple-800/50 text-purple-300 text-[10px] px-2 py-0.5 rounded-md font-mono hidden transition-all duration-300 select-none";
                
                themeIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.364l-.707-.707M15 12a3 3 0 11-6 0 3 3 0 016 0z" />`;
                
                buttons.forEach(btn => {
                    if (btn.classList.contains('bg-cyan-500')) {
                        // Keep Equals key accent intact
                    } else if (btn.classList.contains('bg-red-50')) {
                        btn.className = "calc-button bg-red-950/40 text-red-400 hover:bg-red-900/40 hover:text-red-300 border border-red-900/40 rounded-2xl py-4 font-bold text-sm tracking-wide font-mono shadow-sm";
                    } else if (btn.classList.contains('bg-purple-50')) {
                        btn.className = "calc-button bg-purple-950/40 text-purple-400 hover:bg-purple-900/40 hover:text-purple-300 border border-purple-900/40 rounded-2xl py-4 font-bold text-lg font-mono shadow-sm";
                    } else if (btn.classList.contains('bg-blue-50')) {
                        btn.className = "calc-button bg-cyan-950/40 text-cyan-400 hover:bg-cyan-900/40 hover:text-cyan-300 border border-cyan-900/40 rounded-2xl py-4 font-bold text-xl font-mono shadow-sm";
                    } else if (btn.classList.contains('bg-gray-100') && (btn.innerText === 'DEL' || btn.innerText === '√' || btn.innerText === '^' || btn.innerText === '±' || btn.innerText === '%')) {
                        btn.className = "calc-button bg-slate-900/50 text-slate-300 hover:bg-slate-800/50 border border-slate-800 rounded-2xl py-4 font-bold text-sm tracking-wide font-mono shadow-sm";
                        if (btn.innerText === '√' || btn.innerText === '^') {
                            btn.classList.replace('text-slate-300', 'text-cyan-400');
                            btn.classList.replace('text-sm', 'text-lg');
                        }
                    } else {
                        btn.className = "calc-button bg-slate-900/30 text-slate-200 hover:bg-slate-800/40 border border-slate-800/60 rounded-2xl py-4 font-medium text-lg font-mono shadow-sm";
                    }
                });
            }
        }

        function toggleHistory() {
            playKeyClick('action');
            const drawer = document.getElementById('history-drawer');
            const badge = document.getElementById('history-badge');
            
            badge.classList.add('hidden');
            
            if (drawer.classList.contains('translate-x-full')) {
                drawer.classList.remove('translate-x-full');
            } else {
                drawer.classList.add('translate-x-full');
            }
        }

        function clearHistory() {
            playKeyClick('action');
            const container = document.getElementById('history-items');
            container.innerHTML = `
                <div id="history-empty" class="h-full flex flex-col items-center justify-center text-center text-slate-600 space-y-1">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span class="text-[11px]">Ledger is currently empty</span>
                </div>
            `;
            calculator.historyLedger = [];
        }

        function closeWindow() {
            window.close();
            setTimeout(() => {
                const modal = document.getElementById('modal-container');
                modal.classList.remove('opacity-0', 'pointer-events-none');
            }, 120);
        }

        function hideModal() {
            const modal = document.getElementById('modal-container');
            modal.classList.add('opacity-0', 'pointer-events-none');
        }

        document.addEventListener('keydown', e => {
            if ((e.key >= '0' && e.key <= '9') || e.key === '.') {
                triggerBtn('number', e.key);
            }
            
            if (e.key === '+') triggerBtn('operation', '+');
            if (e.key === '-') triggerBtn('operation', '−');
            if (e.key === '*') triggerBtn('operation', '×');
            if (e.key === '/') {
                e.preventDefault();
                triggerBtn('operation', '÷');
            }
            if (e.key === '^') triggerBtn('operation', '^');
            if (e.key === '%') triggerBtn('operation', '%');
            if (e.key === 'r' || e.key === 'R') triggerBtn('sqrt');
            if (e.key === 'm' || e.key === 'M') {
                e.preventDefault();
                triggerBtn('memory');
            }

            if (e.key === '=' || e.key === 'Enter') {
                e.preventDefault();
                triggerBtn('compute');
            }
            
            if (e.key === 'Backspace') triggerBtn('delete');
            if (e.key === 'Escape') triggerBtn('clear');
        });