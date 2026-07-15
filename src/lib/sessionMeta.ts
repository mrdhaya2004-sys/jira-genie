// Lightweight session metadata helpers (device id, login timestamp, last-active,
// remember-me flag). All values are non-sensitive — real auth tokens are stored
// by the Supabase client itself.

const KEYS = {
  device: 'tz.device_id',
  loginAt: 'tz.login_at',
  lastActive: 'tz.last_active',
  remember: 'tz.remember_me',
  sessionOnly: 'tz.session_only', // sessionStorage marker
  logoutSignal: 'tz.logout_signal', // storage-event ping
} as const;

const uuid = () =>
  (crypto as any)?.randomUUID?.() ??
  Math.random().toString(36).slice(2) + Date.now().toString(36);

export const getDeviceId = (): string => {
  try {
    let id = localStorage.getItem(KEYS.device);
    if (!id) {
      id = uuid();
      localStorage.setItem(KEYS.device, id);
    }
    return id;
  } catch {
    return 'unknown-device';
  }
};

export const markLogin = (rememberMe: boolean) => {
  try {
    localStorage.setItem(KEYS.loginAt, String(Date.now()));
    localStorage.setItem(KEYS.lastActive, String(Date.now()));
    localStorage.setItem(KEYS.remember, rememberMe ? '1' : '0');
    if (rememberMe) {
      sessionStorage.removeItem(KEYS.sessionOnly);
    } else {
      sessionStorage.setItem(KEYS.sessionOnly, '1');
    }
  } catch {}
};

export const markActive = () => {
  try {
    localStorage.setItem(KEYS.lastActive, String(Date.now()));
  } catch {}
};

export const getLastActive = (): number => {
  try {
    return Number(localStorage.getItem(KEYS.lastActive)) || 0;
  } catch {
    return 0;
  }
};

export const getLoginAt = (): number => {
  try {
    return Number(localStorage.getItem(KEYS.loginAt)) || 0;
  } catch {
    return 0;
  }
};

export const isRememberMe = (): boolean => {
  try {
    return localStorage.getItem(KEYS.remember) !== '0';
  } catch {
    return true;
  }
};

/**
 * If the previous session was "session-only" (Remember Me off) and this is a
 * brand-new browser session (no sessionStorage marker), the user has closed
 * and reopened the browser — the session must not be restored.
 */
export const shouldPurgeSessionOnBoot = (): boolean => {
  try {
    const rememberFlag = localStorage.getItem(KEYS.remember);
    if (rememberFlag !== '0') return false;
    return !sessionStorage.getItem(KEYS.sessionOnly);
  } catch {
    return false;
  }
};

export const clearSessionMeta = () => {
  try {
    localStorage.removeItem(KEYS.loginAt);
    localStorage.removeItem(KEYS.lastActive);
    localStorage.removeItem(KEYS.remember);
    sessionStorage.removeItem(KEYS.sessionOnly);
  } catch {}
};

export const broadcastLogout = () => {
  try {
    localStorage.setItem(KEYS.logoutSignal, String(Date.now()));
    localStorage.removeItem(KEYS.logoutSignal);
  } catch {}
};

export const LOGOUT_STORAGE_KEY = KEYS.logoutSignal;
