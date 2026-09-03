import re

with open('src/components/MinibarDashboard.tsx', 'r') as f:
    content = f.read()

old_func = """  const handleAddItem = (predefinedName: string) => {
    const pItem = PREDEFINED_ITEMS.find(p => p.name === predefinedName);
    if (pItem) {
      setItems([...items, { name: pItem.name, price: pItem.defaultPrice, quantity: 1 }]);
    }
  };"""

new_func = """  const handleAddItem = (predefinedName: string) => {
    const existingIndex = items.findIndex(i => i.name === predefinedName);
    if (existingIndex >= 0) {
      const newItems = [...items];
      newItems[existingIndex].quantity += 1;
      setItems(newItems);
    } else {
      const pItem = PREDEFINED_ITEMS.find(p => p.name === predefinedName);
      if (pItem) {
        setItems([...items, { name: pItem.name, price: pItem.defaultPrice, quantity: 1 }]);
      }
    }
  };"""

if old_func in content:
    content = content.replace(old_func, new_func)
    print("Patched successfully")
else:
    print("Could not find block")

with open('src/components/MinibarDashboard.tsx', 'w') as f:
    f.write(content)
