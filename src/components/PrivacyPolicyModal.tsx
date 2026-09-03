import React from 'react';
import { X, ShieldCheck } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrivacyPolicyModal({ isOpen, onClose }: PrivacyPolicyModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Privacy Policy</h2>
              <p className="text-xs text-slate-500">EVDEkimi Consierge Pro Data Safety & Compliance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700 leading-relaxed">
          <p className="font-semibold text-slate-800">
            This Privacy Policy defines how EVDEkimi (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) governs data collection, usage, and protection within the Consierge Pro application to meet strict marketplace verification standards.
          </p>

          <div className="space-y-3">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1">
              Data Collection and Usage
            </h3>
            <p>
              To facilitate comprehensive property management operations, dynamic yield tracking, and procurement digitalization, we collect specific categories of information:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-slate-900">Account Data:</strong> Name, email address, and authentication credentials required for secure platform access.
              </li>
              <li>
                <strong className="text-slate-900">Operational Data:</strong> User-generated content related to structural standard operating procedures, maintenance logs, and material requests.
              </li>
              <li>
                <strong className="text-slate-900">Device Information:</strong> IP address, operating system, and crash logs to troubleshoot functionality and optimize performance.
              </li>
            </ul>
            <p className="text-xs text-slate-500 italic">
              We utilize this data strictly to provide, maintain, and execute the application&apos;s core facility management features.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1">
              Google API Limited Use and Sharing
            </h3>
            <p>
              Consierge Pro integrates with specific APIs to streamline workflows. Our compliance with Google&apos;s verification guidelines is absolute:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-slate-900">Limited Use:</strong> Our use and transfer to any other app of information received from Google APIs will adhere strictly to the Google API Services User Data Policy, including the Limited Use requirements.
              </li>
              <li>
                <strong className="text-slate-900">No Data Selling:</strong> We explicitly do not sell your personal data or operational metrics to advertising platforms or data brokers.
              </li>
              <li>
                <strong className="text-slate-900">Restricted AI Training:</strong> Google user data is never utilized to train generalized artificial intelligence or machine learning architectures.
              </li>
            </ul>
            <p className="text-xs text-slate-500">
              Data is only shared with trusted service providers essential to app functionality, operating under strict confidentiality agreements.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1">
              Data Security and Retention
            </h3>
            <p>
              We protect your organizational and personal data through robust corporate governance and security frameworks:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                All data transmitted between the app and our servers is encrypted using industry-standard protocols.
              </li>
              <li>
                We retain information only for as long as necessary to fulfill operational mandates, manage active procurement cycles, or comply with statutory legal obligations.
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1">
              User Rights and Data Deletion
            </h3>
            <p>
              In compliance with Google Play Data Safety requirements, users maintain comprehensive control over their information:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-slate-900">In-App Deletion:</strong> You can permanently delete your account and associated data directly via the settings menu within Consierge Pro.
              </li>
              <li>
                <strong className="text-slate-900">Web Request:</strong> Data deletion requests can also be submitted outside the application through our external support portal.
              </li>
            </ul>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs font-medium">
            For privacy inquiries, please contact our administrative team at{' '}
            <a href="mailto:office@evdekimi.com" className="font-bold underline hover:text-blue-700">
              office@evdekimi.com
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
          >
            Close Privacy Policy
          </button>
        </div>
      </div>
    </div>
  );
}
