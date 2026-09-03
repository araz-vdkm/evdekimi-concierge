const fs = require('fs');
let code = fs.readFileSync('src/components/Register.tsx', 'utf8');

code = code.replace(
  "setError(err.message || 'Registration failed');",
  `if (err.code === 'auth/email-already-in-use' || err.message.includes('email-already-in-use')) {
        setError('This email is already registered. Please go back to the Sign In page and log in. (If you used Google before, click the Sign In with Google button!)');
      } else {
        setError(err.message || 'Registration failed');
      }`
);

fs.writeFileSync('src/components/Register.tsx', code);
