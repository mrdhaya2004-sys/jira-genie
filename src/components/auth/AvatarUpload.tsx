import React, { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Camera, User, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AvatarUploadProps {
  value?: string;
  onChange: (url: string | null) => void;
  disabled?: boolean;
  className?: string;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({
  value,
  onChange,
  disabled = false,
  className,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return;
    }

    setIsLoading(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setPreview(dataUrl);
        onChange(dataUrl);
        setIsLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setIsLoading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <div className="relative group">
        <Avatar className="h-24 w-24 border-2 border-dashed border-border transition-colors group-hover:border-primary">
          {preview ? (
            <AvatarImage src={preview} alt="Avatar preview" />
          ) : null}
          <AvatarFallback className="bg-muted">
            {isLoading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <User className="h-8 w-8 text-muted-foreground" />
            )}
          </AvatarFallback>
        </Avatar>

        {/* Upload Button Overlay */}
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="absolute bottom-0 right-0 h-8 w-8 rounded-full shadow-soft"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isLoading}
        >
          <Camera className="h-4 w-4" />
        </Button>

        {/* Remove Button */}
        {preview && (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-0 right-0 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleRemove}
            disabled={disabled || isLoading}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />

      <p className="text-xs text-muted-foreground text-center">
        Click to upload profile photo
        <br />
        <span className="text-[10px]">(Optional, max 5MB)</span>
      </p>
    </div>
  );
};

export default AvatarUpload;
