import React, { useState, useEffect } from 'react';
import aiConfigLogo from '@/assets/ai-config-logo.png';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import HiveAIDisableDialog from '@/components/hiveai/HiveAIDisableDialog';
import { useAIConfig } from '@/hooks/useAIConfig';
import { useHiveAISettings } from '@/hooks/useHiveAISettings';
import { AI_PROVIDERS, type AIProvider } from '@/types/aiConfig';
import AIStatusCard from '@/components/ai/AIStatusCard';
import {
  Brain,
  Key,
  Plug,
  Shield,
  Loader2,
  CheckCircle2,
  XCircle,
  Trash2,
  Zap,
  Network } from
'lucide-react';

const AIConfigurationModule: React.FC = () => {
  const { config, isLoading, isTesting, isDetecting, saveConfig, testConnection, detectModels, removeConfig } = useAIConfig();
  const { hiveEnabled, setHiveEnabled } = useHiveAISettings();
  const [showDisableDialog, setShowDisableDialog] = useState(false);

  const [provider, setProvider] = useState<AIProvider>('openai');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [endpointUrl, setEndpointUrl] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [detectedModels, setDetectedModels] = useState<string[] | null>(null);

  const selectedProvider = AI_PROVIDERS.find((p) => p.value === provider);
  const availableModels = detectedModels ?? selectedProvider?.defaultModels ?? [];
  const isModelInvalid =
    !!model && availableModels.length > 0 && !availableModels.includes(model);
  const modelErrorMessage = isModelInvalid
    ? detectedModels
      ? `"${model}" is not available for this API key. Pick one of the detected models or re-run auto-detect.`
      : `"${model}" is not a supported model for ${selectedProvider?.label ?? 'this provider'}. Choose one from the list.`
    : null;

  useEffect(() => {
    if (config) {
      setProvider(config.provider as AIProvider);
      setModel(config.model_name);
      setEndpointUrl(config.endpoint_url || '');
      setDisplayName(config.display_name || '');
    }
  }, [config]);

  const handleSave = async () => {
    if (!apiKey && !config) return;
    if (isModelInvalid) {
      toast.error('Invalid model selected', { description: modelErrorMessage ?? undefined });
      return;
    }
    setIsSaving(true);
    await saveConfig({
      provider,
      apiKey: apiKey || config?.api_key_encrypted || '',
      model,
      endpointUrl: endpointUrl || undefined,
      displayName: displayName || undefined
    });
    setIsSaving(false);
    setApiKey('');
  };

  const handleTest = async () => {
    if (!apiKey && !config) return;
    if (isModelInvalid) {
      toast.error('Invalid model selected', { description: modelErrorMessage ?? undefined });
      return;
    }
    await testConnection({
      provider,
      apiKey: apiKey || config?.api_key_encrypted || '',
      model,
      endpointUrl: endpointUrl || undefined
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>);

  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="glass-shine flex items-center gap-3 p-4 rounded-xl">
        <div className="glass-shine flex items-center justify-center h-12 w-12 rounded-xl">
          <img src={aiConfigLogo} alt="AI Configuration" className="h-8 w-8 object-contain" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">AI Configuration</h2>
          <p className="text-sm text-muted-foreground">
            Connect your own AI models through the Hive Mind orchestrator
          </p>
        </div>
      </div>
      {/* Live per-user AI status */}
      <AIStatusCard onRetry={handleTest} />


      {/* Hive Mind Architecture Info */}
      <Card className="glass-shine border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="glass-shine flex items-center justify-center h-9 w-9 rounded-lg shrink-0">
              <Network className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-foreground">Hive Mind Architecture</h3>
              <p className="text-sm text-muted-foreground">
                All AI requests are orchestrated through the Hive Mind controller. Custom AI providers are routed through specialized agents your API keys never bypass the Hive Mind layer.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {['Test Case Agent', 'Scenario Agent', 'Automation Agent', 'DOM Agent', 'Ticket Agent'].map((agent) =>
                <Badge key={agent} variant="secondary" className="menu-item-shine text-xs cursor-default">
                    <Zap className="h-3 w-3 mr-1" />
                    {agent}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hive AI Toggle */}
      <Card className="glass-shine">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="glass-shine flex items-center justify-center h-10 w-10 rounded-lg text-lg">
                🐝
              </div>
              <div>
                <h3 className="font-medium text-foreground">Hive AI Chat</h3>
                <p className="text-sm text-muted-foreground">
                  {hiveEnabled ? 'Floating assistant is visible on all pages' : 'Floating assistant is hidden'}
                </p>
              </div>
            </div>
            <Switch
              checked={hiveEnabled}
              onCheckedChange={(checked) => {
                if (!checked) setShowDisableDialog(true);
                else { setHiveEnabled(true); toast("🐝 Hive AI Chat is back!", { description: "The floating assistant is now visible on all pages." }); }
              }}
            />
          </div>
        </CardContent>
      </Card>

      <HiveAIDisableDialog
        open={showDisableDialog}
        onConfirm={() => { setShowDisableDialog(false); setHiveEnabled(false); }}
        onCancel={() => setShowDisableDialog(false)}
      />

      {/* Current Status */}
      {config &&
      <Card className="glass-shine">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="glass-shine flex items-center justify-center h-8 w-8 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                </div>
                Active Configuration
              </CardTitle>
              <Button variant="ghost" size="sm" className="menu-item-shine text-destructive hover:text-destructive" onClick={removeConfig}>
                <Trash2 className="h-4 w-4 mr-1" />
                Remove
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Provider:</span>
                <span className="ml-2 font-medium">{AI_PROVIDERS.find((p) => p.value === config.provider)?.label}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Model:</span>
                <span className="ml-2 font-medium">{config.model_name}</span>
              </div>
              {config.display_name &&
            <div>
                  <span className="text-muted-foreground">Name:</span>
                  <span className="ml-2 font-medium">{config.display_name}</span>
                </div>
            }
              <div>
                <span className="text-muted-foreground">API Key:</span>
                <span className="ml-2 font-medium">••••••••</span>
              </div>
            </div>
          </CardContent>
        </Card>
      }

      <Separator />

      {/* Configuration Form */}
      <Card className="glass-shine">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <div className="glass-shine flex items-center justify-center h-8 w-8 rounded-lg">
              <Plug className="h-4 w-4 text-primary" />
            </div>
            {config ? 'Update Configuration' : 'Connect AI Provider'}
          </CardTitle>
          <CardDescription>
            Configure your enterprise AI model to use with Test Zone
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Provider */}
          <div className="space-y-2">
            <Label htmlFor="provider">AI Provider</Label>
            <Select value={provider} onValueChange={(val) => {
              setProvider(val as AIProvider);
              setModel('');
              setDetectedModels(null);
            }}>
              <SelectTrigger className="menu-item-shine">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {AI_PROVIDERS.map((p) =>
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="apiKey" className="flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5" />
              API Key
            </Label>
            <Input
              id="apiKey"
              type="password"
              className="menu-item-shine"
              placeholder={config ? '••••••••  (leave empty to keep current)' : 'Enter your API key'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onBlur={async () => {
                if (apiKey.length < 8) return;
                if (provider === 'azure_openai') return;
                if ((provider === 'custom' || provider === 'local_llm') && !endpointUrl) return;
                const list = await detectModels({ provider, apiKey, endpointUrl: endpointUrl || undefined });
                if (list && list.length) {
                  setDetectedModels(list);
                  if (!list.includes(model)) setModel(list[0]);
                }
              }} />

            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Keys are stored securely and never exposed to the frontend
            </p>
          </div>

          {/* Model */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="model">
                Model Name
                {detectedModels && (
                  <span className="ml-2 text-xs text-muted-foreground font-normal">
                    ({detectedModels.length} auto-detected)
                  </span>
                )}
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="menu-item-shine h-7 text-xs"
                disabled={isDetecting || (!apiKey && !config) || (selectedProvider?.requiresEndpoint && !endpointUrl) || provider === 'azure_openai'}
                onClick={async () => {
                  const key = apiKey || config?.api_key_encrypted || '';
                  if (!key) return;
                  const list = await detectModels({ provider, apiKey: key, endpointUrl: endpointUrl || undefined });
                  if (list && list.length) {
                    setDetectedModels(list);
                    if (!list.includes(model)) setModel(list[0]);
                  }
                }}>
                {isDetecting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Zap className="h-3 w-3 mr-1" />}
                Auto-detect
              </Button>
            </div>
            {availableModels.length > 0 ?
            <Select value={model} onValueChange={setModel}>
                <SelectTrigger
                  className={`menu-item-shine ${isModelInvalid ? 'border-destructive focus:ring-destructive' : ''}`}
                  aria-invalid={isModelInvalid}
                >
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto [&_[data-radix-select-viewport]]:max-h-[280px] [&_[data-radix-select-viewport]]:overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full [&_[data-radix-select-viewport]::-webkit-scrollbar]:w-2 [&_[data-radix-select-viewport]::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&_[data-radix-select-viewport]::-webkit-scrollbar-thumb]:rounded-full">
                  {availableModels.map((m) =>
                <SelectItem key={m} value={m}>{m}</SelectItem>
                )}
                </SelectContent>
              </Select> :

            <Input
              id="model"
              className="menu-item-shine"
              placeholder="e.g., llama-3.1-70b"
              value={model}
              onChange={(e) => setModel(e.target.value)} />

            }
            {modelErrorMessage && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                {modelErrorMessage}
              </p>
            )}
          </div>

          {/* Endpoint URL */}
          {selectedProvider?.requiresEndpoint &&
          <div className="space-y-2">
              <Label htmlFor="endpointUrl">Endpoint URL</Label>
              <Input
              id="endpointUrl"
              className="menu-item-shine"
              placeholder="https://your-endpoint.com/v1/chat/completions"
              value={endpointUrl}
              onChange={(e) => setEndpointUrl(e.target.value)} />

            </div>
          }

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name (optional)</Label>
            <Input
              id="displayName"
              className="menu-item-shine"
              placeholder="e.g., Production GPT-4"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)} />

          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="menu-item-shine"
              onClick={handleTest}
              disabled={isTesting || !apiKey && !config || isModelInvalid}>

              {isTesting ?
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> :

              <Plug className="h-4 w-4 mr-2" />
              }
              Test Connection
            </Button>
            <Button
              className="menu-item-shine"
              onClick={handleSave}
              disabled={isSaving || !apiKey && !config || !model || isModelInvalid}>

              {isSaving ?
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> :

              <CheckCircle2 className="h-4 w-4 mr-2" />
              }
              Save Configuration
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>);

};

export default AIConfigurationModule;
