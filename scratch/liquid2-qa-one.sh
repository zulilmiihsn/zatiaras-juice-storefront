# Runs only the 1440 viewport of the Liquid 2 QA by stubbing the width list.
sed 's/: \[320, 360, 375, 390, 768, 1024, 1280, 1440\]) {/: [1440]) {/' scripts/qa-liquid.mjs > scratch/qa-liquid-1440.mjs
MSYS_NO_PATHCONV=1 QA_PATH=/qa/liquid2 node scratch/qa-liquid-1440.mjs 2>&1 | grep -E "PASS (Liquid wraps|Cover fades)|Top still|Error|Timeout" | cut -c1-200
