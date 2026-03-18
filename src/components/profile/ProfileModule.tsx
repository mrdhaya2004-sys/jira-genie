import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileId } from '@/hooks/useProfileId';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

const RESERVED_USERNAMES = [
  'admin', 'administrator', 'root', 'system', 'support', 'help',
  'moderator', 'mod', 'staff', 'official', 'testzone', 'hivemind',
  'bot', 'api', 'null', 'undefined', 'test', 'dev',
];

const ProfileModule: React.FC = () => {
  const { profile, refreshProfile } = useAuth();
  const { profileId, checkAvailability, saveProfileId, isChecking, isSaving } = useProfileId();

  const [isEditing, setIsEditing] = useState(false);
  const [input, setInput] = useState('');
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const hasUsername = !!profileId;

  // Reset input when entering edit mode
  useEffect(() => {
    if (isEditing && profileId) {
      setInput(profileId.replace(/^@/, ''));
    }
  }, [isEditing, profileId]);

  const formatInput = (value: string): string => {
    let clean = value.replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (clean.length > 20) clean = clean.slice(0, 20);
    return clean;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = formatInput(e.target.value);
    setInput(cleaned);
    setIsAvailable(null);
    setValidationError(null);
  };

  useEffect(() => {
    if (!input || input.length < 3) {
      setIsAvailable(null);
      if (input.length > 0 && input.length < 3) {
        setValidationError('Must be at least 3 characters');
      } else {
        setValidationError(null);
      }
      return;
    }

    // Check reserved
    if (RESERVED_USERNAMES.includes(input)) {
      setIsAvailable(false);
      setValidationError('This username is reserved. Please choose another.');
      return;
    }

    // If editing and same as current, skip check
    if (isEditing && profileId === `@${input}`) {
      setIsAvailable(null);
      setValidationError(null);
      return;
    }

    setValidationError(null);
    const timer = setTimeout(async () => {
      const available = await checkAvailability(`@${input}`);
      setIsAvailable(available);
    }, 500);

    return () => clearTimeout(timer);
  }, [input, checkAvailability, isEditing, profileId]);

  const handleSubmit = async () => {
    if (input.length < 3 || (isAvailable !== true && !(isEditing && profileId === `@${input}`))) return;

    const success = await saveProfileId(`@${input}`);
    if (success) {
      setIsEditing(false);
      setInput('');
      setIsAvailable(null);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setInput('');
    setIsAvailable(null);
    setValidationError(null);
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const showUsernameForm = !hasUsername || isEditing;

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Profile Header Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-5">
              <Avatar className="h-20 w-20 border-2 border-primary/20">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
                  {profile?.full_name ? getInitials(profile.full_name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-foreground">{profile?.full_name}</h2>
                {hasUsername && !isEditing && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-sm font-medium gap-1">
                      <AtSign className="h-3.5 w-3.5" />
                      {profileId?.replace('@', '')}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setIsEditing(true)}
                      className="h-7 w-7"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Username Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AtSign className="h-5 w-5 text-primary" />
              {hasUsername && !isEditing ? 'Your Username' : 'Create Your Username'}
            </CardTitle>
            <CardDescription>
              {hasUsername && !isEditing
                ? 'Your unique username for chat search and mentions.'
                : 'Choose a unique username so team members can find and mention you.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {showUsernameForm ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">@</span>
                    <Input
                      id="username"
                      placeholder="your_username"
                      value={input}
                      onChange={handleInputChange}
                      className="pl-8 pr-10"
                      maxLength={20}
                      autoFocus
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {isChecking && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                      {!isChecking && isAvailable === true && (
                        <CheckCircle className="h-4 w-4 text-success" />
                      )}
                      {!isChecking && isAvailable === false && (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                  </div>

                  {validationError && (
                    <p className="text-xs text-destructive">{validationError}</p>
                  )}
                  {isAvailable === false && !isChecking && !validationError && (
                    <p className="text-xs text-destructive">This username is already taken. Please choose another.</p>
                  )}
                  {isAvailable === true && !isChecking && (
                    <p className="text-xs text-success">Username is available!</p>
                  )}
                </div>

                {/* Rules */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Rules:</p>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary" className="text-xs">Starts with @</Badge>
                    <Badge variant="secondary" className="text-xs">Lowercase only</Badge>
                    <Badge variant="secondary" className="text-xs">3–20 characters</Badge>
                    <Badge variant="secondary" className="text-xs">Letters, numbers, underscores</Badge>
                    <Badge variant="secondary" className="text-xs">No spaces</Badge>
                  </div>
                </div>

                {/* Preview */}
                {input && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm text-muted-foreground">Your username will be:</p>
                    <p className={cn(
                      'text-lg font-semibold',
                      isAvailable ? 'text-primary' : 'text-foreground'
                    )}>
                      @{input}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {isEditing && (
                    <Button variant="outline" onClick={handleCancel}>
                      Cancel
                    </Button>
                  )}
                  <Button
                    onClick={handleSubmit}
                    disabled={!isAvailable || isSaving || input.length < 3}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : isEditing ? (
                      'Update Username'
                    ) : (
                      'Create Username'
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-4">
                <BadgeCheck className="h-5 w-5 text-success flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Username: {profileId}</p>
                  <p className="text-xs text-muted-foreground">Used for chat search and @mentions</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Profile Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-primary" />
              Profile Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfileModule;
