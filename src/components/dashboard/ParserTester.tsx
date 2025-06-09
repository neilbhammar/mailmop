'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
// Simple alert components
const Alert = ({ children, variant = 'default', ...props }: { children: React.ReactNode; variant?: 'default' | 'destructive'; className?: string }) => (
  <div 
    className={`relative w-full rounded-lg border p-4 ${variant === 'destructive' ? 'border-red-200 bg-red-50 text-red-800' : 'border-gray-200 bg-gray-50 text-gray-800'}`}
    {...props}
  >
    {children}
  </div>
);

const AlertDescription = ({ children, ...props }: { children: React.ReactNode; className?: string }) => (
  <div className="text-sm" {...props}>{children}</div>
);
import { Loader2, ExternalLink, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

import { fetchMessageContent, MessageContent } from '@/lib/gmail/fetchFullMessage';
import { parseUnsubscribeLinks, ParseResult, validateParseResult } from '@/lib/gmail/linkParser';
import { useGmailPermissions } from '@/context/GmailPermissionsProvider';

interface TestResult {
  messageId: string;
  messageContent?: MessageContent;
  parseResult?: ParseResult;
  validation?: ReturnType<typeof validateParseResult>;
  error?: string;
  timestamp: number;
}

export function ParserTester() {
  const { getAccessToken, hasRefreshToken } = useGmailPermissions();
  const [messageId, setMessageId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentTest, setCurrentTest] = useState<TestResult | null>(null);
  const [testHistory, setTestHistory] = useState<TestResult[]>([]);

  const handleTest = async () => {
    if (!messageId.trim()) {
      alert('Please enter a message ID');
      return;
    }

    if (!hasRefreshToken) {
      alert('Please connect Gmail to test parser');
      return;
    }

    setIsLoading(true);
    const testResult: TestResult = {
      messageId: messageId.trim(),
      timestamp: Date.now(),
    };

    try {
      // Step 1: Get access token and fetch the complete message
      const accessToken = await getAccessToken();
      const messageContent = await fetchMessageContent(accessToken, messageId);
      testResult.messageContent = messageContent;

      // Step 2: Parse unsubscribe links
      if (messageContent.htmlContent) {
        const parseResult = parseUnsubscribeLinks(messageContent.htmlContent, messageId);
        testResult.parseResult = parseResult;

        // Step 3: Validate the result
        const validation = validateParseResult(parseResult);
        testResult.validation = validation;
      } else {
        testResult.error = 'No HTML content found in message';
      }

    } catch (error) {
      testResult.error = error instanceof Error ? error.message : 'Unknown error occurred';
    }

    setCurrentTest(testResult);
    setTestHistory(prev => [testResult, ...prev.slice(0, 9)]); // Keep last 10 tests
    setIsLoading(false);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getValidationIcon = (isValid: boolean) => {
    return isValid ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Unsubscribe Link Parser Tester</h2>
        <p className="text-gray-600 mt-2">
          Test the link parser with real Gmail message IDs to validate accuracy and tune patterns.
        </p>
      </div>

      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle>Test Parser</CardTitle>
          <CardDescription>
            Enter a Gmail message ID to fetch the email content and test link parsing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter Gmail message ID (e.g., 18c2ba8a1b234567)"
              value={messageId}
              onChange={(e) => setMessageId(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleTest()}
              disabled={isLoading}
            />
            <Button
              onClick={handleTest}
              disabled={isLoading || !messageId.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Parser'
              )}
            </Button>
          </div>
          
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>How to find message IDs:</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Open Gmail in your browser</li>
                <li>Open any email with unsubscribe links</li>
                <li>Look at the URL - the message ID is after "/messages/"</li>
                <li>Example: gmail.com/mail/u/0/#inbox/<strong>18c2ba8a1b234567</strong></li>
              </ol>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Current Test Results */}
      {currentTest && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Test Results for {currentTest.messageId}
              {currentTest.validation && getValidationIcon(currentTest.validation.isValid)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Error Display */}
            {currentTest.error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Error:</strong> {currentTest.error}
                </AlertDescription>
              </Alert>
            )}

            {/* Message Info */}
            {currentTest.messageContent && (
              <div>
                <h4 className="font-semibold mb-2">Message Information</h4>
                <div className="bg-gray-50 p-3 rounded space-y-2 text-sm">
                  <div><strong>From:</strong> {currentTest.messageContent.headers.from || 'Unknown'}</div>
                  <div><strong>Subject:</strong> {currentTest.messageContent.headers.subject || 'No subject'}</div>
                  <div><strong>Has HTML:</strong> {currentTest.messageContent.hasHtml ? 'Yes' : 'No'}</div>
                  <div><strong>Has Text:</strong> {currentTest.messageContent.hasText ? 'Yes' : 'No'}</div>
                  {currentTest.messageContent.listUnsubscribeHeader && (
                    <div><strong>List-Unsubscribe Header:</strong> 
                      <div className="bg-white p-2 mt-1 rounded border text-xs font-mono break-all">
                        {currentTest.messageContent.listUnsubscribeHeader}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Parse Results */}
            {currentTest.parseResult && (
              <div>
                <h4 className="font-semibold mb-2">Parse Results</h4>
                
                {currentTest.parseResult.success ? (
                  <div className="space-y-4">
                    {/* Best Link */}
                    {currentTest.parseResult.bestLink && (
                      <div>
                        <h5 className="font-medium text-green-700 mb-2">🏆 Best Link Found</h5>
                        <div className="bg-green-50 p-3 rounded border border-green-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getConfidenceColor(currentTest.parseResult.bestLink.confidence)}>
                              {(currentTest.parseResult.bestLink.confidence * 100).toFixed(0)}% confidence
                            </Badge>
                            <Badge variant="outline">{currentTest.parseResult.bestLink.source}</Badge>
                            {currentTest.parseResult.bestLink.isHttps && (
                              <Badge variant="outline" className="bg-green-100 text-green-800">HTTPS</Badge>
                            )}
                          </div>
                          <div className="space-y-2 text-sm">
                            <div>
                              <strong>URL:</strong> 
                              <div className="bg-white p-2 mt-1 rounded border text-xs font-mono break-all">
                                <a 
                                  href={currentTest.parseResult.bestLink.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                >
                                  {currentTest.parseResult.bestLink.url}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            </div>
                            {currentTest.parseResult.bestLink.linkText && (
                              <div><strong>Link Text:</strong> "{currentTest.parseResult.bestLink.linkText}"</div>
                            )}
                            <div><strong>Valid Domain:</strong> {currentTest.parseResult.bestLink.isValidDomain ? 'Yes' : 'No'}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* All Links */}
                    {currentTest.parseResult.allLinks.length > 1 && (
                      <div>
                        <h5 className="font-medium mb-2">All Links Found ({currentTest.parseResult.allLinks.length})</h5>
                        <div className="space-y-2">
                          {currentTest.parseResult.allLinks.map((link, index) => (
                            <div key={index} className="bg-gray-50 p-3 rounded border text-sm">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={getConfidenceColor(link.confidence)}>
                                  {(link.confidence * 100).toFixed(0)}%
                                </Badge>
                                <Badge variant="outline">{link.source}</Badge>
                                {index === 0 && <Badge className="bg-yellow-100 text-yellow-800">Selected</Badge>}
                              </div>
                              <div className="font-mono text-xs break-all text-blue-600">
                                {link.url}
                              </div>
                              {link.linkText && (
                                <div className="text-gray-600 mt-1">Text: "{link.linkText}"</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Parse Failed:</strong> {currentTest.parseResult.error || 'Unknown error'}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Validation Results */}
            {currentTest.validation && (
              <div>
                <h4 className="font-semibold mb-2">Validation Results</h4>
                <div className={`p-3 rounded border ${
                  currentTest.validation.isValid 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {getValidationIcon(currentTest.validation.isValid)}
                    <span className="font-medium">
                      {currentTest.validation.isValid ? 'Validation Passed' : 'Validation Issues'}
                    </span>
                  </div>
                  
                  {currentTest.validation.issues.length > 0 && (
                    <div className="mt-2">
                      <strong>Issues:</strong>
                      <ul className="list-disc list-inside mt-1 text-sm space-y-1">
                        {currentTest.validation.issues.map((issue, index) => (
                          <li key={index}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {currentTest.validation.recommendations.length > 0 && (
                    <div className="mt-2">
                      <strong>Recommendations:</strong>
                      <ul className="list-disc list-inside mt-1 text-sm space-y-1">
                        {currentTest.validation.recommendations.map((rec, index) => (
                          <li key={index}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* HTML Content Preview */}
            {currentTest.messageContent?.htmlContent && (
              <div>
                <h4 className="font-semibold mb-2">HTML Content Preview (First 1000 chars)</h4>
                <div className="bg-gray-50 p-3 rounded border text-xs font-mono overflow-auto max-h-40">
                  {currentTest.messageContent.htmlContent.substring(0, 1000)}
                  {currentTest.messageContent.htmlContent.length > 1000 && '...'}
                </div>
              </div>
            )}

          </CardContent>
        </Card>
      )}

      {/* Test History */}
      {testHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Tests</CardTitle>
            <CardDescription>History of recent parser tests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {testHistory.map((test, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-3 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
                  onClick={() => setCurrentTest(test)}
                >
                  <div className="flex items-center gap-3">
                    <code className="text-sm">{test.messageId}</code>
                    {test.validation && getValidationIcon(test.validation.isValid)}
                    {test.parseResult?.bestLink && (
                      <Badge className={getConfidenceColor(test.parseResult.bestLink.confidence)}>
                        {(test.parseResult.bestLink.confidence * 100).toFixed(0)}%
                      </Badge>
                    )}
                    {test.error && (
                      <Badge variant="destructive">Error</Badge>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(test.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 