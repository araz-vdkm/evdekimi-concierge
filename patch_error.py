import re

with open("server.ts", "r") as f:
    content = f.read()

target = """  app.delete("/api/users/:uid", verifyAuth, async (req, res) => {
    try {
      const { uid } = req.params;
      await getAuth().deleteUser(uid);
      res.json({ success: true });
    } catch (e: any) {
      console.error("Error deleting user from Auth:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/users/:uid/toggle-block", verifyAuth, async (req, res) => {
    try {
      const { uid } = req.params;
      const { isBlocked } = req.body;
      const caller = (req as any).user;
      
      // In a real app, verify caller has admin role via Firestore. For now, assume auth means they are an admin if they can reach here, or we trust the route as long as they are authenticated for demo.
      // But let's just do it securely:
      await getAuth().updateUser(uid, { disabled: isBlocked });
      res.json({ success: true, isBlocked });
    } catch (e: any) {
      console.error("Error toggling user block status:", e);
      res.status(500).json({ error: e.message || "Failed to toggle user block status" });
    }
  });"""

content = content.replace(target, "")

with open("server.ts", "w") as f:
    f.write(content)

with open("src/components/UserManagement.tsx", "r") as f:
    content2 = f.read()

target2 = """      try {
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
      }"""

content2 = content2.replace(target2, "")

with open("src/components/UserManagement.tsx", "w") as f:
    f.write(content2)

print("Done patching.")
