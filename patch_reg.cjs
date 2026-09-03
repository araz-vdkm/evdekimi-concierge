const fs = require("fs");
let content = fs.readFileSync("src/components/Register.tsx", "utf8");

content = content.replace(
  'const [error, setError] = useState(\'\');',
  'const [error, setError] = useState(\'\');\n  const [pin, setPin] = useState(\'\');\n  const [showPinInput, setShowPinInput] = useState(false);\n  const [isVerifying, setIsVerifying] = useState(false);'
);

content = content.replace(
  'const handleSubmit = async (e: React.FormEvent) => {',
  `const handleSendPin = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/send-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send PIN');
      setShowPinInput(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {`
);

content = content.replace(
  'e.preventDefault();\n    setIsLoading(true);\n    setError(\'\');',
  `e.preventDefault();
    
    if (!pendingSocialUser && !showPinInput) {
      return handleSendPin();
    }

    setIsLoading(true);
    setError('');`
);

content = content.replace(
  'const userCredential = await createUserWithEmailAndPassword(auth, email, password);',
  `if (!pendingSocialUser) {
        setIsVerifying(true);
        try {
          const res = await fetch('/api/verify-pin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, pin })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Invalid PIN');
        } catch (err: any) {
          setIsVerifying(false);
          setIsLoading(false);
          setError(err.message);
          return;
        }
        setIsVerifying(false);
      }
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);`
);

const pinInputUi = `
            {showPinInput && !pendingSocialUser && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Verification PIN</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Key className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                    placeholder="Enter 6-digit PIN sent to your email"
                  />
                </div>
              </div>
            )}
`;

content = content.replace(
  '<button\n            type="submit"',
  pinInputUi + '\n          <button\n            type="submit"'
);

content = content.replace(
  'import { Shield, Key, Mail, Building2, UserPlus, ArrowLeft, RefreshCw } from "lucide-react";',
  'import { Shield, Key, Mail, Building2, UserPlus, ArrowLeft, RefreshCw, XCircle } from "lucide-react";'
);

content = content.replace(
  `{isLoading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <UserPlus className="w-5 h-5" />
              )}
              {isLoading ? 'Creating Account...' : (pendingSocialUser ? 'Complete Registration' : 'Create Account')}`,
  `{isLoading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <UserPlus className="w-5 h-5" />
              )}
              {isLoading 
                ? (isVerifying ? 'Verifying PIN...' : 'Processing...') 
                : (!pendingSocialUser && !showPinInput 
                    ? 'Send Verification PIN' 
                    : (pendingSocialUser ? 'Complete Registration' : 'Verify PIN & Create Account'))}`
);

// Add cancel for social user
content = content.replace(
  '{error && (',
  `{pendingSocialUser && (
            <div className="text-center mt-4 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center text-sm font-semibold text-rose-600 hover:text-rose-700 transition-colors"
              >
                <XCircle className="w-4 h-4 mr-1" />
                Cancel and sign in differently
              </button>
            </div>
          )}
          {error && (`
);

fs.writeFileSync("src/components/Register.tsx", content);
console.log("Register patched!");
