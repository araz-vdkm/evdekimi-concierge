const fs = require('fs');
let code = fs.readFileSync('src/components/Register.tsx', 'utf8');

code = code.replace(
  /if \(!pendingSocialUser\) \{\s*throw new Error\("Registration is only allowed via Google or Apple Auth\."\);\s*\} else \{\s*onComplete\(\);\s*\}\s*\}, 3000\);/g,
  `if (!pendingSocialUser) {
        throw new Error("Registration is only allowed via Google or Apple Auth.");
      }
      
      const finalRole = email.endsWith('@evdekimi.com') ? 'admin' : role;
      const newUserData = {
        uid: pendingSocialUser.uid,
        email: pendingSocialUser.email || email,
        username: pendingSocialUser.displayName || \`\${firstName} \${lastName}\`,
        title: company || 'Evdekimi',
        role: finalRole,
        assignedComplexes: assignedComplexes,
        assignedUnits: assignedUnits,
        firstName,
        lastName,
        mobile,
        isBlocked: false,
        createdAt: new Date().toISOString()
      };
      
      await saveRecord('users', pendingSocialUser.uid, newUserData);
      onComplete();`
);

fs.writeFileSync('src/components/Register.tsx', code);
console.log("fixed!");
