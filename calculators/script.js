        class Calculator {
            constructor(previousOperandTextElement, currentOperandTextElement) {
                this.previousOperandTextElement = previousOperandTextElement;
                this.currentOperandTextElement = currentOperandTextElement;
                this.clear();
            }

            clear() {
                this.currentOperand = '0';
                this.previousOperand = '';
                this.operation = undefined;
                this.updateDisplay();
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
                if(this.currentOperand.length > 12) {
                     this.currentOperand = this.currentOperand.slice(0, 12);
                }
                this.updateDisplay();
            }

            chooseOperation(operation) {
                if (this.currentOperand === '' && operation === '-') {
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

            compute() {
                let computation;
                const prev = parseFloat(this.previousOperand);
                const current = parseFloat(this.currentOperand);
                if (isNaN(prev) || isNaN(current)) return;

                switch (this.operation) {
                    case '+': computation = prev + current; break;
                    case '-': computation = prev - current; break;
                    case '×': computation = prev * current; break;
                    case '÷': 
                        if (current === 0) {
                            // Offline fallback for messages
                            const errorMsg = document.createElement('div');
                            errorMsg.innerText = "Cannot divide by zero";
                            errorMsg.style.cssText = "position:absolute; top:10px; background:#fee2e2; color:#dc2626; padding:10px; border-radius:5px;";
                            document.body.appendChild(errorMsg);
                            setTimeout(() => errorMsg.remove(), 2000);
                            this.clear();
                            return;
                        }
                        computation = prev / current; 
                        break;
                    default: return;
                }
                this.currentOperand = Math.round(computation * 100000000) / 100000000;
                this.operation = undefined;
                this.previousOperand = '';
                this.updateDisplay();
            }

            getDisplayNumber(number) {
                const stringNumber = number.toString();
                if (stringNumber === '-') return '-'; 
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

            updateDisplay() {
                if (this.currentOperand === '0') {
                    this.currentOperandTextElement.innerText = '0';
                } else if (this.currentOperand === '-') {
                    this.currentOperandTextElement.innerText = '-';
                } else {
                     this.currentOperandTextElement.innerText = this.getDisplayNumber(this.currentOperand);
                }

                if (this.operation != null) {
                    this.previousOperandTextElement.innerText = `${this.getDisplayNumber(this.previousOperand)} ${this.operation}`;
                } else {
                    this.previousOperandTextElement.innerText = '';
                }
            }
        }

        const previousOperandTextElement = document.getElementById('previous-operand');
        const currentOperandTextElement = document.getElementById('current-operand');
        const calculator = new Calculator(previousOperandTextElement, currentOperandTextElement);

        // Bind DOM events instead of using inline HTML onclick handlers to make JS more modular
        document.querySelectorAll('.btn').forEach(button => {
            button.addEventListener('click', () => {
                const action = button.dataset.action;
                const value = button.innerText;

                if (action === 'number') calculator.appendNumber(value);
                if (action === 'operation') calculator.chooseOperation(value);
                if (action === 'clear') calculator.clear();
                if (action === 'delete') calculator.delete();
                if (action === 'compute') calculator.compute();
            });
        });

        document.addEventListener('keydown', e => {
            if(e.key >= 0 && e.key <= 9 || e.key === '.') calculator.appendNumber(e.key);
            if(e.key === '=' || e.key === 'Enter') { e.preventDefault(); calculator.compute(); }
            if(e.key === 'Backspace') calculator.delete();
            if(e.key === 'Escape') calculator.clear();
            if(e.key === '+' || e.key === '-') calculator.chooseOperation(e.key);
            if(e.key === '*') calculator.chooseOperation('×');
            if(e.key === '/') { e.preventDefault(); calculator.chooseOperation('÷'); }
        });
