path = "src/components/Home.tsx"
with open(path, "r") as f:
    content = f.read()

old_import = "import { UserPlus, CheckSquare, ClipboardCheck, LayoutDashboard, LogIn, LogOut, Luggage, Frown, Smile, Clock, RefreshCw, Mail, Sparkles, CheckCircle, Wrench } from 'lucide-react';"
new_import = "import { UserPlus, CheckSquare, ClipboardCheck, LayoutDashboard, LogIn, LogOut, Luggage, Frown, Smile, Clock, RefreshCw, Mail, Sparkles, CheckCircle, Wrench, Coffee } from 'lucide-react';"
if "Coffee" not in old_import:
    content = content.replace(old_import, new_import)

with open(path, "w") as f:
    f.write(content)
print("Home fixed")
