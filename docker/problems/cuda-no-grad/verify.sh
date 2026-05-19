#!/bin/bash
# Solution verifier for cuda-no-grad problem
# Exit 0 = pass, non-zero = fail
# Outputs a single JSON line to stdout

SCRIPT="/home/user/embed.py"

if [ ! -f "$SCRIPT" ]; then
    echo '{"success":false,"message":"embed.py not found. Did you accidentally delete it?"}'
    exit 1
fi

# --- Fast static check (instant, no execution) ---
# torch.no_grad() must appear in the file

static_result=$(python3 << 'PYEOF'
import ast, sys

try:
    source = open('/home/user/embed.py').read()
    tree = ast.parse(source)
except SyntaxError as e:
    print(f"syntax_error:{e}")
    sys.exit(0)

# Look for torch.no_grad() used as a context manager (with statement)
# or as a decorator (@torch.no_grad())
found = False

for node in ast.walk(tree):
    # with torch.no_grad(): ...
    if isinstance(node, ast.With):
        for item in node.items:
            ctx = item.context_expr
            if isinstance(ctx, ast.Call):
                func = ctx.func
                if (isinstance(func, ast.Attribute) and func.attr == 'no_grad'
                        and isinstance(func.value, ast.Name) and func.value.id == 'torch'):
                    found = True
                    break
    # @torch.no_grad() decorator
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
        for dec in node.decorator_list:
            if isinstance(dec, ast.Call):
                func = dec.func
                if (isinstance(func, ast.Attribute) and func.attr == 'no_grad'
                        and isinstance(func.value, ast.Name) and func.value.id == 'torch'):
                    found = True
                    break
    if found:
        break

print("ok" if found else "bug")
PYEOF
)

case "$static_result" in
  syntax_error:*)
    msg="${static_result#syntax_error:}"
    echo "{\"success\":false,\"message\":\"Syntax error in embed.py: ${msg}\"}"
    exit 1
    ;;
  bug)
    echo '{"success":false,"message":"Computation graphs are still being built during inference. PyTorch tracks gradients for every forward pass unless told not to. Wrap your inference code with torch.no_grad()."}'
    exit 1
    ;;
  ok)
    ;;
  *)
    echo '{"success":false,"message":"Could not analyse embed.py. Make sure it is valid Python."}'
    exit 1
    ;;
esac

# --- Runtime check ---
result=$(timeout 60 python3 "$SCRIPT" 2>&1)
exit_code=$?

if [ $exit_code -eq 0 ] && echo "$result" | grep -q "Done. Generated"; then
    echo '{"success":true,"message":"Correct! torch.no_grad() tells PyTorch not to build computation graphs during inference, so memory stays flat no matter how many batches you process."}'
    exit 0
elif [ $exit_code -eq 124 ]; then
    echo '{"success":false,"message":"Script timed out after 60 seconds. Check your fix."}'
    exit 1
else
    if echo "$result" | grep -q "out of memory"; then
        echo '{"success":false,"message":"Still running out of memory. torch.no_grad() must wrap the model() call inside the loop."}'
    else
        last_line=$(echo "$result" | tail -1 | cut -c1-200)
        echo "{\"success\":false,\"message\":\"Script failed: ${last_line}\"}"
    fi
    exit 1
fi
