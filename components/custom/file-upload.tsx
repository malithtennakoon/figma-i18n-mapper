'use client';

import { ChangeEvent, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface FileUploadProps {
  id: string;
  label: string;
  description: string;
  onFileContent: (content: string, filename: string) => void;
  accept?: string;
}

export function FileUpload({
  id,
  label,
  description,
  onFileContent,
  accept = '.json',
}: FileUploadProps) {
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError('');

    if (!file) {
      setFileName('');
      return;
    }

    try {
      const content = await file.text();

      // Validate JSON
      JSON.parse(content);

      setFileName(file.name);
      onFileContent(content, file.name);
    } catch (err) {
      setError('Invalid JSON file');
      setFileName('');
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label htmlFor={id}>Select file</Label>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              id={id}
              type="file"
              accept={accept}
              onChange={handleFileChange}
              className="hidden"
            />
            <Button type="button" variant="outline" onClick={handleClick}>
              Choose File
            </Button>
            <span className="text-sm text-muted-foreground">
              {fileName || 'No file selected'}
            </span>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
