#!/bin/bash
# Solution verifier for cuda-oom problem
# Exit 0 = pass, non-zero = fail
# Outputs a single JSON line to stdout

SCRIPT="/home/user/train.py"

if [ ! -f "$SCRIPT" ]; then
    echo '{"success":false,"message":"train.py not found. Did you accidentally delete it?"}'
    exit 1
fi

# --- Fast static check (instant, no execution) ---
# Parse the AST to detect the bug: appending a raw tensor to a list inside a loop.
# If .item() or .detach() is used, the computation graph is broken — no leak.

static_result=$(python3 << 'PYEOF'
import ast, sys

try:
    source = open('/home/user/train.py').read()
    tree = ast.parse(source)
except SyntaxError as e:
    print(f"syntax_error:{e}")
    sys.exit(0)

# Walk the AST to detect whether any .append() stores a raw tensor.
# A raw tensor (Name or Attribute) keeps the computation graph alive.
# A broken-graph value (result of calling .item(), .detach(), float(), etc.) is safe.

SAFE_METHODS = {'item', 'detach', 'cpu', 'numpy', 'clone', 'tolist'}
SAFE_BUILTINS = {'float', 'int', 'str'}

bug_found = False
for node in ast.walk(tree):
    if not isinstance(node, ast.Call):
        continue
    func = node.func
    if not (isinstance(func, ast.Attribute) and func.attr == 'append'):
        continue
    if not node.args:
        continue
    arg = node.args[0]

    # Safe: result of calling a method/function that breaks the graph
    if isinstance(arg, ast.Call):
        inner = arg.func
        if isinstance(inner, ast.Attribute) and inner.attr in SAFE_METHODS:
            continue
        if isinstance(inner, ast.Name) and inner.id in SAFE_BUILTINS:
            continue
        # Any other call result is safe (not a raw tensor)
        continue

    # Safe: a literal value
    if isinstance(arg, ast.Constant):
        continue

    # Bug: a raw Name (variable) or Attribute (attribute access) — still a tensor
    if isinstance(arg, (ast.Name, ast.Attribute)):
        bug_found = True
        break

print("bug" if bug_found else "ok")
PYEOF
)

case "$static_result" in
  syntax_error:*)
    msg="${static_result#syntax_error:}"
    echo "{\"success\":false,\"message\":\"Syntax error in train.py: ${msg}\"}"
    exit 1
    ;;
  bug)
    echo '{"success":false,"message":"Memory leak still present. A raw tensor is being appended to the list, keeping its entire computation graph in memory. Look for a tensor method that extracts just the scalar value."}'
    exit 1
    ;;
  ok)
    # Static check passed — run the script to confirm it actually completes
    ;;
  *)
    echo '{"success":false,"message":"Could not analyse train.py. Make sure it is valid Python."}'
    exit 1
    ;;
esac

# --- Full execution check (only reached if static check passes) ---
result=$(timeout 90 python3 "$SCRIPT" 2>&1)
exit_code=$?

if [ $exit_code -eq 0 ]; then
    echo '{"success":true,"message":"Training completed all 5 epochs without running out of memory. Memory leak fixed!"}'
    exit 0
elif [ $exit_code -eq 124 ]; then
    echo '{"success":false,"message":"Script timed out after 90 seconds. Make sure the fix is correct and the script can complete in reasonable time."}'
    exit 1
else
    if echo "$result" | grep -q "out of memory"; then
        echo '{"success":false,"message":"Still running out of memory. The fix looks right statically but the script still crashes — double-check your changes."}'
    else
        last_line=$(echo "$result" | tail -1 | cut -c1-200)
        echo "{\"success\":false,\"message\":\"Script failed with an error: ${last_line}\"}"
    fi
    exit 1
fi
