import React from 'react';
import { X, FileText } from 'lucide-react';

interface TermsOfServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TermsOfServiceModal({ isOpen, onClose }: TermsOfServiceModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Terms of Service</h2>
              <p className="text-xs text-slate-500">Consierge Pro Terms & Operational Agreement</p>
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
          {/* Section 1 */}
          <div className="space-y-2">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1">
              1. Acceptance of Terms
            </h3>
            <p>
              Welcome to Consierge Pro, a property management application operated by EVDEkimi. By downloading, accessing, or utilizing our platform, you agree to be bound by these Terms of Service. If you are accepting these terms on behalf of an organization, you represent that you possess the executive authority to bind that entity to this agreement.
            </p>
          </div>

          {/* Section 2 */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1">
              2. Platform Capabilities and Acceptable Use
            </h3>
            <p>
              Consierge Pro is designed to streamline facility operations, procurement digitalization, structural standard operating procedures, and dynamic yield management. To ensure a secure and efficient environment, users must adhere to strict operational guidelines:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                You are responsible for maintaining the absolute confidentiality of your authentication credentials and platform access.
              </li>
              <li>
                You agree to provide accurate, authorized data when submitting material requests, maintenance logs, or organizational metrics.
              </li>
              <li>
                You must not deploy unauthorized automated extraction tools, reverse engineer the platform, or disrupt our operational architectures.
              </li>
              <li>
                You agree to utilize the application in full compliance with your internal corporate governance standards and applicable local property regulations.
              </li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1">
              3. Intellectual Property and Data Ownership
            </h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                EVDEkimi retains all overarching intellectual property rights, title, and interest in the Consierge Pro application, including its underlying code, proprietary workflows, and user interface.
              </li>
              <li>
                Your organization retains full ownership of the specific operational data, structural SOPs, and proprietary content uploaded to the platform.
              </li>
              <li>
                You grant EVDEkimi a limited, secure license to process this data strictly to execute requested facility management and procurement workflows.
              </li>
              <li>
                We reserve the right to aggregate heavily anonymized operational metrics to optimize system performance and refine dynamic yield tracking algorithms.
              </li>
            </ul>
          </div>

          {/* Section 4 */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1">
              4. Limitation of Liability and Account Termination
            </h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                The application is provided on an &quot;as is&quot; and &quot;as available&quot; basis without warranties of any kind. EVDEkimi shall not be held liable for indirect, incidental, or consequential damages arising from procurement delays, material shortages, or operational downtime.
              </li>
              <li>
                We reserve the right to immediately suspend or terminate accounts that violate these terms or compromise platform security protocols.
              </li>
              <li>
                Users may terminate this agreement at any time by executing a verified, complete account deletion request.
              </li>
              <li>
                Upon termination, all active access to procurement cycles, yield tracking, and proprietary dashboards will be immediately revoked.
              </li>
            </ul>
          </div>

          {/* Section 5 */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1">
              5. Governing Law and Dispute Resolution
            </h3>
            <div className="space-y-2">
              <p>
                <strong className="text-slate-900">5.1 Governing Law:</strong> These Terms of Service and any associated operational agreements shall be governed by and construed in accordance with the laws of the Republic of Indonesia, without regard to its conflict of law principles.
              </p>
              <p>
                <strong className="text-slate-900">5.2 Dispute Resolution:</strong> Any dispute, controversy, or claim arising out of or relating to these Terms, including the breach, termination, or invalidity thereof, shall be finally settled by arbitration administered by the Indonesian National Board of Arbitration (BANI). The arbitration shall be seated in Jakarta, Indonesia, and conducted in accordance with the BANI Rules in force at the time of the dispute. The arbitral tribunal shall consist of one arbitrator, and the language of the proceedings shall be English.
              </p>
            </div>
          </div>

          {/* Section 6 */}
          <div className="space-y-2">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1">
              6. Language Clause
            </h3>
            <p>
              These Terms of Service are executed in both the English and Bahasa Indonesia languages in compliance with Indonesian Law No. 24 of 2009. In the event of any discrepancy, inconsistency, or differing interpretation between the English version and the Bahasa Indonesia version, the English version shall prevail, and the Bahasa Indonesia version shall be deemed automatically amended to conform with the prevailing English text.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
          >
            Accept & Close
          </button>
        </div>
      </div>
    </div>
  );
}
