import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const ACCESS_CODE = '370105';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    accessCode: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [supabaseConfigured, setSupabaseConfigured] = useState(true);
  const [databaseReady, setDatabaseReady] = useState<boolean | null>(null);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if Supabase is configured
    const hasSupabase = 
      import.meta.env.VITE_SUPABASE_URL && 
      import.meta.env.VITE_SUPABASE_ANON_KEY &&
      import.meta.env.VITE_SUPABASE_URL !== 'https://placeholder.supabase.co' &&
      import.meta.env.VITE_SUPABASE_ANON_KEY !== 'placeholder-key';
    setSupabaseConfigured(hasSupabase);

    // Check if database tables exist
    if (hasSupabase) {
      const checkDatabase = async () => {
        try {
          // Try to query the users table - if it exists, database is set up
          const { error } = await supabase
            .from('users')
            .select('id')
            .limit(1);
          
          // If no error or error is just "no rows found", table exists
          // 500 errors might be RLS issues, but table exists
          setDatabaseReady(!error || error.code === 'PGRST116' || error.status === 500);
        } catch (error: any) {
          // If query fails with 500, table might exist but have RLS issues
          // That's okay - the trigger will handle user creation
          if (error?.status === 500) {
            setDatabaseReady(true); // Table exists, just RLS blocking
          } else {
            setDatabaseReady(false);
          }
        }
      };
      checkDatabase();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate access code
    if (formData.accessCode !== ACCESS_CODE) {
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      return;
    }

    setIsLoading(true);

    try {
      await signUp(formData.email, formData.password, formData.fullName, 'roofer');
      // Wait a moment for user profile to load
      await new Promise(resolve => setTimeout(resolve, 500));
      // Redirect to back office dashboard
      navigate('/dashboard', { replace: true });
    } catch (error) {
      // Error is handled in AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  const isAccessCodeValid = formData.accessCode === ACCESS_CODE;
  const passwordsMatch = formData.password === formData.confirmPassword || formData.confirmPassword === '';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Partner Registration</CardTitle>
          <CardDescription className="text-center">
            Create your partner account with access code
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!supabaseConfigured && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Supabase Not Configured</AlertTitle>
              <AlertDescription className="mt-2 space-y-3">
                <div>
                  <p className="font-semibold mb-2">📍 Get Your Supabase URL from Dashboard:</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm ml-2">
                    <li>Go to <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">supabase.com</a></li>
                    <li>Open your <strong>"Cedar City Roofers"</strong> project</li>
                    <li>Click <strong>Settings</strong> (⚙️) → <strong>API</strong></li>
                    <li>Copy <strong>"Project URL"</strong>: <code className="bg-muted px-1 rounded text-xs">https://xxxxx.supabase.co</code></li>
                    <li>Copy <strong>"anon public"</strong> key: <code className="bg-muted px-1 rounded text-xs">eyJ...</code></li>
                  </ol>
                </div>
                <div>
                  <p className="font-semibold mb-2">📝 Update Your .env File:</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm ml-2">
                    <li>Create/update <code className="bg-muted px-1 rounded">.env</code> in project root</li>
                    <li>Add (replace with YOUR values):
                      <pre className="bg-muted p-2 rounded mt-1 text-xs overflow-x-auto">
{`VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here`}
                      </pre>
                    </li>
                    <li><strong>⚠️ No trailing slash</strong> on URL, <strong>no quotes</strong> around values</li>
                    <li><strong>🔄 Restart dev server</strong> (Ctrl+C, then npm run dev)</li>
                  </ol>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-xs">
                    📖 Detailed guide: <strong>GET_SUPABASE_URL.md</strong>
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          {databaseReady === false && supabaseConfigured && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Database Setup Required</AlertTitle>
              <AlertDescription className="mt-2 text-sm">
                Before registering, make sure you've run the database schema in Supabase SQL Editor.
                See <strong>SETUP_DATABASE.md</strong> for instructions.
              </AlertDescription>
            </Alert>
          )}

          {databaseReady === true && (
            <Alert className="mb-4 border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800 dark:text-green-200">Database Ready</AlertTitle>
              <AlertDescription className="mt-2 text-sm text-green-700 dark:text-green-300">
                ✅ Database is set up and ready. You can proceed with registration.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accessCode">Access Code *</Label>
              <Input
                id="accessCode"
                type="text"
                placeholder="Enter access code"
                value={formData.accessCode}
                onChange={(e) => setFormData({ ...formData, accessCode: e.target.value })}
                required
                disabled={isLoading}
              />
              {formData.accessCode && !isAccessCodeValid && (
                <p className="text-xs text-destructive">Invalid access code</p>
              )}
              {isAccessCodeValid && (
                <p className="text-xs text-green-600">✓ Access code verified</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                disabled={isLoading}
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                disabled={isLoading}
              />
              {formData.confirmPassword && !passwordsMatch && (
                <p className="text-xs text-destructive">Passwords do not match</p>
              )}
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !supabaseConfigured || !isAccessCodeValid || !passwordsMatch}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : !isAccessCodeValid ? (
                'Enter Valid Access Code'
              ) : (
                'Create Partner Account'
              )}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link to="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
          <div className="mt-2 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:underline">
              ← Back to website
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;

