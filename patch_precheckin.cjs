const fs = require('fs');
let code = fs.readFileSync('src/components/PreCheckInFlow.tsx', 'utf8');

const minibarItemsDef = `
const MINIBAR_ITEMS = [
  { name: 'Organique Water', location: 'Fridge', price: 35000 },
  { name: 'Pocari Sweat', location: 'Fridge', price: 25000 },
  { name: 'Soda Water', location: 'Fridge', price: 25000 },
  { name: 'Buavita Juice', location: 'Fridge', price: 25000 },
  { name: 'Coca-Cola', location: 'Fridge', price: 25000 },
  { name: 'Coca-Cola Zero', location: 'Fridge', price: 25000 },
  { name: 'UC 1000 Vitamin C', location: 'Fridge', price: 30000 },
  { name: 'Redbull', location: 'Fridge', price: 50000 },
  { name: 'Snickers', location: 'Fridge', price: 30000 },
  { name: 'Oatside Oatmilk', location: 'Fridge', price: 20000 },
  { name: 'Bintang', location: 'Fridge', price: 50000 },
  { name: 'Bali Hai', location: 'Fridge', price: 50000 },
  { name: 'Kura Kura Hazy', location: 'Fridge', price: 90000 },
  { name: 'Kura Kura Ale', location: 'Fridge', price: 90000 },
  { name: 'Pringless', location: 'Shelf', price: 35000 },
  { name: 'Roasted Peanut', location: 'Shelf', price: 25000 },
  { name: 'Granobar', location: 'Shelf', price: 25000 },
  { name: 'Oatside Cereal Bar', location: 'Shelf', price: 25000 },
  { name: 'Roasted Almond', location: 'Shelf', price: 30000 },
  { name: 'Salted Pistachio', location: 'Shelf', price: 35000 },
  { name: 'Healthy Protein Bar', location: 'Shelf', price: 70000 },
  { name: 'Mie Sedap Cup Noodle', location: 'Shelf', price: 35000 },
];
`;

code = code.replace(
  "import { Camera, CheckSquare, CheckCircle2, ChevronRight, X, Home as HomeIcon, Droplets, BedDouble, Bath, Upload, RefreshCcw, ChevronLeft } from 'lucide-react';",
  "import { Camera, CheckSquare, CheckCircle2, ChevronRight, X, Home as HomeIcon, Droplets, BedDouble, Bath, Upload, RefreshCcw, ChevronLeft, Coffee } from 'lucide-react';"
);

code = code.replace(
  "const STEPS_CONFIG = [",
  minibarItemsDef + "\nconst STEPS_CONFIG = ["
);

fs.writeFileSync('src/components/PreCheckInFlow.tsx', code);
console.log("PreCheckInFlow imports patched");
