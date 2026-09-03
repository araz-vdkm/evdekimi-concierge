const fs = require('fs');
let code = fs.readFileSync('src/components/CheckInFlow.tsx', 'utf8');

code = code.replace(
  '<label className="block text-sm font-semibold text-blue-900 mb-2">Number of Guests</label>',
  '<label className="block text-sm font-semibold text-blue-900 mb-2">Number of Guests <span className="text-red-500">*</span></label>'
);

const btnFind = `<button
              onClick={() => setStep(2)}
              disabled={!booking.checkOutDate || !booking.complexName || !booking.unitName || !booking.guestsCount || !booking.contactNumber || !booking.contactEmail}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-lg font-bold shadow-md shadow-blue-200 hover:bg-blue-700 transition-colors disabled:opacity-70"
            >`;

const btnReplace = `{!booking.guestsCount && (
              <p className="text-xs text-red-500 font-medium mb-2 text-center">* Please enter the number of guests to proceed</p>
            )}
            <button
              onClick={() => setStep(2)}
              disabled={!booking.checkOutDate || !booking.complexName || !booking.unitName || !booking.guestsCount || !booking.contactNumber || !booking.contactEmail}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-lg font-bold shadow-md shadow-blue-200 hover:bg-blue-700 transition-colors disabled:opacity-70"
            >`;

code = code.replace(btnFind, btnReplace);

fs.writeFileSync('src/components/CheckInFlow.tsx', code);
