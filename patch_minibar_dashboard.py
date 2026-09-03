import re

with open('src/components/MinibarDashboard.tsx', 'r') as f:
    content = f.read()

# 1. Update PREDEFINED_ITEMS
content = re.sub(
    r'\{ name: \'Custom Item\', defaultPrice: 0 \}',
    '',
    content
)

# 2. Add state for recent guests
state_injection = """  const [recentGuests, setRecentGuests] = useState<any[]>([]);
  const [selectedGuestId, setSelectedGuestId] = useState('');
"""
content = content.replace("const [unitsByComplex, setUnitsByComplex] = useState<Record<string, string[]>>({});", "const [unitsByComplex, setUnitsByComplex] = useState<Record<string, string[]>>({});\n" + state_injection)

# 3. Add fetchRecentGuests inside the file
fetch_guests = """
  const fetchRecentGuests = async () => {
    try {
      const guestsSnap = await getDocs(collection(db, 'guests'));
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      
      const recent = guestsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any)
        .filter(g => {
          if (!g.timestamp) return false;
          return new Date(g.timestamp) >= fiveDaysAgo;
        })
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
      setRecentGuests(recent);
    } catch (err) {
      console.warn("Failed to fetch recent guests", err);
    }
  };

  useEffect(() => {
    if (activeTab === 'log') {
      fetchRecentGuests();
    }
  }, [activeTab]);
"""

content = content.replace("const fetchTrackingReports = async () => {", fetch_guests + "\n  const fetchTrackingReports = async () => {")

# 4. Add Guest Dropdown in the form
dropdown_html = """              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Guest (Last 5 Days)</label>
                <select
                  value={selectedGuestId}
                  onChange={(e) => {
                    const gId = e.target.value;
                    setSelectedGuestId(gId);
                    if (gId) {
                      const guest = recentGuests.find(g => g.id === gId);
                      if (guest) {
                        if (guest.complexName) setSelectedComplex(guest.complexName);
                        if (guest.unitName) setSelectedUnit(guest.unitName);
                      }
                    }
                  }}
                  className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-700"
                >
                  <option value="">-- Select Guest --</option>
                  {recentGuests.map(g => (
                    <option key={g.id} value={g.id}>{g.fullName} ({new Date(g.timestamp).toLocaleDateString()}) - {g.complexName} {g.unitName}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">"""

content = content.replace('<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">', dropdown_html, 1)

# 5. Add bookingId to saveRecord payload
payload_find = """        complexName: selectedComplex,
        unitName: selectedUnit,"""
payload_replace = """        complexName: selectedComplex,
        unitName: selectedUnit,
        bookingId: selectedGuestId || `manual-${Date.now()}`,"""
content = content.replace(payload_find, payload_replace)


with open('src/components/MinibarDashboard.tsx', 'w') as f:
    f.write(content)
