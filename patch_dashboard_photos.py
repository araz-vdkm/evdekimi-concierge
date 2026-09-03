import re

path = "src/components/Dashboard.tsx"
with open(path, "r") as f:
    content = f.read()

# Replace src={`data:image/jpeg;base64,${var.photo}`} with src={var.photo.startsWith('http') || var.photo.startsWith('data:') ? var.photo : `data:image/jpeg;base64,${var.photo}`}

def replacer(match):
    var_name = match.group(1)
    return f"src={{{var_name}.startsWith('http') || {var_name}.startsWith('data:') ? {var_name} : `data:image/jpeg;base64,${{{var_name}}}`}}"

content = re.sub(r'src=\{`data:image\/jpeg;base64,\$\{([a-zA-Z0-9_\.]+)\}`\}', replacer, content)

with open(path, "w") as f:
    f.write(content)
print("Dashboard photos patched")
