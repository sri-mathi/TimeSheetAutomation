const { chromium } = require('playwright');
require('dotenv').config();

/**
 * Automates logging to MaxisTime.
 * @param {Array<{desc: string, hours: number}>} logs - List of logs to enter.
 */
async function runAutomation(logs) {
    const email = process.env.MAXISTIME_EMAIL;
    const password = process.env.MAXISTIME_PASSWORD;

    if (!email || !password) {
        throw new Error("Missing MAXISTIME_EMAIL or MAXISTIME_PASSWORD in environment variables.");
    }

    const browser = await chromium.launch({ headless: false }); // Set to false so you can see it work
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        console.log("Navigating to MaxisTime...");
        await page.goto('https://maxistime.com/apps/auth/login');

        // Login
        await page.fill('input[type="email"], input[name="email"]', email);
        await page.fill('input[type="password"], input[name="password"]', password);
        await page.click('button[type="submit"]');

        // Wait for successful login
        await page.waitForURL('**/user/**', { timeout: 30000 });
        console.log("Logged in successfully. Navigating to day view...");

        // Explicitly navigate to the day view
        await page.goto('https://maxistime.com/apps/user/calendar/day', { waitUntil: 'networkidle' });

        for (const log of logs) {
            console.log(`Adding log: ${log.desc} (${log.hours} hrs)`);

            // 0. Ensure form is visible
            let form = page.locator('.add-task-section').first();
            const addNewEntryBtn = page.locator('button').filter({ hasText: /Add Log/i }).first();

            try {
                if (await addNewEntryBtn.isVisible({ timeout: 2000 })) {
                    await addNewEntryBtn.click();
                    await page.waitForTimeout(1000);
                }
            } catch (e) { }

            form = page.locator('.add-task-section').first();

            // 1. Select Project (Calibraint)
            console.log("Selecting project...");
            const projectBtn = form.locator('button.project-button').filter({ has: page.locator('i:has-text("folder_open")') });

            let selectionSuccess = false;
            for (let i = 0; i < 4; i++) {
                await projectBtn.scrollIntoViewIfNeeded();

                // Check if menu is already open
                const overlayVisible = await page.locator('.cdk-overlay-container').isVisible();
                if (!overlayVisible) {
                    // Click to open, use evaluate to avoid backdrop interception issues
                    await projectBtn.evaluate(el => el.click());
                    await page.waitForTimeout(1000);
                }

                // Look for Calibraint in the dropdown
                const projectOption = page.locator('.cdk-overlay-container [role="menuitem"], .cdk-overlay-container .mat-menu-item, .cdk-overlay-container button')
                    .filter({ hasText: /Calibraint/i })
                    .first();

                if (await projectOption.isVisible({ timeout: 2000 })) {
                    // Use evaluation click to ensure it triggers Angular's event listeners
                    await projectOption.evaluate(el => el.click());
                    await page.waitForTimeout(2000);
                } else {
                    console.log("Calibraint option not visible, retrying...");
                    // Click backdrop to reset if needed
                    await page.mouse.click(10, 10);
                    await page.waitForTimeout(500);
                    continue;
                }

                // VERIFICATION
                const btnText = await projectBtn.innerText();
                if (btnText.includes('Calibraint')) {
                    console.log("Project selection verified: Calibraint");
                    selectionSuccess = true;
                    break;
                } else {
                    console.log(`Project selection retry ${i + 1}/4...`);
                }
            }

            if (!selectionSuccess) {
                throw new Error("Failed to select Project 'Calibraint' after multiple retries.");
            }

            // 2. Select Log Category (POC)
            console.log("Selecting category...");
            const categorySelect = form.locator('mat-select, button.project-button').filter({ hasText: /Log Category|POC/i });

            console.log("Waiting for Category field to be enabled...");
            await page.waitForFunction(() => {
                const f = document.querySelector('.add-task-section');
                if (!f) return false;
                const el = f.querySelector('mat-select') || Array.from(f.querySelectorAll('button.project-button')).find(b => b.innerText.includes('Log Category') || b.innerText.includes('POC'));
                if (!el) return false;
                return !el.classList.contains('mat-select-disabled') && !el.hasAttribute('disabled') && !el.classList.contains('mat-button-disabled');
            }, { timeout: 10000 }).catch(() => console.log("Warning: Category field still disabled, force clicking..."));

            await categorySelect.evaluate(el => el.click());
            await page.waitForSelector('.cdk-overlay-container', { state: 'visible', timeout: 5000 });

            const categoryOption = page.locator('.cdk-overlay-container mat-option, .cdk-overlay-container [role="option"]')
                .filter({ hasText: /POC/i })
                .first();
            await categoryOption.waitFor({ state: 'visible', timeout: 5000 });
            await categoryOption.evaluate(el => el.click());
            await page.waitForTimeout(1000);

            // 3. Enter Note
            console.log("Entering notes...");
            await form.locator('input[name="taskTitle"], [placeholder="Notes"]').fill(log.desc);

            // 4. Enter Hours
            console.log("Entering hours...");
            await form.locator('input[name="logHours"], [placeholder="Spent Hours"]').fill(log.hours.toString());

            // 5. Click Save
            console.log("Saving log...");
            const saveBtn = form.locator('button.success').filter({ has: page.locator('i:has-text("check")') });
            await saveBtn.evaluate(el => el.click());

            console.log("Log saved successfully.");
            await page.waitForTimeout(5000);
        }

        console.log("Finished logging all entries.");

    } catch (error) {
        console.error("Automation failed:", error);
    } finally {
        // Keep browser open for user review
    }
}

if (require.main === module) {
    const data = JSON.parse(process.argv[2] || '[]');
    runAutomation(data);
}

module.exports = { runAutomation };
