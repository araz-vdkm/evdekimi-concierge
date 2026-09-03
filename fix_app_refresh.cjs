const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('isGlobalRefreshing')) {
  code = code.replace(
    'const [isMenuOpen, setIsMenuOpen] = useState(false);',
    'const [isMenuOpen, setIsMenuOpen] = useState(false);\n  const [isGlobalRefreshing, setIsGlobalRefreshing] = useState(false);'
  );
  
  code = code.replace(
    'onClick={() => window.dispatchEvent(new Event(\'refresh-data\'))}',
    'onClick={() => {\n              setIsGlobalRefreshing(true);\n              window.dispatchEvent(new Event(\'refresh-data\'));\n              setTimeout(() => setIsGlobalRefreshing(false), 3000);\n            }}'
  );
  
  code = code.replace(
    '<RefreshCw className="w-4 h-4" />',
    '<RefreshCw className={`w-4 h-4 ${isGlobalRefreshing ? "animate-spin text-blue-400" : ""}`} />'
  );
}

fs.writeFileSync('src/App.tsx', code);
console.log('done');
