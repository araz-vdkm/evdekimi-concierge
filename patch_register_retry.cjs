const fs = require('fs');
let code = fs.readFileSync('src/components/Register.tsx', 'utf8');

const btnFind = `{isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Register Account'}`;
const btnReplace = `{isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (error && pendingSocialUser ? 'Retry Registration' : 'Register Account')}`;

code = code.replace(btnFind, btnReplace);

const errFind = `{error && <div className="mb-4 bg-rose-50 text-rose-600 p-3 rounded-md text-sm">{error}</div>}`;
const errReplace = `{error && <div className="mb-4 bg-rose-50 text-rose-600 p-3 rounded-md text-sm">
            {error}
            {pendingSocialUser && <div className="mt-2 font-medium">Please verify your details and try clicking Retry Registration below.</div>}
          </div>}`;

code = code.replace(errFind, errReplace);

fs.writeFileSync('src/components/Register.tsx', code);
