const fs = require('fs');
let code = fs.readFileSync('src/components/Home.tsx', 'utf8');

const sendEmailFind = `                        <button
                          onClick={async () => {
                            if (!recipientEmailInput) return;
                            setIsSendingEmail(true);
                            setEmailSendResult(null);`;

const sendEmailReplace = `                        <button
                          onClick={async () => {
                            if (!recipientEmailInput) return;
                            const emailRegex = /^\\S+@\\S+\\.\\S+$/;
                            if (!emailRegex.test(recipientEmailInput)) {
                               setEmailSendResult({ success: false, message: 'Please enter a valid email address.' });
                               return;
                            }
                            setIsSendingEmail(true);
                            setEmailSendResult(null);`;

code = code.replace(sendEmailFind, sendEmailReplace);

const inputFind = `<input
                            type="email"
                            value={recipientEmailInput}
                            onChange={(e) => setRecipientEmailInput(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />`;

// also disable the send button if not valid email
const btnDisabledFind = `disabled={isSendingEmail || !recipientEmailInput}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md text-sm transition-colors disabled:opacity-50 flex items-center gap-2"`;

const btnDisabledReplace = `disabled={isSendingEmail || !recipientEmailInput || !/^\\S+@\\S+\\.\\S+$/.test(recipientEmailInput)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"`;

code = code.replace(btnDisabledFind, btnDisabledReplace);

fs.writeFileSync('src/components/Home.tsx', code);
