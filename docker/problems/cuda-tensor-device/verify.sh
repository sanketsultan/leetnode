#!/bin/bash
# Solution verifier for cuda-tensor-device problem
# Exit 0 = pass, non-zero = fail
# Outputs a single JSON line to stdout

SCRIPT="/home/user/infer.py"

if [ ! -f "$SCRIPT" ]; then
    echo '{"success":false,"message":"infer.py not found. Did you accidentally delete it?"}'
    exit 1
fi

# --- Fast static check ---
# The original code has exactly one .to(device) call: model.to(device).
# A correct fix adds a second: images.to(device) or torch.randn(..., device=device).
# Count both patterns — need at least 2 total.

to_count=$(grep -cE '\.to\(device\)' "$SCRIPT" || true)
dev_kwarg=$(grep -cE 'device\s*=\s*device' "$SCRIPT" || true)
total=$((to_count + dev_kwarg - 1))   # subtract 1 to ignore the model's own .to(device)

if [ "$total" -lt 1 ]; then
    echo '{"success":false,"message":"The input tensor is still on CPU while the model is on GPU. DataLoaders return CPU tensors by default — move them to the same device as the model before inference."}'
    exit 1
fi

# Sanity: check it is valid Python
if ! python3 -c "import ast; ast.parse(open('$SCRIPT').read())" 2>/dev/null; then
    echo '{"success":false,"message":"Syntax error in infer.py. Check your edit."}'
    exit 1
fi

# --- Runtime check ---
result=$(timeout 60 python3 "$SCRIPT" 2>&1)
exit_code=$?

if [ $exit_code -eq 0 ] && echo "$result" | grep -q "Inference complete"; then
    echo '{"success":true,"message":"The input tensor is now on the correct device. No more device mismatch errors."}'
    exit 0
elif [ $exit_code -eq 124 ]; then
    echo '{"success":false,"message":"Script timed out. Check your fix."}'
    exit 1
else
    last_line=$(echo "$result" | tail -1 | cut -c1-200)
    echo "{\"success\":false,\"message\":\"Script failed: ${last_line}\"}"
    exit 1
fi
