import re

with open("src/App.tsx", "r") as f:
    content = f.read()

# Change `userData.isApproved !== false` to `userData.isApproved === true || userData.email?.toLowerCase() === 'roman@evdekimi.com'`
content = re.sub(
    r'userData\.isApproved !== false',
    r"(userData.isApproved === true || userData.email?.toLowerCase() === 'roman@evdekimi.com')",
    content
)

content = re.sub(
    r'localSessionUser\.isApproved !== false',
    r"(localSessionUser.isApproved === true || localSessionUser.email?.toLowerCase() === 'roman@evdekimi.com')",
    content
)

content = re.sub(
    r'freshUser\.isApproved === false',
    r"(freshUser.isApproved !== true && freshUser.email?.toLowerCase() !== 'roman@evdekimi.com')",
    content
)

with open("src/App.tsx", "w") as f:
    f.write(content)
print("App.tsx approval patched")
