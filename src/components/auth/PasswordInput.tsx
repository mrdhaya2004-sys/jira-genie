import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  showStrength?: boolean;
  value?: string;
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, showStrength = false, value = '', ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    const requirements = [
      { label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
      { label: 'One uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
      { label: 'One lowercase letter', test: (v: string) => /[a-z]/.test(v) },
      { label: 'One number', test: (v: string) => /[0-9]/.test(v) },
      { label: 'One special character', test: (v: string) => /[^a-zA-Z0-9]/.test(v) },
    ];

    const passedRequirements = requirements.filter((r) => r.test(value)).length;
    const strength = passedRequirements / requirements.length;

    const getStrengthColor = () => {
      if (strength < 0.4) return 'bg-destructive';
      if (strength < 0.7) return 'bg-warning';
      return 'bg-success';
    };

    const getStrengthLabel = () => {
      if (strength < 0.4) return 'Weak';
      if (strength < 0.7) return 'Medium';
      if (strength < 1) return 'Good';
      return 'Strong';
    };

    return (
      <div className="space-y-2">
        <div className="relative">
          <Input
            ref={ref}
            type={showPassword ? 'text' : 'password'}
            className={cn('pr-10', className)}
            value={value}
            {...props}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="sr-only">
              {showPassword ? 'Hide password' : 'Show password'}
            </span>
          </Button>
        </div>

        {showStrength && value && (
          <div className="space-y-2">
            {/* Strength Bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn('h-full transition-all duration-300', getStrengthColor())}
                  style={{ width: `${strength * 100}%` }}
                />
              </div>
              <span className={cn('text-xs font-medium', 
                strength < 0.4 ? 'text-destructive' : 
                strength < 0.7 ? 'text-warning' : 'text-success'
              )}>
                {getStrengthLabel()}
              </span>
            </div>

            {/* Requirements List */}
            <div className="grid grid-cols-2 gap-1">
              {requirements.map((req, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex items-center gap-1.5 text-xs transition-colors',
                    req.test(value) ? 'text-success' : 'text-muted-foreground'
                  )}
                >
                  {req.test(value) ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                  <span>{req.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;
