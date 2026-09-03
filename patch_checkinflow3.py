import re

with open('src/components/CheckInFlow.tsx', 'r') as f:
    content = f.read()

# We need to replace the Webcam area if we have a scanned photo, OR at least add a "Next / Continue" button.
# To keep it simple and exactly address "not jumping to next page":
# Let's add a "Continue / Next Guest" button when `guestsDetails[currentGuestIndex].photoBase64` or `fullName` is present.
# Also, if `guestsDetails[currentGuestIndex].photoBase64` is present, display it instead of the Webcam so they see what they captured!

# Let's replace the Webcam div:
webcam_div = r"""          <div className="relative aspect-\[3/2\] max-w-lg mx-auto bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center overflow-hidden mb-2 w-full">
            \{/\* @ts-ignore \*/\}
            <Webcam
              audio=\{false\}
              ref=\{webcamRef\}
              screenshotFormat="image/jpeg"
              videoConstraints=\{\{ facingMode: "environment" \}\}
              className="absolute inset-0 w-full h-full object-cover opacity-80"
            />
            \{/\* Overlay Guide \*/\}
            <div className="absolute inset-x-0 h-0.5 bg-blue-500 shadow-\[0_0_10px_#3B82F6\] top-1/2 pointer-events-none z-10"></div>
          </div>"""

new_webcam_div = """          <div className="relative aspect-[3/2] max-w-lg mx-auto bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center overflow-hidden mb-2 w-full">
            {guestsDetails[currentGuestIndex]?.photoBase64 ? (
              <img src={`data:image/jpeg;base64,${guestsDetails[currentGuestIndex].photoBase64}`} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <>
                {/* @ts-ignore */}
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ facingMode: "environment" }}
                  className="absolute inset-0 w-full h-full object-cover opacity-80"
                />
                {/* Overlay Guide */}
                <div className="absolute inset-x-0 h-0.5 bg-blue-500 shadow-[0_0_10px_#3B82F6] top-1/2 pointer-events-none z-10"></div>
              </>
            )}
            
            {/* Show extracted details overlay if we have them */}
            {guestsDetails[currentGuestIndex]?.fullName && (
              <div className="absolute bottom-0 inset-x-0 bg-white/90 backdrop-blur p-3 text-sm flex flex-col shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-slate-800">{guestsDetails[currentGuestIndex].fullName}</span>
                  <span className="text-xs font-bold text-slate-500">{guestsDetails[currentGuestIndex].nationality}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-600">
                  <span>Pass: {guestsDetails[currentGuestIndex].passportNumber}</span>
                  <span>DOB: {guestsDetails[currentGuestIndex].dob}</span>
                </div>
              </div>
            )}
          </div>"""

content = re.sub(webcam_div, new_webcam_div, content)

# Now add the Next / Continue button
buttons_regex = r"""            <div className="text-slate-400 text-sm">or</div>
            <label className=\{`flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-lg font-bold transition-colors w-full sm:w-auto \$\{isProcessing \? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50'\}\`\}>
              <input type="file" accept="image/\*" capture="environment" onChange=\{handleManualScan\} disabled=\{isProcessing\} className="hidden" />
              Upload Image
            </label>"""

new_buttons = """            <div className="text-slate-400 text-sm">or</div>
            <label className={`flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-lg font-bold transition-colors w-full sm:w-auto ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50'}`}>
              <input type="file" accept="image/*" capture="environment" onChange={handleManualScan} disabled={isProcessing} className="hidden" />
              Upload Image
            </label>
            
            {guestsDetails[currentGuestIndex]?.photoBase64 && (
              <button
                onClick={() => {
                  const totalGuests = parseInt(booking.guestsCount) || 1;
                  if (currentGuestIndex + 1 < totalGuests) {
                    setCurrentGuestIndex(prev => prev + 1);
                    setGuestsDetails(prev => {
                       if (prev.length <= currentGuestIndex + 1) return [...prev, {}];
                       return prev;
                    });
                  } else {
                    setStep(3);
                  }
                }}
                className="py-3 px-6 bg-emerald-600 border border-emerald-700 text-white rounded-lg font-bold hover:bg-emerald-700 transition-colors whitespace-nowrap ml-auto"
              >
                {parseInt(booking.guestsCount) > 1 && currentGuestIndex + 1 < parseInt(booking.guestsCount) ? 'Next Guest' : 'Continue'}
              </button>
            )}"""

content = re.sub(buttons_regex, new_buttons, content)

# Modify Capture button text to "Retake Passport" if they already captured
capture_regex = r"""\{isProcessing \? 'Analyzing\.\.\.' : 'Capture Passport'\}"""
new_capture = """{isProcessing ? 'Analyzing...' : (guestsDetails[currentGuestIndex]?.photoBase64 ? 'Retake Passport' : 'Capture Passport')}"""
content = re.sub(capture_regex, new_capture, content)

with open('src/components/CheckInFlow.tsx', 'w') as f:
    f.write(content)

