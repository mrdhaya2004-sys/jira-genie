import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useAIConfig } from '@/hooks/useAIConfig';
import { useHiveAISettings } from '@/hooks/useHiveAISettings';
import { AI_PROVIDERS, type AIProvider } from '@/types/aiConfig';
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
  const { config, isLoading, isTesting, saveConfig, testConnection, removeConfig } = useAIConfig();
  const { hiveEnabled, toggleHive } = useHiveAISettings();

  const [provider, setProvider] = useState<AIProvider>('openai');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [endpointUrl, setEndpointUrl] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const selectedProvider = AI_PROVIDERS.find((p) => p.value === provider);

  useEffect(() => {
    if (config) {
      setProvider(config.provider as AIProvider);
      setModel(config.model_name);
      setEndpointUrl(config.endpoint_url || '');
      setDisplayName(config.display_name || '');
      // Don't populate API key for security
    }
  }, [config]);

  const handleSave = async () => {
    if (!apiKey && !config) return;
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
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Brain className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">AI Configuration</h2>
          <p className="text-sm text-muted-foreground">
            Connect your own AI models through the Hive Mind orchestrator
          </p>
        </div>
      </div>

      {/* Hive Mind Architecture Info */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Network className="h-5 w-5 text-primary mt-0.5" />
            <div className="space-y-2">
              <h3 className="font-medium text-foreground">Hive Mind Architecture</h3>
              <p className="text-sm text-muted-foreground">
                All AI requests are orchestrated through the Hive Mind controller. Custom AI providers are routed through specialized agents your API keys never bypass the Hive Mind layer.
              
              </p>
              <div className="flex-wrap gap-2 mt-3 border-0 items-start justify-start flex flex-row rounded-sm">
                {['Test Case Agent', 'Scenario Agent', 'Automation Agent', 'DOM Agent', 'Ticket Agent'].map((agent) =>
                <Badge key={agent} variant="secondary" className="text-xs">
                    <Zap className="h-3 w-3 mr-1" />
                    {agent}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Status */}
      {config &&
      <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                Active Configuration
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={removeConfig}>
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
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plug className="h-4 w-4" />
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
            }}>
              <SelectTrigger>
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
              placeholder={config ? '••••••••  (leave empty to keep current)' : 'Enter your API key'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)} />
            
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Keys are stored securely and never exposed to the frontend
            </p>
          </div>

          {/* Model */}
          <div className="space-y-2">
            <Label htmlFor="model">Model Name</Label>
            {selectedProvider && selectedProvider.defaultModels.length > 0 ?
            <Select value={model} onValueChange={setModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {selectedProvider.defaultModels.map((m) =>
                <SelectItem key={m} value={m}>{m}</SelectItem>
                )}
                </SelectContent>
              </Select> :

            <Input
              id="model"
              placeholder="e.g., llama-3.1-70b"
              value={model}
              onChange={(e) => setModel(e.target.value)} />

            }
          </div>

          {/* Endpoint URL */}
          {selectedProvider?.requiresEndpoint &&
          <div className="space-y-2">
              <Label htmlFor="endpointUrl">Endpoint URL</Label>
              <Input
              id="endpointUrl"
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
              placeholder="e.g., Production GPT-4"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)} />
            
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={isTesting || !apiKey && !config}>
              
              {isTesting ?
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> :

              <Plug className="h-4 w-4 mr-2" />
              }
              Test Connection
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !apiKey && !config || !model}>
              
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