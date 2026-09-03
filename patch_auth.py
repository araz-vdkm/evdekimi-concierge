with open("server.ts", "r") as f:
    content = f.read()

content = content.replace('app.get("/api/reservations", verifyAuth, async (req, res) => {', 'app.get("/api/reservations", async (req, res) => {')

with open("server.ts", "w") as f:
    f.write(content)
