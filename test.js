const fs = require("fs");
let content = fs.readFileSync("src/components/Register.tsx", "utf8");
console.log(content.includes("pendingSocialUser"));
