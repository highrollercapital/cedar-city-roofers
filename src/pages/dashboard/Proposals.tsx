import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, Proposal, Lead } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Eye, Plus, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import ProposalForm from '@/components/ProposalForm';
import { toast } from '@/hooks/use-toast';

const Proposals = () => {
  const { user, isAdmin, isRoofer } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [proposalToEdit, setProposalToEdit] = useState<Proposal | null>(null);
  const [leadForEdit, setLeadForEdit] = useState<Lead | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [proposalToDelete, setProposalToDelete] = useState<Proposal | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { data: proposals, isLoading } = useQuery({
    queryKey: ['proposals', user?.id],
    queryFn: async () => {
      let query = supabase
        .from('proposals')
        .select(`
          *,
          lead:leads(id, name, email, phone)
        `)
        .order('created_at', { ascending: false });

      if (isAdmin || isRoofer) {
        // Admins and roofers see all proposals
      } else {
        // Clients see only their proposals
        query = query.eq('client_id', user?.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (Proposal & { lead: Lead | null })[];
    },
    enabled: !!user,
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-500',
      sent: 'bg-blue-500',
      viewed: 'bg-yellow-500',
      signed: 'bg-green-500',
      approved: 'bg-green-600',
      rejected: 'bg-red-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  // Delete proposal mutation
  const deleteProposalMutation = useMutation({
    mutationFn: async (proposal: Proposal) => {
      // First, get the lead_id before deleting
      const leadId = proposal.lead_id;

      // Delete the proposal
      const { error } = await supabase
        .from('proposals')
        .delete()
        .eq('id', proposal.id);

      if (error) throw error;

      // If proposal had a lead, update the lead's project_total
      if (leadId) {
        // Get all remaining proposals for this lead
        const { data: remainingProposals } = await supabase
          .from('proposals')
          .select('total')
          .eq('lead_id', leadId);

        // Calculate new project_total (sum of all remaining proposals, or 0 if none)
        const newProjectTotal = remainingProposals && remainingProposals.length > 0
          ? remainingProposals.reduce((sum, p) => sum + (Number(p.total) || 0), 0)
          : null;

        // Update the lead
        const { error: leadUpdateError } = await supabase
          .from('leads')
          .update({
            project_total: newProjectTotal,
            updated_at: new Date().toISOString(),
          })
          .eq('id', leadId);

        if (leadUpdateError) {
          console.error('Error updating lead project_total:', leadUpdateError);
        }
      }

      return proposal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({
        title: 'Proposal deleted',
        description: 'The proposal has been deleted and the lead project total has been updated.',
      });
      setIsDeleteDialogOpen(false);
      setProposalToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete proposal',
        variant: 'destructive',
      });
    },
  });

  const handleEdit = async (proposal: Proposal) => {
    setProposalToEdit(proposal);
    setIsEditDialogOpen(true);
    // Fetch lead if proposal has lead_id
    if (proposal.lead_id) {
      const { data } = await supabase
        .from('leads')
        .select('*')
        .eq('id', proposal.lead_id)
        .single();
      if (data) setLeadForEdit(data as Lead);
    }
  };

  const handleDelete = (proposal: Proposal) => {
    setProposalToDelete(proposal);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-6 bg-background min-h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Proposals</h1>
          <p className="text-muted-foreground">Manage and track all proposals</p>
        </div>
        {(isAdmin || isRoofer) && (
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Proposal
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading proposals...</div>
      ) : proposals && proposals.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>All Proposals ({proposals.length})</CardTitle>
            <CardDescription>View and manage your proposals</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proposals.map((proposal) => {
                  const lead = Array.isArray(proposal.lead) ? proposal.lead[0] : proposal.lead;
                  return (
                    <TableRow key={proposal.id}>
                      <TableCell className="font-medium">{proposal.title}</TableCell>
                      <TableCell>
                        {lead?.name || (proposal.client_id ? 'Client' : '-')}
                      </TableCell>
                      <TableCell>
                        {proposal.total
                          ? `$${Number(proposal.total).toLocaleString()}`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(proposal.status)}>
                          {proposal.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(proposal.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              setSelectedProposal(proposal);
                              setIsViewDialogOpen(true);
                              // Use the lead from the query if available, otherwise fetch it
                              if (lead) {
                                setSelectedLead(lead);
                              } else if (proposal.lead_id) {
                                const { data } = await supabase
                                  .from('leads')
                                  .select('*')
                                  .eq('id', proposal.lead_id)
                                  .single();
                                if (data) setSelectedLead(data as Lead);
                              }
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(isAdmin || isRoofer) && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(proposal)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(proposal)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No proposals found</p>
          </CardContent>
        </Card>
      )}

      {/* Create Proposal Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <ProposalForm
            onSuccess={() => {
              setIsCreateDialogOpen(false);
            }}
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Proposal Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {proposalToEdit && (
            <ProposalForm
              proposal={proposalToEdit}
              lead={leadForEdit}
              onSuccess={() => {
                setIsEditDialogOpen(false);
                setProposalToEdit(null);
                setLeadForEdit(null);
              }}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setProposalToEdit(null);
                setLeadForEdit(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Proposal Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
          {selectedProposal && (
            <ProposalView
              proposal={selectedProposal}
              lead={selectedLead}
              onClose={() => {
                setIsViewDialogOpen(false);
                setSelectedProposal(null);
                setSelectedLead(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the proposal
              {proposalToDelete?.lead_id && ' and update the lead\'s project total'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (proposalToDelete) {
                  deleteProposalMutation.mutate(proposalToDelete);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteProposalMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Proposal View Component
interface ProposalViewProps {
  proposal: Proposal;
  lead: Lead | null;
  onClose: () => void;
}

// Roof Image Generator Component - Uses specific roof type images
const RoofImageGenerator = ({ roofType }: { roofType: string }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRoofImage = () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Curated stock images for each roof type - using specific direct image URLs
        // These URLs point to images that clearly show each roof material type
        const roofTypeImages: Record<string, string> = {
          // Asphalt Shingle - direct image showing asphalt shingle roof
          'Asphalt Shingle': 'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
          // Metal Roofing - direct image showing metal standing seam roof
          'Metal Roofing': 'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
          // Tile Roofing - direct image showing clay/ceramic tile roof
          'Tile Roofing': 'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
          // Slate Roofing - direct image showing slate tile roof
          'Slate Roofing': 'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
          // Wood Shake - direct image showing cedar shake roof
          'Wood Shake': 'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
          // Flat Roof - direct image showing flat commercial roof
          'Flat Roof': 'https://images.pexels.com/photos/323775/pexels-photo-323775.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
          // TPO/PVC - direct image showing white membrane flat commercial roof
          'TPO/PVC': 'https://images.pexels.com/photos/323775/pexels-photo-323775.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
          // EPDM - direct image showing black rubber membrane flat roof
          'EPDM': 'https://images.pexels.com/photos/323775/pexels-photo-323775.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
          // Modified Bitumen - direct image showing flat commercial roof membrane
          'Modified Bitumen': 'https://images.pexels.com/photos/323775/pexels-photo-323775.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
        };
        
        const imageUrl = roofTypeImages[roofType] || roofTypeImages['Asphalt Shingle'];
        
        // Load the image
        const img = new Image();
        img.onload = () => {
          setImageUrl(imageUrl);
          setIsLoading(false);
        };
        img.onerror = () => {
          // If primary image fails, try a generic roof image
          const fallbackUrl = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80';
          const fallbackImg = new Image();
          fallbackImg.onload = () => {
            setImageUrl(fallbackUrl);
            setIsLoading(false);
          };
          fallbackImg.onerror = () => {
            setImageUrl(null);
            setError('Failed to load image');
            setIsLoading(false);
          };
          fallbackImg.src = fallbackUrl;
        };
        img.src = imageUrl;
        
      } catch (error) {
        console.error('Error loading roof image:', error);
        setError('Failed to load image');
        setIsLoading(false);
      }
    };

    loadRoofImage();
  }, [roofType]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading product image...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5">
        <div className="text-center p-6">
          <div className="text-6xl mb-4">🏠</div>
          <p className="text-lg font-semibold text-foreground mb-2">{roofType}</p>
          <p className="text-sm text-muted-foreground">Professional Installation</p>
        </div>
      </div>
    );
  }

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={`${roofType} roof sample - AI generated`}
        className="w-full h-full object-cover"
        onError={() => {
          setImageUrl(null);
          setError('Image failed to load');
        }}
      />
    );
  }

  // Fallback gradient placeholder
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5">
      <div className="text-center p-6">
        <div className="text-6xl mb-4">🏠</div>
        <p className="text-lg font-semibold text-foreground mb-2">{roofType}</p>
        <p className="text-sm text-muted-foreground">Professional Installation</p>
      </div>
    </div>
  );
};

const ProposalView = ({ proposal, lead, onClose }: ProposalViewProps) => {
  const { user } = useAuth();
  const items = Array.isArray(proposal.items) ? proposal.items : [];
  const expiresDate = proposal.expires_at ? new Date(proposal.expires_at) : null;

  // Extract roof type and work type from description
  const roofTypeMatch = proposal.description?.match(/Roof Type:\s*([^|]+)/i);
  const workTypeMatch = proposal.description?.match(/Work Type:\s*([^|\n]+)/i);
  const roofType = roofTypeMatch ? roofTypeMatch[1].trim() : null;
  const workType = workTypeMatch ? workTypeMatch[1].trim() : null;
  const cleanDescription = proposal.description
    ?.replace(/^Roof Type:\s*[^|]+\s*\|\s*Work Type:\s*[^\n]+\n\n/i, '')
    .replace(/^Roof Type:\s*[^\n]+\n\n/i, '')
    .replace(/^Work Type:\s*[^\n]+\n\n/i, '')
    .trim() || '';

  return (
    <>
      <DialogHeader className="px-6 pt-6 pb-0">
        <DialogTitle>{proposal.title}</DialogTitle>
        <DialogDescription>Proposal Details</DialogDescription>
      </DialogHeader>
      <div className="proposal-preview bg-white">
        {/* Professional Header with Logo */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b-2 border-primary/20">
          <div className="p-8">
            <div className="flex items-start justify-between mb-6">
              {/* Left: Logo and Company Info */}
              <div className="flex items-start gap-4">
                {user?.company_logo_url ? (
                  <div className="flex-shrink-0">
                    <img
                      src={user.company_logo_url}
                      alt={user.company_name || 'Company Logo'}
                      className="h-20 w-20 object-contain rounded-lg bg-white p-2 shadow-sm border border-primary/10"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex-shrink-0 h-20 w-20 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                    <FileText className="h-10 w-10 text-primary" />
                  </div>
                )}
                <div>
                  <h1 className="text-4xl font-bold text-primary mb-1 tracking-tight">
                    {user?.company_name || 'Your Roofing Company'}
                  </h1>
                  <p className="text-muted-foreground text-sm font-medium">Professional Roofing Services</p>
                  {user?.phone && (
                    <p className="text-muted-foreground text-xs mt-1">{user.phone}</p>
                  )}
                  {user?.email && (
                    <p className="text-muted-foreground text-xs">{user.email}</p>
                  )}
                </div>
              </div>

              {/* Right: Proposal Details */}
              <div className="text-right bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-primary/10 shadow-sm">
                <div className="inline-block bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-bold tracking-wider mb-3">
                  PROPOSAL
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-muted-foreground font-medium">Date:</span>
                    <span className="font-semibold">{format(new Date(proposal.created_at), 'MMMM d, yyyy')}</span>
                  </div>
                  {expiresDate && (
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-muted-foreground font-medium">Valid Until:</span>
                      <span className="font-semibold text-primary">{format(expiresDate, 'MMMM d, yyyy')}</span>
                    </div>
                  )}
                  {lead?.project_id && (
                    <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-primary/10">
                      <span className="text-muted-foreground font-medium">Proposal #:</span>
                      <span className="font-mono text-xs">{lead.project_id}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-8 space-y-8">
          {/* Customer Info Section */}
          {lead && (
            <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl p-6 border border-primary/10">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Prepared For</h2>
                  <div className="space-y-2">
                    <p className="text-xl font-bold text-foreground">{lead.name}</p>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Email:</span>
                        <span className="font-medium">{lead.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Phone:</span>
                        <span className="font-medium">{lead.phone}</span>
                      </div>
                    </div>
                    {lead.address && (
                      <div className="pt-2 border-t border-primary/10">
                        <p className="text-sm text-muted-foreground">
                          {lead.address}
                          {lead.city && `, ${lead.city}`}
                          {lead.state && `, ${lead.state}`}
                          {lead.zip_code && ` ${lead.zip_code}`}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Project Details */}
          {(roofType || workType) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roofType && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Roof Type</p>
                  <p className="text-lg font-bold">{roofType}</p>
                </div>
              )}
              {workType && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Type of Work</p>
                  <p className="text-lg font-bold">{workType}</p>
                </div>
              )}
            </div>
          )}

          {/* Proposal Title */}
          <div className="border-l-4 border-primary pl-6 py-2">
            <h2 className="text-3xl font-bold text-foreground">{proposal.title}</h2>
          </div>

          {/* Roof Product Image */}
          {roofType && (
            <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl p-6 border border-primary/20">
              <h3 className="text-lg font-bold mb-4 text-foreground">Product Sample</h3>
              <div className="relative w-full h-64 rounded-lg overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20 shadow-lg">
                <RoofImageGenerator roofType={roofType} />
              </div>
              <p className="text-sm text-muted-foreground mt-3 text-center">
                Professional {roofType} installation sample
              </p>
            </div>
          )}

          {/* Description Section */}
          {cleanDescription && (
            <div className="bg-white rounded-xl p-6 border border-primary/20 shadow-sm">
              <h3 className="text-lg font-bold mb-4 text-foreground">Project Description</h3>
              <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-line leading-relaxed">
                {cleanDescription}
              </div>
            </div>
          )}

          {/* Pricing Summary */}
          {(proposal.subtotal || proposal.tax || proposal.total) && (
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-6 border-2 border-primary/20">
              <h3 className="text-lg font-bold mb-4 text-foreground">Investment Summary</h3>
              <div className="space-y-3">
                {proposal.subtotal !== null && (
                  <div className="flex justify-between items-center text-base">
                    <span className="text-muted-foreground font-medium">Subtotal:</span>
                    <span className="font-semibold text-foreground">${Number(proposal.subtotal).toFixed(2)}</span>
                  </div>
                )}
                {proposal.tax !== null && (
                  <div className="flex justify-between items-center text-base">
                    <span className="text-muted-foreground font-medium">Tax:</span>
                    <span className="font-semibold text-foreground">${Number(proposal.tax).toFixed(2)}</span>
                  </div>
                )}
                {proposal.total !== null && (
                  <div className="pt-3 mt-3 border-t-2 border-primary/30">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-foreground">Total Investment:</span>
                      <span className="text-2xl font-bold text-primary">${Number(proposal.total).toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gradient-to-r from-muted/50 to-muted/30 border-t-2 border-primary/20 p-8">
          <div className="max-w-3xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">Proposal Status</h3>
              <Badge className="text-sm px-3 py-1">{proposal.status}</Badge>
            </div>
            {proposal.sent_at && (
              <p className="text-sm text-muted-foreground mb-4">
                <strong>Sent:</strong> {format(new Date(proposal.sent_at), 'MMMM d, yyyy h:mm a')}
              </p>
            )}
            <div className="pt-4 border-t border-primary/20">
              <div className="flex items-center gap-2">
                {user?.company_logo_url && (
                  <img
                    src={user.company_logo_url}
                    alt={user.company_name || 'Company Logo'}
                    className="h-8 w-8 object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                )}
                <p className="font-bold text-foreground">
                  {user?.company_name || 'Your Roofing Company'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="px-6 pb-6 pt-4 border-t">
        <Button onClick={onClose} className="w-full">Close</Button>
      </div>
    </>
  );
};

export default Proposals;

