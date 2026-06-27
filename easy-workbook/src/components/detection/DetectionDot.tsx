interface DetectionDotProps {
  x: number; // percentage (0 to 1)
  y: number; // percentage (0 to 1)
  label: string;
  onClick: () => void;
}

export function DetectionDot({ x, y, label, onClick }: DetectionDotProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="absolute group z-20 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-auto"
      style={{
        left: `${x * 100}%`,
        top: `${y * 100}%`,
      }}
      title={`Click to select ${label}`}
    >
      {/* Outer pulsing ring */}
      <span className="absolute w-8 h-8 rounded-full bg-brand-500/40 animate-ping opacity-75" />
      
      {/* Inner solid dot */}
      <span className="relative w-4 h-4 rounded-full bg-brand-500 border-2 border-white shadow-lg shadow-brand-500/50 flex items-center justify-center transition-all duration-200 group-hover:scale-125 group-hover:bg-brand-400">
        {/* Subtle dot center */}
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
      </span>

      {/* Tooltip badge */}
      <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-all duration-150 origin-bottom px-2.5 py-1 rounded-lg bg-surface-900 border border-surface-800 text-white text-[10px] font-bold shadow-xl whitespace-nowrap">
        Select {label}
      </span>
    </button>
  );
}
