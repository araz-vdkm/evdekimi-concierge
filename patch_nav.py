path = "src/App.tsx"
with open(path, "r") as f:
    content = f.read()

old_desktop_nav = """          <button
            onClick={() => setCurrentView('maintenance')}
            className={`flex items-center gap-1.5 shrink-0 transition-colors px-3 py-1.5 rounded-lg border text-sm font-semibold ${
              currentView === 'maintenance'
                ? 'bg-amber-500 text-white border-amber-400 shadow-xs'
                : 'bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 border-slate-700'
            }`}
          >
            <Wrench className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Maintenance</span>
          </button>"""

new_desktop_nav = """          <button
            onClick={() => setCurrentView('maintenance')}
            className={`flex items-center gap-1.5 shrink-0 transition-colors px-3 py-1.5 rounded-lg border text-sm font-semibold ${
              currentView === 'maintenance'
                ? 'bg-amber-500 text-white border-amber-400 shadow-xs'
                : 'bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 border-slate-700'
            }`}
          >
            <Wrench className={`w-4 h-4 ${currentView === 'maintenance' ? 'text-white' : 'text-amber-400'}`} />
            <span className="hidden sm:inline">Maintenance</span>
          </button>

          <button
            onClick={() => setCurrentView('minibar')}
            className={`flex items-center gap-1.5 shrink-0 transition-colors px-3 py-1.5 rounded-lg border text-sm font-semibold ${
              currentView === 'minibar'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                : 'bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 border-slate-700'
            }`}
          >
            <Coffee className={`w-4 h-4 ${currentView === 'minibar' ? 'text-white' : 'text-emerald-400'}`} />
            <span className="hidden sm:inline">Minibar</span>
          </button>"""

content = content.replace(old_desktop_nav, new_desktop_nav)

old_mobile_nav = """                <button
                  onClick={() => { setCurrentView('maintenance'); setIsMenuOpen(false); }}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors ${currentView === 'maintenance' ? 'text-blue-600 font-bold' : 'text-slate-700 font-medium'}`}
                >
                  <Wrench className="w-5 h-5 text-amber-500" /> Maintenance Tickets
                </button>"""
                
new_mobile_nav = """                <button
                  onClick={() => { setCurrentView('maintenance'); setIsMenuOpen(false); }}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors ${currentView === 'maintenance' ? 'text-blue-600 font-bold' : 'text-slate-700 font-medium'}`}
                >
                  <Wrench className={`w-5 h-5 ${currentView === 'maintenance' ? 'text-blue-600' : 'text-amber-500'}`} /> Maintenance Tickets
                </button>
                <button
                  onClick={() => { setCurrentView('minibar'); setIsMenuOpen(false); }}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors ${currentView === 'minibar' ? 'text-blue-600 font-bold' : 'text-slate-700 font-medium'}`}
                >
                  <Coffee className={`w-5 h-5 ${currentView === 'minibar' ? 'text-blue-600' : 'text-emerald-500'}`} /> Minibar
                </button>"""

content = content.replace(old_mobile_nav, new_mobile_nav)

with open(path, "w") as f:
    f.write(content)
print("Nav patched")
