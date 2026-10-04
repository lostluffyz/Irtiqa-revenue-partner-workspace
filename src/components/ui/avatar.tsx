type AvatarSize = "sm" | "md" | "lg";

interface AvatarProps {
  name: string;
  size?: AvatarSize;
  className?: string;
}

const sizeStyles: Record<AvatarSize, string> = {
  sm: "h-7 w-7 text-[10px]",
  md: "h-8 w-8 text-[11px]",
  lg: "h-10 w-10 text-[13px]",
};

// Restrained non-status palette — never green/amber/red, which are
// reserved strictly for status meaning.
const AVATAR_COLORS = [
  "bg-slate-100 text-slate-600",
  "bg-indigo-50 text-indigo-600",
  "bg-cyan-50 text-cyan-700",
  "bg-stone-100 text-stone-600",
];

function getColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function Avatar({ name, size = "md", className = "" }: AvatarProps) {
  const initials = getInitials(name);
  const colorClass = getColorFromName(name);

  return (
    <div
      className={`inline-flex items-center justify-center rounded-lg font-semibold shrink-0 ${sizeStyles[size]} ${colorClass} ${className}`}
      aria-label={name}
    >
      {initials}
    </div>
  );
}
