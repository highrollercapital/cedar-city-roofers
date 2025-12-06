import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, Project, ProjectStage, Lead } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, FolderKanban, Image as ImageIcon, FileText, DollarSign, User, Phone, Mail, MapPin, Upload, X, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';

interface ProjectWithLead extends Project {
  lead?: Lead | null;
  media?: Array<{
    id: string;
    file_url: string;
    file_type: string;
    caption: string | null;
    created_at: string;
  }>;
}

const Projects = () => {
  const { user, isAdmin, isRoofer } = useAuth();
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<ProjectWithLead | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  // Fetch projects with lead information
  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects', user?.id, stageFilter],
    queryFn: async () => {
      let query = supabase.from('projects').select('*').order('created_at', { ascending: false });

      if (isAdmin || isRoofer) {
        // Admins and roofers see all projects
        // Only show in_progress and completed stages
        if (stageFilter === 'all') {
          query = query.in('stage', ['in_progress', 'completed']);
        } else {
          query = query.eq('stage', stageFilter);
        }
      } else {
        // Clients see only their projects
        query = query.eq('client_id', user?.id);
        if (stageFilter !== 'all') {
          query = query.eq('stage', stageFilter);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch lead information for each project
      const projectsWithLeads = await Promise.all(
        (data as Project[]).map(async (project) => {
          let lead: Lead | null = null;
          if (project.lead_id) {
            const { data: leadData } = await supabase
              .from('leads')
              .select('*')
              .eq('id', project.lead_id)
              .single();
            lead = leadData as Lead | null;
          }

          // Fetch project media
          const { data: mediaData } = await supabase
            .from('project_media')
            .select('*')
            .eq('project_id', project.id)
            .order('created_at', { ascending: false });

          return {
            ...project,
            lead,
            media: mediaData || [],
          } as ProjectWithLead;
        })
      );

      return projectsWithLeads;
    },
    enabled: !!user,
  });

  const getStageColor = (stage: ProjectStage) => {
    const colors: Record<ProjectStage, string> = {
      inspection: 'bg-blue-500',
      quote_sent: 'bg-yellow-500',
      approved: 'bg-green-500',
      in_progress: 'bg-purple-500',
      completed: 'bg-emerald-500',
    };
    return colors[stage] || 'bg-gray-500';
  };

  // Handle photo upload
  const handlePhotoUpload = async (projectId: string, file: File) => {
    if (!user) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 10MB.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, '_')}`;
      const filePath = `${projectId}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        // Check if bucket doesn't exist
        if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('not found')) {
          toast({
            title: 'Storage bucket not configured',
            description: 'Please create a "project-photos" bucket in Supabase Storage with public access.',
            variant: 'destructive',
          });
        } else {
          throw uploadError;
        }
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('project-photos')
        .getPublicUrl(filePath);

      // Save to project_media table
      const { error: mediaError } = await supabase
        .from('project_media')
        .insert({
          project_id: projectId,
          file_url: publicUrl,
          file_type: 'image',
          uploaded_by: user.id,
        });

      if (mediaError) throw mediaError;

      toast({
        title: 'Photo uploaded',
        description: 'The photo has been added to the project.',
      });

      // Refresh project data
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      
      // Update selected project to show new photo
      if (selectedProject) {
        const { data: updatedMedia } = await supabase
          .from('project_media')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });
        
        setSelectedProject({
          ...selectedProject,
          media: updatedMedia || [],
        });
      }
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast({
        title: 'Upload failed',
        description: error?.message || 'Failed to upload photo. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleViewDetails = (project: ProjectWithLead) => {
    setSelectedProject(project);
    setIsDetailDialogOpen(true);
  };

  return (
    <div className="space-y-6 bg-background min-h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground">Manage all your roofing projects</p>
        </div>
        {(isAdmin || isRoofer) && (
          <Link to="/dashboard/projects/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </Link>
        )}
      </div>

      {/* Filter */}
      {(isAdmin || isRoofer) && (
        <Card>
          <CardContent className="pt-6">
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Projects Grid */}
      {isLoading ? (
        <div className="text-center py-12">Loading projects...</div>
      ) : projects && projects.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  <Badge className={getStageColor(project.stage)}>
                    {project.stage.replace('_', ' ')}
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {project.address}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Lead Information */}
                  {project.lead && (
                    <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <User className="h-4 w-4" />
                        {project.lead.name}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {project.lead.phone}
                      </div>
                      {project.lead.roof_type && (
                        <div className="text-xs">
                          <span className="font-medium">Roof Type: </span>
                          <span className="text-muted-foreground">{project.lead.roof_type}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                  )}
                  
                  <div className="flex items-center justify-between text-sm">
                    {project.estimated_cost && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        <span>Est: ${Number(project.estimated_cost).toLocaleString()}</span>
                      </div>
                    )}
                    {project.actual_cost && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        <span className="font-medium">
                          ${Number(project.actual_cost).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {project.start_date && (
                    <p className="text-xs text-muted-foreground">
                      Started: {format(new Date(project.start_date), 'MMM d, yyyy')}
                    </p>
                  )}

                  {/* Photo count */}
                  {project.media && project.media.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <ImageIcon className="h-3 w-3" />
                      {project.media.length} photo{project.media.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
                <div className="mt-4 flex gap-2">
                  {(isAdmin || isRoofer) ? (
                    <Button 
                      variant="outline" 
                      className="flex-1" 
                      size="sm"
                      onClick={() => handleViewDetails(project)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </Button>
                  ) : (
                    <Link to={`/dashboard/projects/${project.id}`} className="flex-1">
                      <Button variant="outline" className="w-full" size="sm">
                        <FolderKanban className="mr-2 h-4 w-4" />
                        View Details
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No projects found</p>
          </CardContent>
        </Card>
      )}

      {/* Project Detail Dialog */}
      {selectedProject && (isAdmin || isRoofer) && (
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedProject.name}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Lead Information Section */}
              {selectedProject.lead && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Lead Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Name</Label>
                        <p className="font-medium">{selectedProject.lead.name}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Email</Label>
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          <a href={`mailto:${selectedProject.lead.email}`} className="text-sm hover:underline">
                            {selectedProject.lead.email}
                          </a>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Phone</Label>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          <a href={`tel:${selectedProject.lead.phone}`} className="text-sm hover:underline">
                            {selectedProject.lead.phone}
                          </a>
                        </div>
                      </div>
                      {selectedProject.lead.address && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Address</Label>
                          <p className="text-sm">{selectedProject.lead.address}</p>
                        </div>
                      )}
                      {selectedProject.lead.roof_type && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Roof Type</Label>
                          <Badge variant="secondary" className="mt-1">
                            {selectedProject.lead.roof_type}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Project Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Project Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Address</Label>
                      <p className="text-sm">{selectedProject.address}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Stage</Label>
                      <Badge className={getStageColor(selectedProject.stage)}>
                        {selectedProject.stage.replace('_', ' ')}
                      </Badge>
                    </div>
                    {selectedProject.description && (
                      <div className="md:col-span-2">
                        <Label className="text-xs text-muted-foreground">Description</Label>
                        <p className="text-sm">{selectedProject.description}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Photo Upload Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Inspection Photos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Upload Button */}
                  <div>
                    <Label htmlFor="photo-upload" className="cursor-pointer">
                      <Button variant="outline" asChild disabled={uploading}>
                        <span>
                          <Upload className="mr-2 h-4 w-4" />
                          {uploading ? 'Uploading...' : 'Upload Photo'}
                        </span>
                      </Button>
                    </Label>
                    <Input
                      id="photo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handlePhotoUpload(selectedProject.id, file);
                        }
                      }}
                      disabled={uploading}
                    />
                  </div>

                  {/* Photo Gallery */}
                  {selectedProject.media && selectedProject.media.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-3">
                      {selectedProject.media.map((media) => (
                        <div key={media.id} className="relative group">
                          <img
                            src={media.file_url}
                            alt={media.caption || 'Project photo'}
                            className="w-full h-48 object-cover rounded-lg border"
                          />
                          {media.caption && (
                            <p className="text-xs text-muted-foreground mt-1">{media.caption}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No photos uploaded yet. Upload inspection photos above.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Projects;

