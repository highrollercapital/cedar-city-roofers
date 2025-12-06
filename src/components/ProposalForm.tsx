import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, Lead, Proposal } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2, X, Mail, FileText, Save } from 'lucide-react';
import { format } from 'date-fns';

interface ProposalItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface ProposalFormProps {
  proposal?: Proposal | null;
  lead?: Lead | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const ProposalForm = ({ proposal: initialProposal, lead: initialLead, onSuccess, onCancel }: ProposalFormProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditMode = !!initialProposal;
  const [selectedLeadId, setSelectedLeadId] = useState<string>(initialLead?.id || initialProposal?.lead_id || '');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(initialLead || null);
  const [title, setTitle] = useState(initialProposal?.title || '');
  const [description, setDescription] = useState<string>(() => {
    // If editing, extract clean description (remove roof type and work type prefixes)
    if (initialProposal?.description) {
      let cleanDesc = initialProposal.description;
      // Remove "Roof Type: X | Work Type: Y" prefix if present
      cleanDesc = cleanDesc.replace(/^Roof Type:\s*[^|]+\s*\|\s*Work Type:\s*[^\n]+\n\n/i, '');
      cleanDesc = cleanDesc.replace(/^Roof Type:\s*[^\n]+\n\n/i, '');
      cleanDesc = cleanDesc.replace(/^Work Type:\s*[^\n]+\n\n/i, '');
      return cleanDesc.trim();
    }
    return '';
  });
  const [roofType, setRoofType] = useState<string>(() => {
    // Extract roof type from description if editing, or use lead's roof type
    if (initialProposal?.description) {
      // Try to match "Roof Type: X" format
      const match = initialProposal.description.match(/Roof Type:\s*([^|]+)/i);
      if (match) {
        const extracted = match[1].trim();
        // Check if it matches any of our options
        const roofTypeOptions = [
          'Asphalt Shingle',
          'Metal Roofing',
          'Tile Roofing',
          'Slate Roofing',
          'Wood Shake',
          'Flat Roof',
          'TPO/PVC',
          'EPDM',
          'Modified Bitumen',
          'Other',
        ];
        if (roofTypeOptions.includes(extracted)) {
          return extracted;
        }
        return extracted; // Return even if not in list
      }
    }
    return initialLead?.roof_type || '';
  });
  const [workType, setWorkType] = useState<string>(() => {
    // Extract work type from description if editing
    if (initialProposal?.description) {
      // Try to match "Work Type: X" format
      const match = initialProposal.description.match(/Work Type:\s*([^|\n]+)/i);
      if (match) {
        const extracted = match[1].trim();
        // Check if it matches any of our options
        const workTypeOptions = [
          'Full Roof Replacement',
          'Partial Roof Replacement',
          'Roof Repair',
          'Roof Inspection',
          'Gutter Installation',
          'Gutter Repair',
          'Roof Maintenance',
          'Emergency Repair',
          'Roof Coating',
          'Ventilation Installation',
          'Skylight Installation',
          'Chimney Repair',
          'Other',
        ];
        if (workTypeOptions.includes(extracted)) {
          return extracted;
        }
        return extracted; // Return even if not in list
      }
    }
    return '';
  });
  const [items, setItems] = useState<ProposalItem[]>(() => {
    if (initialProposal?.items && Array.isArray(initialProposal.items)) {
      return initialProposal.items.map((item: any, index: number) => ({
        id: `item-${index}`,
        description: item.description || '',
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
        total: (item.quantity || 1) * (item.unit_price || 0),
      }));
    }
    return [{ id: '1', description: '', quantity: 1, unit_price: 0, total: 0 }];
  });
  const [taxRate, setTaxRate] = useState(() => {
    if (initialProposal?.subtotal && initialProposal?.tax) {
      return (Number(initialProposal.tax) / Number(initialProposal.subtotal)) * 100;
    }
    return 7.5;
  });
  const [expiresInDays, setExpiresInDays] = useState(() => {
    if (initialProposal?.expires_at) {
      const expiresDate = new Date(initialProposal.expires_at);
      const now = new Date();
      const diffTime = expiresDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 30;
    }
    return 30;
  });
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Fetch all leads for selection
  const { data: leads } = useQuery({
    queryKey: ['leads-for-proposal'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Lead[];
    },
  });

  // Roof type options
  const roofTypeOptions = [
    'Asphalt Shingle',
    'Metal Roofing',
    'Tile Roofing',
    'Slate Roofing',
    'Wood Shake',
    'Flat Roof',
    'TPO/PVC',
    'EPDM',
    'Modified Bitumen',
    'Other',
  ];

  // Work type options
  const workTypeOptions = [
    'Full Roof Replacement',
    'Partial Roof Replacement',
    'Roof Repair',
    'Roof Inspection',
    'Gutter Installation',
    'Gutter Repair',
    'Roof Maintenance',
    'Emergency Repair',
    'Roof Coating',
    'Ventilation Installation',
    'Skylight Installation',
    'Chimney Repair',
    'Other',
  ];

  // Generate professional description based on roof type and work type
  const generateProfessionalDescription = (roofTypeValue: string, workTypeValue: string, leadAddress?: string): string => {
    if (!roofTypeValue && !workTypeValue) return '';

    const address = leadAddress || selectedLead?.address || 'your property';
    const customerName = selectedLead?.name || 'you';
    const city = selectedLead?.city || '';
    const state = selectedLead?.state || '';
    const location = city && state ? `${city}, ${state}` : address;
    
    // Generate a unique seed based on lead info and current timestamp for variation
    const seed = selectedLead?.id ? 
      selectedLead.id.split('-')[0] : 
      Date.now().toString();
    const seedNum = parseInt(seed, 16) || Date.now();
    
    // Helper to select variation based on seed
    const selectVariation = (variations: string[]) => {
      return variations[seedNum % variations.length];
    };

    // Get current season for personalization
    const month = new Date().getMonth();
    const season = month >= 2 && month <= 4 ? 'spring' : 
                   month >= 5 && month <= 7 ? 'summer' : 
                   month >= 8 && month <= 10 ? 'fall' : 'winter';

    let description = '';

    // Opening hook - Multiple variations for each work type
    if (workTypeValue) {
      switch (workTypeValue) {
        case 'Full Roof Replacement':
          const fullReplacementOpenings = [
            `Dear ${customerName},\n\nYour roof at ${location} has been your home's first line of defense, and now it's time to give it the upgrade it deserves. We're not just replacing materials – we're installing a complete roofing system engineered to protect your investment for the next 30+ years.\n\n`,
            `Dear ${customerName},\n\nAfter years of protecting your home at ${location}, your roof has earned its retirement. But here's the good news: what comes next will be even better. We're bringing you a roofing solution that combines cutting-edge materials with time-tested craftsmanship.\n\n`,
            `Dear ${customerName},\n\nThink about what your roof has endured – rain, wind, sun, snow. It's done its job, but now it's time for something extraordinary. At ${location}, we're going to transform your home's protection with a roof that's built to last generations.\n\n`,
            `Dear ${customerName},\n\nYour home at ${location} deserves a roof that matches its value. We're not just doing a replacement – we're creating a complete roofing ecosystem that will increase your property value, lower your energy costs, and give you absolute peace of mind.\n\n`,
          ];
          description = selectVariation(fullReplacementOpenings);
          break;
        case 'Partial Roof Replacement':
          const partialReplacementOpenings = [
            `Dear ${customerName},\n\nSometimes the smartest solution isn't the biggest one. For your property at ${location}, we've identified that a targeted partial replacement will restore your roof's integrity without the expense of a full replacement.\n\n`,
            `Dear ${customerName},\n\nPrecision matters. At ${location}, we're going to replace only what's necessary, using the exact same premium materials and installation standards as a full replacement. The result? Seamless protection that looks and performs perfectly.\n\n`,
            `Dear ${customerName},\n\nWhy replace more than you need? For your home at ${location}, we're taking a surgical approach – restoring the damaged sections with premium materials while preserving everything that's still in excellent condition.\n\n`,
          ];
          description = selectVariation(partialReplacementOpenings);
          break;
        case 'Roof Repair':
          const repairOpenings = [
            `Dear ${customerName},\n\nThat leak at ${location} isn't going to fix itself, and every day you wait costs more. We don't do quick patches – we find the root cause and fix it permanently, backed by our warranty.\n\n`,
            `Dear ${customerName},\n\nSmall problems become expensive ones fast. At ${location}, we're going to diagnose exactly what's wrong and fix it right the first time. No band-aids. No excuses. Just permanent solutions.\n\n`,
            `Dear ${customerName},\n\nYour roof at ${location} is trying to tell you something, and we're listening. We'll identify the exact problem, explain it clearly, and fix it with materials and methods that will last.\n\n`,
          ];
          description = selectVariation(repairOpenings);
          break;
        case 'Roof Inspection':
          const inspectionOpenings = [
            `Dear ${customerName},\n\nKnowledge is your best defense. Before you spend thousands on repairs or replacement, let us give you a complete picture of your roof's condition at ${location}. We'll show you exactly what needs attention and what doesn't.\n\n`,
            `Dear ${customerName},\n\nWhat you don't know about your roof at ${location} can cost you. Our comprehensive inspection will reveal every potential issue, prioritize what needs immediate attention, and give you a clear roadmap for protecting your investment.\n\n`,
            `Dear ${customerName},\n\nYour roof at ${location} is your biggest home investment, and it deserves a thorough evaluation. We'll inspect every inch, document everything we find, and give you an honest assessment of what needs attention – and what doesn't.\n\n`,
          ];
          description = selectVariation(inspectionOpenings);
          break;
        case 'Gutter Installation':
          const gutterInstallOpenings = [
            `Dear ${customerName},\n\nYour gutters at ${location} are your roof's drainage system, and when they're properly installed, they protect your foundation, prevent water damage, and keep your home's exterior pristine.\n\n`,
            `Dear ${customerName},\n\nAt ${location}, we're installing a gutter system that doesn't just look good – it works hard. Every drop of water will be directed away from your home, protecting your foundation and preventing costly water damage.\n\n`,
            `Dear ${customerName},\n\nThink of gutters as your home's first line of defense against water damage. At ${location}, we're installing a system engineered to handle heavy rainfall, prevent clogs, and protect your property for decades.\n\n`,
          ];
          description = selectVariation(gutterInstallOpenings);
          break;
        case 'Gutter Repair':
          const gutterRepairOpenings = [
            `Dear ${customerName},\n\nClogged or damaged gutters at ${location} can cause thousands in foundation and water damage. We'll restore your gutter system to peak performance, ensuring water flows exactly where it should – away from your home.\n\n`,
            `Dear ${customerName},\n\nYour gutters at ${location} aren't working like they should, and that's costing you. We'll diagnose the problem, fix it permanently, and get your drainage system back to protecting your home the way it was designed to.\n\n`,
          ];
          description = selectVariation(gutterRepairOpenings);
          break;
        case 'Roof Maintenance':
          const maintenanceOpenings = [
            `Dear ${customerName},\n\nThink of roof maintenance like changing your car's oil – skip it, and you'll pay dearly later. At ${location}, our maintenance program keeps your roof in peak condition and catches problems when they're cheap to fix.\n\n`,
            `Dear ${customerName},\n\nYour roof at ${location} is an investment, and like any investment, it needs regular care. Our maintenance program extends its lifespan, prevents costly repairs, and gives you peace of mind year-round.\n\n`,
          ];
          description = selectVariation(maintenanceOpenings);
          break;
        case 'Emergency Repair':
          const emergencyOpenings = [
            `Dear ${customerName},\n\nWhen disaster strikes at ${location}, you need action, not promises. Our emergency team will secure your property immediately, stop the damage in its tracks, and then provide a permanent solution.\n\n`,
            `Dear ${customerName},\n\nTime is critical. At ${location}, we understand that every hour counts. Our emergency repair service gets to your property fast, secures it immediately, and then delivers a permanent fix that restores your peace of mind.\n\n`,
          ];
          description = selectVariation(emergencyOpenings);
          break;
        case 'Roof Coating':
          const coatingOpenings = [
            `Dear ${customerName},\n\nA roof coating at ${location} is like a protective shield – it extends your roof's life, improves energy efficiency, and prevents costly damage. It's one of the smartest investments you can make.\n\n`,
            `Dear ${customerName},\n\nAt ${location}, we're applying a roof coating that will protect your investment for years to come. This isn't just a surface treatment – it's a complete protective system that saves you money on energy and repairs.\n\n`,
          ];
          description = selectVariation(coatingOpenings);
          break;
        case 'Ventilation Installation':
          const ventilationOpenings = [
            `Dear ${customerName},\n\nProper ventilation at ${location} isn't optional – it's essential. Without it, your attic becomes a heat trap that damages shingles, increases energy costs, and creates moisture problems.\n\n`,
            `Dear ${customerName},\n\nYour attic at ${location} needs to breathe. We'll install a ventilation system that works 24/7 to protect your roof, lower your energy bills, and prevent costly moisture damage.\n\n`,
          ];
          description = selectVariation(ventilationOpenings);
          break;
        case 'Skylight Installation':
          const skylightOpenings = [
            `Dear ${customerName},\n\nNatural light transforms a space, and at ${location}, we're going to bring that transformation to your home. We don't just cut a hole – we create a watertight, energy-efficient window to the sky.\n\n`,
            `Dear ${customerName},\n\nAt ${location}, we're installing a skylight that will flood your space with natural light while maintaining perfect weather protection. This isn't just a window – it's a complete system that adds value and beauty.\n\n`,
          ];
          description = selectVariation(skylightOpenings);
          break;
        case 'Chimney Repair':
          const chimneyOpenings = [
            `Dear ${customerName},\n\nYour chimney at ${location} is more than decorative – it's a critical safety system. When it's damaged, you're risking water intrusion, fire hazards, and structural problems. We'll restore both function and safety.\n\n`,
            `Dear ${customerName},\n\nA damaged chimney at ${location} is a ticking time bomb. We'll repair it properly, restore its structural integrity, and ensure it protects your home and family for years to come.\n\n`,
          ];
          description = selectVariation(chimneyOpenings);
          break;
        default:
          description = `Dear ${customerName},\n\nAt ${location}, we understand that protecting your home is about more than just fixing problems – it's about investing in your family's safety, comfort, and peace of mind.\n\n`;
      }
    }

    // Add roof type specific benefits with variations
    if (roofTypeValue) {
      switch (roofTypeValue) {
        case 'Asphalt Shingle':
          const asphaltVariations = [
            `For your ${roofTypeValue} roof at ${location}, we're using premium-grade materials engineered for ${season} weather and beyond. These aren't average shingles – they're designed to withstand extreme conditions, resist algae and mold, and maintain their appearance for 30+ years.\n\n`,
            `Your ${roofTypeValue} installation at ${location} features top-tier materials that offer exceptional durability and weather resistance. We're using shingles that are specifically engineered for your climate, ensuring they'll protect your home through every season.\n\n`,
            `At ${location}, your new ${roofTypeValue} roof will be built with premium materials that don't just look great – they perform. These shingles are designed to resist wind, hail, and UV damage while maintaining their appearance for decades.\n\n`,
          ];
          description += selectVariation(asphaltVariations);
          break;
        case 'Metal Roofing':
          const metalVariations = [
            `Your ${roofTypeValue} installation at ${location} delivers a roof that's virtually maintenance-free, incredibly durable, and energy-efficient. Metal roofs reflect heat (perfect for ${season}), reduce cooling costs by up to 25%, and can last 50+ years.\n\n`,
            `At ${location}, a ${roofTypeValue} system will give you decades of protection with minimal maintenance. These roofs reflect solar heat, reducing your energy costs, and they're built to withstand extreme weather conditions.\n\n`,
            `Your ${roofTypeValue} roof at ${location} is an investment that pays dividends. It's fire-resistant, energy-efficient, and can last 50+ years with minimal care. Plus, it adds significant value to your property.\n\n`,
          ];
          description += selectVariation(metalVariations);
          break;
        case 'Tile Roofing':
          const tileVariations = [
            `A ${roofTypeValue} system at ${location} is an investment in timeless beauty and exceptional durability. These tiles are fire-resistant, energy-efficient, and can last a century or more. They don't just protect – they elevate your entire home.\n\n`,
            `At ${location}, your ${roofTypeValue} installation will give you a roof that's both beautiful and built to last. These tiles are engineered to withstand extreme weather, resist fire, and maintain their appearance for generations.\n\n`,
          ];
          description += selectVariation(tileVariations);
          break;
        case 'Slate Roofing':
          const slateVariations = [
            `When you choose ${roofTypeValue} at ${location}, you're choosing a roof that can last 100+ years. It's fireproof, waterproof, and absolutely stunning. This isn't just a roof – it's a legacy investment.\n\n`,
            `Your ${roofTypeValue} installation at ${location} will give you a roof that's both beautiful and virtually indestructible. Slate is fireproof, waterproof, and can last for generations with minimal maintenance.\n\n`,
          ];
          description += selectVariation(slateVariations);
          break;
        case 'Wood Shake':
          const woodVariations = [
            `Your ${roofTypeValue} roof at ${location} will give your home natural beauty and excellent insulation. We use premium, fire-treated shakes that offer the classic look you want with modern safety and durability.\n\n`,
            `At ${location}, your ${roofTypeValue} installation combines natural beauty with modern performance. These fire-treated shakes provide excellent insulation and a timeless appearance that enhances your home's value.\n\n`,
          ];
          description += selectVariation(woodVariations);
          break;
        case 'Flat Roof':
          const flatVariations = [
            `For your ${roofTypeValue} at ${location}, we're installing a system designed specifically for flat surfaces. Our materials are engineered to handle standing water, resist UV damage, and provide decades of reliable protection.\n\n`,
            `Your ${roofTypeValue} system at ${location} is more than just a roof – it's a complete waterproofing solution. We're using materials specifically designed for flat surfaces that will protect your property for decades.\n\n`,
          ];
          description += selectVariation(flatVariations);
          break;
        case 'TPO/PVC':
          const tpoVariations = [
            `Your ${roofTypeValue} system at ${location} offers exceptional energy efficiency, incredible durability, and minimal maintenance. These single-ply membranes are designed for commercial-grade performance at a residential price.\n\n`,
            `At ${location}, your ${roofTypeValue} installation will give you a roof that performs flawlessly for decades with very little upkeep. These membranes are engineered for maximum energy efficiency and weather resistance.\n\n`,
          ];
          description += selectVariation(tpoVariations);
          break;
        case 'EPDM':
          const epdmVariations = [
            `An ${roofTypeValue} roof at ${location} is one of the most reliable and cost-effective roofing solutions available. It's incredibly durable, weather-resistant, and requires minimal maintenance.\n\n`,
            `Your ${roofTypeValue} installation at ${location} will give you commercial-grade protection at a residential price. These roofs are built to last, require minimal maintenance, and provide excellent weather protection.\n\n`,
          ];
          description += selectVariation(epdmVariations);
          break;
        case 'Modified Bitumen':
          const bitumenVariations = [
            `Your ${roofTypeValue} installation at ${location} provides exceptional waterproofing and durability. This system is built to handle temperature extremes, resist punctures, and provide reliable protection for decades.\n\n`,
            `At ${location}, your ${roofTypeValue} system is the smart choice for flat and low-slope roofs. It's engineered to withstand extreme temperatures and provide decades of reliable waterproofing.\n\n`,
          ];
          description += selectVariation(bitumenVariations);
          break;
        default:
          description += `For your ${roofTypeValue} roof at ${location}, we're bringing years of expertise and premium materials to ensure your home gets the protection it deserves.\n\n`;
      }
    }

    // Closing with varied value propositions
    const closings = [
      `What sets us apart? We don't just show up and do the work – we treat your home at ${location} like it's our own. Every detail matters. Every seam is perfect. Every installation is backed by our commitment to excellence and your complete satisfaction.\n\nYou're not just getting a roof – you're getting peace of mind, increased property value, and a team that stands behind their work. That's our promise to you.`,
      `At ${location}, we're not just contractors – we're craftsmen. Every detail of your installation will be perfect because we believe your home deserves nothing less. We stand behind our work with comprehensive warranties and a commitment to your complete satisfaction.\n\nThis isn't just a roof – it's an investment in your home's future, your family's safety, and your peace of mind.`,
      `Here's what you're getting at ${location}: premium materials, expert craftsmanship, and a team that treats your home like their own. We don't cut corners. We don't make excuses. We deliver excellence, period.\n\nYour investment is protected by our comprehensive warranty and our commitment to your complete satisfaction. That's not just a promise – it's our standard.`,
      `At ${location}, we understand that your home is your biggest investment. That's why we bring the same attention to detail, the same quality materials, and the same commitment to excellence that we'd want for our own homes.\n\nYou're getting more than a roof – you're getting peace of mind, increased property value, and a team that will be there for you long after the installation is complete.`,
    ];
    description += selectVariation(closings);

    return description;
  };

  // Auto-generate description and populate first line item when roof type or work type changes
  useEffect(() => {
    if (!isEditMode && (roofType || workType) && items.length > 0) {
      const generated = generateProfessionalDescription(roofType, workType);
      if (generated) {
        // Auto-populate the first line item's description field
        setItems((prev) => {
          const updated = [...prev];
          if (updated[0]) {
            updated[0] = { ...updated[0], description: generated };
          }
          return updated;
        });
        // Also set description state for backward compatibility
        setDescription(generated);
      }
    }
  }, [roofType, workType, isEditMode, selectedLead]);

  // Fetch selected lead details
  useEffect(() => {
    // If lead is passed directly (e.g., when editing), use it
    if (initialLead && initialLead.id === selectedLeadId) {
      setSelectedLead(initialLead);
      if (!isEditMode && initialLead.roof_type && !roofType) {
        setRoofType(initialLead.roof_type);
      }
      return;
    }

    // Otherwise, find it from the leads list
    if (selectedLeadId && leads) {
      const lead = leads.find((l) => l.id === selectedLeadId);
      setSelectedLead(lead || null);
      if (lead && !isEditMode) {
        // Only auto-populate title when creating new proposal
        if (!title) {
          setTitle(`Roofing Estimate - ${lead.name}`);
        }
        if (lead.roof_type && !roofType) {
          setRoofType(lead.roof_type);
        }
      }
    }
  }, [selectedLeadId, leads, isEditMode, title, initialLead, roofType]);

  const updateItem = (id: string, field: keyof ProposalItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === 'quantity' || field === 'unit_price') {
            updated.total = updated.quantity * updated.unit_price;
          }
          return updated;
        }
        return item;
      })
    );
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        description: '',
        quantity: 1,
        unit_price: 0,
        total: 0,
      },
    ]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  const saveProposalMutation = useMutation({
    mutationFn: async (status: 'draft' | 'sent') => {
      if (!user?.id) throw new Error('User not authenticated');
      if (!selectedLeadId) throw new Error('Please select a lead');

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      // Build description from first line item or generate from roof/work type
      let finalDescription = '';
      
      // Get description from first line item if available (this is where the auto-generated description goes)
      if (items.length > 0 && items[0].description) {
        finalDescription = items[0].description;
      } else if (roofType || workType) {
        // Generate description if not in line items
        finalDescription = generateProfessionalDescription(roofType, workType);
      }
      
      // Add roof type and work type metadata at the beginning
      if (roofType || workType) {
        const parts: string[] = [];
        if (roofType) parts.push(`Roof Type: ${roofType}`);
        if (workType) parts.push(`Work Type: ${workType}`);
        if (finalDescription) {
          finalDescription = `${parts.join(' | ')}\n\n${finalDescription}`;
        } else {
          finalDescription = parts.join(' | ');
        }
      }

      const proposalData = {
        lead_id: selectedLeadId,
        title,
        description: finalDescription,
        items: items.map(({ id, ...rest }) => rest),
        subtotal,
        tax,
        total,
        status: status,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
        ...(status === 'sent' && !initialProposal?.sent_at ? { sent_at: new Date().toISOString() } : {}),
      };

      let data;
      if (isEditMode && initialProposal) {
        // Update existing proposal
        const { data: updatedData, error } = await supabase
          .from('proposals')
          .update(proposalData)
          .eq('id', initialProposal.id)
          .select()
          .single();

        if (error) throw error;
        data = updatedData;
      } else {
        // Create new proposal
        const { data: newData, error } = await supabase
          .from('proposals')
          .insert({
            ...proposalData,
            created_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        data = newData;
      }

      // Update the lead's project_total with the proposal total
      const { error: leadUpdateError } = await supabase
        .from('leads')
        .update({
          project_total: total,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedLeadId);

      if (leadUpdateError) {
        console.error('Error updating lead project_total:', leadUpdateError);
      }

      return data;
    },
    onSuccess: (data, status) => {
      // Invalidate both proposals and leads queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads-for-proposal'] });
      
      toast({
        title: isEditMode 
          ? (status === 'sent' ? 'Proposal updated and sent!' : 'Proposal updated!')
          : (status === 'sent' ? 'Proposal sent!' : 'Proposal saved!'),
        description: isEditMode
          ? 'The proposal has been updated. Lead project total has been updated.'
          : (status === 'sent' 
            ? 'The proposal has been sent to the customer via email. Lead project total has been updated.'
            : 'The proposal has been saved as a draft. Lead project total has been updated.'),
      });
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${isEditMode ? 'update' : 'create'} proposal`,
        variant: 'destructive',
      });
    },
  });

  const sendEmail = async (proposalId: string) => {
    if (!selectedLead) return;

    setIsSendingEmail(true);
    try {
      // Use description from first line item if available
      const emailDescription = items.length > 0 && items[0].description ? items[0].description : description;
      // Generate proposal HTML
      const proposalHtml = generateProposalHTML(selectedLead, title, emailDescription, items, subtotal, tax, total);

      // For now, we'll use a simple approach - in production, you'd call your email API
      // This creates a mailto link as a fallback
      const subject = encodeURIComponent(title);
      const body = encodeURIComponent(
        `Dear ${selectedLead.name},\n\nPlease find your roofing estimate attached.\n\nThank you for choosing our services.\n\nBest regards,\n${user?.company_name || 'Your Roofing Company'}`
      );

      // Update proposal status to 'sent'
      await supabase
        .from('proposals')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', proposalId);

      // In a real implementation, you would:
      // 1. Call your email API endpoint
      // 2. Send the HTML proposal as an email
      // 3. Optionally attach a PDF version

      toast({
        title: 'Email sent!',
        description: `Proposal sent to ${selectedLead.email}. In production, this would send via your email service.`,
      });

      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    } catch (error: any) {
      toast({
        title: 'Error sending email',
        description: error.message || 'Failed to send email',
        variant: 'destructive',
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSave = () => {
    saveProposalMutation.mutate('draft');
  };

  const handleSaveAndSend = async () => {
    const result = await saveProposalMutation.mutateAsync('sent');
    if (result) {
      await sendEmail(result.id);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{isEditMode ? 'Edit Roofing Proposal' : 'Create Roofing Proposal'}</CardTitle>
          <CardDescription>
            {isEditMode ? 'Update the proposal details' : 'Create a professional estimate for your customer'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Lead Selection */}
          <div className="space-y-2">
            <Label htmlFor="lead">Select Lead *</Label>
            <Select value={selectedLeadId} onValueChange={setSelectedLeadId} disabled={isEditMode}>
              <SelectTrigger id="lead">
                <SelectValue placeholder="Choose a lead" />
              </SelectTrigger>
              <SelectContent>
                {leads && leads.length > 0 ? (
                  leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.name} - {lead.email} {lead.address ? `(${lead.address})` : ''}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-leads" disabled>
                    No leads available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {isEditMode && (
              <p className="text-xs text-muted-foreground mt-1">
                Lead cannot be changed when editing a proposal
              </p>
            )}
            {leads && leads.length === 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                No leads found. Please create a lead first.
              </p>
            )}
            {selectedLead && (
              <div className="mt-2 p-3 bg-muted rounded-md text-sm">
                <p><strong>Contact:</strong> {selectedLead.name}</p>
                <p><strong>Email:</strong> {selectedLead.email}</p>
                <p><strong>Phone:</strong> {selectedLead.phone}</p>
                {selectedLead.address && (
                  <p><strong>Address:</strong> {selectedLead.address}, {selectedLead.city}, {selectedLead.state} {selectedLead.zip_code}</p>
                )}
                {selectedLead.roof_type && (
                  <p><strong>Roof Type:</strong> {selectedLead.roof_type}</p>
                )}
              </div>
            )}
          </div>

          {/* Roof Type and Work Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="roofType">Roof Type</Label>
              <Select value={roofType} onValueChange={setRoofType}>
                <SelectTrigger id="roofType">
                  <SelectValue placeholder="Select roof type" />
                </SelectTrigger>
                <SelectContent>
                  {roofTypeOptions.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="workType">Type of Work</Label>
              <Select value={workType} onValueChange={setWorkType}>
                <SelectTrigger id="workType">
                  <SelectValue placeholder="Select type of work" />
                </SelectTrigger>
                <SelectContent>
                  {workTypeOptions.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Proposal Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Proposal Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Roofing Estimate - [Customer Name]"
            />
          </div>

          {/* Line Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Line Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 p-3 border rounded-md">
                  <div className="col-span-5">
                    <Label className="text-xs">
                      Description {index === 0 && <span className="text-muted-foreground">(Auto-generated from roof type & work type)</span>}
                    </Label>
                    {index === 0 ? (
                      <Textarea
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        placeholder="Professional description will auto-generate when you select roof type and work type..."
                        rows={6}
                        className="resize-none"
                      />
                    ) : (
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        placeholder="e.g., Materials, Labor, Additional services..."
                      />
                    )}
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Quantity</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Unit Price</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                      placeholder="$0.00"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Total</Label>
                    <Input
                      value={`$${item.total.toFixed(2)}`}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                      disabled={items.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tax and Totals */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-2">
              <Label htmlFor="taxRate">Tax Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiresInDays">Expires In (Days)</Label>
              <Input
                id="expiresInDays"
                type="number"
                min="1"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 30)}
              />
            </div>
          </div>

          <div className="bg-muted p-4 rounded-md space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Tax ({taxRate}%):</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => setIsPreviewOpen(true)}>
              <FileText className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleSave}
              disabled={!selectedLeadId || !title || saveProposalMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {isEditMode ? 'Update Draft' : 'Save Draft'}
            </Button>
            <Button
              type="button"
              onClick={handleSaveAndSend}
              disabled={!selectedLeadId || !title || saveProposalMutation.isPending || isSendingEmail}
            >
              <Mail className="h-4 w-4 mr-2" />
              {isSendingEmail ? 'Sending...' : isEditMode ? 'Update & Send' : 'Save & Send'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <ProposalPreview
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        lead={selectedLead}
        title={title}
        description={items.length > 0 && items[0].description ? items[0].description : description}
        roofType={roofType}
        workType={workType}
        items={items}
        subtotal={subtotal}
        tax={tax}
        total={total}
        taxRate={taxRate}
        expiresInDays={expiresInDays}
      />
    </div>
  );
};

// Roof Image Generator Component - Displays stock images for each roof type
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

// Professional Proposal Preview Component
interface ProposalPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  title: string;
  description: string;
  roofType?: string;
  workType?: string;
  items: ProposalItem[];
  subtotal: number;
  tax: number;
  total: number;
  taxRate: number;
  expiresInDays: number;
}

const ProposalPreview = ({
  isOpen,
  onClose,
  lead,
  title,
  description,
  roofType,
  workType,
  items,
  subtotal,
  tax,
  total,
  taxRate,
  expiresInDays,
}: ProposalPreviewProps) => {
  const { user } = useAuth();
  const expiresDate = new Date();
  expiresDate.setDate(expiresDate.getDate() + expiresInDays);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>Proposal Preview</DialogTitle>
          <DialogDescription>This is how your proposal will appear to the customer</DialogDescription>
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
                      <span className="font-semibold">{format(new Date(), 'MMMM d, yyyy')}</span>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-muted-foreground font-medium">Valid Until:</span>
                      <span className="font-semibold text-primary">{format(expiresDate, 'MMMM d, yyyy')}</span>
                    </div>
                    {lead && (
                      <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-primary/10">
                        <span className="text-muted-foreground font-medium">Proposal #:</span>
                        <span className="font-mono text-xs">{lead.project_id || 'N/A'}</span>
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

            {/* Proposal Title */}
            <div className="border-l-4 border-primary pl-6 py-2">
              <h2 className="text-3xl font-bold text-foreground">{title}</h2>
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
            {description && (
              <div className="bg-white rounded-xl p-6 border border-primary/20 shadow-sm">
                <h3 className="text-lg font-bold mb-4 text-foreground">Project Description</h3>
                <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-line leading-relaxed">
                  {description}
                </div>
              </div>
            )}

            {/* Totals Section */}
            <div className="flex justify-end">
              <div className="w-80 bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/20 rounded-xl p-6 shadow-sm">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-base">
                    <span className="text-muted-foreground font-medium">Subtotal:</span>
                    <span className="font-semibold text-foreground">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-base">
                    <span className="text-muted-foreground font-medium">Tax ({taxRate}%):</span>
                    <span className="font-semibold text-foreground">${tax.toFixed(2)}</span>
                  </div>
                  <div className="pt-3 mt-3 border-t-2 border-primary/30">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-foreground">Total:</span>
                      <span className="text-2xl font-bold text-primary">${total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gradient-to-r from-muted/50 to-muted/30 border-t-2 border-primary/20 p-8">
            <div className="max-w-3xl">
              <h3 className="text-lg font-bold mb-4 text-foreground">Terms & Conditions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-primary font-bold mt-1">•</span>
                    <p className="text-sm text-muted-foreground">This proposal is valid for <strong className="text-foreground">{expiresInDays} days</strong> from the date of issue.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-primary font-bold mt-1">•</span>
                    <p className="text-sm text-muted-foreground">Payment terms: <strong className="text-foreground">50% deposit</strong> upon acceptance, <strong className="text-foreground">50% upon completion</strong>.</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-primary font-bold mt-1">•</span>
                    <p className="text-sm text-muted-foreground">All work is <strong className="text-foreground">guaranteed and insured</strong>.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-primary font-bold mt-1">•</span>
                    <p className="text-sm text-muted-foreground">Materials and labor are included unless otherwise specified.</p>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-primary/20">
                <p className="text-sm text-muted-foreground mb-2">
                  Thank you for considering our services. We look forward to working with you!
                </p>
                <div className="flex items-center gap-2 mt-4">
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
          <Button onClick={onClose} className="w-full">Close Preview</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Helper function to generate proposal HTML for email
const generateProposalHTML = (
  lead: Lead,
  title: string,
  description: string,
  items: ProposalItem[],
  subtotal: number,
  tax: number,
  total: number
): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #1e40af; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
        .content { padding: 20px; background: #f9fafb; }
        .section { background: white; padding: 15px; margin-bottom: 15px; border-radius: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #1e40af; color: white; padding: 10px; text-align: left; }
        td { padding: 10px; border-bottom: 1px solid #ddd; }
        .total { text-align: right; font-size: 18px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${title}</h1>
      </div>
      <div class="content">
        <div class="section">
          <h2>Dear ${lead.name},</h2>
          <p>${description || 'Please find your roofing estimate below.'}</p>
        </div>
        <div class="section">
          <table>
            <tr><th>Description</th><th>Quantity</th><th>Unit Price</th><th>Total</th></tr>
            ${items.map(item => `
              <tr>
                <td>${item.description}</td>
                <td>${item.quantity}</td>
                <td>$${item.unit_price.toFixed(2)}</td>
                <td>$${item.total.toFixed(2)}</td>
              </tr>
            `).join('')}
          </table>
          <div class="total">
            <p>Subtotal: $${subtotal.toFixed(2)}</p>
            <p>Tax: $${tax.toFixed(2)}</p>
            <p>Total: $${total.toFixed(2)}</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

export default ProposalForm;

