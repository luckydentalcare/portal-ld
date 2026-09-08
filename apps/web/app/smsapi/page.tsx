'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Terminal, 
  Key, 
  ShieldCheck, 
  Copy, 
  Check, 
  Code, 
  AlertCircle, 
  ArrowRight, 
  Zap, 
  CheckCircle2, 
  Globe, 
  Server,
  Lock,
  Layers,
  ArrowLeft
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';

type TabLanguage = 'curl' | 'js' | 'python' | 'php';

export default function SmsApiDocsPage() {
  const [activeTab, setActiveTab] = useState<TabLanguage>('curl');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopy = (text: string, sectionKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionKey);
    setTimeout(() => {
      setCopiedSection(null);
    }, 2000);
  };

  const curlSnippet = `curl -X POST "https://your-domain.com/message/api" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_SMS_KEY" \\
  -d '{
    "to": "01712345678",
    "message": "Hello from Luckydental! Your appointment is scheduled for tomorrow at 7:30 PM."
  }'`;

  const jsSnippet = `const response = await fetch('https://your-domain.com/message/api', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'YOUR_SMS_KEY' // Replace with your secure server-side API key
  },
  body: JSON.stringify({
    to: '01712345678',
    message: 'Hello from Luckydental! Your appointment is scheduled for tomorrow at 7:30 PM.'
  })
});

const data = await response.json();
console.log(data);
// Output: { success: true, status: 'accepted', message: 'SMS accepted for sending.' }`;

  const pythonSnippet = `import requests

url = "https://your-domain.com/message/api"
headers = {
    "Content-Type": "application/json",
    "x-api-key": "YOUR_SMS_KEY"
}
payload = {
    "to": "01712345678",
    "message": "Hello from Luckydental! Your appointment is scheduled for tomorrow at 7:30 PM."
}

response = requests.post(url, json=payload, headers=headers)
print(response.status_code, response.json())`;

  const phpSnippet = `<?php
$ch = curl_init("https://your-domain.com/message/api");

$payload = json_encode([
    "to" => "01712345678",
    "message" => "Hello from Luckydental! Your appointment is scheduled for tomorrow at 7:30 PM."
]);

curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        "Content-Type: application/json",
        "x-api-key: YOUR_SMS_KEY"
    ]
]);

$response = curl_exec($ch);
curl_close($ch);

echo $response;
?>`;

  return (
    <div className="min-h-screen bg-[#060606] text-gray-100 selection:bg-red-600/30 selection:text-white relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-gradient-radial from-red-900/15 via-red-950/5 to-transparent blur-3xl pointer-events-none" />

      {/* Top Navigation Bar */}
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-red-950 border border-red-500/30 flex items-center justify-center text-white shadow-glow-red-sm">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-white text-sm tracking-tight block">
                Luckydental Developer API
              </span>
              <span className="text-[10px] text-gray-400 font-mono">
                v1.0 • Public Gateway Reference
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-xs text-gray-300 hover:text-white gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" />
                Portal Login
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-10 relative z-10">
        {/* Hero Section */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/60 border border-red-700/40 text-red-400 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5 text-red-400" />
            RESTful External SMS API
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Luckydental SMS Integration Guide
          </h1>
          <p className="text-sm text-gray-400 max-w-3xl leading-relaxed">
            Integrate clinic SMS notifications, appointment alerts, and status dispatches from external web applications, bots, or third-party dental systems directly through our carrier-grade gateway endpoint.
          </p>
        </div>

        {/* Security Warning Notice */}
        <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-600/30 flex items-start gap-3.5 text-xs text-amber-200">
          <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-amber-300">Authentication & Security Policy</p>
            <p className="text-amber-200/80 leading-relaxed">
              Every request requires authentication via the <code className="px-1.5 py-0.5 rounded bg-black/50 border border-amber-500/20 font-mono text-amber-300">x-api-key</code> HTTP header. Never expose your secret API key inside browser JavaScript, client-side React code, or public repositories. Only make API calls from secure server-side environments. Obtain your active key from the authenticated admin SMS settings panel.
            </p>
          </div>
        </div>

        {/* Quick Reference Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassCard className="p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-wider">
              <Globe className="w-4 h-4" />
              Endpoints
            </div>
            <div className="space-y-1">
              <code className="text-xs font-mono text-white block bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/5">
                POST /message/api
              </code>
              <code className="text-xs font-mono text-gray-400 block bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/5">
                POST /api/message/send
              </code>
            </div>
            <p className="text-[11px] text-gray-500">Both endpoints are functionally identical and fully supported.</p>
          </GlassCard>

          <GlassCard className="p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-wider">
              <Key className="w-4 h-4" />
              Authentication
            </div>
            <code className="text-xs font-mono text-white block bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/5">
              x-api-key: YOUR_SMS_KEY
            </code>
            <p className="text-[11px] text-gray-500">Passed as an HTTP header on each POST request.</p>
          </GlassCard>

          <GlassCard className="p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-wider">
              <Lock className="w-4 h-4" />
              Rate Limits
            </div>
            <p className="text-xs font-bold text-white font-mono">
              60 requests / 15 minutes
            </p>
            <p className="text-[11px] text-gray-500">Enforced per IP & API key. Excess requests return HTTP 429.</p>
          </GlassCard>
        </div>

        {/* Interactive Code Samples */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Code className="w-4 h-4 text-red-500" />
              Request Code Examples
            </h2>

            <div className="flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/10 gap-1">
              {(['curl', 'js', 'python', 'php'] as TabLanguage[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                    activeTab === tab
                      ? 'bg-red-600 text-white shadow-glow-red-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tab === 'js' ? 'JavaScript' : tab.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="relative rounded-2xl border border-white/10 bg-black/80 backdrop-blur-xl overflow-hidden font-mono text-xs">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-white/[0.02]">
              <span className="text-[11px] text-gray-400">
                {activeTab === 'curl' && 'cURL (Bash / Terminal)'}
                {activeTab === 'js' && 'Node.js / Modern Fetch'}
                {activeTab === 'python' && 'Python 3 (requests)'}
                {activeTab === 'php' && 'PHP (cURL)'}
              </span>

              <button
                onClick={() => {
                  const text = activeTab === 'curl' 
                    ? curlSnippet 
                    : activeTab === 'js' 
                    ? jsSnippet 
                    : activeTab === 'python' 
                    ? pythonSnippet 
                    : phpSnippet;
                  handleCopy(text, 'code-sample');
                }}
                className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-white transition-colors"
              >
                {copiedSection === 'code-sample' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-4 overflow-x-auto text-gray-200 leading-relaxed">
              <code>
                {activeTab === 'curl' && curlSnippet}
                {activeTab === 'js' && jsSnippet}
                {activeTab === 'python' && pythonSnippet}
                {activeTab === 'php' && phpSnippet}
              </code>
            </pre>
          </div>
        </div>

        {/* Request Specifications */}
        <GlassCard className="p-6 space-y-6">
          <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
            <Server className="w-4 h-4 text-red-500" />
            Request Parameters (JSON Body)
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3">Field</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Required</th>
                  <th className="pb-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                <tr>
                  <td className="py-3 font-mono font-bold text-red-400">to</td>
                  <td className="py-3 font-mono text-gray-400">string</td>
                  <td className="py-3 font-bold text-emerald-400">Yes</td>
                  <td className="py-3 text-gray-300">
                    Recipient 11-digit Bangladeshi mobile number. Format: <code className="font-mono text-white">017XXXXXXXX</code>, <code className="font-mono text-white">88017XXXXXXXX</code>, or <code className="font-mono text-white">+88017XXXXXXXX</code>. Automatically normalized to standard 11-digit local format before carrier dispatch.
                  </td>
                </tr>
                <tr>
                  <td className="py-3 font-mono font-bold text-red-400">message</td>
                  <td className="py-3 font-mono text-gray-400">string</td>
                  <td className="py-3 font-bold text-emerald-400">Yes</td>
                  <td className="py-3 text-gray-300">
                    The SMS text content (1 to 1000 characters). Supports English (standard GSM-7) and native Unicode Bangla (<span className="text-white">বাংলা</span>). Multi-segment concatenation is automatically handled.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </GlassCard>

        {/* Response Specifications */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Successful Response */}
          <GlassCard className="p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Success Response (HTTP 200)</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-700/50">
                200 OK
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Returned when the carrier gateway accepts the dispatch request.
            </p>
            <pre className="p-3.5 rounded-xl bg-black/70 border border-white/10 font-mono text-xs text-emerald-300 overflow-x-auto">
{`{
  "success": true,
  "status": "accepted",
  "message": "SMS accepted for sending."
}`}
            </pre>
          </GlassCard>

          {/* Failure Response */}
          <GlassCard className="p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <h3 className="text-sm font-bold text-white">Error Response (HTTP 4xx / 5xx)</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-950/80 text-red-400 border border-red-700/50">
                Error
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Standard structured error response without exposing internal server tokens.
            </p>
            <pre className="p-3.5 rounded-xl bg-black/70 border border-white/10 font-mono text-xs text-red-300 overflow-x-auto">
{`{
  "success": false,
  "status": "failed",
  "message": "Invalid recipient phone number."
}`}
            </pre>
          </GlassCard>
        </div>

        {/* HTTP Status Codes Table */}
        <GlassCard className="p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
            <Layers className="w-4 h-4 text-red-500" />
            HTTP Status Codes
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3">Status Code</th>
                  <th className="pb-3">Status Meaning</th>
                  <th className="pb-3">Resolution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr>
                  <td className="py-2.5 font-mono font-bold text-emerald-400">200 OK</td>
                  <td className="py-2.5 font-semibold text-white">Accepted</td>
                  <td className="py-2.5 text-gray-400">SMS queued/accepted for transmission.</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-mono font-bold text-amber-400">400 Bad Request</td>
                  <td className="py-2.5 font-semibold text-white">Validation Error</td>
                  <td className="py-2.5 text-gray-400">Missing fields, invalid phone number, or message exceeding 1000 chars.</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-mono font-bold text-red-400">401 Unauthorized</td>
                  <td className="py-2.5 font-semibold text-white">Invalid API Key</td>
                  <td className="py-2.5 text-gray-400">Missing or incorrect <code className="font-mono text-red-300">x-api-key</code> header.</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-mono font-bold text-purple-400">429 Too Many Requests</td>
                  <td className="py-2.5 font-semibold text-white">Rate Limit Exceeded</td>
                  <td className="py-2.5 text-gray-400">Request limit exceeded (60 per 15 min). Back off and retry later.</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-mono font-bold text-red-400">502 Bad Gateway</td>
                  <td className="py-2.5 font-semibold text-white">Carrier Rejection</td>
                  <td className="py-2.5 text-gray-400">Carrier provider failed to accept the message (e.g. balance or route issue).</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-mono font-bold text-red-400">503 Unavailable</td>
                  <td className="py-2.5 font-semibold text-white">Service Paused</td>
                  <td className="py-2.5 text-gray-400">SMS functionality is temporarily disabled in clinic administration.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </GlassCard>

        {/* Footer Note */}
        <div className="text-center pt-8 border-t border-white/10 text-xs text-gray-500 space-y-1">
          <p>© {new Date().getFullYear()} Luckydental Dental Management System. All rights reserved.</p>
          <p>For credential rotation or administrative assistance, access the authenticated SMS panel.</p>
        </div>
      </main>
    </div>
  );
}
