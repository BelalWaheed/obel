import React from 'react';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

export const Logo: React.FC<LogoProps> = ({ size = 24, className, ...props }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Coffee Cup Body */}
      <path
        d="M30 40C30 40 32 75 50 75C68 75 70 40 70 40H30Z"
        fill="#f8f4fa"
      />
      
      {/* Cup Handle */}
      <path
        d="M70 45C78 45 82 48 82 54C82 60 78 63 70 63"
        stroke="#f8f4fa"
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* Coffee Surface */}
      <ellipse cx="50" cy="40" rx="20" ry="5" fill="#3a2a3f" opacity="0.8" />

      {/* Steam & Clock Face */}
      <g opacity="0.9">
        {/* Steam path 1 */}
        <path
          d="M50 35C50 35 40 25 55 18C70 11 50 5 50 5"
          stroke="#c4aad1"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        
        {/* Clock markers/dots */}
        <circle cx="50" cy="20" r="1.5" fill="#c4aad1" />
        <circle cx="58" cy="25" r="1.5" fill="#c4aad1" />
        <circle cx="42" cy="25" r="1.5" fill="#c4aad1" />
        <circle cx="50" cy="12" r="1.5" fill="#c4aad1" />
        
        {/* Clock Hands */}
        <line x1="50" y1="20" x2="50" y2="15" stroke="#c4aad1" strokeWidth="2" strokeLinecap="round" />
        <line x1="50" y1="20" x2="55" y2="23" stroke="#c4aad1" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* Leaves */}
      <path
        d="M28 35C28 35 22 30 25 25C28 20 33 22 33 22"
        fill="#a9c492"
        opacity="0.8"
      />
      <path
        d="M72 35C72 35 78 30 75 25C72 20 67 22 67 22"
        fill="#a9c492"
        opacity="0.8"
      />
    </svg>
  );
};
