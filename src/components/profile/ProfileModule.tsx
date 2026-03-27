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
import CountryCodeSelect from '@/components/profile/CountryCodeSelect';
import {
  parseMobileNumber,
  formatMobileForStorage,
  validateMobileForCountry,
  getCountryByCode,
  DEFAULT_COUNTRY,
} from '@/lib/countryCodes';
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
  mobileCountryCode: string;
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
    mobileCountryCode: DEFAULT_COUNTRY,
    username: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  // Populate form when entering edit mode
  useEffect(() => {
    if (isEditing && profile) {
      const parsed = parseMobileNumber(profile.mobile_number);
      setFormData({
        fullName: profile.full_name || '',
        employeeId: profile.employee_id || '',
        mobileNumber: parsed.number,
        mobileCountryCode: parsed.countryCode,
        username: profileId?.replace(/^@/, '') || '',
      });
      setErrors({});
      setUsernameAvailable(null);
    }
  }, [isEditing, profile, profileId]);

  // Validate individual field
  const validateField = useCallback((field: keyof ProfileFormData, value: string, countryCode?: string): string | undefined => {
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
        return validateMobileForCountry(countryCode || formData.mobileCountryCode, trimmed);
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
  }, [formData.mobileCountryCode]);

  const handleFieldChange = (field: keyof ProfileFormData, value: string) => {
    let cleanValue = value;
    if (field === 'username') {
      cleanValue = value.replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
    }
    if (field === 'mobileNumber') {
      const country = getCountryByCode(formData.mobileCountryCode);
      const maxLen = country?.maxLength || 15;
      cleanValue = value.replace(/\D/g, '').slice(0, maxLen);
    }

    setFormData(prev => ({ ...prev, [field]: cleanValue }));
    const error = validateField(field, cleanValue);
    setErrors(prev => ({ ...prev, [field]: error }));

    if (field === 'username') {
      setUsernameAvailable(null);
    }
  };

  const handleCountryCodeChange = (code: string) => {
    setFormData(prev => ({ ...prev, mobileCountryCode: code }));
    // Re-validate mobile number with new country
    if (formData.mobileNumber) {
      const error = validateMobileForCountry(code, formData.mobileNumber);
      setErrors(prev => ({ ...prev, mobileNumber: error }));
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
      mobileNumber: validateField('mobileNumber', formData.mobileNumber, formData.mobileCountryCode),
      username: validateField('username', formData.username),
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some(Boolean);
  };

  const handleSave = async () => {
    if (!validateAll() || !user) return;

    const usernameChanged = formData.username && profileId !== `@${formData.username}`;
    if (usernameChanged && usernameAvailable === false) {
      setErrors(prev => ({ ...prev, username: 'Username already exists' }));
      return;
    }

    setIsSaving(true);
    try {
      const mobileForStorage = formatMobileForStorage(formData.mobileCountryCode, formData.mobileNumber);

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName.trim(),
          employee_id: formData.employeeId.trim(),
          mobile_number: mobileForStorage,
        })
        .eq('user_id', user.id);

      if (error) throw error;

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
    setFormData({ fullName: '', employeeId: '', mobileNumber: '', mobileCountryCode: DEFAULT_COUNTRY, username: '' });
    setErrors({});
    setUsernameAvailable(null);
  };

  const hasUsername = !!profileId;

  /** Format stored mobile for display (e.g. "+91 9876543210") or show N/A */
  const displayMobile = () => {
    if (!profile?.mobile_number) return 'N/A';
    return profile.mobile_number;
  };

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

                {/* Mobile Number with Country Code */}
                <div className="space-y-2">
                  <Label htmlFor="edit-mobile">Mobile Number</Label>
                  <div className="flex gap-2">
                    <CountryCodeSelect
                      value={formData.mobileCountryCode}
                      onChange={handleCountryCodeChange}
                    />
                    <Input
                      id="edit-mobile"
                      placeholder="Enter mobile number"
                      value={formData.mobileNumber}
                      onChange={e => handleFieldChange('mobileNumber', e.target.value)}
                      className={cn('flex-1', errors.mobileNumber && 'border-destructive')}
                      inputMode="numeric"
                    />
                  </div>
                  {errors.mobileNumber && <p className="text-xs text-destructive">{errors.mobileNumber}</p>}
                  {!errors.mobileNumber && formData.mobileNumber && (
                    <p className="text-xs text-muted-foreground">
                      {getCountryByCode(formData.mobileCountryCode)?.name} format: {getCountryByCode(formData.mobileCountryCode)?.example}
                    </p>
                  )}
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
                    <p className="text-sm font-medium">{profile?.full_name || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium">{profile?.email || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <IdCard className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Employee ID</p>
                    <p className="text-sm font-medium">{profile?.employee_id || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Mobile</p>
                    <p className="text-sm font-medium">{displayMobile()}</p>
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
