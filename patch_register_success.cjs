const fs = require('fs');
let code = fs.readFileSync('src/components/Register.tsx', 'utf8');

code = code.replace(
  "setTimeout(() => onComplete(), 3000);",
  `setTimeout(() => {
        if (pendingSocialUser) {
          window.location.reload();
        } else {
          onComplete();
        }
      }, 3000);`
);

fs.writeFileSync('src/components/Register.tsx', code);
