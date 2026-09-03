const fs = require("fs");
let content = fs.readFileSync("src/components/Register.tsx", "utf8");

// Remove password state
content = content.replace("const [password, setPassword] = useState('');\n", "");

// Remove the handleSendPin function and its state
content = content.replace("const [pin, setPin] = useState('');\n", "");
content = content.replace("const [showPinInput, setShowPinInput] = useState(false);\n", "");
content = content.replace("const [isVerifying, setIsVerifying] = useState(false);\n", "");

content = content.replace(/const handleSendPin = async \(\) => \{[\s\S]*?const handleSubmit = async \(e: React.FormEvent\) => \{/m, "const handleSubmit = async (e: React.FormEvent) => {");

content = content.replace(/e\.preventDefault\(\);\s+if \(!pendingSocialUser && !showPinInput\) \{\s+return handleSendPin\(\);\s+\}/, "e.preventDefault();");

// Replace the submit logic
content = content.replace(/if \(!pendingSocialUser\) \{[\s\S]*?\} else \{/, `if (!pendingSocialUser) {
        throw new Error("Registration is only allowed via Google or Apple Auth.");
      } else {`);

// Remove the password UI block
content = content.replace(/\{\!pendingSocialUser && \(<div>\s*<label className="block text-sm font-medium text-slate-700">Password<\/label>[\s\S]*?<\/div>\)\}/, "");

// Remove the verification PIN UI
content = content.replace(/\{showPinInput && !pendingSocialUser && \([\s\S]*?<\/div>\s*\)\}/, "");

// Fix the button text
content = content.replace(
  `{isLoading \n                ? (isVerifying ? 'Verifying PIN...' : 'Processing...') \n                : (!pendingSocialUser && !showPinInput \n                    ? 'Send Verification PIN' \n                    : (pendingSocialUser ? 'Complete Registration' : 'Verify PIN & Create Account'))}`,
  `{isLoading ? 'Processing...' : 'Complete Registration'}`
);

content = content.replace(
  `{!pendingSocialUser && (\n            <div className="mb-6 pb-6 border-b border-slate-200">\n              <p className="text-sm text-slate-600 mb-3 text-center">Want to register with Google or Apple? Go back to Sign In and click the social buttons!</p>\n            </div>\n          )}`,
  ""
);

fs.writeFileSync("src/components/Register.tsx", content);
console.log("Register.tsx simplified");
