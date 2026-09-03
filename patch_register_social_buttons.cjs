const fs = require('fs');
let code = fs.readFileSync('src/components/Register.tsx', 'utf8');

if (!code.includes('import { registerUser, signInWithSocial }')) {
  code = code.replace(
    `import { registerUser } from '../lib/auth';`,
    `import { registerUser, signInWithSocial } from '../lib/auth';`
  );
  
  // Add a handler
  const handlerCode = `
  const handleSocialRegister = async (provider: 'google' | 'apple') => {
    try {
      setIsSubmitting(true);
      setError('');
      const user = await signInWithSocial(provider);
      // Wait, we need to update state so they can finish filling out the form
      setFirstName(user.displayName?.split(' ')[0] || '');
      setLastName(user.displayName?.split(' ').slice(1).join(' ') || '');
      setEmail(user.email || '');
      // We don't have a way to update pendingSocialUser in App.tsx from here unless we pass a setter,
      // but we can just use a local state variable for localSocialUser if we want, OR just rely on the App.tsx flow.
      // Easiest is to throw an error and tell them to use the Login page for Social Auth if we don't lift it.
    } catch (err: any) {
      setError(err.message || \`\${provider} signup failed\`);
      setIsSubmitting(false);
    }
  };
  `;
  // Actually, wait, it's easier to just put a small banner at the top of Register:
  const banner = `
          {!pendingSocialUser && (
            <div className="mb-6 pb-6 border-b border-slate-200">
              <p className="text-sm text-slate-600 mb-3 text-center">Want to register with Google or Apple? Go back to Sign In and click the social buttons!</p>
            </div>
          )}
  `;
  code = code.replace(
    `<form onSubmit={handleRegister}`,
    banner + `\n<form onSubmit={handleRegister}`
  );
}

fs.writeFileSync('src/components/Register.tsx', code);
