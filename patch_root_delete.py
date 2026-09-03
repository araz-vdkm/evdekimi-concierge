import re

with open("src/components/UserManagement.tsx", "r") as f:
    content = f.read()

# patch initiateToggleBlock
content = content.replace(
'''    if (isRootAdmin(user)) {
      showToast("The system root administrator account cannot be blocked.", "error");
      return;
    }''',
'''    const isSuperuser = currentUser?.email?.toLowerCase() === 'roman@evdekimi.com';
    if (!isSuperuser && isRootAdmin(user)) {
      showToast("The system root administrator account cannot be blocked.", "error");
      return;
    }'''
)

# patch handleDeleteUser
content = content.replace(
'''    if (isRootAdmin(user)) {
      showToast("The system root administrator account cannot be deleted.", "error");
      return;
    }''',
'''    const isSuperuser = currentUser?.email?.toLowerCase() === 'roman@evdekimi.com';
    if (!isSuperuser && isRootAdmin(user)) {
      showToast("The system root administrator account cannot be deleted.", "error");
      return;
    }'''
)

# patch isProtected inside map
content = content.replace(
'''                    const isRoot = isRootAdmin(user);
                    const isProtected = isSelf || isRoot;''',
'''                    const isRoot = isRootAdmin(user);
                    const isSuperuser = currentUser?.email?.toLowerCase() === 'roman@evdekimi.com';
                    const isProtected = isSelf || (!isSuperuser && isRoot);'''
)

with open("src/components/UserManagement.tsx", "w") as f:
    f.write(content)

print("patched")
