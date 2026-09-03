import React, { useState } from 'react';
import { Star, Send, CheckCircle, Mail, AlertCircle, X } from 'lucide-react';
import { saveRecord } from '../lib/db';

interface SurveyFlowProps {
  bookingId: string;
  onComplete: () => void;
}

export default function SurveyFlow({ bookingId, onComplete }: SurveyFlowProps) {
  const [overall, setOverall] = useState<number | null>(null);
  const [overallComment, setOverallComment] = useState('');
  
  const [cleanliness, setCleanliness] = useState<number | null>(null);
  const [cleanlinessComment, setCleanlinessComment] = useState('');
  
  const [concierge, setConcierge] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const targetEmail = 'roman@evdekimi.com';

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (overall && cleanliness && concierge) {
      setShowConfirmModal(true);
    }
  };

  const handleFinalSubmit = async () => {
    setShowConfirmModal(false);
    
    const surveyData = {
      overall,
      overallComment,
      cleanliness,
      cleanlinessComment,
      concierge,
      timestamp: new Date().toISOString()
    };
    
    await saveRecord('survey', bookingId, surveyData);
    
    // Also trigger an email back to the concierge with the results
    const subject = encodeURIComponent(`Guest Survey Results - Booking ${bookingId}`);
    let body = `Overall Satisfaction: ${overall}/10\n`;
    if (overallComment) body += `Comments: ${overallComment}\n`;
    
    body += `\nCleanliness & Functionality: ${cleanliness}/10\n`;
    if (cleanlinessComment) body += `Comments: ${cleanlinessComment}\n`;
    
    body += `\nConcierge Service Satisfaction: ${concierge}/10\n`;
    
    window.location.href = `mailto:${targetEmail}?subject=${subject}&body=${encodeURIComponent(body)}`;
    
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-sm text-center max-w-md w-full border border-slate-200">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Thank You!</h2>
          <p className="text-slate-600 mb-6">Your feedback has been successfully submitted and helps us improve our services.</p>
          <button 
            onClick={onComplete}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const renderStars = (value: number | null, onChange: (val: number) => void) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              value === rating 
                ? 'bg-blue-600 text-white scale-110 shadow-md' 
                : 'bg-slate-100 text-slate-500 hover:bg-blue-100 hover:text-blue-600'
            }`}
          >
            {rating}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-8">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-blue-600 p-6 text-white text-center">
          <Star className="w-12 h-12 mx-auto mb-3 opacity-90" />
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Guest Satisfaction Survey</h1>
          <p className="opacity-90">We value your feedback. Please rate your stay with us.</p>
        </div>

        <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50">
          <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-bold text-slate-900 text-sm">Prefer Google Forms?</p>
              <p className="text-xs text-slate-500">You can also complete our official guest feedback form directly on Google Forms.</p>
            </div>
            <a
              href="https://forms.gle/joBC1gteqn14A1Hs6"
              target="_blank"
              rel="noreferrer"
              className="shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors shadow-xs"
            >
              Open Google Form ↗
            </a>
          </div>
        </div>
        
        <form onSubmit={handleOpenConfirm} className="p-6 sm:p-8 space-y-8">
          {/* Question 1 */}
          <div className="space-y-3">
            <label className="block text-lg font-semibold text-slate-900">
              1. How would you rate your overall satisfaction with your stay?
              <span className="block text-sm font-normal text-slate-500 mt-1">(10 = Very Satisfied, 1 = Needs Improvement)</span>
            </label>
            {renderStars(overall, setOverall)}
            
            {overall !== null && overall < 7 && (
              <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Please tell us how we can improve:
                </label>
                <textarea
                  required
                  value={overallComment}
                  onChange={(e) => setOverallComment(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  rows={3}
                  placeholder="Your comments..."
                />
              </div>
            )}
          </div>

          <hr className="border-slate-100" />

          {/* Question 2 */}
          <div className="space-y-3">
            <label className="block text-lg font-semibold text-slate-900">
              2. How would you rate the facility cleanliness and functionality?
            </label>
            {renderStars(cleanliness, setCleanliness)}
            
            {cleanliness !== null && cleanliness < 7 && (
              <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  What should be added or fixed?
                </label>
                <textarea
                  required
                  value={cleanlinessComment}
                  onChange={(e) => setCleanlinessComment(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  rows={3}
                  placeholder="What was missing or broken..."
                />
              </div>
            )}
          </div>

          <hr className="border-slate-100" />

          {/* Question 3 */}
          <div className="space-y-3">
            <label className="block text-lg font-semibold text-slate-900">
              3. How satisfied were you with the Concierge Service?
            </label>
            {renderStars(concierge, setConcierge)}
          </div>

          <div className="pt-6">
            <button
              type="submit"
              disabled={!overall || !cleanliness || !concierge}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold text-lg py-4 rounded-xl hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
              Send Survey
            </button>
          </div>
        </form>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-blue-600 p-6 text-white relative">
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="absolute right-4 top-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <Mail className="w-10 h-10 mb-2 opacity-90" />
              <h3 className="text-xl font-bold">Confirm Survey Submission</h3>
              <p className="text-blue-100 text-sm mt-1">Please review the recipient email before sending.</p>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                <Mail className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs uppercase font-bold text-blue-800 tracking-wider">Recipient Email</span>
                  <p className="text-base font-bold text-slate-900">{targetEmail}</p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Survey Ratings Summary</p>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Overall Stay:</span>
                  <span className="font-bold text-slate-900">{overall}/10</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Cleanliness:</span>
                  <span className="font-bold text-slate-900">{cleanliness}/10</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Concierge Service:</span>
                  <span className="font-bold text-slate-900">{concierge}/10</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  className="flex-1 py-3 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-200 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Confirm & Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
