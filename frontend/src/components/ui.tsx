import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";

/* ==========================================================================
   Iconos: SVG en línea (sin librerías externas) para mantener la app liviana.
   ========================================================================== */

const ICONS: Record<string, ReactNode> = {
  home: <path d="M3 10.2 12 3l9 7.2V20a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1v-9.8Z" />,
  grid: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.8" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.8" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.8" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.8" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  userPlus: (
    <>
      <path d="M15 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <path d="M19 8v6" />
      <path d="M22 11h-6" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1.5A5.5 5.5 0 0 1 9.5 14h5A5.5 5.5 0 0 1 20 19.5V21" />
    </>
  ),
  check: <path d="m4.5 12.5 4.5 4.5L19.5 6.5" />,
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.2 12.4 2.6 2.6 5-5.4" />
    </>
  ),
  xCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </>
  ),
  x: <path d="M6 6l12 12M18 6 6 18" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10" width="15" height="10.5" rx="2.2" />
      <path d="M8 10V7.2a4 4 0 0 1 8 0V10" />
      <path d="M12 14.5v2" />
    </>
  ),
  unlock: (
    <>
      <rect x="4.5" y="10" width="15" height="10.5" rx="2.2" />
      <path d="M8 10V7.2a4 4 0 0 1 7.6-1.7" />
      <path d="M12 14.5v2" />
    </>
  ),
  printer: (
    <>
      <path d="M7 8V3.5h10V8" />
      <rect x="3.5" y="8" width="17" height="8.5" rx="2" />
      <path d="M7 13.5h10v7H7z" />
    </>
  ),
  download: (
    <>
      <path d="M12 3.5v11.5" />
      <path d="m7.5 11 4.5 4.5 4.5-4.5" />
      <path d="M4.5 20.5h15" />
    </>
  ),
  logout: (
    <>
      <path d="M9.5 21H5.5A2.5 2.5 0 0 1 3 18.5v-13A2.5 2.5 0 0 1 5.5 3h4" />
      <path d="m16 16.5 4.5-4.5L16 7.5" />
      <path d="M20.5 12H9.5" />
    </>
  ),
  chevronLeft: <path d="m14.5 18-6-6 6-6" />,
  chevronRight: <path d="m9.5 18 6-6-6-6" />,
  chevronDown: <path d="m6 9.5 6 6 6-6" />,
  idCard: (
    <>
      <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
      <circle cx="8.2" cy="10.6" r="2.2" />
      <path d="M4.9 16.4c.6-1.5 1.8-2.2 3.3-2.2s2.7.7 3.3 2.2" />
      <path d="M14.5 9.5h4.2" />
      <path d="M14.5 13.5h4.2" />
    </>
  ),
  activity: <path d="M3 12h4l2.6-7 4 14L16 12h5" />,
  mapPin: (
    <>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="2.7" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.6-3.6" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v6c0 4.4 3 7.6 7 9 4-1.4 7-4.6 7-9V6l-7-3Z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </>
  ),
  refresh: (
    <>
      <path d="M20.5 12a8.5 8.5 0 1 1-2.5-6" />
      <path d="M20.5 3.5V9H15" />
    </>
  ),
  alert: (
    <>
      <path d="M10.3 4.3 2.7 17.3A1.9 1.9 0 0 0 4.4 20h15.2a1.9 1.9 0 0 0 1.7-2.7L13.7 4.3a1.9 1.9 0 0 0-3.4 0Z" />
      <path d="M12 9v4.2" />
      <path d="M12 16.6h.01" />
    </>
  ),
  mail: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </>
  ),
  phone: <path d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 6 6L16.5 13l4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  fileText: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20H2" />
    </>
  ),
  wifi: (
    <>
      <path d="M2.5 8.5a15 15 0 0 1 19 0" />
      <path d="M5.5 12a10.5 10.5 0 0 1 13 0" />
      <path d="M8.5 15.4a6 6 0 0 1 7 0" />
      <path d="M12 19h.01" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M3 3l18 18" />
      <path d="M10.6 6.1A9.7 9.7 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3.1 3.9" />
      <path d="M6.3 7.9A17.5 17.5 0 0 0 2.5 12S6 18 12 18a9.4 9.4 0 0 0 3.6-.7" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  arrowRight: (
    <>
      <path d="M4 12h16" />
      <path d="m14 6 6 6-6 6" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3.5 13.8 9l5.7 1.8-5.7 1.8L12 18.3l-1.8-5.7L4.5 10.8 10.2 9 12 3.5Z" />
    </>
  ),
  network: (
    <>
      <rect x="16" y="16" width="6" height="6" rx="1.5" />
      <rect x="2" y="16" width="6" height="6" rx="1.5" />
      <rect x="9" y="2" width="6" height="6" rx="1.5" />
      <path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" />
      <path d="M12 12V8" />
    </>
  )
};

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  className = "h-5 w-5",
  strokeWidth = 1.8
}: {
  name: IconName;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}

/* ==========================================================================
   Botones
   ========================================================================== */

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success" | "yellow" | "dark";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-mep-purple text-mep-yellow shadow-sm hover:bg-mep-purple-dark active:bg-mep-purple-700 focus-visible:ring-mep-purple/30",
  secondary:
    "border border-gray-200 bg-white text-gray-700 shadow-sm hover:border-mep-purple/40 hover:text-mep-purple focus-visible:ring-mep-purple/20",
  ghost: "text-gray-600 hover:bg-mep-purple/5 hover:text-mep-purple focus-visible:ring-mep-purple/20",
  danger: "bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-500/30",
  success: "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus-visible:ring-emerald-500/30",
  yellow: "bg-mep-yellow text-mep-purple-deep shadow-sm hover:bg-mep-yellow-dark focus-visible:ring-mep-yellow/50",
  dark: "bg-mep-purple-deep text-white shadow-sm hover:bg-mep-purple-800 focus-visible:ring-mep-purple/30"
};

const SIZE: Record<Size, string> = {
  sm: "h-8 gap-1.5 rounded-lg px-2.5 text-xs",
  md: "h-10 gap-2 rounded-xl px-4 text-sm",
  lg: "h-12 gap-2.5 rounded-xl px-6 text-[0.95rem]"
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  block?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  loading,
  block,
  className = "",
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-5 w-5" : "h-4 w-4";
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-semibold transition-all duration-150 outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-55 ${
        VARIANT[variant]
      } ${SIZE[size]} ${block ? "w-full" : ""} ${className}`}
    >
      {loading ? <Spinner className={iconSize} /> : icon ? <Icon name={icon} className={iconSize} /> : null}
      {children}
      {iconRight && !loading ? <Icon name={iconRight} className={iconSize} /> : null}
    </button>
  );
}

export function IconButton({
  icon,
  label,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string }) {
  return (
    <button
      {...rest}
      aria-label={label}
      title={label}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-current transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-mep-purple/20 ${className}`}
    >
      <Icon name={icon} className="h-5 w-5" />
    </button>
  );
}

export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`animate-spin ${className}`} fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ==========================================================================
   Superficies
   ========================================================================== */

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-2xl border border-gray-200/80 bg-white shadow-soft ${className}`}>{children}</div>;
}

export function CardHeader({
  title,
  subtitle,
  icon,
  right
}: {
  title: string;
  subtitle?: string;
  icon?: IconName;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
      <div className="flex items-center gap-3">
        {icon && (
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-mep-purple/10 text-mep-purple">
            <Icon name={icon} className="h-[18px] w-[18px]" />
          </span>
        )}
        <div>
          <h2 className="text-sm font-bold text-gray-800">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

export function PageTitle({
  title,
  subtitle,
  icon,
  actions
}: {
  title: string;
  subtitle?: string;
  icon?: IconName;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex items-center gap-3">
        {icon && (
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-mep-purple text-mep-yellow shadow-soft">
            <Icon name={icon} className="h-5 w-5" />
          </span>
        )}
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-gray-900 sm:text-2xl">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/* ==========================================================================
   Badges / estados
   ========================================================================== */

type Tone = "purple" | "green" | "yellow" | "red" | "gray" | "blue";

const TONE: Record<Tone, string> = {
  purple: "bg-mep-purple/10 text-mep-purple ring-mep-purple/15",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  yellow: "bg-amber-50 text-amber-700 ring-amber-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/15",
  gray: "bg-gray-100 text-gray-600 ring-gray-500/15",
  blue: "bg-sky-50 text-sky-700 ring-sky-600/15"
};

export function Badge({
  children,
  tone = "gray",
  dot,
  className = ""
}: {
  children: ReactNode;
  tone?: Tone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${TONE[tone]} ${className}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function estadoTone(estado?: string): Tone {
  if (estado === "aprobado") return "green";
  if (estado === "pendiente") return "yellow";
  if (estado === "rechazado") return "red";
  if (estado === "bloqueado") return "gray";
  return "gray";
}

/* ==========================================================================
   Estados vacíos / carga
   ========================================================================== */

export function EmptyState({
  icon = "fileText",
  title,
  description,
  action
}: {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-200 bg-white/60 px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-mep-purple/5 text-mep-purple/70">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      {description && <p className="max-w-sm text-sm text-gray-500">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/* ==========================================================================
   Avatar
   ========================================================================== */

export function Avatar({ nombre, size = "md" }: { nombre?: string; size?: "sm" | "md" | "lg" }) {
  const iniciales = (nombre || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  const cls = size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-12 w-12 text-base" : "h-10 w-10 text-sm";
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-mep-purple/10 font-bold text-mep-purple ring-1 ring-inset ring-mep-purple/10 ${cls}`}
    >
      {iniciales || "?"}
    </span>
  );
}

/* ==========================================================================
   Modal
   ========================================================================== */

export function Modal({
  open,
  onClose,
  children,
  className = "max-w-md"
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  // Cerrar con Escape y bloquear el scroll del fondo mientras está abierto.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-mep-purple-deep/50 p-0 backdrop-blur-sm animate-fade-in sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`relative w-full max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-2xl bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-lift animate-scale-in sm:rounded-2xl sm:pb-6 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <IconButton
          icon="x"
          label="Cerrar"
          onClick={onClose}
          className="absolute right-2 top-2 text-gray-400 hover:text-gray-700"
        />
        {children}
      </div>
    </div>
  );
}
