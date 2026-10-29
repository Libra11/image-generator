import * as React from 'react'

import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm'

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'accent-gradient text-modality-contrast shadow-[var(--shadow-md)] hover:brightness-[1.06] active:brightness-95',
  secondary:
    'bg-secondary text-secondary-foreground border border-border hover:bg-accent hover:text-accent-foreground',
  ghost: 'text-muted-foreground hover:bg-accent hover:text-foreground',
  outline:
    'border border-border bg-transparent text-foreground hover:border-modality/40 hover:bg-accent/60',
  danger: 'bg-destructive/10 text-destructive hover:bg-destructive/15',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 rounded-lg px-3 text-xs',
  md: 'h-9 gap-2 rounded-lg px-4 text-sm',
  lg: 'h-11 gap-2 rounded-xl px-5 text-sm',
  icon: 'h-9 w-9 rounded-lg',
  'icon-sm': 'h-8 w-8 rounded-lg',
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'secondary', size = 'md', type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97] active:duration-75',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-modality/40 focus-visible:ring-offset-0',
        'disabled:pointer-events-none disabled:opacity-45',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  )
})