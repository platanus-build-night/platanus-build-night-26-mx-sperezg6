import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-[color,background-color,opacity,transform] duration-150 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-cream hover:opacity-90",
  secondary: "border border-line bg-surface text-ink hover:bg-surface-2",
  ghost: "text-mute hover:bg-surface-2 hover:text-ink",
  danger: "border border-line text-danger hover:bg-danger-bg",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-2.5 text-sm",
  md: "h-9 px-3.5 text-sm",
};

type CommonProps = { variant?: Variant; size?: Size; className?: string };

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  href,
  ...props
}: CommonProps & { href: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <Link href={href} className={cn(base, variants[variant], sizes[size], className)} {...props} />
  );
}
