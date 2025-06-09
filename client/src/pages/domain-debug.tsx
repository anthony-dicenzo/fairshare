import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function DomainDebugPage() {
  const [domainInfo, setDomainInfo] = useState<any>(null);
  const [testResult, setTestResult] = useState<string>('');

  const checkDomainInfo = () => {
    const info = {
      windowLocation: {
        href: window.location.href,
        origin: window.location.origin,
        hostname: window.location.hostname,
        host: window.location.host,
        protocol: window.location.protocol,
        port: window.location.port
      },
      userAgent: navigator.userAgent,
      referrer: document.referrer,
      baseURI: document.baseURI
    };
    
    setDomainInfo(info);
    console.log('Domain Info:', info);
  };

  const testFirebaseDirectly = async () => {
    setTestResult('Testing...');
    
    try {
      // Test Firebase Identity Toolkit directly from browser
      const API_KEY = import.meta.env.VITE_FIREBASE_API_KEY;
      
      const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: 'test@example.com',
          providerId: 'google.com',
          continueUri: window.location.origin + '/auth'
        })
      });
      
      console.log('Firebase API Response Status:', response.status);
      console.log('Firebase API Response Headers:', Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const data = await response.json();
        setTestResult(`✅ Firebase API accessible from browser. Auth URI: ${data.authUri?.substring(0, 50)}...`);
      } else {
        const errorText = await response.text();
        setTestResult(`❌ Firebase API error: ${response.status} - ${errorText.substring(0, 200)}`);
      }
    } catch (error: any) {
      setTestResult(`❌ Network error: ${error.message}`);
      console.error('Firebase API test error:', error);
    }
  };

  const testCORSHeaders = async () => {
    setTestResult('Testing CORS...');
    
    try {
      // Make a simple request to see what headers are sent
      const response = await fetch('https://httpbin.org/headers');
      const data = await response.json();
      
      console.log('Headers sent by browser:', data.headers);
      setTestResult(`Headers sent: Origin: ${data.headers.Origin || 'None'}, Referer: ${data.headers.Referer || 'None'}`);
    } catch (error: any) {
      setTestResult(`❌ CORS test error: ${error.message}`);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Domain & Firebase Debug</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Domain Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={checkDomainInfo}>Check Domain Info</Button>
          
          {domainInfo && (
            <div className="bg-gray-100 p-4 rounded text-sm">
              <pre>{JSON.stringify(domainInfo, null, 2)}</pre>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Firebase API Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={testFirebaseDirectly}>Test Firebase API</Button>
            <Button onClick={testCORSHeaders} variant="outline">Test Headers</Button>
          </div>
          
          {testResult && (
            <Alert>
              <AlertDescription>{testResult}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expected vs Actual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div><strong>Expected Origin:</strong> https://workspace.adicenzo1.repl.co</div>
            <div><strong>Actual Origin:</strong> {window.location.origin}</div>
            <div><strong>Match:</strong> {window.location.origin === 'https://workspace.adicenzo1.repl.co' ? '✅ Yes' : '❌ No'}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}