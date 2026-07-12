import "@/app/globals.css";

interface IconProps {
  className?: string;
}

export function Logo({className}: IconProps) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Inputs */}
      <line
        x1="2"
        y1="13"
        x2="8"
        y2="13"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      <line
        x1="2"
        y1="23"
        x2="8"
        y2="23"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Body */}
      <path
        d="M8 7H17C23.2 7 28 11.8 28 18C28 24.2 23.2 29 17 29H8V7Z"
        fill="currentColor"
      />

      {/* Bubble */}
      <circle
        cx="31"
        cy="18"
        r="3"
        fill="var(--copper)"
      />

      {/* Output */}
      <line
        x1="34"
        y1="18"
        x2="36"
        y2="18"
        stroke="var(--copper)"
        strokeWidth="2.2"
        strokeLinecap="round"
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

export function LogoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 100" width="100%" height="100%"
         aria-labelledby="logoTitle logoDesc" role="img">
      <title id="logoTitle">Nandscape Logo</title>
      <desc id="logoDesc">A logo combining a logic NAND gate with a puzzle piece shape and the text Nandscape.</desc>
      <defs>
        <linearGradient id="gateGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{'stopColor': 'var(--copper)'}}/>
          <stop offset="100%" style={{'stopColor': 'var(--copper-dark)'}}/>
        </linearGradient>
        <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{'stopColor': 'var(--copper)'}}/>
          <stop offset="100%" style={{'stopColor': 'var(--signal-coral)'}}/>
        </linearGradient>
        <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="1" dy="2.5" stdDeviation="2" floodOpacity="0.15" style={{'floodColor': 'var(--ink)'}}/>
        </filter>
      </defs>

      <g filter="url(#shadow)">
        <path d="M 15 30 L 40 30" strokeWidth="4" strokeLinecap="round" style={{'stroke': 'var(--ink)'}}/>
        <path d="M 15 70 L 40 70" strokeWidth="4" strokeLinecap="round" style={{'stroke': 'var(--ink)'}}/>

        <path d="M 40 20
               L 52.5 20
               C 52.5 32.5, 67.5 32.5, 67.5 20
               L 80 20
               A 30 30 0 0 1 80 80
               L 40 80
               L 40 60
               C 20 60, 20 40, 40 40
               Z"
              fill="url(#gateGrad)"/>

        <circle cx="117.5" cy="50" r="7.5" strokeWidth="4"
                style={{'fill': 'var(--surface)', 'stroke': 'url(#gateGrad)'}}/>

        <path d="M 125 50 L 145 50" strokeWidth="4" strokeLinecap="round" style={{'stroke': 'var(--ink)'}}/>
      </g>

      <text x="155" y="62.5" style={{
        'fontFamily': 'var(--font-display, sans-serif)',
        'fontSize': '38px',
        'fontWeight': '900',
        'letterSpacing': '-1px'
      }}>
        <tspan style={{'fill': 'var(--ink)'}}>Nand</tspan>
        <tspan fill="url(#textGrad)">scape</tspan>
      </text>
    </svg>
  );
}