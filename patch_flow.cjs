const fs = require('fs');
let code = fs.readFileSync('src/components/CheckInFlow.tsx', 'utf8');

code = code.replace(
  "dietary: ''",
  "dietary: '',\n    nextDestination: ''"
);

const nextDestinationHTML = `            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <label className="block text-sm font-semibold text-blue-900 mb-2">What is your next destination in Bali?</label>
              <input
                type="text"
                placeholder="e.g., Ubud, Seminyak, Uluwatu, or Airport"
                value={answers.nextDestination}
                onChange={e => setAnswers({...answers, nextDestination: e.target.value})}
                className="w-full px-3 py-2 text-sm bg-white rounded border border-blue-200 text-blue-900 placeholder:text-blue-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>`;

code = code.replace(
  '            </div>\n          </div>',
  '            </div>\n' + nextDestinationHTML + '\n          </div>'
);

fs.writeFileSync('src/components/CheckInFlow.tsx', code);
console.log("CheckInFlow UI patched!");
