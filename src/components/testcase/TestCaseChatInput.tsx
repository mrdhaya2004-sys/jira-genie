import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Upload, FileSpreadsheet, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TestCaseChatInputProps {
  onSend: (message: string) => void;
  onExcelUpload: (file: File) => void;
  disabled?: boolean;
  placeholder?: string;
  showExcelUpload?: boolean;
}

const TestCaseChatInput: React.FC<TestCaseChatInputProps> = ({
  onSend,
  onExcelUpload,
  disabled = false,
  placeholder = "Type your test case request...",
  showExcelUpload = true,
}) => {
  const [input, setInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        '.xlsx',
        '.xls',
      ];
      const isValid = validTypes.some(type => 
        file.type === type || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
      );
      
      if (!isValid) {
        alert('Please upload a valid Excel file (.xlsx or .xls)');
        return;
      }
      
      setSelectedFile(file);
      onExcelUpload(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  return (
    <div className="border-t bg-card p-4">
      {/* Selected file indicator */}
      {selectedFile && (
        <div className="mb-2 flex items-center gap-2 p-2 bg-muted rounded-lg">
          <FileSpreadsheet className="h-4 w-4 text-green-600" />
          <span className="text-sm flex-1 truncate">{selectedFile.name}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={removeFile}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <form 
        onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
        className="flex items-end gap-2"
      >
        {/* Excel Upload Button */}
        {showExcelUpload && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="flex-shrink-0"
              title="Upload reference Excel file"
            >
              <Upload className="h-4 w-4" />
            </Button>
          </>
        )}

        {/* Text Input */}
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "min-h-[44px] max-h-[120px] resize-none",
            "flex-1"
          )}
          rows={1}
        />

        {/* Send Button */}
        <Button
          type="submit"
          size="icon"
          disabled={!input.trim() || disabled}
          className="flex-shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>

      <p className="text-xs text-muted-foreground mt-2">
        {showExcelUpload 
          ? "Upload an Excel file to define test case format, or just describe what you need."
          : "Press Enter to send, Shift+Enter for new line"
        }
      </p>
    </div>
  );
};

export default TestCaseChatInput;
