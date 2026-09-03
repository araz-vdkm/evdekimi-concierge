path = "src/App.tsx"
with open(path, "r") as f:
    content = f.read()

content = content.replace("useState<'home' | 'checkin' | 'pre_checkin' | 'post_checkout' | 'dashboard' | 'usermanagement' | 'maintenance'>('home');", "useState<'home' | 'checkin' | 'pre_checkin' | 'post_checkout' | 'dashboard' | 'usermanagement' | 'maintenance' | 'minibar'>('home');")

old_imports = "import Home from './components/Home';"
new_imports = "import Home from './components/Home';\nimport MinibarDashboard from './components/MinibarDashboard';"
if "import MinibarDashboard" not in content:
    content = content.replace(old_imports, new_imports)

old_nav_desktop = """          <button 
            onClick={() => setCurrentView('maintenance')}
            className={`flex flex-col items-center gap-1 ${currentView === 'maintenance' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'} transition-colors relative group`}
          >
            <div className={`p-2 rounded-xl transition-all ${currentView === 'maintenance' ? 'bg-blue-50 text-blue-600' : 'group-hover:bg-slate-100 text-slate-500'}`}>
              <Wrench className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold tracking-widest uppercase opacity-80">Maintenance</span>
          </button>"""

new_nav_desktop = """          <button 
            onClick={() => setCurrentView('maintenance')}
            className={`flex flex-col items-center gap-1 ${currentView === 'maintenance' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'} transition-colors relative group`}
          >
            <div className={`p-2 rounded-xl transition-all ${currentView === 'maintenance' ? 'bg-blue-50 text-blue-600' : 'group-hover:bg-slate-100 text-slate-500'}`}>
              <Wrench className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold tracking-widest uppercase opacity-80">Maintenance</span>
          </button>
          
          <button 
            onClick={() => setCurrentView('minibar')}
            className={`flex flex-col items-center gap-1 ${currentView === 'minibar' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'} transition-colors relative group`}
          >
            <div className={`p-2 rounded-xl transition-all ${currentView === 'minibar' ? 'bg-blue-50 text-blue-600' : 'group-hover:bg-slate-100 text-slate-500'}`}>
              <Coffee className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold tracking-widest uppercase opacity-80">Minibar</span>
          </button>"""

if "setCurrentView('minibar')" not in content:
    content = content.replace(old_nav_desktop, new_nav_desktop)
    
old_nav_mobile = """                <button
                  onClick={() => { setCurrentView('maintenance'); setIsMenuOpen(false); }}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors ${currentView === 'maintenance' ? 'text-blue-600 font-bold' : 'text-slate-700 font-medium'}`}
                >
                  <Wrench className="w-5 h-5" /> Maintenance Tickets
                </button>"""

new_nav_mobile = """                <button
                  onClick={() => { setCurrentView('maintenance'); setIsMenuOpen(false); }}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors ${currentView === 'maintenance' ? 'text-blue-600 font-bold' : 'text-slate-700 font-medium'}`}
                >
                  <Wrench className="w-5 h-5" /> Maintenance Tickets
                </button>
                <button
                  onClick={() => { setCurrentView('minibar'); setIsMenuOpen(false); }}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors ${currentView === 'minibar' ? 'text-blue-600 font-bold' : 'text-slate-700 font-medium'}`}
                >
                  <Coffee className="w-5 h-5" /> Minibar Consumption
                </button>"""

if "Minibar Consumption" not in content:
    content = content.replace(old_nav_mobile, new_nav_mobile)

old_routes = """{currentView === 'maintenance' && <MaintenanceDashboard currentUser={currentUser} onBackToHome={() => setCurrentView('home')} />}"""
new_routes = """{currentView === 'maintenance' && <MaintenanceDashboard currentUser={currentUser} onBackToHome={() => setCurrentView('home')} />}
            {currentView === 'minibar' && <MinibarDashboard currentUser={currentUser} onBackToHome={() => setCurrentView('home')} />}"""

if "<MinibarDashboard" not in content:
    content = content.replace(old_routes, new_routes)

# ensure Coffee is imported
old_lucide_import = "import { Hotel, LogOut, LayoutDashboard, UserPlus, Home as HomeIcon, ShieldCheck, UserCheck, Key, RefreshCw, Menu, X, Users, Wrench } from 'lucide-react';"
new_lucide_import = "import { Hotel, LogOut, LayoutDashboard, UserPlus, Home as HomeIcon, ShieldCheck, UserCheck, Key, RefreshCw, Menu, X, Users, Wrench, Coffee } from 'lucide-react';"
if "Coffee" not in content and "Coffee" not in old_lucide_import: # just safely add
    content = content.replace(old_lucide_import, new_lucide_import)

with open(path, "w") as f:
    f.write(content)
print("App patched")
