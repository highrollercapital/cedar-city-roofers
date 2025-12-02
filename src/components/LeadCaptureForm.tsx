import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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
    roofingNeed: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    setIsSubmitted(true);
    toast({
      title: "Request Submitted!",
      description: "We'll match you with the best roofers in Cedar City within 24 hours.",
    });
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name *</Label>
          <Input
            id="name"
            placeholder="John Smith"
            required
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email Address *</Label>
          <Input
            id="email"
            type="email"
            placeholder="john@example.com"
            required
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number *</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="(435) 555-0123"
            required
            value={formData.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="roofingNeed">Roofing Need *</Label>
          <Select
            value={formData.roofingNeed}
            onValueChange={(value) => handleChange("roofingNeed", value)}
            required
          >
            <SelectTrigger id="roofingNeed">
              <SelectValue placeholder="Select your need" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="repair">Roof Repair</SelectItem>
              <SelectItem value="replacement">Roof Replacement</SelectItem>
              <SelectItem value="inspection">Roof Inspection</SelectItem>
              <SelectItem value="new">New Construction</SelectItem>
              <SelectItem value="storm">Storm Damage</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {variant === "default" && (
        <div className="space-y-2">
          <Label htmlFor="message">Tell Us More (Optional)</Label>
          <Textarea
            id="message"
            placeholder="Describe your roofing project or any specific concerns..."
            rows={4}
            value={formData.message}
            onChange={(e) => handleChange("message", e.target.value)}
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
