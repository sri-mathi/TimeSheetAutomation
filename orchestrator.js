const { parseWorkDescription } = require('./processor');
const { runAutomation } = require('./automation');

async function main() {
    const input = process.argv[2];
    if (!input) {
        console.error("Please provide a work description.");
        process.exit(1);
    }

    console.log("Step 1: Parsing work description with AI...");
    const logs = await parseWorkDescription(input);
    console.log("Structured Logs:", logs);

    if (!logs || logs.length === 0) {
        console.error("Failed to parse logs.");
        process.exit(1);
    }

    console.log("Step 2: Starting browser automation...");
    await runAutomation(logs);
}

main().catch(err => {
    console.error("Critical Error:", err);
    process.exit(1);
});
