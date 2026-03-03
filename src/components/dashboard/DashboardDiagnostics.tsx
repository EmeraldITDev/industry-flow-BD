import React from 'react';
import { AlertCircle, CheckCircle2, Zap, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function DashboardDiagnostics() {
  const [diagnosticResult, setDiagnosticResult] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);

  const runDiagnostic = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://industry-flow-backend.onrender.com/api/projects', {
        credentials: 'include'
      });

      if (!response.ok) {
        setDiagnosticResult({
          status: 'error',
          message: `API Error: ${response.status} ${response.statusText}`,
          details: 'Backend server may be down or requires authentication'
        });
        return;
      }

      const data = await response.json();
      let projects = [];

      if (Array.isArray(data)) {
        projects = data;
      } else if (Array.isArray(data?.data)) {
        projects = data.data;
      } else if (Array.isArray(data?.results)) {
        projects = data.results;
      }

      const activeProjects = projects.filter((p: any) => p.status === 'active');
      const withFinancialData = projects.filter((p: any) => {
        const ngn = parseFloat(p.contract_value_ngn ?? p.contractValueNGN ?? 0) || 0;
        const usd = parseFloat(p.contract_value_usd ?? p.contractValueUSD ?? 0) || 0;
        return ngn > 0 || usd > 0;
      });

      setDiagnosticResult({
        status: withFinancialData.length > 0 ? 'success' : 'warning',
        totalProjects: projects.length,
        activeProjects: activeProjects.length,
        withFinancialData: withFinancialData.length,
        sampleProject: withFinancialData[0] || projects[0],
      });
    } catch (error) {
      setDiagnosticResult({
        status: 'error',
        message: 'Failed to connect to backend',
        details: (error as Error).message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Dashboard Diagnostics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Check the health of your backend connection and verify contract/PO values are available.
          </p>
          
          <Button onClick={runDiagnostic} disabled={loading} className="w-full">
            {loading ? 'Running diagnostic...' : 'Run Diagnostic'}
          </Button>

          {diagnosticResult && (
            <div className="space-y-4 mt-4">
              {diagnosticResult.status === 'success' && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">Backend is Ready!</AlertTitle>
                  <AlertDescription className="text-green-700">
                    <p className="mb-2">Contract/PO values should be appearing on the dashboard.</p>
                    <ul className="text-sm space-y-1">
                      <li>✅ Total Projects: {diagnosticResult.totalProjects}</li>
                      <li>✅ Active Projects: {diagnosticResult.activeProjects}</li>
                      <li>✅ Projects with Contract Values: {diagnosticResult.withFinancialData}</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {diagnosticResult.status === 'warning' && (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertTitle className="text-yellow-800">No Financial Data Found</AlertTitle>
                  <AlertDescription className="text-yellow-700">
                    <p className="mb-3">Backend has {diagnosticResult.totalProjects} projects, but none have contract/PO values.</p>
                    <p className="text-sm font-medium mb-2">This means you need to:</p>
                    <ol className="text-sm space-y-1 list-decimal list-inside">
                      <li>Run backend migrations: <code className="bg-yellow-100 px-1 rounded">php artisan migrate</code></li>
                      <li>Seed sample data: <code className="bg-yellow-100 px-1 rounded">php artisan db:seed --class=ProjectSeeder</code></li>
                      <li>OR create a new project and add contract values in the form</li>
                    </ol>
                  </AlertDescription>
                </Alert>
              )}

              {diagnosticResult.status === 'error' && (
                <Alert className="bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertTitle className="text-red-800">Backend Connection Error</AlertTitle>
                  <AlertDescription className="text-red-700">
                    <p className="mb-2">{diagnosticResult.message}</p>
                    <p className="text-sm">{diagnosticResult.details}</p>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Setup Guide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="frontend" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="frontend">Frontend</TabsTrigger>
              <TabsTrigger value="backend">Backend</TabsTrigger>
              <TabsTrigger value="troubleshoot">Troubleshoot</TabsTrigger>
            </TabsList>

            <TabsContent value="frontend" className="space-y-4 mt-4">
              <div className="space-y-3">
                <h3 className="font-semibold">Frontend is Ready ✅</h3>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600 shrink-0" />
                    <span>Dashboard displays contract values from API</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600 shrink-0" />
                    <span>Automatic currency conversion (NGN ↔ USD)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600 shrink-0" />
                    <span>Revenue analytics and margin calculations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600 shrink-0" />
                    <span>Financial data normalized from API response</span>
                  </li>
                </ul>
              </div>
            </TabsContent>

            <TabsContent value="backend" className="space-y-4 mt-4">
              <div className="space-y-3">
                <h3 className="font-semibold">Backend Setup Required</h3>
                <p className="text-sm text-muted-foreground">
                  Run these commands on your backend server:
                </p>
                <div className="bg-slate-950 text-slate-100 p-3 rounded font-mono text-xs space-y-1 overflow-auto">
                  <div>$ php artisan migrate</div>
                  <div>$ php artisan db:seed --class=ProjectSeeder</div>
                </div>
                <p className="text-sm text-muted-foreground">
                  This creates sample projects with financial data that will appear on the dashboard.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="troubleshoot" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm mb-2">Contract values not showing?</h4>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Check backend database has projects with contract_value_ngn/usd populated</li>
                    <li>Ensure project status is "active" to appear on dashboard</li>
                    <li>Hard refresh browser: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)</li>
                    <li>Check browser console for errors (F12)</li>
                  </ol>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
