const fs = require("fs");
let content = fs.readFileSync("src/components/SignIn.tsx", "utf8");

// Remove the Register button block
content = content.replace(
  /<div className="mt-6">\s*<div className="relative">\s*<div className="absolute inset-0 flex items-center">\s*<div className="w-full border-t border-slate-300" \/>\s*<\/div>\s*<div className="relative flex justify-center text-sm">\s*<span className="px-2 bg-white text-slate-500">Don't have an account\?<\/span>\s*<\/div>\s*<\/div>\s*<div className="mt-6">\s*<button\s*onClick=\{onRegisterClick\}\s*className="w-full flex justify-center py-2.5 px-4 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"\s*>\s*Register\s*<\/button>\s*<\/div>\s*<\/div>/,
  '<div className="mt-6 text-center text-sm text-slate-500">New users: Please register using Google or Apple auth above.</div>'
);

fs.writeFileSync("src/components/SignIn.tsx", content);
console.log("SignIn patched");
