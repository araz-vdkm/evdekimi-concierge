path = "src/components/Home.tsx"
with open(path, "r") as f:
    content = f.read()

content = content.replace(
    "onSelectView: (view: 'checkin' | 'pre_checkin' | 'post_checkout' | 'dashboard' | 'maintenance' | 'usermanagement', data?: any) => void;",
    "onSelectView: (view: 'checkin' | 'pre_checkin' | 'post_checkout' | 'dashboard' | 'maintenance' | 'usermanagement' | 'minibar', data?: any) => void;"
)

with open(path, "w") as f:
    f.write(content)
print("Home props patched")
