import React from 'react';

export type LogoVariant = 'white' | 'blue' | 'slate';

interface EvdekimiLogoProps {
  className?: string;
  iconOnly?: boolean;
  variant?: LogoVariant;
}

export const EvdekimiLogo: React.FC<EvdekimiLogoProps> = ({ 
  className = "h-9", 
  iconOnly = false,
  variant = 'blue'
}) => {
  const activeVariant = variant;
  
  const logoSrc = activeVariant === 'white' 
    ? '/Logo EV white.png' 
    : '/Logo EV blue.png';

  const getTitleColorClass = () => {
    switch (activeVariant) {
      case 'white':
        return 'text-white';
      case 'blue':
        return 'text-[#1E3A8A]';
      case 'slate':
        return 'text-slate-700';
    }
  };

  const getSubtitleColorClass = () => {
    switch (activeVariant) {
      case 'white':
        return 'text-slate-300';
      case 'blue':
        return 'text-[#1E3A8A] opacity-80';
      case 'slate':
        return 'text-slate-500';
    }
  };

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <img 
        src={logoSrc} 
        alt="EVDEkimi Logo" 
        className="h-full w-auto object-contain shrink-0"
        referrerPolicy="no-referrer"
      />
      {!iconOnly && (
        <div className="flex flex-col justify-center leading-none">
          <span className={`font-extrabold tracking-tight text-lg ${getTitleColorClass()}`}>
            EVDEkimi
          </span>
          <span className={`text-[10px] font-bold tracking-widest uppercase mt-1 ${getSubtitleColorClass()}`}>
            Real Estates
          </span>
        </div>
      )}
    </div>
  );
};

export default EvdekimiLogo;
