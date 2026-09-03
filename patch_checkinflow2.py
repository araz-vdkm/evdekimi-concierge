import re

with open('src/components/CheckInFlow.tsx', 'r') as f:
    content = f.read()

# 1. Remove auto-advance from capturePassport and handleManualScan
# They both have the same block:
# setIsProcessing(false);
#       const totalGuests = parseInt(booking.guestsCount) || 1;
#       if (currentGuestIndex + 1 < totalGuests) {
#         setCurrentGuestIndex(prev => prev + 1);
#         setGuestsDetails(prev => {
#            if (prev.length <= currentGuestIndex + 1) {
#               return [...prev, {}];
#            }
#            return prev;
#         });
#       } else {
#         setStep(3);
#       }
# We can just replace this with `setIsProcessing(false);` everywhere.

pattern1 = re.compile(
    r'setIsProcessing\(false\);\s*e\.target\.value = \'\';\s*const totalGuests = parseInt\(booking\.guestsCount\) \|\| 1;\s*if \(currentGuestIndex \+ 1 < totalGuests\) \{.*?\s*else \{\s*setStep\(3\);\s*\}',
    re.DOTALL
)
content = pattern1.sub(r'setIsProcessing(false);\n      e.target.value = \'\';', content)

pattern1b = re.compile(
    r'setIsProcessing\(false\);\s*const totalGuests = parseInt\(booking\.guestsCount\) \|\| 1;\s*if \(currentGuestIndex \+ 1 < totalGuests\) \{.*?\s*else \{\s*setStep\(3\);\s*\}',
    re.DOTALL
)
content = pattern1b.sub(r'setIsProcessing(false);', content)

with open('src/components/CheckInFlow.tsx', 'w') as f:
    f.write(content)
