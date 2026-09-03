path = "src/types.ts"
with open(path, "r") as f:
    content = f.read()

content += """
export interface MinibarItem {
  name: string;
  quantity: number;
  price: number;
}

export interface MinibarRecord {
  id: string;
  createdAt: string;
  createdBy: string;
  complexName: string;
  unitName: string;
  bookingId?: string;
  items: MinibarItem[];
  totalRevenue: number;
  notes?: string;
}
"""

with open(path, "w") as f:
    f.write(content)
print("types patched")
