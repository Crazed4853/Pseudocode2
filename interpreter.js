let variables = {}; // Dictionary to store variables
let skipExecution = false;
let blockStack = [];
let loopStack = [];

function interpretCommand(command) {
    const outputElement = document.getElementById('output');

    if (skipExecution && !command.startsWith("else") && !command.startsWith("end")) {
        return;
    }

    // Handle "set" command
    if (command.startsWith("set")) {
        const parts = command.split("=");
        if (parts.length === 2) {
            const varName = parts[0].replace("set", "").trim();
            let value = parts[1].trim();
            if (!isNaN(value)) {
                value = parseFloat(value);
            }
            variables[varName] = value;
            outputElement.textContent += `Set variable '${varName}' to ${value}\n`;
        } else {
            outputElement.textContent += `Error: Invalid 'set' command format.\n`;
        }
    }

    // Handle "store user input as" command
    else if (command.startsWith("store user input as")) {
        let varName = command.split(" ").pop();
        let userInput = window.prompt(`Enter a value for ${varName}:`);

        const value = isNaN(userInput) ? userInput : parseFloat(userInput);
        variables[varName] = value;
        outputElement.textContent += `Stored input for '${varName}' with value ${value}\n`;
    }

     // Handle "store input as" command
    else if (command.startsWith("store input as")) {
        let varName = command.split(" ").pop();
        let userInput = window.prompt(`Enter a value for ${varName}:`);

        const value = isNaN(userInput) ? userInput : parseFloat(userInput);
        variables[varName] = value;
        outputElement.textContent += `Stored input for '${varName}' with value ${value}\n`;
    }

    // Handle loops (repeat loop until <condition> or repeat loop <N> times)
    else if (command.startsWith("repeat loop")) {
        let loopInfo = command.replace("repeat loop", "").trim();

        if (loopInfo.startsWith("until")) {
            let condition = loopInfo.replace("until", "").trim();
            loopStack.push({ type: "until", condition, commands: [] });
        } else {
            let match = loopInfo.match(/^(\d+)\s*times$/);
            if (match) {
                let iterations = parseInt(match[1], 10);
                loopStack.push({ type: "times", iterations, commands: [] });
            } else {
                outputElement.textContent += `Error: Invalid loop syntax: '${command}'.\n`;
            }
        }
    }

    // Handle "end loop"
    else if (command.startsWith("end loop")) {
        if (loopStack.length === 0) {
            outputElement.textContent += `Error: 'end loop' without matching 'repeat loop'.\n`;
            return;
        }

        let loop = loopStack.pop();

        if (loop.type === "until") {
            while (true) {
                let conditionWithValues = loop.condition;
                for (const key in variables) {
                    conditionWithValues = conditionWithValues.replace(new RegExp(`\\b${key}\\b`, 'g'), variables[key]);
                }

                if (eval(conditionWithValues)) break;
                for (let cmd of loop.commands) {
                    interpretCommand(cmd);
                }
            }
        } else if (loop.type === "times") {
            let prevCounter = variables.hasOwnProperty("counter") ? variables["counter"] : undefined;

            for (let i = 1; i <= loop.iterations; i++) {
                variables["counter"] = i;
                for (let cmd of loop.commands) {
                    interpretCommand(cmd);
                }
            }

            if (prevCounter !== undefined) {
                variables["counter"] = prevCounter;
            } else {
                delete variables["counter"];
            }
        }
    }

    // Store commands inside loops
    else if (loopStack.length > 0) {
        loopStack[loopStack.length - 1].commands.push(command);
    }

    // Handle "if" condition
    else if (command.startsWith("if")) {
        const condition = command.substring(2).trim();
        let evaluatedCondition;

        try {
            let conditionWithValues = condition;
            for (const key in variables) {
                conditionWithValues = conditionWithValues.replace(new RegExp(`\\b${key}\\b`, 'g'), variables[key]);
            }

            evaluatedCondition = eval(conditionWithValues);
            blockStack.push({ type: "if", condition: evaluatedCondition });
            skipExecution = !evaluatedCondition;

            outputElement.textContent += `Evaluating condition: ${conditionWithValues} -> ${evaluatedCondition}\n`;
        } catch (e) {
            outputElement.textContent += `Error evaluating condition: ${e.message}\n`;
            skipExecution = true;
            blockStack.push({ type: "if", condition: false });
        }
    }

    // Handle "else"
    else if (command.startsWith("else")) {
        if (blockStack.length === 0 || blockStack[blockStack.length - 1].type !== "if") {
            outputElement.textContent += `Error: 'else' without matching 'if'.\n`;
            return;
        }

        const lastBlock = blockStack[blockStack.length - 1];
        skipExecution = lastBlock.condition;
    }

    // Handle "end"
    else if (command.startsWith("end")) {
        if (blockStack.length === 0) {
            outputElement.textContent += `Error: 'end' without matching 'if'.\n`;
            return;
        }

        blockStack.pop();
        skipExecution = blockStack.some(block => !block.condition);
    }

    // Handle "output"
    else if (command.startsWith("output")) {
        const argument = command.substring(7).trim();
        const components = argument.split(",").map(component => component.trim());
        const outputMessage = components
            .map(part => (part.startsWith('"') && part.endsWith('"')) ? part.slice(1, -1) : (variables[part] !== undefined ? variables[part] : `Error: Variable '${part}' not defined.`))
            .join("");
        outputElement.textContent += `${outputMessage}\n`;
    }
    // Handle arithmetic and exponentiation
    else if (command.includes(" = ") && !command.startsWith("set")) {
        if (skipExecution) return;
    
        const [varName, expression] = command.split(" = ");
        const trimmedVarName = varName.trim();
        let trimmedExpression = expression.trim();
    
        for (const key in variables) {
            trimmedExpression = trimmedExpression.replace(new RegExp(`\\b${key}\\b`, 'g'), variables[key]);
        }
    
        // ✅ FIX: Properly handle negative & decimal exponents in expressions
        // trimmedExpression = trimmedExpression.replace(/(-?\d+(\.\d+)?|\w+)\s*\^\s*(-?\d+(\.\d+)?|\w+)/g, (_, base, _, exponent) => {
          //  return `Math.pow(${base}, ${exponent})`;
        // });
        // Replace `^` with `Math.pow` syntax
        // trimmedExpression = trimmedExpression.replace(/(\d+|\w+)\s*\^\s*(\d+|\w+)/g, (_, base, exponent) => `Math.pow(${base}, ${exponent})`);
        trimmedExpression = trimmedExpression.replace(/(-?\d+(\.\d+)?|\w+)\s*\^\s*(-?\d+(\.\d+)?|\w+)/g, (_, base, exponent) => `Math.pow(${base}, ${exponent})`);
        try {
            variables[trimmedVarName] = eval(trimmedExpression);
            outputElement.textContent += `Set variable '${trimmedVarName}' to ${variables[trimmedVarName]}\n`;
        } catch (e) {
            outputElement.textContent += `Error evaluating expression: ${e}\n`;
        }
    }

else {
        outputElement.textContent += `Unknown command: ${command}\n`;
    }
}

function runInterpreter() {
    const pseudocodeInput = document.getElementById('pseudocodeInput').value;
    const commands = pseudocodeInput.split("\n");
    document.getElementById('output').textContent = "";

    commands.forEach(command => {
        if (command.trim() !== "") {
            interpretCommand(command.trim());
        }
    });
}
