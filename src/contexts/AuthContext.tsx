import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase, User } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role?: 'admin' | 'roofer' | 'client') => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  isAdmin: boolean;
  isRoofer: boolean;
  isClient: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const isSupabaseConfigured = () => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
    return url && key && key.startsWith('eyJ');
  };

  const fetchUserProfile = async (supabaseUser: SupabaseUser | null) => {
    if (!supabaseUser) {
      setUser(null);
      return;
    }

    // Check if Supabase is properly configured
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured, skipping user profile fetch');
      setUser(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (error) throw error;
      
      if (data) {
        console.log('User profile found:', data.email);
        setUser(data as User);
        return;
      }
    } catch (error: any) {
      console.error('Error fetching user profile:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      
      // If user profile doesn't exist (PGRST116 = no rows returned), create one
      if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
        console.log('User profile not found, creating new profile...');
        
        try {
          // Extract name from email if no metadata
          const emailName = supabaseUser.email?.split('@')[0] || 'User';
          const fullName = supabaseUser.user_metadata?.full_name || 
                          supabaseUser.user_metadata?.name || 
                          emailName.charAt(0).toUpperCase() + emailName.slice(1);
          
          // Default to 'roofer' role if not specified (since this is for partners)
          const role = supabaseUser.user_metadata?.role || 'roofer';
          
          console.log('Creating profile with:', { id: supabaseUser.id, email: supabaseUser.email, fullName, role });
          
          const { data, error: insertError } = await supabase
            .from('users')
            .insert({
              id: supabaseUser.id,
              email: supabaseUser.email || '',
              full_name: fullName,
              role: role as 'admin' | 'roofer' | 'client',
            })
            .select()
            .single();

          if (insertError) {
            console.error('Error inserting user profile:', insertError);
            // If insert fails due to RLS, try to get the user anyway
            // This might happen if the trigger already created it
            const { data: retryData } = await supabase
              .from('users')
              .select('*')
              .eq('id', supabaseUser.id)
              .single();
            
            if (retryData) {
              setUser(retryData as User);
              return;
            }
            throw insertError;
          }

          if (data) {
            console.log('User profile created successfully:', data.email);
            setUser(data as User);
          }
        } catch (insertErr: any) {
          console.error('Error creating user profile:', insertErr);
          
          // Check if it's an RLS error or permission issue
          const isRLSError = insertErr.message?.includes('permission') || 
                            insertErr.message?.includes('policy') ||
                            insertErr.code === '42501';
          
          // If it's an RLS error, the trigger might have already created it
          // Try to fetch it one more time
          if (isRLSError) {
            console.log('RLS error detected, checking if trigger created profile...');
            const { data: retryData, error: retryError } = await supabase
              .from('users')
              .select('*')
              .eq('id', supabaseUser.id)
              .single();
            
            if (retryData && !retryError) {
              console.log('Profile found after RLS error (likely created by trigger)');
              setUser(retryData as User);
              return;
            }
          }
          
          // If we can't create the profile, still try to set a minimal user object
          // so the user can at least log in
          setUser({
            id: supabaseUser.id,
            email: supabaseUser.email || '',
            full_name: supabaseUser.user_metadata?.full_name || null,
            phone: null,
            role: (supabaseUser.user_metadata?.role as 'admin' | 'roofer' | 'client') || 'roofer',
            company_name: null,
            company_logo_url: null,
            created_at: supabaseUser.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          
          // Don't throw if it's just an RLS error and we have a user object
          // The trigger should have created it
          if (!isRLSError) {
            throw insertErr;
          } else {
            console.log('RLS error on insert, but user object set. Trigger may have created profile.');
          }
        }
      } else {
        // Some other error occurred
        console.error('Unexpected error fetching user profile:', error);
        throw error;
      }
    }
  };

  useEffect(() => {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured, running in demo mode');
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      fetchUserProfile(session?.user ?? null);
      setLoading(false);
    }).catch((error) => {
      console.error('Error getting session:', error);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      fetchUserProfile(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured()) {
      toast({
        title: 'Supabase not configured',
        description: 'Please configure Supabase to enable authentication.',
        variant: 'destructive',
      });
      throw new Error('Supabase not configured');
    }

    try {
      console.log('Attempting sign in for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        
        // Provide more helpful error messages
        let errorMessage = error.message;
        if (error.message.includes('Invalid login credentials') || error.message.includes('invalid')) {
          errorMessage = 'Invalid email or password. Please check your credentials.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please verify your email address before signing in.';
        } else if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
          errorMessage = `Connection error. Most likely the database tables don't exist!\n\n🔴 CRITICAL: Run supabase/schema.sql in Supabase SQL Editor first!\n\nSee SETUP_DATABASE.md for instructions.`;
        } else if (error.message.includes('relation') || error.message.includes('does not exist')) {
          errorMessage = 'Database tables not set up. Run supabase/schema.sql in Supabase SQL Editor. See SETUP_DATABASE.md';
        }
        
        toast({
          title: 'Sign in failed',
          description: errorMessage,
          variant: 'destructive',
          duration: 5000,
        });
        throw new Error(errorMessage);
      }

      if (data.user) {
        console.log('Auth successful, fetching user profile...');
        
        // Fetch or create user profile
        try {
          await fetchUserProfile(data.user);
          console.log('User profile loaded successfully');
          
          // Get user role for welcome message
          const userRole = data.user.user_metadata?.role || 'client';
          const roleMessage = userRole === 'admin' ? 'Admin' : userRole === 'roofer' ? 'Partner' : 'Client';
          
          toast({
            title: 'Welcome back!',
            description: `You have successfully signed in as ${roleMessage}. Redirecting to your back office...`,
          });
        } catch (profileError: any) {
          console.error('Error with user profile:', profileError);
          
          // Even if profile fetch fails, set a minimal user object so redirect works
          const emailName = data.user.email?.split('@')[0] || 'User';
          const fullName = data.user.user_metadata?.full_name || 
                          data.user.user_metadata?.name || 
                          emailName.charAt(0).toUpperCase() + emailName.slice(1);
          const role = data.user.user_metadata?.role || 'roofer';
          
          setUser({
            id: data.user.id,
            email: data.user.email || '',
            full_name: fullName,
            phone: null,
            role: role as 'admin' | 'roofer' | 'client',
            company_name: null,
            company_logo_url: null,
            created_at: data.user.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          
          // Show warning but don't block login
          toast({
            title: 'Signed in',
            description: 'Signed in successfully. Redirecting to your back office...',
            variant: 'default',
            duration: 3000,
          });
        }
      }
    } catch (error: any) {
      // Error already handled above, just re-throw
      throw error;
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: 'admin' | 'roofer' | 'client' = 'roofer'
  ) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!isSupabaseConfigured()) {
      toast({
        title: 'Supabase Configuration Required',
        description: 'Please set up your Supabase credentials.',
        variant: 'destructive',
        duration: 10000,
      });
      throw new Error('Supabase not configured');
    }

    // Validate URL format
    if (!supabaseUrl.includes('.supabase.co') || !supabaseUrl.startsWith('https://')) {
      toast({
        title: 'Invalid Supabase URL Format',
        description: `Your URL format is incorrect.\n\nShould be: https://your-project-id.supabase.co\n\nCurrent: ${supabaseUrl}\n\nGet the correct URL from:\nSupabase Dashboard → Settings → API → Project URL`,
        variant: 'destructive',
        duration: 15000,
      });
      throw new Error('Invalid Supabase URL format');
    }
    
    // Check for common URL mistakes
    if (supabaseUrl.endsWith('/')) {
      toast({
        title: 'URL Format Issue',
        description: `Remove the trailing slash from your URL.\n\nCurrent: ${supabaseUrl}\n\nShould be: ${supabaseUrl.slice(0, -1)}`,
        variant: 'destructive',
        duration: 10000,
      });
      throw new Error('URL should not end with a slash');
    }

    try {
      console.log('Attempting sign up for:', email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        console.error('Supabase sign up error:', error);
        
        // Provide more helpful error messages
        let errorMessage = error.message;
        if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
          errorMessage = `Connection failed. Most likely the database tables don't exist!\n\n🔴 CRITICAL: Run the database schema first!\n\n1. Go to Supabase → SQL Editor\n2. Copy entire contents of supabase/schema.sql\n3. Paste and Run in SQL Editor\n4. Verify tables exist in Table Editor\n\nThen check:\n- ✅ Supabase URL is correct (Settings → API → Project URL)\n- ✅ Project is active (not paused)\n- ✅ Restart dev server after updating .env\n\nSee SETUP_DATABASE.md for step-by-step instructions.`;
        } else if (error.message.includes('Invalid API key') || error.message.includes('JWT') || error.message.includes('401')) {
          errorMessage = 'Invalid API key. Get the correct key from: Supabase Dashboard → Settings → API → anon public key';
        } else if (error.message.includes('already registered') || error.message.includes('already exists') || error.message.includes('User already registered')) {
          errorMessage = 'This email is already registered. Try signing in instead at /login';
        } else if (error.message.includes('Password') || error.message.includes('password')) {
          errorMessage = 'Password must be at least 6 characters long.';
        } else if (error.message.includes('relation') || error.message.includes('does not exist')) {
          errorMessage = 'Database tables not set up. Please run supabase/schema.sql in Supabase SQL Editor. See SETUP_DATABASE.md';
        }
        
        toast({
          title: 'Sign up failed',
          description: errorMessage,
          variant: 'destructive',
          duration: 10000,
        });
        throw new Error(errorMessage);
      }

      if (data.user) {
        // Wait a moment for the trigger to create the profile
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Fetch the user profile (don't throw if it fails - trigger should have created it)
        try {
          await fetchUserProfile(data.user);
        } catch (profileError: any) {
          console.warn('Profile fetch/creation had issues, but user was created:', profileError);
          // Don't throw - the user was successfully created in auth
          // The trigger should have created the profile, or we set a minimal user object
        }
        
        toast({
          title: 'Account created!',
          description: 'Your partner account has been created. You can now sign in.',
        });
      }
    } catch (error: any) {
      // Only show toast if it wasn't already shown above
      if (!error.message || (!error.message.includes('Connection failed') && !error.message.includes('Invalid'))) {
        // Don't show "Database Setup Required" for profile creation errors
        if (error.message?.includes('Database Setup Required') || error.message?.includes('Database error saving')) {
          toast({
            title: 'Account created!',
            description: 'Your account was created. You may need to sign in to complete setup.',
            variant: 'default',
            duration: 5000,
          });
        } else {
          toast({
            title: 'Sign up failed',
            description: error.message || 'An error occurred during sign up. Check your Supabase configuration.',
            variant: 'destructive',
            duration: 10000,
          });
        }
      }
      // Don't throw profile errors - user was created successfully
      if (!error.message?.includes('Database error saving') && !error.message?.includes('Database Setup Required')) {
        throw error;
      }
    }
  };

  const signOut = async () => {
    if (!isSupabaseConfigured()) {
      setUser(null);
      setSession(null);
      return;
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setSession(null);
      toast({
        title: 'Signed out',
        description: 'You have been successfully signed out.',
      });
    } catch (error: any) {
      toast({
        title: 'Sign out failed',
        description: error.message || 'An error occurred during sign out.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      setUser(data as User);
      toast({
        title: 'Profile updated',
        description: 'Your profile has been successfully updated.',
      });
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error.message || 'An error occurred while updating your profile.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    updateUser,
    isAdmin: user?.role === 'admin',
    isRoofer: user?.role === 'roofer' || user?.role === 'admin',
    isClient: user?.role === 'client',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

