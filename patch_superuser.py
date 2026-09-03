import re

with open("src/components/UserManagement.tsx", "r") as f:
    content = f.read()

target1 = """  const handleDeleteUser = async (user: UserAccount) => {
    if (isSelfUser(user)) {
      showToast("You cannot delete your own active administrator account.", "error");
      return;
    }
    const isSuperuser = currentUser?.email?.toLowerCase() === 'roman@evdekimi.com';
    if (!isSuperuser && isRootAdmin(user)) {
      showToast("The system root administrator account cannot be deleted.", "error");
      return;
    }

    setDeletingUser(user);
  };"""

replacement1 = """  const handleDeleteUser = async (user: UserAccount) => {
    const isSuperuser = currentUser?.email?.toLowerCase() === 'roman@evdekimi.com';
    
    if (!isSuperuser && isSelfUser(user)) {
      showToast("You cannot delete your own active administrator account.", "error");
      return;
    }
    
    if (!isSuperuser && isRootAdmin(user)) {
      showToast("The system root administrator account cannot be deleted.", "error");
      return;
    }

    setDeletingUser(user);
  };"""

if target1 in content:
    content = content.replace(target1, replacement1)
else:
    print("Could not find target1")

target2 = """                    const isProtected = isSelf || (!isSuperuser && isRoot);"""
replacement2 = """                    const isProtected = !isSuperuser && (isSelf || isRoot);"""

if target2 in content:
    content = content.replace(target2, replacement2)
else:
    print("Could not find target2")

with open("src/components/UserManagement.tsx", "w") as f:
    f.write(content)
print("Done patching.")
