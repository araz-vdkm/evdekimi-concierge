const fs = require('fs');
let code = fs.readFileSync('src/components/Home.tsx', 'utf8');

// The Pre Check-In logic inside map
const preCheckInMatch = `                        <button
                          onClick={() => {
                            if (isPreCheckInDone) {
                              onSelectView('dashboard', { ...bookingData, targetTab: 'pre-checkin' });
                            } else {
                              onSelectView('pre_checkin', bookingData);
                            }
                          }}`;
const preCheckInReplace = `                        <button
                          onClick={() => {
                            onSelectView('pre_checkin', bookingData);
                          }}`;
code = code.replace(preCheckInMatch, preCheckInReplace);

// The Guest Reg logic
const guestRegMatch = `                        <button
                          onClick={() => {
                            if (isGuestRegDone) {
                              onSelectView('dashboard', { ...bookingData, targetTab: 'list' });
                            } else {
                              onSelectView('checkin', bookingData);
                            }
                          }}`;
const guestRegReplace = `                        {userRole !== 'supervisor' && (
                        <button
                          onClick={() => {
                            onSelectView('checkin', bookingData);
                          }}`;
code = code.replace(guestRegMatch, guestRegReplace);

// Close Guest Reg button
const closeGuestRegMatch = `                          <span className="truncate">{isGuestRegDone ? 'All Guests Registered' : 'Guest Registration'}</span>
                        </button>`;
const closeGuestRegReplace = `                          <span className="truncate">{isGuestRegDone ? 'Edit Registrations' : 'Guest Registration'}</span>
                        </button>
                        )}`;
code = code.replace(closeGuestRegMatch, closeGuestRegReplace);

// Update Pre Check In text
const preTextMatch = `                          <span className="truncate">{isPreCheckInDone ? 'Ready for Check in' : 'Pre Check-in Report'}</span>
                        </button>`;
const preTextReplace = `                          <span className="truncate">{isPreCheckInDone ? 'Edit Pre Check-in' : 'Pre Check-in Report'}</span>
                        </button>`;
code = code.replace(preTextMatch, preTextReplace);

// The Post Check-Out logic
const postCheckOutMatch = `                        <button
                          onClick={() => {
                            if (isPostCheckOutDone) {
                              onSelectView('dashboard', { ...bookingData, targetTab: 'post-checkout' });
                            } else {
                              onSelectView('post_checkout', bookingData);
                            }
                          }}`;
const postCheckOutReplace = `                        <button
                          onClick={() => {
                            onSelectView('post_checkout', bookingData);
                          }}`;
code = code.replace(postCheckOutMatch, postCheckOutReplace);

const postTextMatch = `                          <span className="truncate">{isPostCheckOutDone ? 'Cleared for Check out' : 'Post Check-out Report'}</span>
                        </button>`;
const postTextReplace = `                          <span className="truncate">{isPostCheckOutDone ? 'Edit Post Check-out' : 'Post Check-out Report'}</span>
                        </button>`;
code = code.replace(postTextMatch, postTextReplace);

// The Survey logic
const surveyMatch = `                        <button
                          onClick={() => {
                            const surveyUrl = \`https://forms.gle/joBC1gteqn14A1Hs6\`;`;
const surveyReplace = `                        {userRole !== 'supervisor' && (
                        <button
                          onClick={() => {
                            const surveyUrl = \`https://forms.gle/joBC1gteqn14A1Hs6\`;`;
code = code.replace(surveyMatch, surveyReplace);

const closeSurveyMatch = `                          <span className="truncate">{isSurveySent ? 'Survey Sent' : 'Send Survey'}</span>
                        </button>`;
const closeSurveyReplace = `                          <span className="truncate">{isSurveySent ? 'Survey Sent' : 'Send Survey'}</span>
                        </button>
                        )}`;
code = code.replace(closeSurveyMatch, closeSurveyReplace);

fs.writeFileSync('src/components/Home.tsx', code);
console.log('Home.tsx patched');
