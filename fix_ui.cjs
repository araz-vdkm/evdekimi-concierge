const fs = require('fs');
let code = fs.readFileSync('src/components/Register.tsx', 'utf8');

// I also need to remove the `import { createUserWithEmailAndPassword }` line if it exists
code = code.replace(/import \{ createUserWithEmailAndPassword \} from "firebase\/auth";\n/, "");

fs.writeFileSync('src/components/Register.tsx', code);
