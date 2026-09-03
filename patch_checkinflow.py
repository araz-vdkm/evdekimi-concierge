import re

with open('src/components/CheckInFlow.tsx', 'r') as f:
    content = f.read()

# 1. Remove auto-advance from capturePassport
pattern1 = re.compile(r'setIsProcessing\(false\);\s*const totalGuests = parseInt\(booking\.guestsCount\) \|\| 1;\s*if \(currentGuestIndex \+ 1 < totalGuests\) \{\s*setCurrentGuestIndex\(prev => prev \+ 1\);\s*setGuestsDetails\(prev => \{\s*if \(prev\.length <= currentGuestIndex \+ 1\) \{\s*return \[\.\.\.prev, \{\}\];\s*\}\s*return prev;\s*\}\);\s*\} else \{\s*setStep\(3\);\s*\}', re.DOTALL)
replacement1 = r'setIsProcessing(false);'
content = pattern1.sub(replacement1, content)

# 2. Modify Step 2 UI to show results and Next button
pattern2 = re.compile(r'<div className="relative aspect-\[3/2\] max-w-lg mx-auto bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center overflow-hidden mb-2 w-full">\s*\{\/\* @ts-ignore \*\/\}\s*<Webcam.*?</div>\s*</div>\s*<div className="flex flex-col sm:flex-row items-center justify-center gap-4">.*?</div>\s*</div>\s*\)\}', re.DOTALL)

# Let's write the new UI block. We need to match exactly from `<div className="relative aspect-[3/2]...` up to `</div>\n      )}` for Step 2.
