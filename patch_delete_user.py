import re

with open("server.ts", "r") as f:
    content = f.read()

delete_endpoint = """
  app.delete("/api/users/:uid", verifyAuth, async (req, res) => {
    try {
      const { uid } = req.params;
      await getAuth().deleteUser(uid);
      res.json({ success: true });
    } catch (e: any) {
      console.error("Error deleting user from Auth:", e);
      res.status(500).json({ error: e.message });
    }
  });
"""

if "app.delete(\"/api/users/:uid\"" not in content:
    content = content.replace(
        "app.post(\"/api/users/:uid/toggle-block\", verifyAuth, async (req, res) => {",
        delete_endpoint + "\n  app.post(\"/api/users/:uid/toggle-block\", verifyAuth, async (req, res) => {"
    )

with open("server.ts", "w") as f:
    f.write(content)

print("added delete endpoint to server.ts")
