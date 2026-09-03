import re

with open('src/components/MinibarDashboard.tsx', 'r') as f:
    content = f.read()

old = """                             const itemNames = new Set<string>();
                             report.preCheckIn?.minibarConsumed?.forEach((i:any) => itemNames.add(i.name));
                             report.postCheckOut?.minibarConsumed?.forEach((i:any) => itemNames.add(i.name));
                             const bridgedItems = Array.from(itemNames).map(name => {
                               const preItem = report.preCheckIn?.minibarConsumed?.find((i:any) => i.name === name);
                               const postItem = report.postCheckOut?.minibarConsumed?.find((i:any) => i.name === name);
                               const price = preItem?.price || postItem?.price || 0;
                               const initial = preItem?.qtyConsumed || 0;
                               const consumed = postItem?.qtyConsumed || 0;
                               return { name, initial, consumed, price, value: consumed * price };
                             });"""

new = """                             const itemNames = new Set<string>();
                             report.preCheckIn?.minibarConsumed?.forEach((i:any) => itemNames.add(i.name));
                             report.postCheckOut?.minibarConsumed?.forEach((i:any) => itemNames.add(i.name));
                             report.manualLogs?.forEach((log:any) => log.items?.forEach((i:any) => itemNames.add(i.name)));
                             const bridgedItems = Array.from(itemNames).map(name => {
                               const preItem = report.preCheckIn?.minibarConsumed?.find((i:any) => i.name === name);
                               const postItem = report.postCheckOut?.minibarConsumed?.find((i:any) => i.name === name);
                               
                               let manualQty = 0;
                               let manualPrice = 0;
                               report.manualLogs?.forEach((log:any) => {
                                 const mItem = log.items?.find((i:any) => i.name === name);
                                 if (mItem) {
                                   manualQty += mItem.quantity;
                                   manualPrice = mItem.price;
                                 }
                               });

                               const price = preItem?.price || postItem?.price || manualPrice || 0;
                               const initial = preItem?.qtyConsumed || 0;
                               const consumed = (postItem?.qtyConsumed || 0) + manualQty;
                               return { name, initial, consumed, price, value: consumed * price };
                             });"""

if old in content:
    content = content.replace(old, new)
    print("Patched bridgedItems successfully.")
else:
    print("Could not find block!")

with open('src/components/MinibarDashboard.tsx', 'w') as f:
    f.write(content)
