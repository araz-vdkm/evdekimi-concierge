with open("server.ts", "r") as f:
    content = f.read()

target = """  // GET /api/reservations
  app.get("/api/reservations", verifyAuth, async (req, res) => {"""

replacement = """  app.get("/api/debug-complexes", async (req, res) => {
      res.json(cachedReservations.map(r => r.complexName || r.villa).filter(Boolean));
  });

  // GET /api/reservations
  app.get("/api/reservations", verifyAuth, async (req, res) => {"""

if target in content:
    content = content.replace(target, replacement)
    with open("server.ts", "w") as f:
        f.write(content)
    print("Patched server.ts")
