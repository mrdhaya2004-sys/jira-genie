import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileId } from '@/hooks/useProfileId';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import AvatarUpload from '@/components/auth/AvatarUpload';
import {
  AtSign,
  CheckCircle,
  XCircle,
  Loader2,
  Pencil,
  User,
  Mail,
  BadgeCheck,
  Calendar,
  Phone,
  IdCard,
  Save,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const RESERVED_USERNAMES = [
  'admin', 'administrator', 'root', 'system', 'support', 'help',
  'moderator', 'mod', 'staff', 'official', 'testzone', 'hivemind',
  'bot', 'api', 'null', 'undefined', 'test', 'dev',
];

interface ProfileFormData {
  fullName: string;
  employeeId: string;
  mobileNumber: string;
  username: string;
}

interface FormErrors {
  fullName?: string;
  employeeId?: string;
  mobileNumber?: string;
  username?: string;
}

const ProfileModule: React.FC = () => {
  const { profile, user, refreshProfile } = useAuth();
  const { profileId, checkAvailability, saveProfileId, isChecking, isSaving: isSavingUsername } = useProfileId();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    fullName: '',
    employeeId: '',
    mobileNumber: '',
    username: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  // Populate form when entering edit mode
  useEffect(() => {
    if (isEditing && profile) {
      setFormData({
        fullName: profile.full_name || '',
        employeeId: profile.employee_id || '',
        mobileNumber: profile.mobile_number || '',
        username: profileId?.replace(/^@/, '') || '',
      });
      setErrors({});
      setUsernameAvailable(null);
    }
  }, [isEditing, profile, profileId]);

  // Validate individual field
  const validateField = useCallback((field: keyof ProfileFormData, value: string): string | undefined => {
    switch (field) {
      case 'fullName': {
        const trimmed = value.trim();
        if (trimmed.length < 3) return 'Full name must be at least 3 characters';
        if (!/^[a-zA-Z\s'-]+$/.test(trimmed)) return 'Name can only contain letters and spaces';
        return undefined;
      }
      case 'employeeId': {
        const trimmed = value.trim();
        if (!trimmed) return 'Employee ID is required';
        if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) return 'Invalid employee ID';
        return undefined;
      }
      case 'mobileNumber': {
        const trimmed = value.trim();
        if (!trimmed) return undefined; // optional
        if (!/^\d{10}$/.test(trimmed)) return 'Invalid mobile number (must be 10 digits)';
        return undefined;
      }
      case 'username': {
        if (!value) return undefined;
        if (value.length < 3) return 'Must be at least 3 characters';
        if (value.length > 20) return 'Must be 20 characters or less';
        if (!/^[a-z0-9_]+$/.test(value)) return 'Lowercase letters, numbers and underscores only';
        if (RESERVED_USERNAMES.includes(value)) return 'This username is reserved';
        return undefined;
      }
      default:
        return undefined;
    }
  }, []);

  const handleFieldChange = (field: keyof ProfileFormData, value: string) => {
    let cleanValue = value;
    if (field === 'username') {
      cleanValue = value.replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
    }
    if (field === 'mobileNumber') {
      cleanValue = value.replace(/\D/g, '').slice(0, 10);
    }

    setFormData(prev => ({ ...prev, [field]: cleanValue }));
    const error = validateField(field, cleanValue);
    setErrors(prev => ({ ...prev, [field]: error }));

    if (field === 'username') {
      setUsernameAvailable(null);
    }
  };

  // Debounced username availability check
  useEffect(() => {
    if (!isEditing) return;
    const username = formData.username;
    if (!username || username.length < 3 || errors.username) {
      setUsernameAvailable(null);
      return;
    }
    // Same as current — no need to check
    if (profileId === `@${username}`) {
      setUsernameAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      const available = await checkAvailability(`@${username}`);
      setUsernameAvailable(available);
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.username, isEditing, errors.username, profileId, checkAvailability]);

  const validateAll = (): boolean => {
    const newErrors: FormErrors = {
      fullName: validateField('fullName', formData.fullName),
      employeeId: validateField('employeeId', formData.employeeId),
      mobileNumber: validateField('mobileNumber', formData.mobileNumber),
      username: validateField('username', formData.username),
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some(Boolean);
  };

  const handleSave = async () => {
    if (!validateAll() || !user) return;

    // If username changed, check availability
    const usernameChanged = formData.username && profileId !== `@${formData.username}`;
    if (usernameChanged && usernameAvailable === false) {
      setErrors(prev => ({ ...prev, username: 'Username already exists' }));
      return;
    }

    setIsSaving(true);
    try {
      // Update profile fields
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName.trim(),
          employee_id: formData.employeeId.trim(),
          mobile_number: formData.mobileNumber.trim() || null,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Update username if changed
      if (usernameChanged && formData.username) {
        const success = await saveProfileId(`@${formData.username}`);
        if (!success) {
          setIsSaving(false);
          return;
        }
      }

      await refreshProfile();
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (err: any) {
      console.error('Profile update error:', err);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({ fullName: '', employeeId: '', mobileNumber: '', username: '' });
    setErrors({});
    setUsernameAvailable(null);
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const hasUsername = !!profileId;

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Profile Header Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <AvatarUpload
                currentAvatarUrl={profile?.avatar_url}
                userId={profile?.user_id || ''}
                userName={profile?.full_name}
                onAvatarUpdated={() => refreshProfile()}
                size="md"
              />
              <div className="space-y-1 text-center sm:text-left flex-1">
                <h2 className="text-xl font-bold text-foreground">{profile?.full_name}</h2>
                {hasUsername && (
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <Badge variant="secondary" className="text-sm font-medium gap-1">
                      <AtSign className="h-3.5 w-3.5" />
                      {profileId?.replace('@', '')}
                    </Badge>
                  </div>
                )}
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
              </div>
              {!isEditing && (
                <Button variant="outline" onClick={() => setIsEditing(true)} className="gap-2">
                  <Pencil className="h-4 w-4" />
                  Edit Profile
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Profile Details / Edit Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-primary" />
              {isEditing ? 'Edit Profile' : 'Profile Details'}
            </CardTitle>
            {isEditing && (
              <CardDescription>Update your profile information. Email cannot be changed.</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-5">
            {isEditing ? (
              <>
                {/* Username */}
                <div className="space-y-2">
                  <Label htmlFor="edit-username">Username</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">@</span>
                    <Input
                      id="edit-username"
                      placeholder="your_username"
                      value={formData.username}
                      onChange={e => handleFieldChange('username', e.target.value)}
                      className={cn('pl-8 pr-10', errors.username && 'border-destructive')}
                      maxLength={20}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {isChecking && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                      {!isChecking && usernameAvailable === true && (
                        <CheckCircle className="h-4 w-4 text-success" />
                      )}
                      {!isChecking && usernameAvailable === false && (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                  </div>
                  {errors.username && <p className="text-xs text-destructive">{errors.username}</p>}
                  {usernameAvailable === false && !errors.username && (
                    <p className="text-xs text-destructive">Username already exists</p>
                  )}
                  {usernameAvailable === true && !errors.username && (
                    <p className="text-xs text-success">Username is available!</p>
                  )}
                </div>

                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="edit-fullname">Full Name</Label>
                  <Input
                    id="edit-fullname"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={e => handleFieldChange('fullName', e.target.value)}
                    className={cn(errors.fullName && 'border-destructive')}
                  />
                  {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
                </div>

                {/* Employee ID */}
                <div className="space-y-2">
                  <Label htmlFor="edit-empid">Employee ID</Label>
                  <Input
                    id="edit-empid"
                    placeholder="EMP001"
                    value={formData.employeeId}
                    onChange={e => handleFieldChange('employeeId', e.target.value)}
                    className={cn(errors.employeeId && 'border-destructive')}
                  />
                  {errors.employeeId && <p className="text-xs text-destructive">{errors.employeeId}</p>}
                </div>

                {/* Mobile Number */}
                <div className="space-y-2">
                  <Label htmlFor="edit-mobile">Mobile Number</Label>
                  <Input
                    id="edit-mobile"
                    placeholder="9876543210"
                    value={formData.mobileNumber}
                    onChange={e => handleFieldChange('mobileNumber', e.target.value)}
                    className={cn(errors.mobileNumber && 'border-destructive')}
                    inputMode="numeric"
                  />
                  {errors.mobileNumber && <p className="text-xs text-destructive">{errors.mobileNumber}</p>}
                </div>

                {/* Email (read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    value={profile?.email || ''}
                    disabled
                    className="bg-muted/50 cursor-not-allowed opacity-70"
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={handleSave}
                    disabled={isSaving || isSavingUsername}
                    className="gap-2"
                  >
                    {isSaving || isSavingUsername ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={handleCancel} className="gap-2">
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {hasUsername && (
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <AtSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Username</p>
                      <p className="text-sm font-medium">{profileId}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Full Name</p>
                    <p className="text-sm font-medium">{profile?.full_name || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium">{profile?.email || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <IdCard className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Employee ID</p>
                    <p className="text-sm font-medium">{profile?.employee_id || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Mobile</p>
                    <p className="text-sm font-medium">{profile?.mobile_number || '—'}</p>
                  </div>
                </div>
                {profile?.date_of_birth && (
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Date of Birth</p>
                      <p className="text-sm font-medium">{profile.date_of_birth}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfileModule;
