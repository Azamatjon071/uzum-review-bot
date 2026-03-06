import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  haptic?: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' | 'none';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', haptic = 'light', onClick, ...props }, ref) => {
    const { impactOccurred } = useHapticFeedback();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (haptic !== 'none') {
        impactOccurred(haptic);
      }
      onClick?.(e);
    };

    const variants = {
      primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm active:scale-95',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-95',
      ghost: 'hover:bg-accent hover:text-accent-foreground active:scale-95',
      outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground active:scale-95',
      danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm active:scale-95',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 px-4 py-2',
      lg: 'h-12 px-8 text-lg',
      icon: 'h-10 w-10',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-xl font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 select-none touch-manipulation',
          variants[variant],
          sizes[size],
          className
        )}
        onClick={handleClick}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button };
