import React from "react";

export function ClubMatchLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="36" height="36" rx="8" className="fill-indigo-600 dark:fill-indigo-500" />
      {/* Crisp flat community node glyph */}
      <circle cx="13" cy="14" r="3.5" fill="white" />
      <circle cx="23" cy="14" r="3.5" fill="white" fillOpacity="0.75" />
      <path
        d="M9 25C9 21.5 12 19.5 18 19.5C24 19.5 27 21.5 27 25"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="18" cy="24" r="2" fill="white" />
    </svg>
  );
}
