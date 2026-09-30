import "@/app/globals.css";

interface IconProps {
  className?: string;
}

// The two snap blocks, same geometry as public/brand/mark.svg: an orange
// Scratch-style "hat" block whose tab sits in the blue block's notch.
const MARK_TOP = "M0 8C14 -2.67 30 -2.67 44 8H63Q68 8 68 13V29Q68 34 63 34H42L37 40H27L22 34H5Q0 34 0 29Z";
const MARK_BOTTOM = "M14 47Q14 42 19 42H20L25 48H39L44 42H63Q68 42 68 47V63Q68 68 63 68H19Q14 68 14 63Z";

export function Logo({className}: IconProps) {
  return (
    <svg
      viewBox="0 0 68 68"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d={MARK_TOP} fill="var(--brand-orange)" />
      <path d={MARK_BOTTOM} fill="var(--brand-blue)" />
    </svg>
  );
}

/**
 * The horizontal lockup from public/brand/logo-horizontal-*.svg, cropped to
 * its artwork. The wordmark (JetBrains Mono Bold as outlines) is on
 * currentColor, so a single inline copy follows the theme instead of
 * swapping between the light and dark files.
 */
export function LogoLockup({className}: IconProps) {
  return (
    <svg
      viewBox="46 46 761 155"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Nandscape"
    >
      <defs>
        <linearGradient id="nandscape-lockup-stripe" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" style={{stopColor: "var(--brand-blue)"}} />
          <stop offset=".5" style={{stopColor: "var(--brand-red)"}} />
          <stop offset="1" style={{stopColor: "var(--brand-yellow)"}} />
        </linearGradient>
      </defs>
      <g transform="translate(48 48) scale(1.76471)">
        <path d={MARK_TOP} fill="var(--brand-orange)" />
        <path d={MARK_BOTTOM} fill="var(--brand-blue)" />
      </g>
      <path
        transform="translate(203.50 151.07) scale(0.118)"
        fill="currentColor"
        d="M72 0V-730H225L428 -140Q425 -172 421.5 -215.5Q418 -259 416.0 -304.5Q414 -350 414 -384V-730H528V0H375L174 -590Q176 -561 179.0 -520.0Q182 -479 184.0 -436.0Q186 -393 186 -357V0ZM809.0 10Q724.0 10 675.0 -35.0Q626.0 -80 626.0 -156Q626.0 -237 680.0 -281.0Q734.0 -325 833.0 -325H970.0V-372Q970.0 -412 944.0 -434.5Q918.0 -457 873.0 -457Q832.0 -457 805.0 -439.0Q778.0 -421 773.0 -390H651.0Q660.0 -468 721.0 -514.0Q782.0 -560 877.0 -560Q978.0 -560 1036.5 -509.5Q1095.0 -459 1095.0 -373V0H974.0V-96H972.0Q964.0 -54 929.0 -26Q884.0 10 809.0 10ZM850.0 -84Q903.0 -84 936.5 -111.0Q970.0 -138 970.0 -181V-248H835.0Q797.0 -248 774.0 -226.0Q751.0 -204 751.0 -168Q751.0 -129 777.5 -106.5Q804.0 -84 850.0 -84ZM1217.0 0V-550H1339.0V-445H1341.0Q1348.0 -493 1379.0 -522Q1418.0 -560 1487.0 -560Q1568.0 -560 1616.5 -506.0Q1665.0 -452 1665.0 -361V0H1540.0V-348Q1540.0 -398 1514.0 -425.0Q1488.0 -452 1441.0 -452Q1395.0 -452 1368.5 -424.0Q1342.0 -396 1342.0 -344V0ZM1963.0 10Q1881.0 10 1830.5 -47.0Q1780.0 -104 1780.0 -200V-349Q1780.0 -446 1830.0 -503.0Q1880.0 -560 1963.0 -560Q2031.0 -560 2071.0 -522Q2102.0 -492 2109.0 -445H2112.0L2108.0 -576V-730H2233.0V0H2111.0V-105H2109.0Q2102.0 -58 2071.0 -29Q2031.0 10 1963.0 10ZM2007.0 -98Q2055.0 -98 2081.5 -126.5Q2108.0 -155 2108.0 -206V-344Q2108.0 -395 2081.5 -423.5Q2055.0 -452 2007.0 -452.0Q1959.0 -452 1932.0 -424.0Q1905.0 -396 1905.0 -344V-206Q1905.0 -154 1932.0 -126.0Q1959.0 -98 2007.0 -98ZM2559.0 9Q2496.0 9 2449.0 -11.0Q2402.0 -31 2375.5 -66.5Q2349.0 -102 2347.0 -150H2472.0Q2474.0 -124 2497.5 -108.0Q2521.0 -92 2559.0 -92H2603.0Q2649.0 -92 2672.0 -110.0Q2695.0 -128 2695.0 -159Q2695.0 -188 2674.5 -204.5Q2654.0 -221 2611.0 -226L2543.0 -236Q2449.0 -249 2405.0 -286.0Q2361.0 -323 2361.0 -397Q2361.0 -474 2413.0 -516.5Q2465.0 -559 2566.0 -559H2604.0Q2696.0 -559 2751.0 -518.0Q2806.0 -477 2810.0 -408H2685.0Q2682.0 -430 2660.5 -444.0Q2639.0 -458 2604.0 -458H2566.0Q2523.0 -458 2503.5 -442.5Q2484.0 -427 2484.0 -397Q2484.0 -369 2501.0 -355.5Q2518.0 -342 2556.0 -336L2627.0 -326Q2725.0 -312 2771.5 -273.5Q2818.0 -235 2818.0 -160Q2818.0 -80 2763.5 -35.5Q2709.0 9 2603.0 9ZM3153.0 10Q3083.0 10 3030.5 -16.5Q2978.0 -43 2949.0 -91.5Q2920.0 -140 2920.0 -206V-344Q2920.0 -411 2949.0 -459.0Q2978.0 -507 3030.5 -533.5Q3083.0 -560 3153.0 -560Q3257.0 -560 3319.0 -506.5Q3381.0 -453 3384.0 -361H3259.0Q3256.0 -404 3228.5 -427.5Q3201.0 -451 3153.0 -451Q3103.0 -451 3074.0 -423.5Q3045.0 -396 3045.0 -345V-206Q3045.0 -155 3074.0 -127.0Q3103.0 -99 3153.0 -99Q3201.0 -99 3228.5 -122.5Q3256.0 -146 3259.0 -189H3384.0Q3381.0 -97 3319.0 -43.5Q3257.0 10 3153.0 10ZM3659.0 10Q3574.0 10 3525.0 -35.0Q3476.0 -80 3476.0 -156Q3476.0 -237 3530.0 -281.0Q3584.0 -325 3683.0 -325H3820.0V-372Q3820.0 -412 3794.0 -434.5Q3768.0 -457 3723.0 -457Q3682.0 -457 3655.0 -439.0Q3628.0 -421 3623.0 -390H3501.0Q3510.0 -468 3571.0 -514.0Q3632.0 -560 3727.0 -560Q3828.0 -560 3886.5 -509.5Q3945.0 -459 3945.0 -373V0H3824.0V-96H3822.0Q3814.0 -54 3779.0 -26Q3734.0 10 3659.0 10ZM3700.0 -84Q3753.0 -84 3786.5 -111.0Q3820.0 -138 3820.0 -181V-248H3685.0Q3647.0 -248 3624.0 -226.0Q3601.0 -204 3601.0 -168Q3601.0 -129 3627.5 -106.5Q3654.0 -84 3700.0 -84ZM4067.0 180V-550H4189.0V-445H4191.0Q4198.0 -492 4229.0 -522Q4269.0 -560 4337.0 -560Q4420.0 -560 4470.0 -503.0Q4520.0 -446 4520.0 -350V-201Q4520.0 -137 4497.5 -89.5Q4475.0 -42 4434.0 -16.0Q4393.0 10 4337.0 10Q4269.0 10 4229.0 -29Q4198.0 -58 4191.0 -105H4188.0L4192.0 26V180ZM4293.0 -98Q4341.0 -98 4368.0 -126.0Q4395.0 -154 4395.0 -206V-344Q4395.0 -396 4368.0 -424.0Q4341.0 -452 4293.0 -452Q4246.0 -452 4219.0 -423.5Q4192.0 -395 4192.0 -344V-206Q4192.0 -155 4219.0 -126.5Q4246.0 -98 4293.0 -98ZM4861.0 10Q4791.0 10 4739.0 -17.0Q4687.0 -44 4658.5 -92.5Q4630.0 -141 4630.0 -206V-344Q4630.0 -409 4658.5 -457.5Q4687.0 -506 4739.0 -533.0Q4791.0 -560 4861.0 -560Q4930.0 -560 4981.5 -533.0Q5033.0 -506 5061.5 -457.5Q5090.0 -409 5090.0 -344V-245H4751.0V-206Q4751.0 -148 4779.0 -118.5Q4807.0 -89 4862.0 -89Q4904.0 -89 4930.0 -103.5Q4956.0 -118 4963.0 -146H5086.0Q5072.0 -75 5010.5 -32.5Q4949.0 10 4861.0 10ZM4969.0 -325V-345Q4969.0 -402 4942.0 -432.5Q4915.0 -463 4861.0 -463.0Q4807.0 -463 4779.0 -432.0Q4751.0 -401 4751.0 -344V-323Z"
      />
      <rect
        x="212.00"
        y="192.31"
        width="592.12"
        height="6"
        rx="3"
        fill="url(#nandscape-lockup-stripe)"
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
