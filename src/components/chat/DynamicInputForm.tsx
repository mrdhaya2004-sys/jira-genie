import React, { useState } from 'react';
import { DynamicInput } from '@/types/ticket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Send } from 'lucide-react';

interface DynamicInputFormProps {
  inputs: DynamicInput[];
  onSubmit: (values: Record<string, string>) => void;
}

const DynamicInputForm: React.FC<DynamicInputFormProps> = ({ inputs, onSubmit }) => {
  const [values, setValues] = useState<Record<string, string>>({});

  const handleChange = (id: string, value: string) => {
    setValues(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  const allRequiredFilled = inputs
    .filter(input => input.required)
    .every(input => values[input.id]?.trim());

  return (
    <Card className="w-full max-w-lg mt-2 shadow-soft-lg border-border/50 animate-slide-in-up">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          📝 Additional Information Needed
        </CardTitle>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {inputs.map((input) => (
            <div key={input.id} className="space-y-2">
              <Label htmlFor={input.id} className="text-sm font-medium">
                {input.question}
                {input.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              
              {input.inputType === 'credentials' ? (
                <div className="space-y-2">
                  <Input
                    id={`${input.id}-username`}
                    placeholder="Username / Email"
                    value={values[`${input.id}_username`] || ''}
                    onChange={(e) => handleChange(`${input.id}_username`, e.target.value)}
                    className="text-sm"
                  />
                  <Input
                    id={`${input.id}-password`}
                    type="password"
                    placeholder="Password"
                    value={values[`${input.id}_password`] || ''}
                    onChange={(e) => handleChange(`${input.id}_password`, e.target.value)}
                    className="text-sm"
                  />
                </div>
              ) : (
                <Input
                  id={input.id}
                  placeholder={input.placeholder || 'Enter your answer...'}
                  value={values[input.id] || ''}
                  onChange={(e) => handleChange(input.id, e.target.value)}
                  className="text-sm"
                />
              )}
            </div>
          ))}
        </CardContent>
        
        <CardFooter className="pt-4 border-t border-border">
          <Button 
            type="submit" 
            className="w-full"
            disabled={!allRequiredFilled}
          >
            <Send className="h-4 w-4 mr-2" />
            Continue
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default DynamicInputForm;
