const axios = require('axios');

/**
 * Parses a natural language work description into structured logs using Ollama.
 * @param {string} text - The user's work description.
 * @returns {Promise<Array<{desc: string, hours: number}>>}
 */
async function parseWorkDescription(text) {
    const model = "llama3:latest";
    const prompt = `
You are an assistant that converts a natural language description of a day's work into structured JSON.
Divide the work into exactly 3 entries with a total of 8 hours. 
The distribution should be roughly 3, 3, and 2 hours unless specific numbers are mentioned.

Input: "${text}"

Output only a JSON array of objects with "desc" (string) and "hours" (number) keys.
Example Output:
[
  {"desc": "Fixed UI bugs in dashboard", "hours": 3},
  {"desc": "Implemented chart components", "hours": 3},
  {"desc": "Testing and documentation", "hours": 2}
]
`;

    try {
        const response = await axios.post('http://localhost:11434/api/generate', {
            model: model,
            prompt: prompt,
            stream: false,
            format: "json"
        });

        const responseData = response.data.response;
        let result = JSON.parse(responseData);

        // Handle case where AI wraps array in an object (e.g., { "workLog": [...] })
        if (result && !Array.isArray(result) && typeof result === 'object') {
            const keys = Object.keys(result);
            if (keys.length === 1 && Array.isArray(result[keys[0]])) {
                result = result[keys[0]];
            } else if (result.logs && Array.isArray(result.logs)) {
                result = result.logs;
            } else if (result.workLog && Array.isArray(result.workLog)) {
                result = result.workLog;
            } else if (result.entries && Array.isArray(result.entries)) {
                result = result.entries;
            }
        }

        if (!Array.isArray(result) || result.length === 0) {
            console.log("AI returned empty or invalid logs, using fallback...");
            return [
                { desc: `${text} (Part 1)`, hours: 3 },
                { desc: `${text} (Part 2)`, hours: 3 },
                { desc: `${text} (Part 3)`, hours: 2 }
            ];
        }

        return result;
    } catch (error) {
        console.error("Error calling Ollama:", error.message);
        if (error.response) {
            console.error("Ollama Response Data:", error.response.data);
        }
        // Fallback to a simple split if AI fails
        return [
            { desc: `${text} (Part 1)`, hours: 3 },
            { desc: `${text} (Part 2)`, hours: 3 },
            { desc: `${text} (Part 3)`, hours: 2 }
        ];
    }
}

if (require.main === module) {
    const input = process.argv.slice(2).join(' ') || "Worked on dashboard project and fixed typescript errors";
    parseWorkDescription(input).then(console.log);
}

module.exports = { parseWorkDescription };
