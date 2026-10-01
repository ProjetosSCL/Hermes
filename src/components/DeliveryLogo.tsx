import React from 'react';

export interface DeliveryLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const DeliveryLogo: React.FC<DeliveryLogoProps> = ({ className = '', size = 'md' }) => {
  const sizeMap = {
    sm: 'w-8 h-8 rounded-lg',
    md: 'w-10 h-10 rounded-xl',
    lg: 'w-12 h-12 rounded-2xl',
    xl: 'w-16 h-16 rounded-2xl',
  };

  const containerSize = sizeMap[size] || sizeMap.md;

  return (
    <div
      className={`bg-[#008248] p-1.5 shadow-md shadow-emerald-900/20 flex items-center justify-center flex-shrink-0 transition-transform hover:scale-105 ${containerSize} ${className}`}
    >
      <svg
        viewBox="0 0 240 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full text-white"
      >
        {/* Speed / Motion lines behind the box */}
        <path d="M12 135H38" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
        <path d="M6 150H42" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
        <path d="M18 165H38" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />

        {/* Delivery Box */}
        <rect x="48" y="92" width="56" height="52" rx="7" fill="none" stroke="currentColor" strokeWidth="7" />
        <path d="M48 114H104" stroke="currentColor" strokeWidth="5" />
        {/* Emblem on Box (Circle with Arrow) */}
        <circle cx="76" cy="133" r="12" stroke="currentColor" strokeWidth="4" fill="none" />
        <path d="M72 133L78 128V138L72 133Z" fill="currentColor" />

        {/* Helmet */}
        <path
          d="M112 72C112 55 126 44 144 44C164 44 176 56 176 74C176 80 173 85 167 88L145 98L126 92C117 88 112 80 112 72Z"
          fill="currentColor"
        />
        {/* Visor Cutout */}
        <path
          d="M152 66H170C168 76 160 82 148 82V66Z"
          fill="#008248"
        />

        {/* Rider Body & Arm */}
        <path
          d="M112 98C112 98 122 82 136 82C150 82 158 92 162 104"
          fill="none"
          stroke="currentColor"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d="M136 100L180 108"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* Wing on Foot / Boot (Hermes Wing) */}
        <g fill="currentColor">
          <path d="M115 138C105 130 96 132 92 138C100 140 105 144 105 148C105 152 98 156 92 154C100 162 112 162 120 152L115 138Z" />
          <path d="M120 148C112 142 106 144 102 148C108 150 112 153 112 156C112 158 108 160 104 159C110 165 118 164 123 157L120 148Z" />
        </g>

        {/* Motorcycle Body & Gas Tank */}
        <path
          d="M118 126C132 110 152 110 168 118C176 122 184 132 192 132"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* Handlebars & Mirror */}
        <path d="M172 98L190 142" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
        <path d="M182 92L188 108" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
        <circle cx="182" cy="88" r="4" fill="currentColor" />

        {/* Exhaust Pipe */}
        <path d="M115 168L160 160" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />

        {/* Fender over Rear Wheel */}
        <path d="M72 145C80 134 98 134 108 142" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />

        {/* Wheels */}
        {/* Rear Wheel */}
        <circle cx="82" cy="168" r="25" stroke="currentColor" strokeWidth="9" fill="none" />
        <circle cx="82" cy="168" r="9" fill="currentColor" />

        {/* Front Wheel */}
        <circle cx="192" cy="168" r="25" stroke="currentColor" strokeWidth="9" fill="none" />
        <circle cx="192" cy="168" r="9" fill="currentColor" />

        {/* Frame Structure */}
        <path d="M82 168H122L148 142M128 168L150 145" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
};
