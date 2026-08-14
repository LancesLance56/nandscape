interface LedProps {
  label: string;
  value: 0 | 1;
}

export function Led({label, value}: LedProps) {
  const isOn = value === 1;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white transition-colors ${
          isOn
            ? "bg-signal-green shadow-[0_0_0_4px_var(--signal-green-bg)]"
            : "bg-signal-coral shadow-[0_0_0_4px_var(--signal-coral-bg)]"
        }`}
      >
        {value}
      </div>
      <span className=" text-xs font-medium text-slate">{label}</span>
    </div>
  );
}