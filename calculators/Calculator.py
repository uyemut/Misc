import tkinter as tk
from tkinter import messagebox
import math

class Calculator:
    def __init__(self, root):
        self.root = root
        self.root.title("Python Calculator")
        self.root.geometry("350x500")
        self.root.resizable(False, False)

        # State Variables
        self.current_expr = ""
        self.first_num = None
        self.operation = None
        
        # Memory variables (stores op and operand)
        self.memory_op = None
        self.memory_val = None

        # Display
        self.display = tk.Entry(root, font=("Arial", 24), borderwidth=5, relief="flat", justify="right")
        self.display.grid(row=0, column=0, columnspan=4, padx=10, pady=20, sticky="nsew")
        self.display.insert(0, "0")

        # Memory indicator
        self.mem_label = tk.Label(root, text=" ", font=("Arial", 10), fg="purple")
        self.mem_label.grid(row=1, column=0, columnspan=4, sticky="w", padx=10)

        # Button Layout
        buttons = [
            'AC', 'DEL', 'M', '√',
            '7', '8', '9', '÷',
            '4', '5', '6', '×',
            '1', '2', '3', '−',
            '.', '0', '^', '+'
        ]

        row_val = 2
        col_val = 0

        for button in buttons:
            action = lambda x=button: self.on_button_click(x)
            tk.Button(root, text=button, width=5, height=2, font=("Arial", 14), command=action).grid(row=row_val, column=col_val, sticky="nsew", padx=2, pady=2)
            col_val += 1
            if col_val > 3:
                col_val = 0
                row_val += 1

        # Equals button
        tk.Button(root, text="=", width=20, height=2, font=("Arial", 14), bg="lightblue", command=self.compute).grid(row=row_val, column=0, columnspan=4, sticky="nsew", padx=2, pady=2)

        # Grid config
        for i in range(4): self.root.grid_columnconfigure(i, weight=1)

    def on_button_click(self, char):
        if char in '0123456789.':
            if self.display.get() == "0": self.display.delete(0, tk.END)
            self.display.insert(tk.END, char)
        
        elif char == 'AC':
            self.display.delete(0, tk.END)
            self.display.insert(0, "0")
            self.first_num = None
            self.operation = None
            
        elif char == 'DEL':
            current = self.display.get()
            if len(current) > 1: self.display.delete(len(current)-1, tk.END)
            else: self.display.delete(0, tk.END); self.display.insert(0, "0")
            
        elif char == '√':
            val = float(self.display.get())
            self.display.delete(0, tk.END)
            self.display.insert(0, str(math.sqrt(val)))
            
        elif char == 'M':
            self.apply_memory()
            
        elif char in ['+', '−', '×', '÷', '^']:
            self.first_num = float(self.display.get())
            self.operation = char
            self.display.delete(0, tk.END)
            self.display.insert(0, "0")
            
    def compute(self):
        second_num = float(self.display.get())
        result = 0
        
        if self.operation == '+': result = self.first_num + second_num
        elif self.operation == '−': result = self.first_num - second_num
        elif self.operation == '×': result = self.first_num * second_num
        elif self.operation == '÷': 
            if second_num == 0: messagebox.showerror("Error", "Div by zero"); return
            result = self.first_num / second_num
        elif self.operation == '^': result = math.pow(self.first_num, second_num)
        
        self.display.delete(0, tk.END)
        self.display.insert(0, str(result))
        
        # Save to memory
        self.memory_op = self.operation
        self.memory_val = second_num
        self.mem_label.config(text=f"M: {self.memory_op} {self.memory_val}")

    def apply_memory(self):
        if self.memory_op:
            current = float(self.display.get())
            res = 0
            if self.memory_op == '+': res = current + self.memory_val
            elif self.memory_op == '−': res = current - self.memory_val
            elif self.memory_op == '×': res = current * self.memory_val
            elif self.memory_op == '÷': res = current / self.memory_val
            elif self.memory_op == '^': res = math.pow(current, self.memory_val)
            
            self.display.delete(0, tk.END)
            self.display.insert(0, str(res))

if __name__ == "__main__":
    root = tk.Tk()
    app = Calculator(root)
    root.mainloop()