import re

with open('src/components/MinibarDashboard.tsx', 'r') as f:
    content = f.read()

start_sig = "  const handleSaveEdit = async () => {"
end_sig = "  const fetchTrackingReports = async () => {"

idx_start = content.find(start_sig)
idx_end = content.find(end_sig)

new_func = """  const handleSaveEdit = async () => {
    if (!editingReport) return;
    setIsSubmitting(true);
    try {
      // 1. Pre Check In
      const hasPre = Object.values(editFormData).some((v: any) => v.initial > 0);
      if (editingReport.preCheckIn || hasPre) {
        const newPreConsumed = PREDEFINED_ITEMS.map(item => ({
          ...item,
          qtyConsumed: editFormData[item.name]?.initial || 0,
          price: item.defaultPrice
        })).filter(i => i.qtyConsumed > 0);
        
        const updatedPre = { 
          ...(editingReport.preCheckIn || { 
            id: `pre_${Date.now()}`, 
            bookingId: editingReport.bookingId,
            complexName: editingReport.complexName,
            unitName: editingReport.unitName,
            createdAt: new Date().toISOString()
          }), 
          minibarConsumed: newPreConsumed 
        };
        updatedPre.totalMinibar = newPreConsumed.reduce((acc, curr) => acc + (curr.qtyConsumed * curr.price), 0);
        await saveRecord('pre_checkin', editingReport.bookingId, updatedPre);
      }

      // 2. Post Check Out
      const hasPost = Object.values(editFormData).some((v: any) => v.postOut > 0);
      if (editingReport.postCheckOut || hasPost) {
        const newPostConsumed = PREDEFINED_ITEMS.map(item => ({
          ...item,
          qtyConsumed: editFormData[item.name]?.postOut || 0,
          price: item.defaultPrice
        })).filter(i => i.qtyConsumed > 0);
        
        const updatedPost = { 
          ...(editingReport.postCheckOut || {
            id: `post_${Date.now()}`, 
            bookingId: editingReport.bookingId,
            complexName: editingReport.complexName,
            unitName: editingReport.unitName,
            createdAt: new Date().toISOString()
          }), 
          minibarConsumed: newPostConsumed 
        };
        updatedPost.totalMinibar = newPostConsumed.reduce((acc, curr) => acc + (curr.qtyConsumed * curr.price), 0);
        await saveRecord('post_checkout', editingReport.bookingId, updatedPost);
      }

      // 3. Manual Logs
      if (editingReport.manualLogs?.length > 0) {
        for (const log of editingReport.manualLogs) {
          const newManualItems = PREDEFINED_ITEMS.map(item => ({
            name: item.name,
            quantity: editFormData[item.name]?.manual?.[log.id] || 0,
            price: item.defaultPrice
          })).filter(i => i.quantity > 0);
          
          const updatedLog = { ...log, items: newManualItems };
          updatedLog.totalRevenue = newManualItems.reduce((acc, curr) => acc + (curr.quantity * curr.price), 0);
          await saveRecord('minibar', log.id, updatedLog);
        }
      }

      await fetchTrackingReports();
      setEditingReport(null);
    } catch (error) {
      console.error("Failed to update report", error);
    } finally {
      setIsSubmitting(false);
    }
  };

"""

content = content[:idx_start] + new_func + content[idx_end:]
with open('src/components/MinibarDashboard.tsx', 'w') as f:
    f.write(content)
print("Updated handleSaveEdit")
