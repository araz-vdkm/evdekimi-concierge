const fs = require('fs');

let code = fs.readFileSync('src/components/PreCheckInFlow.tsx', 'utf8');

const regex = /let processedSignature = existingSignature;[\s\S]*?processedSignature = await uploadImageToStorage\(compSig, `reports\/pre_checkin\/\$\{bookingId\}\/signature\.jpg`\);\s*\}/g;

code = code.replace(regex, `let processedSignature = report.signature;`);

fs.writeFileSync('src/components/PreCheckInFlow.tsx', code);
console.log('Patched signature in PreCheckInFlow');
