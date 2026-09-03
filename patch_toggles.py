path_register = "src/components/Register.tsx"
with open(path_register, "r") as f:
    content = f.read()

old_complex_toggle = """  const handleComplexToggle = (complex: string) => {
    setAssignedComplexes(prev => 
      prev.includes(complex) ? prev.filter(c => c !== complex) : [...prev, complex]
    );
  };"""

new_complex_toggle = """  const handleComplexToggle = (complex: string) => {
    setAssignedComplexes(prev => {
      const isSelected = prev.includes(complex);
      const newComplexes = isSelected ? prev.filter(c => c !== complex) : [...prev, complex];
      
      const unitsForComplex = unitsByComplex[complex] || [];
      if (!isSelected) {
        setAssignedUnits(prevUnits => {
          const toAdd = unitsForComplex.filter(u => !prevUnits.includes(u));
          return [...prevUnits, ...toAdd];
        });
      } else {
        setAssignedUnits(prevUnits => prevUnits.filter(u => !unitsForComplex.includes(u)));
      }
      
      return newComplexes;
    });
  };"""

content = content.replace(old_complex_toggle, new_complex_toggle)
with open(path_register, "w") as f:
    f.write(content)

path_user = "src/components/UserManagement.tsx"
with open(path_user, "r") as f:
    content = f.read()

old_complex_toggle_user = """  const handleComplexToggle = (complex: string) => {
    setEditAssignedComplexes(prev => 
      prev.includes(complex) ? prev.filter(c => c !== complex) : [...prev, complex]
    );
  };"""

new_complex_toggle_user = """  const handleComplexToggle = (complex: string) => {
    setEditAssignedComplexes(prev => {
      const isSelected = prev.includes(complex);
      const newComplexes = isSelected ? prev.filter(c => c !== complex) : [...prev, complex];
      
      const unitsForComplex = unitsByComplex[complex] || [];
      if (!isSelected) {
        setEditAssignedUnits(prevUnits => {
          const toAdd = unitsForComplex.filter(u => !prevUnits.includes(u));
          return [...prevUnits, ...toAdd];
        });
      } else {
        setEditAssignedUnits(prevUnits => prevUnits.filter(u => !unitsForComplex.includes(u)));
      }
      
      return newComplexes;
    });
  };"""

content = content.replace(old_complex_toggle_user, new_complex_toggle_user)
with open(path_user, "w") as f:
    f.write(content)

print("patched")
