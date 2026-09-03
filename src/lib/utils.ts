import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeCountryName(nat: string | null | undefined): string {
  if (!nat) return 'Unknown';
  let name = nat.trim();
  if (name.length === 0) return 'Unknown';
  
  // Basic capitalization
  name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  
  const map: Record<string, string> = {
    'Ukrainian': 'Ukraine',
    'Russian': 'Russia',
    'American': 'United States',
    'Usa': 'United States',
    'US': 'United States',
    'United states of america': 'United States',
    'British': 'United Kingdom',
    'Uk': 'United Kingdom',
    'English': 'United Kingdom',
    'Great britain': 'United Kingdom',
    'French': 'France',
    'German': 'Germany',
    'Italian': 'Italy',
    'Spanish': 'Spain',
    'Chinese': 'China',
    'Japanese': 'Japan',
    'Korean': 'South Korea',
    'South korean': 'South Korea',
    'Canadian': 'Canada',
    'Australian': 'Australia',
    'Indian': 'India',
    'Dutch': 'Netherlands',
    'Swiss': 'Switzerland',
    'Swedish': 'Sweden',
    'Norwegian': 'Norway',
    'Danish': 'Denmark',
    'Finnish': 'Finland',
    'Irish': 'Ireland',
    'Belgian': 'Belgium',
    'Austrian': 'Austria',
    'Polish': 'Poland',
    'Turkish': 'Turkey',
    'Greek': 'Greece',
    'Portuguese': 'Portugal',
    'Brazilian': 'Brazil',
    'Mexican': 'Mexico',
    'Argentine': 'Argentina',
    'Argentinian': 'Argentina',
    'Colombian': 'Colombia',
    'Chilean': 'Chile',
    'Peruvian': 'Peru',
    'Venezuelan': 'Venezuela',
    'Egyptian': 'Egypt',
    'South african': 'South Africa',
    'Nigerian': 'Nigeria',
    'Kenyan': 'Kenya',
    'Moroccan': 'Morocco',
    'Emirati': 'United Arab Emirates',
    'Uae': 'United Arab Emirates',
    'Saudi': 'Saudi Arabia',
    'Saudi arabian': 'Saudi Arabia',
    'Indonesian': 'Indonesia',
    'Malaysian': 'Malaysia',
    'Singaporean': 'Singapore',
    'Thai': 'Thailand',
    'Vietnamese': 'Vietnam',
    'Filipino': 'Philippines',
    'New zealander': 'New Zealand',
    'Kiwi': 'New Zealand',
    'Taiwanese': 'Taiwan',
    'Hong konger': 'Hong Kong'
  };

  return map[name] || name;
}

export const compressImage = (base64Str: string, maxWidth = 400, maxHeight = 400, quality = 0.4): Promise<string> => {
  return new Promise((resolve) => {
    if (!base64Str || typeof base64Str !== 'string' || !base64Str.startsWith('data:image')) {
      return resolve(base64Str || '');
    }
    
    // Safety timeout in case canvas compression hangs
    const timeout = setTimeout(() => {
      resolve(base64Str);
    }, 2000);

    const img = new Image();
    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = Math.max(1, Math.round(width));
        canvas.height = Math.max(1, Math.round(height));
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        } else {
          resolve(base64Str);
        }
      } catch (err) {
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      clearTimeout(timeout);
      resolve(base64Str);
    };
    // Set src AFTER handlers are defined
    img.src = base64Str;
  });
};
