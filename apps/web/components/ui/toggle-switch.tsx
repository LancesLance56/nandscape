interface ToggleSwitchProps {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}

export function ToggleSwitch({ label, checked, onChange }: ToggleSwitchProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`flex h-6 w-11 items-center rounded-full p-0.5 transition-colors ${
          checked ? "bg-signal-green" : "bg-signal-coral"
        }`}
      >
        <span
          className={`h-5 w-5 rounded-full bg-white transition-transform duration-150 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
      <span className="font-mono text-xs font-medium text-slate">
        {label} = {checked ? 1 : 0}
      </span>
    </div>
  );
}