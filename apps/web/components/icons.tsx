import "@/app/globals.css";

interface IconProps {
  className?: string;
}

export function Logo({className}: IconProps) {
  return (
    <svg
      viewBox="0 0 68 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Two snap blocks, same geometry as public/brand/mark.svg. The top
          block's tab sits in the bottom block's notch. */}
      <path
        d="M0 5Q0 0 5 0H63Q68 0 68 5V21Q68 26 63 26H42L37 32H27L22 26H5Q0 26 0 21Z"
        fill="var(--brand-blue)"
      />
      <path
        d="M14 39Q14 34 19 34H20L25 40H39L44 34H63Q68 34 68 39V55Q68 60 63 60H19Q14 60 14 55Z"
        fill="var(--brand-red)"
      />
    </svg>
  );
}

export function SunIcon({className}: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.3"/>
      <path
        d="M8 0.8V2.3M8 13.7V15.2M15.2 8H13.7M2.3 8H0.8M13.06 2.94L12 4M4 12L2.94 13.06M13.06 13.06L12 12M4 4L2.94 2.94"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MoonIcon({className}: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M14 9.3A6.2 6.2 0 1 1 6.7 2a5 5 0 0 0 7.3 7.3Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function PlayIcon({className}: IconProps) {
  return (
    <svg
      viewBox="0 0 11 11"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M1 0.5L10 5.5L1 10.5V0.5Z" fill="currentColor"/>
    </svg>
  );
}

export function RefreshIcon({className}: IconProps) {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M10 6A4 4 0 1 1 8.8 3.2M10 1V4H7"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function EyeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}
