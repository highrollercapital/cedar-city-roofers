import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  LayoutDashboard,
  Users,
  Calendar,
  FolderKanban,
  FileText,
  DollarSign,
  Settings,
  LogOut,
  MessageSquare,
  Home,
  Menu,
  X,
  Edit2,
  Check,
  X as XIcon,
  Upload,
  Image as ImageIcon,
  Phone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, signOut, isAdmin, isRoofer, isClient, updateUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isEditingCompanyName, setIsEditingCompanyName] = useState(false);
  const [companyNameValue, setCompanyNameValue] = useState(user?.company_name || '');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isLogoDialogOpen, setIsLogoDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Update local state when user changes
  useEffect(() => {
    setCompanyNameValue(user?.company_name || '');
  }, [user?.company_name]);

  // Mutation to update company name
  const updateCompanyNameMutation = useMutation({
    mutationFn: async (newCompanyName: string) => {
      if (!user?.id) throw new Error('User not found');
      
      const { error } = await supabase
        .from('users')
        .update({ 
          company_name: newCompanyName || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
      
      // Update user context
      await updateUser({ company_name: newCompanyName || null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', user?.id] });
      toast({
        title: 'Company name updated',
        description: 'Your company name has been saved successfully.',
      });
      setIsEditingCompanyName(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Update failed',
        description: error?.message || 'Failed to update company name. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSaveCompanyName = () => {
    if (companyNameValue.trim() !== (user?.company_name || '')) {
      updateCompanyNameMutation.mutate(companyNameValue.trim());
    } else {
      setIsEditingCompanyName(false);
    }
  };

  const handleCancelEdit = () => {
    setCompanyNameValue(user?.company_name || '');
    setIsEditingCompanyName(false);
  };

  // Handle logo upload
  const handleLogoUpload = async (file: File) => {
    if (!user?.id) {
      console.error('No user ID found');
      toast({
        title: 'Error',
        description: 'Please sign in to upload a logo.',
        variant: 'destructive',
      });
      return;
    }

    console.log('Starting logo upload for user:', user.id);
    console.log('File details:', { name: file.name, size: file.size, type: file.type });

    // Validate file size (max 5MB for logos)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file (PNG, JPG, etc.).',
        variant: 'destructive',
      });
      return;
    }

    setIsUploadingLogo(true);
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
      const fileName = `logo-${user.id}-${Date.now()}.${fileExt}`;
      const filePath = fileName; // Store directly in bucket root

      console.log('Uploading to path:', filePath);

      // Delete old logo if exists (extract path from URL)
      if (user.company_logo_url) {
        try {
          // Extract the file path from the URL
          // URL format: https://project.supabase.co/storage/v1/object/public/company-logos/path/to/file
          const urlParts = user.company_logo_url.split('/company-logos/');
          if (urlParts.length > 1) {
            const oldPath = urlParts[1];
            console.log('Deleting old logo at path:', oldPath);
            const { error: deleteError } = await supabase.storage.from('company-logos').remove([oldPath]);
            if (deleteError) {
              console.warn('Failed to delete old logo:', deleteError);
            }
          }
        } catch (deleteError) {
          // Don't fail the upload if old logo deletion fails
          console.warn('Error deleting old logo:', deleteError);
        }
      }

      console.log('Attempting to upload to company-logos bucket...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        console.error('Error details:', {
          message: uploadError.message,
          statusCode: uploadError.statusCode,
          error: uploadError.error,
        });

        if (uploadError.message?.includes('Bucket not found') || 
            uploadError.message?.includes('not found') ||
            uploadError.statusCode === '404') {
          toast({
            title: 'Storage bucket not configured',
            description: (
              <div className="space-y-2">
                <p>Please create a "company-logos" bucket in Supabase Storage:</p>
                <ol className="list-decimal list-inside text-sm space-y-1">
                  <li>Go to Supabase Dashboard → Storage</li>
                  <li>Click "New bucket"</li>
                  <li>Name it "company-logos"</li>
                  <li>Set it to "Public"</li>
                  <li>Click "Create bucket"</li>
                </ol>
              </div>
            ),
            variant: 'destructive',
            duration: 10000,
          });
        } else if (uploadError.message?.includes('new row violates row-level security') || 
                   uploadError.message?.includes('RLS')) {
          toast({
            title: 'Permission denied',
            description: 'Storage bucket needs proper RLS policies. Please check Supabase Storage settings.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Upload failed',
            description: uploadError.message || 'Failed to upload logo. Please check console for details.',
            variant: 'destructive',
          });
        }
        return;
      }

      console.log('Upload successful:', uploadData);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(filePath);

      console.log('Public URL:', publicUrl);

      // Update user record
      const { error: updateError } = await supabase
        .from('users')
        .update({
          company_logo_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      console.log('User record updated successfully');

      // Update user context
      await updateUser({ company_logo_url: publicUrl });

      toast({
        title: 'Logo uploaded',
        description: 'Your company logo has been saved successfully.',
      });

      queryClient.invalidateQueries({ queryKey: ['user', user.id] });
      setIsLogoDialogOpen(false);
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      console.error('Error stack:', error?.stack);
      toast({
        title: 'Upload failed',
        description: error?.message || 'Failed to upload logo. Please check the browser console for details.',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const adminRooferNav = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/leads', label: 'Leads', icon: Users },
    { href: '/dashboard/appointments', label: 'Appointments', icon: Calendar },
    { href: '/dashboard/projects', label: 'Projects', icon: FolderKanban },
    { href: '/dashboard/proposals', label: 'Proposals', icon: FileText },
    { href: '/dashboard/revenue', label: 'Revenue', icon: DollarSign },
    { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
    { href: '/dashboard/calling', label: 'Calling', icon: Phone },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  const clientNav = [
    { href: '/dashboard', label: 'My Projects', icon: FolderKanban },
    { href: '/dashboard/appointments', label: 'Appointments', icon: Calendar },
    { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  const navItems = isAdmin || isRoofer ? adminRooferNav : clientNav;

  const isActive = (href: string) => {
    if (href === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(href);
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out lg:translate-x-0',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Link to="/dashboard" className="flex items-center gap-2 flex-1 min-w-0">
                <div className="relative group shrink-0">
                  {user?.company_logo_url ? (
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg overflow-hidden border border-border bg-background">
                      <img
                        src={user.company_logo_url}
                        alt="Company Logo"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          // Fallback to icon if image fails to load
                          const target = e.target as HTMLImageElement;
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = '';
                            const fallback = document.createElement('div');
                            fallback.className = 'flex items-center justify-center w-10 h-10 rounded-lg bg-trust text-primary-foreground';
                            fallback.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>';
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                    </div>
                  ) : (
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-trust text-primary-foreground">
                <Home className="w-5 h-5" />
              </div>
                  )}
                  {(isAdmin || isRoofer) && (
                    <>
                      <button
                        type="button"
                        className={cn(
                          "absolute inset-0 flex items-center justify-center rounded-lg cursor-pointer transition-all z-10",
                          "bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100",
                          "hover:bg-black/70"
                        )}
                        title="Upload company logo"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsLogoDialogOpen(true);
                        }}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <Upload className="h-4 w-4 text-white" />
                          <span className="text-[10px] text-white font-medium">Upload</span>
                        </div>
                      </button>
                      <Dialog open={isLogoDialogOpen} onOpenChange={setIsLogoDialogOpen}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Upload Company Logo</DialogTitle>
                          <DialogDescription>
                            Upload your company logo. Recommended size: 200x200px. Max file size: 5MB.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          {user?.company_logo_url && (
                            <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
                              <p className="text-sm font-medium">Current Logo</p>
                              <img
                                src={user.company_logo_url}
                                alt="Current Logo"
                                className="h-20 w-20 object-contain border rounded"
                              />
                            </div>
                          )}
                          <div className="space-y-2">
                            <input
                              id="logo-file-input"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                console.log('File input onChange triggered');
                                const file = e.target.files?.[0];
                                if (file) {
                                  console.log('File selected:', {
                                    name: file.name,
                                    size: file.size,
                                    type: file.type,
                                    lastModified: file.lastModified
                                  });
                                  handleLogoUpload(file);
                                } else {
                                  console.log('No file selected');
                                }
                                // Reset input after a delay to allow processing
                                setTimeout(() => {
                                  if (e.target) {
                                    (e.target as HTMLInputElement).value = '';
                                  }
                                }, 100);
                              }}
                              onClick={(e) => {
                                console.log('File input clicked');
                                e.stopPropagation();
                              }}
                              disabled={isUploadingLogo}
                            />
                            <label 
                              htmlFor="logo-file-input" 
                              className="block cursor-pointer"
                              onClick={(e) => {
                                console.log('Label clicked');
                                e.stopPropagation();
                              }}
                            >
                              <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg hover:border-primary transition-colors bg-muted/20">
                                {isUploadingLogo ? (
                                  <div className="flex flex-col items-center gap-2">
                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
                                    <p className="text-sm text-muted-foreground">Uploading...</p>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center gap-2">
                                    <Upload className="h-8 w-8 text-muted-foreground" />
                                    <p className="text-sm font-medium">Click to upload logo</p>
                                    <p className="text-xs text-muted-foreground">PNG, JPG, or SVG (max 5MB)</p>
                                  </div>
                                )}
                              </div>
                            </label>
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('Browse button clicked');
                                const input = document.getElementById('logo-file-input') as HTMLInputElement;
                                if (input) {
                                  console.log('Triggering file input click');
                                  input.click();
                                } else {
                                  console.error('File input not found');
                                }
                              }}
                              disabled={isUploadingLogo}
                            >
                              <Upload className="mr-2 h-4 w-4" />
                              {isUploadingLogo ? 'Uploading...' : 'Browse Files'}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                      </Dialog>
                    </>
                  )}
                </div>
                {isEditingCompanyName ? (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Input
                      value={companyNameValue}
                      onChange={(e) => setCompanyNameValue(e.target.value)}
                      placeholder="Company Name"
                      className="h-8 text-sm font-bold flex-1 min-w-0"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveCompanyName();
                        } else if (e.key === 'Escape') {
                          handleCancelEdit();
                        }
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={handleSaveCompanyName}
                      disabled={updateCompanyNameMutation.isPending}
                    >
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={handleCancelEdit}
                      disabled={updateCompanyNameMutation.isPending}
                    >
                      <XIcon className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-1 min-w-0 group">
                    <span className="font-display text-lg font-bold truncate">
                      {user?.company_name || 'Roofing SaaS'}
                    </span>
                    {(isAdmin || isRoofer) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsEditingCompanyName(true);
                        }}
                        title="Edit company name"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}
            </Link>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden shrink-0"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive(item.href)
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-3">
                  <Avatar>
                    <AvatarFallback>{getInitials(user?.full_name || null)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium">{user?.full_name || 'User'}</span>
                    <span className="text-xs text-muted-foreground capitalize">{user?.role}</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex h-16 items-center justify-between px-4 lg:px-8">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-4 ml-auto">
              <Link to="/">
                <Button variant="outline" size="sm">
                  <Home className="mr-2 h-4 w-4" />
                  Back to Site
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-8 bg-background min-h-screen">{children}</main>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default DashboardLayout;

