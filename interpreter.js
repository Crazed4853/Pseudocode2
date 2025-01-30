let variables = {}; // Dictionary to store variables
let skipExecution = false; // Flag to handle skipping commands
let blockStack = []; // Stack to track block states (if-else logic)


function interpretCommand(command) {
    const outputElement = document.getElementById('output');

    // Handle skipping commands due to an inactive block
    if (skipExecution && !command.startsWith("else") && !command.startsWith("end")) {
        return; // Skip this command if inside an inactive block
    }

    // Handle the "set" command
    if (command.startsWith("set")) {
        const parts = command.split("=");
        if (parts.length === 2) {
            const varName = parts[0].replace("set", "").trim(); // Extract variable name
            let value = parts[1].trim(); // Extract value

            // Try to convert value to a number if possible
            if (!isNaN(value)) {
                value = parseFloat(value);
            }

            // Define and initialize the variable
            variables[varName] = value;
            outputElement.textContent += `Set variable '${varName}' to ${value}\n`;
        } else {
            outputElement.textContent += `Error: Invalid 'set' command format. Use 'set <variable> = <value>'.\n`;
        }
    }
    // Handle the "store user input as" command
    else if (command.startsWith("store user input as")) {
        let varName = command.split(" ").pop(); // Extract the variable name
        let userInput = window.prompt(`Enter a value for ${varName}:`); // Prompt the user for input

        // Convert input to a number if possible, otherwise store it as a string
        const value = isNaN(userInput) ? userInput : parseFloat(userInput);

        // Store the input value in the variable
        variables[varName] = value;
        outputElement.textContent += `Stored input for '${varName}' with value ${value}\n`;
    }

     // Handle the "store input as" command
    else if (command.startsWith("store input as")) {
        let varName = command.split(" ").pop(); // Extract the variable name
        let userInput = window.prompt(`Enter a value for ${varName}:`); // Prompt the user for input

        // Convert input to a number if possible, otherwise store it as a string
        const value = isNaN(userInput) ? userInput : parseFloat(userInput);

        // Store the input value in the variable
        variables[varName] = value;
        outputElement.textContent += `Stored input for '${varName}' with value ${value}\n`;
    }
    // Handle the "if" condition
    else if (command.startsWith("if")) {
        const condition = command.substring(2).trim(); // Extract the condition
        let evaluatedCondition;

        try {
            // Replace variable names in the condition with their values
            let conditionWithValues = condition;
            for (const key in variables) {
                conditionWithValues = conditionWithValues.replace(new RegExp(`\\b${key}\\b`, 'g'), variables[key]);
            }

            // Evaluate the condition
            evaluatedCondition = eval(conditionWithValues);

            // Push the result to the block stack
            blockStack.push({ type: "if", condition: evaluatedCondition });

            // Set the skipExecution flag based on the condition
            skipExecution = !evaluatedCondition;

            outputElement.textContent += `Evaluating condition: ${conditionWithValues} -> ${evaluatedCondition}\n`;
        } catch (e) {
            outputElement.textContent += `Error evaluating condition: ${e.message}\n`;
            skipExecution = true; // Skip execution if the condition fails to evaluate
            blockStack.push({ type: "if", condition: false }); // Push a "false" block to ensure proper tracking
        }
    }
    // Handle the "else" command
    else if (command.startsWith("else")) {
        if (blockStack.length === 0 || blockStack[blockStack.length - 1].type !== "if") {
            outputElement.textContent += `Error: 'else' without matching 'if'.\n`;
            return;
        }

        const lastBlock = blockStack[blockStack.length - 1];
        if (lastBlock.condition) {
            // If the 'if' condition was true, skip the 'else' block
            skipExecution = true;
        } else {
            // If the 'if' condition was false, execute the 'else' block
            skipExecution = false;
        }
        // Update the block type to "else"
        lastBlock.type = "else";
    }
    // Handle the "end" command
    else if (command.startsWith("end")) {
        if (blockStack.length === 0) {
            outputElement.textContent += `Error: 'end' without matching 'if'.\n`;
            return;
        }

        // Pop the last block from the stack
        blockStack.pop();

        // Reset the skipExecution flag based on the remaining blocks
        skipExecution = blockStack.some(block => !block.condition);
    }
    // Handle the "output" command
    else if (command.startsWith("output")) {
        if (skipExecution) return; // Skip execution if inside an inactive block

        const argument = command.substring(7).trim(); // Extract the argument after "output"

        try {
            // Split the argument by commas to handle multiple components
            const components = argument.split(",").map(component => component.trim());

            // Process each component
            const outputMessage = components
                .map(part => {
                    if (part.startsWith('"') && part.endsWith('"')) {
                        // If it's a string literal, treat it as-is
                        return part.slice(1, -1); // Remove quotes but preserve content
                    } else if (variables.hasOwnProperty(part)) {
                        // If it's a variable, replace it with its value
                        return variables[part];
                    } else {
                        // If it's neither a variable nor a string literal, throw an error
                        throw new Error(`Variable '${part}' not defined or invalid format.`);
                    }
                })
                .join(""); // Combine all components into a single string

            // Print the final combined output
            outputElement.textContent += `${outputMessage}\n`;
        } catch (e) {
            outputElement.textContent += `Error processing output: ${e.message}\n`;
        }
    }
    // Handle arithmetic and assignment
    else if (command.includes(" = ") && !command.startsWith("set")) {
        if (skipExecution) return; // Skip execution if inside an inactive block

        const [varName, expression] = command.split(" = ");
        const trimmedVarName = varName.trim();
        let trimmedExpression = expression.trim();

        // Replace variable names in the expression with their values
        for (const key in variables) {
            trimmedExpression = trimmedExpression.replace(new RegExp(`\\b${key}\\b`, 'g'), variables[key]);
        }
         // Replace `^` with `Math.pow` syntax
        trimmedExpression = trimmedExpression.replace(/(\d+|\w+)\s*\^\s*(\d+|\w+)/g, (_, base, exponent) => `Math.pow(${base}, ${exponent})`);

        try {
            // Define and assign the variable
            variables[trimmedVarName] = eval(trimmedExpression);
            outputElement.textContent += `Set variable '${trimmedVarName}' to ${variables[trimmedVarName]}\n`;
        } catch (e) {
            outputElement.textContent += `Error evaluating expression: ${e}\n`;
        }
    } else {
        outputElement.textContent += `Unknown command: ${command}\n`;
    }
}

function runInterpreter() {
    const pseudocodeInput = document.getElementById('pseudocodeInput').value;
    const commands = pseudocodeInput.split("\n");
    document.getElementById('output').textContent = ""; // Clear previous output

    commands.forEach(command => {
        if (command.trim() !== "") {
            interpretCommand(command.trim());
        }
    });
}
