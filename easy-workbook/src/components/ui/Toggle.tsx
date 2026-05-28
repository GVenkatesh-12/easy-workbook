interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <label className={`
      inline-flex items-center gap-3.5 cursor-pointer select-none
      ${disabled ? 'opacity-40 pointer-events-none' : ''}
    `}>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={`
          relative w-12 h-7 rounded-full transition-colors duration-200 ease-out shrink-0
          ${checked ? 'bg-brand-500' : 'bg-surface-700'}
        `}
      >
        <span
          className={`
            absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-md
            transition-transform duration-200 ease-out
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
      {label && <span className="text-sm text-surface-300">{label}</span>}
    </label>
  );
}
