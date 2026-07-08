import javax.swing.*;
import java.awt.*;
import java.awt.event.*;
import java.util.ArrayList;

public class Calculator extends JFrame implements ActionListener {
    
    private JTextField display;
    private double firstNum, secondNum, result;
    private String operation;
    
    // Memory state
    private double memoryOpValue;
    private String memoryOperation;
    private JLabel memoryLabel;

    public Calculator() {
        setTitle("Java Desktop Calculator");
        setSize(350, 500);
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setLayout(new BorderLayout(10, 10));

        // Display
        display = new JTextField("0");
        display.setFont(new Font("Monospaced", Font.BOLD, 30));
        display.setHorizontalAlignment(JTextField.RIGHT);
        display.setEditable(false);
        add(display, BorderLayout.NORTH);

        // Memory Label
        memoryLabel = new JLabel(" ");
        add(memoryLabel, BorderLayout.SOUTH);

        // Button Grid
        JPanel buttonPanel = new JPanel(new GridLayout(6, 4, 5, 5));
        String[] buttons = {
            "AC", "DEL", "M", "√",
            "7", "8", "9", "÷",
            "4", "5", "6", "×",
            "1", "2", "3", "−",
            ".", "0", "^", "+"
        };

        for (String text : buttons) {
            JButton btn = new JButton(text);
            btn.addActionListener(this);
            buttonPanel.add(btn);
        }

        JButton equalsBtn = new JButton("=");
        equalsBtn.addActionListener(this);
        add(buttonPanel, BorderLayout.CENTER);
        add(equalsBtn, BorderLayout.SOUTH);
        
        setLocationRelativeTo(null);
        setVisible(true);
    }

    public void actionPerformed(ActionEvent e) {
        String cmd = e.getActionCommand();

        if (cmd.charAt(0) >= '0' && cmd.charAt(0) <= '9' || cmd.equals(".")) {
            if (display.getText().equals("0")) display.setText(cmd);
            else display.setText(display.getText() + cmd);
        } else if (cmd.equals("AC")) {
            display.setText("0");
        } else if (cmd.equals("DEL")) {
            String val = display.getText();
            if (val.length() > 1) display.setText(val.substring(0, val.length() - 1));
            else display.setText("0");
        } else if (cmd.equals("√")) {
            double val = Double.parseDouble(display.getText());
            display.setText(String.valueOf(Math.sqrt(val)));
        } else if (cmd.equals("M")) {
            applyMemory();
        } else if (cmd.equals("=")) {
            compute();
        } else {
            // Operations: +, -, ×, ÷, ^
            firstNum = Double.parseDouble(display.getText());
            operation = cmd;
            display.setText("0");
        }
    }

    private void compute() {
        secondNum = Double.parseDouble(display.getText());
        switch (operation) {
            case "+": result = firstNum + secondNum; break;
            case "−": result = firstNum - secondNum; break;
            case "×": result = firstNum * secondNum; break;
            case "÷": result = firstNum / secondNum; break;
            case "^": result = Math.pow(firstNum, secondNum); break;
        }
        display.setText(String.valueOf(result));
        
        // Remember operation for Memory feature
        memoryOpValue = secondNum;
        memoryOperation = operation;
        memoryLabel.setText("M: " + memoryOperation + " " + memoryOpValue);
    }

    private void applyMemory() {
        if (memoryOperation != null) {
            double current = Double.parseDouble(display.getText());
            switch (memoryOperation) {
                case "+": current += memoryOpValue; break;
                case "−": current -= memoryOpValue; break;
                case "×": current *= memoryOpValue; break;
                case "÷": current /= memoryOpValue; break;
                case "^": current = Math.pow(current, memoryOpValue); break;
            }
            display.setText(String.valueOf(current));
        }
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> new Calculator());
    }
}