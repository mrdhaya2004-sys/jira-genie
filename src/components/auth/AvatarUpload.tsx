import React, { useState, useRef, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Camera, User, X, Loader2, Upload, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 8;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  userId: string;
  userName?: string;
  onAvatarUpdated: (url: string | null) => void;
  size?: 'sm' | 'md' | 'lg';
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({
  currentAvatarUrl,
  userId,
  userName,
  onAvatarUpdated,
  size = 'lg',
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'h-16 w-16',
    md: 'h-20 w-20',
    lg: 'h-28 w-28',
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Only JPG, PNG, and WEBP formats are allowed.';
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `File size must be less than ${MAX_SIZE_MB} MB.`;
    }
    return null;
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      toast.error(error);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleSave = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const filePath = `${userId}/avatar.${fileExt}`;

      // Upload to storage (upsert)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: true,
          contentType: selectedFile.type,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Add cache-busting param
      const avatarUrl = `${publicUrl}?t=${Date.now()}`;

      // Update profile in DB
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      onAvatarUpdated(avatarUrl);
      setPreview(null);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success('Profile picture updated successfully.');
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast.error('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setPreview(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemove = async () => {
    setIsUploading(true);
    try {
      // List and delete existing avatar files
      const { data: files } = await supabase.storage
        .from('avatars')
        .list(userId);

      if (files && files.length > 0) {
        const filePaths = files.map(f => `${userId}/${f.name}`);
        await supabase.storage.from('avatars').remove(filePaths);
      }

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('user_id', userId);

      if (error) throw error;

      onAvatarUpdated(null);
      setPreview(null);
      setSelectedFile(null);
      toast.success('Profile picture removed.');
    } catch (error) {
      console.error('Avatar remove error:', error);
      toast.error('Failed to remove profile picture.');
    } finally {
      setIsUploading(false);
    }
  };

  const displayUrl = preview || currentAvatarUrl;
  const showPreviewActions = !!preview && !!selectedFile;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Avatar with hover overlay */}
      <div className="relative group">
        <Avatar className={cn(sizeClasses[size], 'border-2 border-primary/20 transition-all')}>
          {displayUrl ? (
            <AvatarImage src={displayUrl} alt="Profile picture" />
          ) : null}
          <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
            {userName ? getInitials(userName) : <User className="h-8 w-8" />}
          </AvatarFallback>
        </Avatar>

        {/* Hover overlay */}
        {!showPreviewActions && !isUploading && (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <span className="text-white text-xs font-medium flex flex-col items-center gap-1">
                    <Camera className="h-4 w-4" />
                    Change Photo
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                JPG, PNG or WEBP · Max {MAX_SIZE_MB}MB
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Loading overlay */}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        )}

        {/* Remove button */}
        {currentAvatarUrl && !preview && !isUploading && (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-1 -right-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
            onClick={handleRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Action buttons */}
      {showPreviewActions ? (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCancel} disabled={isUploading}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {currentAvatarUrl ? (
              <>
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Edit Photo
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Upload Photo
              </>
            )}
          </Button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />

    </div>
  );
};

export default AvatarUpload;
