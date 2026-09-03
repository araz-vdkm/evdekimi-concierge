path = "src/components/CheckInFlow.tsx"
with open(path, "r") as f:
    content = f.read()

content = content.replace(
    "useState<Partial<Guest & { photoBase64?: string; existingId?: string; gender?: string }>[]>([",
    "useState<Partial<Guest & { photoBase64?: string; existingId?: string; existingPhotoUrl?: string; gender?: string }>[]>([",
)

content = content.replace(
    "photoBase64: ''",
    "photoBase64: '',\n              existingPhotoUrl: g.photo || ''"
)

old_submit = """        let uploadedPhotoUrl = '';
        if (guestDetail.photoBase64) {
          const compPhoto = await compressImage(`data:image/jpeg;base64,${guestDetail.photoBase64}`, 1200, 1200, 0.85);
          uploadedPhotoUrl = await uploadImageToStorage(compPhoto, `guests/${initialBooking?.id || 'manual'}/passport_${i}.jpg`);
        }
        
        const finalGuest: any = {"""
new_submit = """        let uploadedPhotoUrl = (guestDetail as any).existingPhotoUrl || '';
        if (guestDetail.photoBase64) {
          const compPhoto = await compressImage(`data:image/jpeg;base64,${guestDetail.photoBase64}`, 1200, 1200, 0.85);
          uploadedPhotoUrl = await uploadImageToStorage(compPhoto, `guests/${initialBooking?.id || 'manual'}/passport_${i}.jpg`);
        }
        
        const finalGuest: any = {"""
content = content.replace(old_submit, new_submit)

with open(path, "w") as f:
    f.write(content)
print("photo logic patched")
