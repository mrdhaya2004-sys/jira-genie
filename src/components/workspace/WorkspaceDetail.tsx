import React, { useState, useEffect } from 'react';
import { ArrowLeft, Upload, FileText, Smartphone, Bot, Trash2, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useWorkspaceFiles } from '@/hooks/useWorkspaces';
import { useWorkspaceAI } from '@/hooks/useWorkspaceAI';
import type { Workspace, AICapability } from '@/types/workspace';
import { cn } from '@/lib/utils';

interface WorkspaceDetailProps {
  workspace: Workspace;
  onBack: () => void;
}

const AI_CAPABILITIES: { id: AICapability; label: string; icon: string; description: string }[] = [
  { id: 'test_cases', label: 'Generate Test Cases', icon: '📋', description: 'Create comprehensive test cases' },
  { id: 'code_generation', label: 'Generate Code', icon: '💻', description: 'Python, Java, Playwright' },
  { id: 'xpath_generation', label: 'Generate XPaths', icon: '🎯', description: 'Android & iOS locators' },
  { id: 'jira_ticket', label: 'Create Jira Ticket', icon: '🎫', description: 'Structured ticket creation' },
  { id: 'workflow_breakdown', label: 'Workflow Analysis', icon: '🔄', description: 'Break down app modules' },
  { id: 'explain_app', label: 'Explain App', icon: '📖', description: 'Simple app explanation' },
];

const WorkspaceDetail: React.FC<WorkspaceDetailProps> = ({ workspace, onBack }) => {
  const { files, isLoading: filesLoading, uploadFile, deleteFile } = useWorkspaceFiles(workspace.id);
  const { messages, isLoading: aiLoading, isStreaming, sendMessage, fetchChatHistory, clearHistory } = useWorkspaceAI({
    workspaceId: workspace.id,
    files,
  });
  
  const [activeTab, setActiveTab] = useState('files');
  const [chatInput, setChatInput] = useState('');
  const [selectedCapability, setSelectedCapability] = useState<AICapability | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChatHistory();
  }, [fetchChatHistory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fileType: 'user_story' | 'apk' | 'ipa') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file types
    if (fileType === 'apk' && !file.name.endsWith('.apk')) {
      alert('Please upload a valid APK file');
      return;
    }
    if (fileType === 'ipa' && !file.name.endsWith('.ipa')) {
      alert('Please upload a valid IPA file');
      return;
    }

    await uploadFile(file, fileType);
    e.target.value = '';
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || aiLoading) return;
    const message = chatInput;
    setChatInput('');
    await sendMessage(message, selectedCapability || 'qa_chat');
  };

  const userStories = files.filter(f => f.file_type === 'user_story');
  const appFiles = files.filter(f => f.file_type === 'apk' || f.file_type === 'ipa');

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b bg-background">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{workspace.name}</h1>
          {workspace.description && (
            <p className="text-sm text-muted-foreground">{workspace.description}</p>
          )}
        </div>
        <Badge variant="outline" className="gap-1">
          <FileText className="h-3 w-3" />
          {userStories.length} Stories
        </Badge>
        <Badge variant="outline" className="gap-1">
          <Smartphone className="h-3 w-3" />
          {appFiles.length} Apps
        </Badge>
      </div>

      {/* Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-4 h-12">
          <TabsTrigger value="files" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
            Files & Stories
          </TabsTrigger>
          <TabsTrigger value="ai" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
            AI Assistant
          </TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="flex-1 overflow-auto p-4 mt-0">
          <div className="grid gap-6 md:grid-cols-2">
            {/* User Stories */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  User Stories
                </CardTitle>
                <CardDescription>
                  Upload user stories to train the AI on your application requirements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    id="story-upload"
                    className="hidden"
                    accept=".txt,.doc,.docx,.pdf"
                    onChange={(e) => handleFileUpload(e, 'user_story')}
                  />
                  <Button asChild variant="outline" className="gap-2">
                    <label htmlFor="story-upload" className="cursor-pointer">
                      <Upload className="h-4 w-4" />
                      Upload Story
                    </label>
                  </Button>
                </div>
                <div className="space-y-2">
                  {userStories.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No user stories uploaded yet
                    </p>
                  ) : (
                    userStories.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm truncate">{file.file_name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={() => deleteFile(file.id, file.file_url)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Application Files */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Application Files
                </CardTitle>
                <CardDescription>
                  Upload APK or IPA files for AI to analyze the application structure
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="file"
                    id="apk-upload"
                    className="hidden"
                    accept=".apk"
                    onChange={(e) => handleFileUpload(e, 'apk')}
                  />
                  <Button asChild variant="outline" className="gap-2">
                    <label htmlFor="apk-upload" className="cursor-pointer">
                      <Upload className="h-4 w-4" />
                      Upload APK
                    </label>
                  </Button>
                  <input
                    type="file"
                    id="ipa-upload"
                    className="hidden"
                    accept=".ipa"
                    onChange={(e) => handleFileUpload(e, 'ipa')}
                  />
                  <Button asChild variant="outline" className="gap-2">
                    <label htmlFor="ipa-upload" className="cursor-pointer">
                      <Upload className="h-4 w-4" />
                      Upload IPA
                    </label>
                  </Button>
                </div>
                <div className="space-y-2">
                  {appFiles.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No application files uploaded yet
                    </p>
                  ) : (
                    appFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Smartphone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm truncate">{file.file_name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {file.file_type.toUpperCase()}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={() => deleteFile(file.id, file.file_url)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ai" className="flex-1 flex flex-col overflow-hidden p-0 mt-0">
          <div className="flex flex-1 overflow-hidden">
            {/* Capability Sidebar */}
            <div className="w-64 border-r bg-muted/30 p-4 hidden md:block">
              <h3 className="font-medium text-sm mb-3">AI Capabilities</h3>
              <div className="space-y-2">
                {AI_CAPABILITIES.map((cap) => (
                  <button
                    key={cap.id}
                    onClick={() => setSelectedCapability(cap.id)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg transition-colors",
                      selectedCapability === cap.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span>{cap.icon}</span>
                      <span className="text-sm font-medium">{cap.label}</span>
                    </div>
                    <p className={cn(
                      "text-xs mt-1",
                      selectedCapability === cap.id
                        ? "text-primary-foreground/80"
                        : "text-muted-foreground"
                    )}>
                      {cap.description}
                    </p>
                  </button>
                ))}
              </div>
              <Separator className="my-4" />
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={clearHistory}
              >
                Clear Chat History
              </Button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              <ScrollArea className="flex-1 p-4">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center max-w-md">
                      <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-medium mb-2">Start a conversation</h3>
                      <p className="text-sm text-muted-foreground">
                        Select a capability from the sidebar and ask questions about your application.
                        The AI will use your uploaded user stories and app files to provide context-aware responses.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "flex",
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[80%] rounded-lg px-4 py-2",
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          )}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        </div>
                      </div>
                    ))}
                    {isStreaming && messages[messages.length - 1]?.content === '' && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-lg px-4 py-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Input */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={
                      selectedCapability
                        ? `Ask about ${AI_CAPABILITIES.find(c => c.id === selectedCapability)?.label.toLowerCase()}...`
                        : 'Select a capability and ask a question...'
                    }
                    className="min-h-[60px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim() || aiLoading}
                    size="icon"
                    className="h-auto"
                  >
                    {aiLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {selectedCapability && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Mode: {AI_CAPABILITIES.find(c => c.id === selectedCapability)?.label}
                  </p>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WorkspaceDetail;
