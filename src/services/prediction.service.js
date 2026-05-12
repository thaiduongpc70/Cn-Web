const path = require("path");
const { spawn } = require("child_process");

function safeFloat(value, defaultValue = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : defaultValue;
}

function calculateBmi(heightCm, weightKg) {
    const height = safeFloat(heightCm);
    const weight = safeFloat(weightKg);

    if (height <= 0 || weight <= 0) return 0;

    return Math.round((weight / ((height / 100) ** 2)) * 100) / 100;
}

function makePrediction(data) {
    return new Promise((resolve, reject) => {
        const pythonScript = path.join(
            __dirname,
            "../python/model_bridge.py"
        );

        const py = spawn("python", [pythonScript], {
            stdio: ["pipe", "pipe", "pipe"]
        });

        let output = "";
        let errorOutput = "";

        py.stdout.on("data", chunk => {
            output += chunk.toString();
        });

        py.stderr.on("data", chunk => {
            errorOutput += chunk.toString();
        });

        py.on("close", code => {
            if (code !== 0) {
                return reject(new Error(errorOutput || "Python model error"));
            }

            try {
                const result = JSON.parse(output);
                resolve(result);
            } catch (error) {
                reject(new Error("Không đọc được kết quả từ Python model."));
            }
        });

        py.stdin.write(JSON.stringify(data));
        py.stdin.end();
    });
}

module.exports = {
    makePrediction,
    calculateBmi,
    safeFloat
};