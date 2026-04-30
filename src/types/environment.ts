export type Environment = 'dev' | 'uat' | 'beta' | 'prod';
export type BuildPlatform = 'android' | 'ios';

export interface EnvironmentMeta {
  value: Environment;
  label: string;
  shortLabel: string;
  description: string;
  badgeClass: string;
}

export const ENVIRONMENTS: EnvironmentMeta[] = [
  {
    value: 'dev',
    label: 'Developer Build',
    shortLabel: 'DEV',
    description: 'Internal developer testing builds',
    badgeClass: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  },
  {
    value: 'uat',
    label: 'UAT',
    shortLabel: 'UAT',
    description: 'User Acceptance Testing environment',
    badgeClass: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  },
  {
    value: 'beta',
    label: 'BETA',
    shortLabel: 'BETA',
    description: 'Beta release candidates',
    badgeClass: 'bg-purple-500/15 text-purple-600 border-purple-500/30',
  },
  {
    value: 'prod',
    label: 'Production',
    shortLabel: 'PROD',
    description: 'Live production builds',
    badgeClass: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  },
];

export const getEnvironmentMeta = (env: Environment | null | undefined): EnvironmentMeta | undefined =>
  env ? ENVIRONMENTS.find(e => e.value === env) : undefined;

export interface DomSnapshot {
  id: string;
  workspace_id: string;
  user_id: string;
  environment: Environment;
  platform: BuildPlatform;
  dom_content: string;
  source: 'manual' | 'auto';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const STORAGE_PREFIX = 'tz-last-env:';
export const getRememberedEnv = (workspaceId: string): Environment | null => {
  if (typeof window === 'undefined') return null;
  const v = localStorage.getItem(STORAGE_PREFIX + workspaceId);
  return v && ['dev', 'uat', 'beta', 'prod'].includes(v) ? (v as Environment) : null;
};
export const rememberEnv = (workspaceId: string, env: Environment) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_PREFIX + workspaceId, env);
};
