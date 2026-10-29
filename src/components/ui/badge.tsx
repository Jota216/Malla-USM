import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "success"
    | "warning"
    | "usm"
    | "gold";
}

const badgeVariants: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
  secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
  destructive: "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
  outline: "text-foreground border border-input",
  success: "border-transparent bg-emerald-600 text-white shadow hover:bg-emerald-700",
  warning: "border-transparent bg-amber-500 text-slate-950 shadow hover:bg-amber-600",
  usm: "border-transparent bg-[#002B49] text-white shadow hover:bg-[#002B49]/90",
  gold: "border-transparent bg-[#D99B00] text-slate-950 shadow hover:bg-[#D99B00]/90",
};

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none",
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
