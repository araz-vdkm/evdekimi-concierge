import re

with open("src/App.tsx", "r") as f:
    content = f.read()

target = """                <div className="border-t border-slate-100 my-1" />
                <button
                  onClick={() => { setIsPrivacyOpen(true); setIsMenuOpen(false); }}
                  className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-slate-700 font-medium"
                >
                  <ShieldCheck className="w-5 h-5 text-blue-600" /> Privacy Policy
                </button>"""

if target in content:
    content = content.replace(target, "")
    with open("src/App.tsx", "w") as f:
        f.write(content)
    print("Menu patched")
else:
    print("Target not found")
