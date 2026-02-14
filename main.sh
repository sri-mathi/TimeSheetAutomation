#!/bin/bash

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# Step 1: Show Popup
WORK_DONE=$(zenity --entry --title="Daily Work Logger" --text="What did you do today?" --width=400)

if [ -z "$WORK_DONE" ]; then
    echo "No input provided. Exiting."
    exit 0
fi

# Step 2: Trigger Orchestration
node orchestrator.js "$WORK_DONE"
