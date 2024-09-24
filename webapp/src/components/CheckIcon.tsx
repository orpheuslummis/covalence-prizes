// src/components/CheckIcon.tsx
import React from "react";

interface CheckIconProps {
  className: string;
}

const CheckIcon: React.FC<CheckIconProps> = ({ className }) => {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
  );
};

export default CheckIcon;
