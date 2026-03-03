import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, ArrowRight, Copy, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function ContractValuesSetupGuide() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const CodeBlock = ({ code, id }: { code: string; id: string }) => (
    <div className="relative bg-slate-950 text-slate-100 p-4 rounded font-mono text-sm overflow-auto">
      <code className="block whitespace-pre-wrap">{code}</code>
      <Button
        size="sm"
        variant="ghost"
        className="absolute top-2 right-2 text-slate-400 hover:text-slate-200"
        onClick={() => copyToClipboard(code, id)}
      >
        {copied === id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </Button>
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Contract/PO Values Setup Guide</h1>
        <p className="text-muted-foreground">
          Complete guide to get contract/PO values appearing on your dashboard
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Pre-requisite Check</AlertTitle>
        <AlertDescription>
          This guide assumes you have:
          <ul className="mt-2 ml-4 space-y-1 text-sm list-disc">
            <li>✅ Laravel backend deployed (Render, heroku, etc.)</li>
            <li>✅ Access to backend server (SSH or Render dashboard)</li>
            <li>✅ Database configured and accessible</li>
          </ul>
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="quick" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="quick">Quick Fix (5 min)</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Setup</TabsTrigger>
          <TabsTrigger value="verify">Verify & Test</TabsTrigger>
        </TabsList>

        <TabsContent value="quick" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRight className="w-5 h-5" />
                Fast Path: 3 Commands Only
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Step 1: SSH to Backend Server</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  If using Render: Dashboard → Your Service → Shell Tab
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Step 2: Run Migration</h3>
                <CodeBlock code="php artisan migrate" id="migrate" />
                <p className="text-xs text-muted-foreground mt-2">
                  Creates all database tables with financial columns
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Step 3: Seed Sample Data</h3>
                <CodeBlock code="php artisan db:seed --class=ProjectSeeder" id="seed" />
                <p className="text-xs text-muted-foreground mt-2">
                  Loads 7 projects with contract values totaling ₦144.65M
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Step 4: Verify (Optional)</h3>
                <CodeBlock code="php artisan tinker\n>>> Project::count()\n// Should return 7\n>>> exit" id="tinker" />
              </div>

              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Done! 🎉</AlertTitle>
                <AlertDescription className="text-green-700">
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>✅ Database ready with sample data</li>
                    <li>✅ Dashboard will show contract values</li>
                    <li>✅ Hard refresh browser if needed (Ctrl+Shift+R)</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Complete Setup Walkthrough</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <span className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
                  Prerequisites
                </h3>
                <div className="space-y-3 ml-8">
                  <p className="text-sm">Ensure these files exist in your backend:</p>
                  <ul className="text-sm space-y-2 text-muted-foreground list-disc list-inside">
                    <li><code>app/Models/Project.php</code></li>
                    <li><code>app/Http/Controllers/ProjectController.php</code></li>
                    <li><code>database/migrations/2026_01_30_000001_create_projects_table.php</code></li>
                    <li><code>database/seeders/ProjectSeeder.php</code></li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <span className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
                  Run Migrations
                </h3>
                <div className="space-y-3 ml-8">
                  <CodeBlock code="php artisan migrate" id="migrate-detailed" />
                  <p className="text-sm text-muted-foreground">
                    This creates the <code className="bg-slate-100 px-1 rounded">projects</code> table with all columns:
                  </p>
                  <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                    <li>contract_value_ngn</li>
                    <li>contract_value_usd</li>
                    <li>margin_percent_ngn / margin_percent_usd</li>
                    <li>margin_value_ngn / margin_value_usd</li>
                    <li>...and more</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <span className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">3</span>
                  Seed Sample Data
                </h3>
                <div className="space-y-3 ml-8">
                  <CodeBlock code="php artisan db:seed --class=ProjectSeeder" id="seed-detailed" />
                  <p className="text-sm text-muted-foreground">
                    Creates these projects with full financial data:
                  </p>
                  <table className="text-sm w-full mt-3 border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Project Name</th>
                        <th className="text-right p-2">NGN Value</th>
                        <th className="text-right p-2">USD Value</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b hover:bg-muted/50">
                        <td className="p-2">Manufacturing Equipment</td>
                        <td className="text-right p-2">₦12.5M</td>
                        <td className="text-right p-2">$7.8K</td>
                      </tr>
                      <tr className="border-b hover:bg-muted/50">
                        <td className="p-2">Oil & Gas Pipeline</td>
                        <td className="text-right p-2">₦45.0M</td>
                        <td className="text-right p-2">$28.1K</td>
                      </tr>
                      <tr className="border-b hover:bg-muted/50">
                        <td className="p-2">Healthcare IT</td>
                        <td className="text-right p-2">₦8.75M</td>
                        <td className="text-right p-2">$5.5K</td>
                      </tr>
                      <tr className="border-b hover:bg-muted/50">
                        <td className="p-2">Renewable Energy</td>
                        <td className="text-right p-2">₦16.0M</td>
                        <td className="text-right p-2">$10K</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-semibold">...and 3 more</td>
                        <td className="text-right p-2 font-semibold">₦144.65M</td>
                        <td className="text-right p-2 font-semibold">$91.4K</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <span className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">4</span>
                  Verify Setup
                </h3>
                <div className="space-y-3 ml-8">
                  <CodeBlock code="php artisan tinker" id="tinker-enter" />
                  <p className="text-sm text-muted-foreground">Then type these commands:</p>
                  <CodeBlock code=">>> Project::count()\n7\n\n>>> Project::sum('contract_value_ngn')\n144650000\n\n>>> Project::where('status', 'active')->count()\n7\n\n>>> exit" id="tinker-verify" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verify" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Verification Checklist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Backend migration ran successfully</p>
                    <p className="text-sm text-muted-foreground">No errors in <code className="bg-slate-100 px-1 rounded">php artisan migrate</code></p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Sample data seeded</p>
                    <p className="text-sm text-muted-foreground">Seeder created 7 projects with financial data</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Database verified</p>
                    <p className="text-sm text-muted-foreground"><code className="bg-slate-100 px-1 rounded">Project::count()</code> returns 7</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Financial values confirmed</p>
                    <p className="text-sm text-muted-foreground">Sum of contract_value_ngn = ₦144,650,000</p>
                  </div>
                </div>
              </div>

              <Alert className="bg-green-50 border-green-200 mt-6">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Ready for Frontend</AlertTitle>
                <AlertDescription className="text-green-700 space-y-2">
                  <p>Backend is fully set up. Now in the frontend:</p>
                  <ol className="list-decimal list-inside text-sm space-y-1">
                    <li>Go to <strong>Dashboard</strong></li>
                    <li>Look for <strong>"Active Projects"</strong> card (bottom left)</li>
                    <li>Should see projects with contract values displayed</li>
                    <li>Stat cards at top should show portfolio totals</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <p className="text-sm text-blue-700">
                    <strong>Not seeing values?</strong> Try a hard refresh (Ctrl+Shift+R) or check browser console for errors.
                  </p>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="text-amber-900">Still Having Issues?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-amber-900 text-sm">
          <p>
            Check the diagnostic tool in Dashboard settings for automated troubleshooting, or review:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Browser console (F12 → Console tab) for errors</li>
            <li>Backend logs (Render dashboard or SSH)</li>
            <li>Database connection in .env file</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
