interface ToggleSwitchProps {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  /** "signal": green/red pill + "label = 1/0" caption, for circuit HIGH/LOW toggles (default).
   *  "setting": bare copper/border-strong pill, no caption,  for plain on/off preferences. */
  variant?: "signal" | "setting";
}

export function ToggleSwitch({label, checked, onChange, variant = "signal"}: ToggleSwitchProps) {
  const track =
    variant === "signal"
      ? checked
        ? "bg-signal-green"
        : "bg-signal-coral"
      : checked
        ? "bg-copper"
        : "bg-border-strong";

  const button = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`flex h-6 w-11 items-center rounded-full p-0.5 transition-colors ${track}`}
    >
      <span
        className={`h-5 w-5 rounded-full bg-white transition-transform duration-150 ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );

  if (variant === "setting") return button;

  return (
    <div className="flex flex-col items-center gap-2">
      {button}
      <span className=" text-xs font-medium text-slate">
        {label} = {checked ? 1 : 0}
      </span>
    </div>
  );
}