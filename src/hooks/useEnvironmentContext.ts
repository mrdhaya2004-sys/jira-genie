import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Environment, BuildPlatform } from '@/types/environment';
import type { WorkspaceFile } from '@/types/workspace';

export interface EnvContextResult {
  hasBuild: boolean;
  build?: WorkspaceFile;
  domContent?: string;
  domUpdatedAt?: string;
  source: 'workspace';
}

/**
 * Loads environment-scoped build + DOM data for a workspace.
 * Modules use this before sending AI requests to ensure the AI has the
 * actual UI/DOM data for the selected environment.
 */
export const useEnvironmentContext = () => {
  const loadContext = useCallback(async (
    workspaceId: string,
    env: Environment,
    platform?: BuildPlatform | null,
  ): Promise<EnvContextResult> => {
    // Fetch builds for this env (and platform if provided)
    let buildQuery = supabase
      .from('workspace_files')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('environment', env)
      .in('file_type', ['apk', 'ipa']);
    if (platform) buildQuery = buildQuery.eq('platform', platform);
    const { data: builds } = await buildQuery.order('created_at', { ascending: false }).limit(1);
    const build = builds?.[0] as WorkspaceFile | undefined;

    // Fetch DOM snapshot
    let domQuery = supabase
      .from('dom_snapshots')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('environment', env);
    if (platform) domQuery = domQuery.eq('platform', platform);
    const { data: doms } = await domQuery.order('updated_at', { ascending: false }).limit(1);
    const dom = doms?.[0];

    return {
      hasBuild: !!build,
      build,
      domContent: dom?.dom_content,
      domUpdatedAt: dom?.updated_at,
      source: 'workspace',
    };
  }, []);

  return { loadContext };
};
