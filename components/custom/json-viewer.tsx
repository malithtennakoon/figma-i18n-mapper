'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Edit, Eye, AlertCircle } from 'lucide-react';

interface JsonViewerProps {
  json: object;
  title?: string;
  description?: string;
}

export function JsonViewer({ json, title = 'Generated Keys', description }: JsonViewerProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedJson, setEditedJson] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [currentJson, setCurrentJson] = useState(json);

  // Initialize edited JSON when component mounts or json prop changes
  useEffect(() => {
    setCurrentJson(json);
    setEditedJson(JSON.stringify(json, null, 2));
  }, [json]);

  const handleCopy = async () => {
    try {
      const textToCopy = isEditing ? editedJson : JSON.stringify(currentJson, null, 2);
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = () => {
    const textToDownload = isEditing ? editedJson : JSON.stringify(currentJson, null, 2);
    const blob = new Blob([textToDownload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'generated-keys.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleJsonChange = (value: string) => {
    setEditedJson(value);

    // Validate JSON
    try {
      const parsed = JSON.parse(value);
      setJsonError('');
      setCurrentJson(parsed);
    } catch (err) {
      setJsonError('Invalid JSON format');
    }
  };

  const toggleEditMode = () => {
    if (isEditing && !jsonError) {
      // Switching from edit to view - update current JSON
      try {
        const parsed = JSON.parse(editedJson);
        setCurrentJson(parsed);
      } catch (err) {
        // Should not happen as we validate on change
      }
    }
    setIsEditing(!isEditing);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <div className="flex gap-2">
            <Button onClick={toggleEditMode} variant="outline" size="sm">
              {isEditing ? (
                <>
                  <Eye className="h-4 w-4 mr-1" />
                  Preview
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </>
              )}
            </Button>
            <Button onClick={handleCopy} variant="outline" size="sm">
              {copied ? 'Copied!' : 'Copy JSON'}
            </Button>
            <Button onClick={handleDownload} variant="outline" size="sm">
              Download JSON
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You can edit the JSON below. Remove unwanted keys or modify values as needed.
            </AlertDescription>
          </Alert>
        )}

        {jsonError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{jsonError}</AlertDescription>
          </Alert>
        )}

        {isEditing ? (
          <Textarea
            value={editedJson}
            onChange={(e) => handleJsonChange(e.target.value)}
            className={`font-mono text-sm min-h-[500px] ${
              jsonError ? 'border-red-500' : ''
            }`}
            placeholder="Edit your JSON here..."
          />
        ) : (
          <div className="rounded-md overflow-hidden border bg-slate-950 dark:bg-slate-950">
            <pre className="p-4 overflow-auto max-h-[500px] text-sm">
              <code className="text-slate-50 dark:text-slate-50">
                {JSON.stringify(currentJson, null, 2)}
              </code>
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
