const fs = require('fs');

let code = fs.readFileSync('src/components/PreCheckInFlow.tsx', 'utf8');

const matchFunc = `  const handlePhotoAdd = (sectionId: string, itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        setData(prev => {
          const itemData = prev[sectionId]?.[itemId] || { photos: [] };
          return {
            ...prev,
            [sectionId]: {
              ...prev[sectionId],
              [itemId]: {
                ...itemData,
                photos: [...itemData.photos, result]
              }
            }
          };
        });
      };
      reader.readAsDataURL(file);
    }
  };`;

const replaceFunc = `  const handlePhotoAdd = async (sectionId: string, itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newPhotos: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.readAsDataURL(file);
      });
      newPhotos.push(dataUrl);
    }

    setData(prev => {
      const itemData = prev[sectionId]?.[itemId] || { photos: [] };
      return {
        ...prev,
        [sectionId]: {
          ...prev[sectionId],
          [itemId]: {
            ...itemData,
            photos: [...itemData.photos, ...newPhotos]
          }
        }
      };
    });
  };`;

if(code.includes(matchFunc)) {
  code = code.replace(matchFunc, replaceFunc);
} else {
  console.log("PreCheckInFlow function match not found");
}

code = code.replace(
  `type="file" accept="image/*" className="hidden"`,
  `type="file" accept="image/*" multiple className="hidden"`
);

fs.writeFileSync('src/components/PreCheckInFlow.tsx', code);
console.log('Patched PreCheckInFlow');
