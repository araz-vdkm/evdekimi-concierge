import re

with open("src/components/UserManagement.tsx", "r") as f:
    content = f.read()

old_delete = """      try {
        await deleteDoc(doc(db, 'users', targetId));
      } catch (err) {
        console.warn("Direct firestore delete warning:", err);
      }
      
      setUsers(prev => prev.filter(u => (u.uid ? u.uid !== deletingUser.uid : u.username !== deletingUser.username)));"""

new_delete = """      try {
        await deleteDoc(doc(db, 'users', targetId));
      } catch (err) {
        console.warn("Direct firestore delete warning:", err);
      }
      
      try {
        if (deletingUser.uid) {
            const token = await getAccessToken();
            await fetch(`/api/users/${deletingUser.uid}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-google-oauth-token': getGoogleToken()
                }
            });
        }
      } catch (e) {
        console.warn("Failed to delete user from Firebase Auth via backend:", e);
      }
      
      setUsers(prev => prev.filter(u => (u.uid ? u.uid !== deletingUser.uid : u.username !== deletingUser.username)));"""

content = content.replace(old_delete, new_delete)

# Ensure getGoogleToken is imported
if 'getGoogleToken' not in content:
    content = content.replace('import { db } from \'../lib/auth\';', 'import { db, getAccessToken, getGoogleToken } from \'../lib/auth\';')
elif 'getAccessToken' not in content:
    content = content.replace('import { db } from \'../lib/auth\';', 'import { db } from \'../lib/auth\';\nimport { getAccessToken, getGoogleToken } from \'../lib/auth\';')

with open("src/components/UserManagement.tsx", "w") as f:
    f.write(content)

print("patched UserManagement delete")
