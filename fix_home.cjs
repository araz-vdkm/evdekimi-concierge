const fs = require('fs');
let code = fs.readFileSync('src/components/Home.tsx', 'utf8');

const surveyMatch = `                          <span className="truncate">{isSurveySent ? 'Sent' : 'Send Survey'}</span>
                        </button>`;
const surveyReplace = `                          <span className="truncate">{isSurveySent ? 'Sent' : 'Send Survey'}</span>
                        </button>
                        )}`;
code = code.replace(surveyMatch, surveyReplace);
fs.writeFileSync('src/components/Home.tsx', code);
console.log('Fixed home');
