import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase, UrgencyLevel, generateProjectId } from "@/lib/supabase";

interface LeadCaptureFormProps {
  variant?: "default" | "compact";
}

const LeadCaptureForm = ({ variant = "default" }: LeadCaptureFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "UT",
    zip_code: "",
    roof_type: "",
    urgency: "medium" as UrgencyLevel,
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Check if Supabase is configured
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        // If Supabase is not configured, just show success message (demo mode)
        console.warn('Supabase not configured, running in demo mode');
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setIsSubmitted(true);
        toast({
          title: "Request Submitted!",
          description: "We'll match you with the best roofers in Cedar City within 24 hours.",
        });
        return;
      }

      // Validate required fields
      if (!formData.name || !formData.email || !formData.phone) {
        throw new Error('Please fill in all required fields (Name, Email, Phone).');
      }

      // Save lead to database in "Cedar City Roofers" Supabase project
      const leadData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address?.trim() || null,
        city: formData.city?.trim() || null,
        state: formData.state?.trim() || 'UT',
        zip_code: formData.zip_code?.trim() || null,
        roof_type: formData.roof_type?.trim() || null,
        notes: formData.notes?.trim() || null,
        status: 'new' as const,
        source: 'website',
        urgency: formData.urgency || 'medium',
        project_id: generateProjectId(), // Generate unique project ID
      };

      console.log('Submitting lead data:', leadData);

      const { data, error } = await supabase.from('leads').insert(leadData).select();

      if (error) {
        console.error('Error saving lead to Supabase:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        
        // Handle different error types
        let errorMessage = 'Failed to save your request. Please try again.';
        
        if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
          errorMessage = 'No data was returned. Please check your connection.';
        } else if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
          errorMessage = 'Database tables not set up. Please contact support.';
        } else if (error.message?.includes('permission') || error.message?.includes('policy') || error.code === '42501') {
          errorMessage = 'Permission denied. Please contact support.';
        } else if (error.code === '23505') {
          errorMessage = 'This lead already exists.';
        } else if (error.code === '23502') {
          errorMessage = 'Required fields are missing.';
        } else if (error.message) {
          // Show the actual error message if available
          errorMessage = error.message;
        }
        
        throw new Error(errorMessage);
      }

      console.log('Lead saved to Supabase:', data);

      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        state: "UT",
        zip_code: "",
        roof_type: "",
        urgency: "medium" as UrgencyLevel,
        notes: "",
      });

      setIsSubmitted(true);
      toast({
        title: "Request Submitted!",
        description: "We'll match you with the best roofers in Cedar City within 24 hours.",
      });
    } catch (error: any) {
      console.error('Error submitting lead:', error);
      const errorMessage = error?.message || 'An error occurred while submitting your request.';
      
      // Show error to user so they know something went wrong
      toast({
        title: "Submission Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Don't mark as submitted if there was an error
      setIsSubmitted(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  if (isSubmitted) {
    return (
      <div className="text-center py-8 animate-scale-in">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-success" />
        </div>
        <h3 className="font-display text-xl font-bold text-foreground mb-2">
          Thank You!
        </h3>
        <p className="text-muted-foreground">
          We've received your request. One of our verified Cedar City roofers will contact you within 24 hours.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            placeholder="John Smith"
            required
            value={formData.name}
            onChange={handleInputChange}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            placeholder="john@example.com"
            required
            value={formData.email}
            onChange={handleInputChange}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone *</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="(435) 555-0123"
            required
            value={formData.phone}
            onChange={handleInputChange}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="roof_type">Roof Type</Label>
          <Input
            id="roof_type"
            placeholder="e.g., Repair, Replacement, Inspection"
            value={formData.roof_type}
            onChange={handleInputChange}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            placeholder="Street address"
            value={formData.address}
            onChange={handleInputChange}
          />
        </div>
        <div className="grid grid-cols-3 gap-2 md:col-span-2">
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              placeholder="City"
              value={formData.city}
              onChange={handleInputChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              placeholder="UT"
              value={formData.state}
              onChange={handleInputChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zip_code">ZIP</Label>
            <Input
              id="zip_code"
              placeholder="ZIP"
              value={formData.zip_code}
              onChange={handleInputChange}
            />
          </div>
        </div>
        {variant === "default" && (
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="urgency">Urgency</Label>
            <Select
              value={formData.urgency}
              onValueChange={(value) => handleChange("urgency", value)}
            >
              <SelectTrigger id="urgency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      {variant === "default" && (
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            placeholder="Describe your roofing project or any specific concerns..."
            rows={4}
            value={formData.notes}
            onChange={handleInputChange}
          />
        </div>
      )}

      <Button
        type="submit"
        variant="cta"
        size="lg"
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Submitting...
          </>
        ) : (
          "Get Matched With The Best Roofer in Cedar City!"
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        By submitting, you agree to our{" "}
        <a href="/privacy" className="underline hover:text-foreground">
          Privacy Policy
        </a>
        . We'll never spam you.
      </p>
    </form>
  );
};

export default LeadCaptureForm;
