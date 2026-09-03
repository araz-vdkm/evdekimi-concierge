import re
path = "src/components/SignIn.tsx"
with open(path, "r") as f:
    content = f.read()

# Change bg-slate-50 to bg-[#0F172A]
content = content.replace('className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8"', 'className="min-h-screen bg-[#0F172A] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8"')

# Also change variant="blue" to variant="white" just to be consistent, though we overrode it.
content = content.replace('variant="blue"', 'variant="white"')

# We should also update text-slate-900 to text-white and text-slate-600 to text-slate-400 for the sign in header.
content = content.replace('text-center text-3xl font-extrabold text-slate-900', 'text-center text-3xl font-extrabold text-white')
content = content.replace('text-center text-sm text-slate-600', 'text-center text-sm text-slate-400')

with open(path, "w") as f:
    f.write(content)
print("SignIn patched")
