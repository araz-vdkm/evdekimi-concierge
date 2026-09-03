with open("server.ts", "r") as f:
    content = f.read()

target = """  app.get("/api/debug-complexes", async (req, res) => {
      res.json(cachedReservations.map(r => r.complexName || r.villa).filter(Boolean));
  });"""

replacement = """  app.get("/api/debug-complexes", async (req, res) => {
      res.json(cachedReservations);
  });"""

if target in content:
    content = content.replace(target, replacement)
    with open("server.ts", "w") as f:
        f.write(content)
    print("Patched server.ts")
