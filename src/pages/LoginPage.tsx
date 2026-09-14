import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { homePathForUser } from '@/lib/executive/access';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, LogIn, Eye, EyeOff } from 'lucide-react';
import emeraldLogo from '@/assets/emerald-logo.png';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  if (isAuthenticated) {
    navigate(homePathForUser(user), { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);

    const normalizedEmail = email.toLowerCase().trim();
    const success = await login(normalizedEmail, password);

    if (success) {
      // Prefer the freshly authenticated identity from storage (state update is async).
      let homeUser: Parameters<typeof homePathForUser>[0] = {
        id: '',
        email: normalizedEmail,
        name: '',
        accessLevel: 'employee',
        createdAt: new Date(),
        isActive: true,
      };

      try {
        const stored = JSON.parse(localStorage.getItem('user') || 'null');
        if (stored) {
          homeUser = {
            id: String(stored.id ?? ''),
            email: stored.email || normalizedEmail,
            name: stored.name || '',
            accessLevel: stored.accessLevel || stored.role || 'employee',
            systemRole: stored.systemRole,
            createdAt: new Date(),
            isActive: true,
          };
        }
      } catch {
        // use email-based fallback above
      }

      navigate(homePathForUser(homeUser), { replace: true });
    }

    setIsLoggingIn(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <Card className="w-full max-w-md border-border/50 shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img
              src={emeraldLogo}
              alt="Emerald CFZE"
              className="h-16 w-auto"
            />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
            <CardDescription className="mt-2">
              Sign in to access Emerald Project Management
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@emeraldcfze.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full gap-2" disabled={isLoggingIn}>
              {isLoggingIn ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Sign In
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground text-center">
              Only @emeraldcfze.com email addresses are allowed
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
