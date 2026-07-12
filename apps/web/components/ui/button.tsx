import {forwardRef, type ButtonHTMLAttributes} from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-copper text-white hover:bg-copper-dark",
  secondary:
    "border border-border-strong text-ink hover:border-ink-soft bg-transparent",
  ghost: "text-ink-soft hover:text-ink bg-transparent",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-5 py-2.5 text-sm rounded-lg",
  lg: "px-7 py-3.5 text-base rounded-xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({variant = "primary", size = "sm", className = "", ...props}, ref) => {
    return (
      <button
        ref={ref}
        className={`font-semibold transition-colors ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";