import { useState, useRef } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase, Lead } from '@/lib/supabase';
// Note: Deepgram SDK has CORS issues in browser, using fetch API directly instead
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Phone, Search, Filter, RefreshCw, CheckCircle2, XCircle, Clock, 
  Loader2, Mail, MapPin, Settings, Save, Edit, Eye, EyeOff, Mic, Play, Sparkles, Volume2,
  Bot, Zap, Wand2, Brain, MessageSquare, Radio, Activity, Trash2, Plus, X, MoreVertical
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

interface CallLog {
  id: string;
  lead_id: string | null;
  automation_type: string;
  status: string;
  recipient: string;
  content: string | null;
  metadata: any;
  created_at: string;
}

interface TwilioSettings {
  account_sid: string;
  auth_token: string;
  inbound_number: string;
  outbound_number: string;
}


interface VoiceAgent {
  id: string;
  name: string;
  voiceProvider: 'deepgram';
  systemPrompt: string;
  greeting?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  settings?: {
    deepgram?: DeepgramSettings;
  };
}

interface DeepgramSettings {
  api_key?: string;
  audio: {
    input: {
      encoding: string;
      sample_rate: number;
    };
    output: {
      encoding: string;
      sample_rate: number;
      container: string;
    };
  };
  agent: {
    language: string;
    speak: {
      provider: {
        type: string;
        model?: string;
        model_id?: string;
        voice?: string | {
          mode: string;
          id: string;
        };
        language_code?: string;
        engine?: string;
        credentials?: {
          type: string;
          region: string;
          access_key_id?: string;
          secret_access_key?: string;
          session_token?: string;
        };
      };
      endpoint?: {
        url: string;
        headers?: Record<string, string>;
      };
    };
    listen: {
      provider: {
        type: string;
        version?: string;
        model: string;
      };
    };
    think: {
      provider: {
        type: string;
        model?: string;
        temperature?: number | string;
        credentials?: {
          type: string;
          region: string;
          access_key_id?: string;
          secret_access_key?: string;
          session_token?: string;
        };
      };
      endpoint?: {
        url: string;
        headers?: Record<string, string>;
      };
      prompt: string;
    };
    greeting: string;
  };
}


const Calling = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('call-leads');
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>('all');
  const [showAuthToken, setShowAuthToken] = useState(false);
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [isEditingDeepgram, setIsEditingDeepgram] = useState(false);
  const [showDeepgramApiKey, setShowDeepgramApiKey] = useState(false);
  const [testText, setTestText] = useState('Hello, this is a test of the voice agent system.');
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const [isTestingAgentVoice, setIsTestingAgentVoice] = useState(false);
  const [testingVoiceActor, setTestingVoiceActor] = useState<string | null>(null);
  const [voiceActorTestTexts, setVoiceActorTestTexts] = useState<Record<string, string>>({});
  const [customModelId, setCustomModelId] = useState('');
  const [customVoiceId, setCustomVoiceId] = useState('');
  const [selectedVoiceProvider, setSelectedVoiceProvider] = useState<'deepgram'>('deepgram');
  const [agentSystemPrompt, setAgentSystemPrompt] = useState('');
  const [isAgentActive, setIsAgentActive] = useState(false);
  
  // Agent management state
  const [agents, setAgents] = useState<VoiceAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<VoiceAgent | null>(null);
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);
  const [editingAgent, setEditingAgent] = useState<VoiceAgent | null>(null);
  const [agentName, setAgentName] = useState('');
  
  // Agent selection dialog state
  const [showAgentDialog, setShowAgentDialog] = useState(false);
  const [selectedLeadForCall, setSelectedLeadForCall] = useState<Lead | null>(null);
  const [selectedAgentForCall, setSelectedAgentForCall] = useState<VoiceAgent | null>(null);
  const [isInitiatingCall, setIsInitiatingCall] = useState(false);
  
  // Refs for scrolling to provider sections
  const deepgramSectionRef = useRef<HTMLDivElement>(null);
  
  const [twilioSettings, setTwilioSettings] = useState<TwilioSettings>({
    account_sid: '',
    auth_token: '',
    inbound_number: '',
    outbound_number: '',
  });


  const [deepgramSettings, setDeepgramSettings] = useState<DeepgramSettings>({
    api_key: '',
    audio: {
      input: {
        encoding: 'mulaw', // Twilio Media Stream uses PCMU (μ-law) at 8000 Hz
        sample_rate: 8000,  // Twilio Media Stream standard sample rate
      },
      output: {
        encoding: 'mulaw', // Match Twilio Media Stream output format
        sample_rate: 8000,  // Match Twilio Media Stream standard sample rate
        container: 'none',
      },
    },
    agent: {
      language: 'en',
      speak: {
        provider: {
          type: 'deepgram',
          model: 'aura-2-odysseus-en',
        },
      },
      listen: {
        provider: {
          type: 'deepgram',
          version: 'v2',
          model: 'flux-general-en',
        },
      },
      think: {
        provider: {
          type: 'anthropic',
          model: 'claude-3-5-haiku-latest',
          temperature: 0.7,
        },
        prompt: '#Role\nYou are a virtual customer support assistant speaking to customers over the phone. Your task is to help them understand the policy for broken or damaged phones.\n\n#General Guidelines\nBe warm, helpful, and professional.\nSpeak clearly and naturally in plain language.\nKeep most responses to 1–2 sentences and under 120 characters unless the caller asks for more detail (max: 300 characters).\nDo not use markdown formatting, including code blocks, quotes, bold, links, or italics.\nUse line breaks for lists.\nAvoid repeating phrasing.\nIf a message is unclear, ask for clarification.\nIf the user\'s message is empty, respond with an empty message.\nIf asked how you\'re doing, respond kindly and briefly.\n\n#Voice-Specific Instructions\nSpeak in a conversational tone—your responses will be spoken aloud.\nPause briefly after questions to allow replies.\nConfirm unclear inputs with the customer.\nDo not interrupt.\n\n#Style\nUse a friendly, approachable, professional tone.\nKeep language simple and reassuring.\nMirror the customer\'s tone if they use formal or technical language.\n\n#Call Flow Objective\nGreet the caller and welcome them to MyDeviceCare. Ask how you can help.\nIf they mention a broken, cracked, or damaged phone, ask:\n"Can you briefly describe what happened to the phone?"\nBased on their response, explain the policy:\nCovered under warranty (if it\'s a defect):\n"If the phone stopped working due to a manufacturing issue, it may be covered under warranty."Covered under protection plan (if they have one):\n"If you purchased a protection plan, accidental damage may be covered."\nNot covered (physical damage with no plan):\n"If the phone was physically damaged and there\'s no protection plan, it may not be covered."\nOffer to check their coverage:\n"Would you like me to check whether your phone is under warranty or a protection plan?"\nIf they say yes, ask for the make, model and year of purchase of the phone.\nKnown Test Inputs\nIf the phone is less than 5 years old →\n"Yes, your phone is covered under the protection plan. A repair can be scheduled."\nIf they say "broken screen, no plan" →\n"Unfortunately, screen damage without a plan isn\'t covered. A repair fee may apply."\n\n#Off-Scope Questions\nIf asked about pricing, store locations, or device compatibility:\n"I recommend speaking with a support representative for more details on that."\n\n#Customer Considerations\nCallers may be upset or frustrated. Stay calm, patient, and helpful—especially if the device is essential or recently damaged.\n\n#Closing\nAlways ask:\n"Is there anything else I can help you with today?"\nThen thank them and say:\n"Thanks for calling MyDeviceCare. Hope your phone is back to normal soon!"',
      },
      greeting: 'Hi! You\'re speaking with our customer support agent. We can help you understand the policy for damaged phones. Try the scenarios listed below. How may I assist you?',
    },
  });

  
  const queryClient = useQueryClient();

  // Fetch leads (for reference in call logs and for making calls)
  const { data: leads, isLoading: leadsLoading } = useQuery({
    queryKey: ['leads', 'calling', leadStatusFilter],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (leadStatusFilter !== 'all') {
        query = query.eq('status', leadStatusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Lead[];
    },
  });


  // Fetch Deepgram settings
  const { data: savedDeepgramSettings, isLoading: deepgramSettingsLoading } = useQuery({
    queryKey: ['deepgram-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('key', 'deepgram_integration')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching Deepgram settings:', error);
        throw error;
      }

      if (data?.value) {
        const settings = data.value as DeepgramSettings;
        setDeepgramSettings(settings);
        return settings;
      }
      return null;
    },
    retry: 1,
  });

  // Mutation to save Deepgram settings
  const saveDeepgramMutation = useMutation({
    mutationFn: async (settings: DeepgramSettings) => {
      const { data, error } = await supabase
        .from('settings')
        .upsert({
          key: 'deepgram_integration',
          value: settings,
          description: 'Deepgram voice agent integration settings',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'key',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deepgram-settings'] });
      toast({
        title: 'Settings saved',
        description: 'Deepgram voice agent settings have been saved successfully.',
      });
      setIsEditingDeepgram(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error saving settings',
        description: error.message || 'Failed to save Deepgram settings.',
        variant: 'destructive',
      });
    },
  });

  // Fetch voice agents
  const { data: savedAgents, isLoading: agentsLoading } = useQuery({
    queryKey: ['voice-agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .like('key', 'voice_agent_%')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching voice agents:', error);
        throw error;
      }

      if (data) {
        const agentsList = data.map((item) => ({
          id: item.key.replace('voice_agent_', ''),
          ...(item.value as Omit<VoiceAgent, 'id'>),
        }));
        setAgents(agentsList);
        return agentsList;
      }
      return [];
    },
  });

  // Mutation to save voice agent
  const saveAgentMutation = useMutation({
    mutationFn: async (agent: VoiceAgent) => {
      const agentData = {
        name: agent.name,
        voiceProvider: agent.voiceProvider,
        systemPrompt: agent.systemPrompt,
        greeting: agent.greeting,
        isActive: agent.isActive,
        createdAt: agent.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        settings: agent.settings,
      };

      const { data, error } = await supabase
        .from('settings')
        .upsert({
          key: `voice_agent_${agent.id}`,
          value: agentData,
          description: `Voice agent: ${agent.name}`,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'key',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-agents'] });
      setIsCreatingAgent(false);
      setEditingAgent(null);
      setSelectedAgent(null);
      toast({
        title: 'Agent saved',
        description: 'Voice agent has been saved successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error saving agent',
        description: error.message || 'Failed to save voice agent.',
        variant: 'destructive',
      });
    },
  });

  // Mutation to delete voice agent
  const deleteAgentMutation = useMutation({
    mutationFn: async (agentId: string) => {
      const { error } = await supabase
        .from('settings')
        .delete()
        .eq('key', `voice_agent_${agentId}`);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-agents'] });
      if (selectedAgent?.id === editingAgent?.id) {
        setSelectedAgent(null);
        setEditingAgent(null);
      }
      toast({
        title: 'Agent deleted',
        description: 'Voice agent has been deleted successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting agent',
        description: error.message || 'Failed to delete voice agent.',
        variant: 'destructive',
      });
    },
  });


  // Test individual voice actor
  const testVoiceActor = async (modelId: string, testText: string) => {
    if (!testText.trim()) {
      toast({
        title: 'Text required',
        description: 'Please enter some text to test the voice.',
        variant: 'destructive',
      });
      return;
    }

    const apiKey = savedDeepgramSettings?.api_key;
    if (!apiKey) {
      toast({
        title: 'API key required',
        description: 'Please configure your Deepgram API key first.',
        variant: 'destructive',
      });
      return;
    }

    setTestingVoiceActor(modelId);

    try {
      // Use fetch to call Deepgram TTS API directly
      // Deepgram TTS endpoint: https://api.deepgram.com/v1/speak
      const response = await fetch(`https://api.deepgram.com/v1/speak?model=${encodeURIComponent(modelId)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: testText,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Deepgram API error: ${response.status} - ${errorText}`);
      }

      // Get the audio blob directly from the response
      const audioBlob = await response.blob();

      if (!audioBlob || audioBlob.size === 0) {
        throw new Error('Received empty audio response from Deepgram');
      }

      // Play the audio
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        toast({
          title: 'Audio playback failed',
          description: 'The audio format may not be supported.',
          variant: 'destructive',
        });
        URL.revokeObjectURL(audioUrl);
        setTestingVoiceActor(null);
      };

      await audio.play();

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setTestingVoiceActor(null);
      };
    } catch (error: any) {
      console.error('Error testing voice actor:', error);
      toast({
        title: 'Voice test failed',
        description: error.message || 'Failed to generate or play audio.',
        variant: 'destructive',
      });
      setTestingVoiceActor(null);
    }
  };

  // Test agent voice function (for Deepgram agent TTS providers)
  const testAgentVoice = async () => {
    if (!testText.trim()) {
      toast({
        title: 'Text required',
        description: 'Please enter some text to test the voice.',
        variant: 'destructive',
      });
      return;
    }

    const speakProvider = deepgramSettings.agent?.speak?.provider;
    if (!speakProvider || !speakProvider.type) {
      toast({
        title: 'TTS provider not configured',
        description: 'Please configure a TTS provider in the Speak Provider settings.',
        variant: 'destructive',
      });
      return;
    }

    setIsTestingAgentVoice(true);

    try {
      let audioBlob: Blob;
      const providerType = speakProvider.type;

      if (providerType === 'deepgram') {
        // Deepgram TTS using SDK
        const model = speakProvider.model || 'aura-2-thalia-en';
        const apiKey = savedDeepgramSettings?.api_key;
        
        if (!apiKey) {
          throw new Error('Deepgram API key not configured');
        }

        // Use fetch to call Deepgram TTS API directly (SDK has CORS issues in browser)
        const response = await fetch(`https://api.deepgram.com/v1/speak?model=${encodeURIComponent(model)}`, {
          method: 'POST',
          headers: {
            'Authorization': `Token ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: testText,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Deepgram API error: ${response.status} - ${errorText}`);
        }

        // Get the audio blob directly from the response
        audioBlob = await response.blob();

        if (!audioBlob || audioBlob.size === 0) {
          throw new Error('Received empty audio response from Deepgram');
        }
      } else if (providerType === 'open_ai') {
        // OpenAI TTS
        const apiKey = speakProvider.api_key || 
                      deepgramSettings.agent.speak.endpoint?.headers?.['authorization']?.replace('Bearer ', '');
        
        if (!apiKey) {
          throw new Error('OpenAI API key not configured');
        }

        const model = speakProvider.model || 'tts-1';
        const voice = typeof speakProvider.voice === 'string' ? speakProvider.voice : 'alloy';

        const response = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model,
            input: testText,
            voice: voice,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
        }

        audioBlob = await response.blob();
      } else if (providerType === 'eleven_labs') {
        // Eleven Labs TTS
        const apiKey = speakProvider.api_key || 
                      deepgramSettings.agent.speak.endpoint?.headers?.['xi-api-key'];
        
        if (!apiKey) {
          throw new Error('Eleven Labs API key not configured');
        }

        const voiceId = speakProvider.voice_id || '21m00Tcm4TlvDq8ikWAM';
        const modelId = speakProvider.model_id || 'eleven_turbo_v2_5';

        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': apiKey,
          },
          body: JSON.stringify({
            text: testText,
            model_id: modelId,
            language_code: speakProvider.language_code || 'en-US',
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Eleven Labs API error: ${response.status} - ${errorText}`);
        }

        audioBlob = await response.blob();
      } else if (providerType === 'aws_polly') {
        // AWS Polly TTS - requires backend proxy
        toast({
          title: 'AWS Polly testing',
          description: 'AWS Polly voice testing requires backend configuration. Please test during a call.',
          variant: 'default',
        });
        setIsTestingAgentVoice(false);
        return;
      } else {
        throw new Error(`Unsupported TTS provider: ${providerType}`);
      }

      // Play the audio
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        toast({
          title: 'Audio playback failed',
          description: 'The audio format may not be supported.',
          variant: 'destructive',
        });
        URL.revokeObjectURL(audioUrl);
        setIsTestingAgentVoice(false);
      };

      await audio.play();
      toast({
        title: 'Voice test successful',
        description: `Audio generated and played successfully using ${providerType}.`,
      });

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setIsTestingAgentVoice(false);
      };
    } catch (error: any) {
      console.error('Error testing agent voice:', error);
      toast({
        title: 'Voice test failed',
        description: error.message || 'Failed to generate or play audio.',
        variant: 'destructive',
      });
      setIsTestingAgentVoice(false);
    }
  };


  // Fetch Twilio settings
  const { data: savedTwilioSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['twilio-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('key', 'twilio_integration')
        .maybeSingle(); // Use maybeSingle() instead of single() to handle no rows gracefully

      if (error) {
        // Only throw if it's not a "no rows" error
        if (error.code !== 'PGRST116') {
          console.error('Error fetching Twilio settings:', error);
          throw error;
        }
        return null;
      }

      if (data?.value) {
        const settings = data.value as TwilioSettings;
        setTwilioSettings(settings);
        return settings;
      }
      return null;
    },
    retry: 1, // Only retry once on failure
  });

  // Mutation to save Twilio settings
  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: TwilioSettings) => {
      const { data, error } = await supabase
        .from('settings')
        .upsert({
          key: 'twilio_integration',
          value: settings,
          description: 'Twilio integration settings for calling functionality',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'key',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['twilio-settings'] });
      setIsEditingSettings(false);
      toast({
        title: 'Settings saved',
        description: 'Twilio integration settings have been saved successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error saving settings',
        description: error.message || 'Failed to save Twilio settings.',
        variant: 'destructive',
      });
    },
  });

  // Mutation to log a manual call
  const logCallMutation = useMutation({
    mutationFn: async ({ leadId, phoneNumber }: { leadId: string; phoneNumber: string }) => {
      const { data, error } = await supabase
        .from('automation_logs')
        .insert({
          lead_id: leadId,
          automation_type: 'call',
          status: 'completed',
          recipient: phoneNumber,
          content: 'Manual call initiated by roofer',
          metadata: { manual_call: true, initiated_at: new Date().toISOString() },
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-logs'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  // Fetch call logs
  const { data: callLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['call-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automation_logs')
        .select('*')
        .eq('automation_type', 'call')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as CallLog[];
    },
  });

  const filteredLogs = callLogs?.filter((log) => {
    const lead = leads?.find((l) => l.id === log.lead_id);
    const searchLower = searchTerm.toLowerCase();
    return (
      (lead?.name.toLowerCase().includes(searchLower) ||
        lead?.email.toLowerCase().includes(searchLower) ||
        lead?.phone.includes(searchTerm) ||
        log.recipient.includes(searchTerm)) &&
      (statusFilter === 'all' || log.status === statusFilter)
    );
  }) || [];

  // Filter leads for the call leads tab
  const filteredLeads = leads?.filter((lead) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      lead.name.toLowerCase().includes(searchLower) ||
      lead.email.toLowerCase().includes(searchLower) ||
      lead.phone.includes(searchTerm) ||
      (lead.address && lead.address.toLowerCase().includes(searchLower)) ||
      (lead.project_id && lead.project_id.toLowerCase().includes(searchLower))
    );
  }) || [];

  // Handle making a call
  const handleMakeCall = async (lead: Lead, agent?: VoiceAgent) => {
    console.log('handleMakeCall called:', { lead: lead.name, agent: agent?.name, hasAgent: !!agent });
    
    // Check if Twilio settings are configured
    if (!savedTwilioSettings || !savedTwilioSettings.account_sid || !savedTwilioSettings.auth_token) {
      console.error('Twilio not configured');
      toast({
        title: 'Twilio not configured',
        description: 'Please configure your Twilio settings in the Settings tab before making calls.',
        variant: 'destructive',
      });
      setActiveTab('settings');
      return;
    }

    // Format phone number (remove any non-digit characters except +)
    const phoneNumber = lead.phone.replace(/[^\d+]/g, '');
    console.log('Formatted phone number:', phoneNumber);

    // If using a Voice Agent
    if (agent) {
      console.log('Using agent:', agent.name, 'Provider:', agent.voiceProvider);
      // Check if agent has required settings, merge with saved settings if needed
      if (agent.voiceProvider === 'deepgram') {
        console.log('Processing Deepgram agent...');
        
        // First check if saved Deepgram settings exist
        if (!savedDeepgramSettings) {
          console.error('❌ No saved Deepgram settings found');
          toast({
            title: 'Deepgram not configured',
            description: 'Please go to the Voice Agent tab → Deepgram section and configure your Deepgram API key and settings first.',
            variant: 'destructive',
          });
          setActiveTab('voice-agent');
          return;
        }
        
        // Merge agent settings with saved Deepgram settings as fallback
        const agentDeepgramSettings = agent.settings?.deepgram || {};
        console.log('Agent Deepgram settings:', {
          hasApiKey: !!agentDeepgramSettings.api_key,
          hasAgent: !!agentDeepgramSettings.agent,
          keys: Object.keys(agentDeepgramSettings)
        });
        console.log('Saved Deepgram settings:', {
          hasApiKey: !!savedDeepgramSettings.api_key,
          hasAgent: !!savedDeepgramSettings.agent,
          apiKeyPreview: savedDeepgramSettings.api_key ? '***' + savedDeepgramSettings.api_key.slice(-4) : 'MISSING'
        });
        
        const mergedSettings = {
          ...savedDeepgramSettings,
          ...agentDeepgramSettings,
          // Ensure API key is preserved (saved settings take priority)
          api_key: savedDeepgramSettings.api_key || agentDeepgramSettings.api_key,
          agent: {
            ...savedDeepgramSettings?.agent,
            ...agentDeepgramSettings.agent,
            think: {
              ...savedDeepgramSettings?.agent?.think,
              ...agentDeepgramSettings.agent?.think,
              prompt: agent.systemPrompt || agentDeepgramSettings.agent?.think?.prompt || savedDeepgramSettings?.agent?.think?.prompt || '',
            },
            greeting: agent.greeting || agentDeepgramSettings.agent?.greeting || savedDeepgramSettings?.agent?.greeting || '',
          },
        };
        
        console.log('Merged settings check:', { 
          hasApiKey: !!mergedSettings.api_key,
          hasAgent: !!mergedSettings.agent,
          prompt: mergedSettings.agent?.think?.prompt?.substring(0, 50) + '...',
          savedApiKey: !!savedDeepgramSettings?.api_key,
          agentApiKey: !!agentDeepgramSettings?.api_key,
          savedSettingsExists: !!savedDeepgramSettings,
          agentSettingsExists: !!agentDeepgramSettings,
          mergedApiKey: mergedSettings.api_key ? '***' + mergedSettings.api_key.slice(-4) : 'MISSING'
        });
        
        // Check if we have an API key (from agent or saved settings)
        if (!mergedSettings.api_key) {
          console.error('❌ No Deepgram API key found in merged settings');
          console.error('Saved Deepgram settings:', savedDeepgramSettings);
          console.error('Agent Deepgram settings:', agentDeepgramSettings);
          console.error('Merged settings (partial):', {
            api_key: mergedSettings.api_key,
            hasAgent: !!mergedSettings.agent,
            agentKeys: Object.keys(mergedSettings.agent || {})
          });
          
          // Check if saved settings exist but are missing API key
          if (savedDeepgramSettings && !savedDeepgramSettings.api_key) {
            toast({
              title: 'Deepgram API key missing',
              description: 'Deepgram settings are saved but missing the API key. Please edit Deepgram settings and add your API key.',
              variant: 'destructive',
            });
          } else if (!savedDeepgramSettings) {
            toast({
              title: 'Deepgram not configured',
              description: 'Please go to the Voice Agent tab → Deepgram section and configure your Deepgram API key and settings.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Deepgram configuration required',
              description: 'Deepgram API key is not configured. Please configure Deepgram settings first.',
              variant: 'destructive',
            });
          }
          setActiveTab('voice-agent');
          return;
        }
        
        console.log('✅ Deepgram API key found, proceeding with call');

        try {
          // Format phone number to E.164 format
          // Remove all non-digits first
          let digitsOnly = phoneNumber.replace(/\D/g, '');
          console.log('Phone number formatting:', { original: phoneNumber, digitsOnly, length: digitsOnly.length });
          
          // Handle different phone number formats
          let formattedPhone = '';
          if (digitsOnly.length === 10) {
            // 10-digit US number, add +1 country code
            formattedPhone = `+1${digitsOnly}`;
            console.log('✅ Formatted as 10-digit US number:', formattedPhone);
          } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
            // 11-digit number starting with 1 (US with country code), add +
            formattedPhone = `+${digitsOnly}`;
            console.log('✅ Formatted as 11-digit US number:', formattedPhone);
          } else if (phoneNumber.startsWith('+')) {
            // Already has +, check if it needs country code
            const withoutPlus = phoneNumber.substring(1).replace(/\D/g, '');
            if (withoutPlus.length === 10) {
              formattedPhone = `+1${withoutPlus}`;
              console.log('✅ Formatted +10-digit as US number:', formattedPhone);
            } else {
              formattedPhone = phoneNumber;
              console.log('⚠️ Using original + format (may be incorrect):', formattedPhone);
            }
          } else {
            // Other format, add + prefix
            formattedPhone = `+${digitsOnly}`;
            console.log('⚠️ Formatted as other format (may be incorrect):', formattedPhone);
          }
          
          console.log('Final formatted phone number:', formattedPhone);
          
          // Format from number
          const fromNumberRaw = (savedTwilioSettings.outbound_number || savedTwilioSettings.inbound_number || '').replace(/\D/g, '');
          let fromNumber = '';
          if (fromNumberRaw.length === 10) {
            fromNumber = `+1${fromNumberRaw}`;
          } else if (fromNumberRaw.length === 11 && fromNumberRaw.startsWith('1')) {
            fromNumber = `+${fromNumberRaw}`;
          } else {
            fromNumber = (savedTwilioSettings.outbound_number || savedTwilioSettings.inbound_number || '').startsWith('+') 
              ? (savedTwilioSettings.outbound_number || savedTwilioSettings.inbound_number)
              : `+${savedTwilioSettings.outbound_number || savedTwilioSettings.inbound_number}`;
          }

          console.log('Making call with:', {
            to: formattedPhone,
            from: fromNumber,
            agent: agent.name,
            backend: 'http://localhost:3000/api/make-call-deepgram',
            hasApiKey: !!mergedSettings.api_key
          });

          const response = await fetch('http://localhost:3000/api/make-call-deepgram', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: formattedPhone,
              from: fromNumber,
              leadId: lead.id,
              settings: mergedSettings, // Use merged settings with agent's system prompt
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('Backend error response:', errorText);
            
            // Parse error message for better user feedback
            let errorMessage = `Backend returned ${response.status}: ${errorText}`;
            try {
              const errorJson = JSON.parse(errorText);
              if (errorJson.error) {
                errorMessage = errorJson.error;
                // Check if it's a Twilio verification error
                if (errorMessage.includes('unverified') || errorMessage.includes('verified numbers')) {
                  errorMessage = `Phone number verification required: ${errorMessage}. Please verify this number in your Twilio console at https://console.twilio.com/us1/develop/phone-numbers/manage/verified`;
                }
              }
            } catch (e) {
              // If parsing fails, use the original error text
            }
            throw new Error(errorMessage);
          }

          const result = await response.json();
          console.log('Call API response:', result);

          if (result.success) {
            toast({
              title: 'Voice Agent call initiated',
              description: `Calling ${lead.name} at ${formattedPhone} with ${agent.name}...`,
              duration: 8000,
            });
            
            // Show info about Twilio trial message if applicable
            setTimeout(() => {
              toast({
                title: '📞 Call in progress',
                description: 'Note: If you hear a Twilio trial account message at the start, the agent will begin speaking right after. This is normal for trial accounts.',
                duration: 10000,
                variant: 'default',
              });
            }, 2000);

            // Log the call
            logCallMutation.mutate(
              { leadId: lead.id, phoneNumber: lead.phone },
              {
                onSuccess: () => {
                  console.log('Call logged successfully');
                },
                onError: (error) => {
                  console.error('Error logging call:', error);
                },
              }
            );
          } else {
            toast({
              title: 'Call failed',
              description: result.error || 'Failed to initiate Voice Agent call.',
              variant: 'destructive',
            });
          }
        } catch (error: any) {
          console.error('Error making Voice Agent call:', error);
          
          let errorMessage = 'Failed to initiate call. ';
          if (error.message?.includes('fetch')) {
            errorMessage += 'Backend server is not running. Please start it with: node app.js';
          } else if (error.message?.includes('unverified') || error.message?.includes('verified numbers')) {
            errorMessage = error.message; // Use the improved error message from above
          } else {
            errorMessage += error.message || 'Unknown error occurred.';
          }
          
          toast({
            title: 'Call failed',
            description: errorMessage,
            variant: 'destructive',
            duration: 10000, // Show for 10 seconds so user can read the verification instructions
          });
        }
        return;
      } else {
        // Unknown voice provider
        toast({
          title: 'Invalid voice provider',
          description: `Voice provider "${agent.voiceProvider}" is not supported.`,
          variant: 'destructive',
        });
        setIsInitiatingCall(false);
        return;
      }
    }

    // Regular tel: link call (no agent)
    const telLink = `tel:${phoneNumber}`;
    
    // Log the call attempt
    logCallMutation.mutate(
      { leadId: lead.id, phoneNumber: lead.phone },
      {
        onSuccess: () => {
          toast({
            title: 'Call logged',
            description: `Call to ${lead.name} has been logged.`,
          });
        },
        onError: (error) => {
          console.error('Error logging call:', error);
          // Still allow the call to proceed even if logging fails
        },
      }
    );

    // Open the phone dialer
    window.location.href = telLink;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
      case 'completed':
      case 'delivered':
        return 'bg-green-500';
      case 'failed':
      case 'busy':
      case 'no-answer':
        return 'bg-red-500';
      case 'pending':
      case 'queued':
      case 'ringing':
        return 'bg-yellow-500';
      case 'in-progress':
        return 'bg-blue-500';
      case 'canceled':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
      case 'completed':
      case 'delivered':
        return <CheckCircle2 className="h-3 w-3" />;
      case 'failed':
      case 'busy':
      case 'no-answer':
        return <XCircle className="h-3 w-3" />;
      case 'pending':
      case 'queued':
      case 'ringing':
        return <Clock className="h-3 w-3" />;
      case 'in-progress':
        return <Clock className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'queued': return 'Queued';
      case 'ringing': return 'Ringing';
      case 'in-progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'busy': return 'Busy';
      case 'failed': return 'Failed';
      case 'no-answer': return 'No Answer';
      case 'canceled': return 'Canceled';
      case 'sent': return 'Sent';
      case 'delivered': return 'Delivered';
      case 'pending': return 'Pending';
      default: return status;
    }
  };

  return (
    <div className="space-y-6 bg-background min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calling</h1>
          <p className="text-muted-foreground mt-1">Call history and logs</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['call-logs'] });
            queryClient.invalidateQueries({ queryKey: ['leads', 'calling'] });
          }}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 max-w-4xl">
          <TabsTrigger value="call-leads" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Call Leads
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Twilio Settings
          </TabsTrigger>
          <TabsTrigger value="voice-agent" className="flex items-center gap-2">
            <Mic className="h-4 w-4" />
            Voice Agent
          </TabsTrigger>
        </TabsList>

        {/* Call Leads Tab */}
        <TabsContent value="call-leads" className="space-y-6 mt-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search leads..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={leadStatusFilter} onValueChange={setLeadStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="needs_follow_up">Needs Follow Up</SelectItem>
                    <SelectItem value="booked">Booked</SelectItem>
                    <SelectItem value="estimate_sent">Estimate Sent</SelectItem>
                    <SelectItem value="post_estimate_follow_up">Post Estimate Follow Up</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => {
                    setLeadStatusFilter('all');
                    setSearchTerm('');
                  }}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Leads List */}
          <Card>
            <CardHeader>
              <CardTitle>Leads to Call</CardTitle>
              <CardDescription>Click the call button to dial a lead directly</CardDescription>
            </CardHeader>
            <CardContent>
              {leadsLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground mt-2 text-sm">Loading leads...</p>
                </div>
              ) : !leads || leads.length === 0 ? (
                <div className="text-center py-12">
                  <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                  <p className="text-muted-foreground text-sm">No leads found</p>
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                  <p className="text-muted-foreground text-sm">No leads match your filters</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="p-4 border rounded-lg transition-colors hover:bg-muted/50 bg-card"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Badge
                              variant="outline"
                              className="text-xs"
                            >
                              {lead.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </Badge>
                            {lead.urgency && (
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  lead.urgency === 'urgent' ? 'bg-red-500 text-white border-0' :
                                  lead.urgency === 'high' ? 'bg-orange-500 text-white border-0' :
                                  lead.urgency === 'medium' ? 'bg-yellow-500 text-white border-0' :
                                  'bg-gray-500 text-white border-0'
                                }`}
                              >
                                {lead.urgency}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(lead.created_at), 'MMM d, yyyy')}
                            </span>
                          </div>
                          <div className="font-medium text-base mb-2">{lead.name}</div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Phone className="h-3 w-3" />
                              <span>{lead.phone}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Mail className="h-3 w-3" />
                              <span>{lead.email}</span>
                            </div>
                            {lead.address && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3" />
                                <span>
                                  {lead.address}
                                  {lead.city && `, ${lead.city}`}
                                  {lead.state && `, ${lead.state}`}
                                  {lead.zip_code && ` ${lead.zip_code}`}
                                </span>
                              </div>
                            )}
                            {lead.project_id && (
                              <div className="text-xs font-mono text-muted-foreground mt-1">
                                Project: {lead.project_id}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            onClick={() => {
                              setSelectedLeadForCall(lead);
                              setShowAgentDialog(true);
                            }}
                            className="flex items-center gap-2 flex-1"
                            size="sm"
                          >
                            <Phone className="h-4 w-4" />
                            Call
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6 mt-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search calls..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="queued">Queued</SelectItem>
                    <SelectItem value="ringing">Ringing</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatusFilter('all');
                    setSearchTerm('');
                  }}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Call History */}
          <Card>
            <CardHeader>
              <CardTitle>Call History</CardTitle>
              <CardDescription>Recent call attempts and status</CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground mt-2 text-sm">Loading call history...</p>
                </div>
              ) : !callLogs || callLogs.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                  <p className="text-muted-foreground text-sm">No call history yet</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Call logs will appear here after calls are made
                  </p>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                  <p className="text-muted-foreground text-sm">No calls match your filters</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredLogs.map((log) => {
                    const lead = leads?.find((l) => l.id === log.lead_id);
                    
                    return (
                      <div
                        key={log.id}
                        className="p-4 border rounded-lg transition-colors hover:bg-muted/50 bg-card"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <Badge
                                variant="outline"
                                className={`${getStatusColor(log.status)} text-white border-0 text-xs`}
                              >
                                <span className="flex items-center gap-1">
                                  {getStatusIcon(log.status)}
                                  {getStatusLabel(log.status)}
                                </span>
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(log.created_at), 'MMM d, h:mm a')}
                              </span>
                            </div>
                            {lead ? (
                              <div className="font-medium truncate text-sm">{lead.name}</div>
                            ) : (
                              <div className="text-sm text-muted-foreground truncate">
                                {log.recipient}
                              </div>
                            )}
                            {log.content && (
                              <div className="text-sm text-muted-foreground mt-1 line-clamp-2">{log.content}</div>
                            )}
                            {log.metadata?.callSid && (
                              <div className="text-xs text-muted-foreground mt-2 font-mono">
                                Call ID: {log.metadata.callSid.substring(0, 24)}...
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Twilio Settings Tab */}
        <TabsContent value="settings" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Twilio Integration Settings</CardTitle>
                  <CardDescription>
                    Configure your Twilio credentials for making and receiving calls
                  </CardDescription>
                </div>
                {!isEditingSettings && (
                  <Button
                    variant="outline"
                    onClick={() => setIsEditingSettings(true)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Settings
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {settingsLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground mt-2 text-sm">Loading settings...</p>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveSettingsMutation.mutate(twilioSettings);
                  }}
                  className="space-y-6"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="account_sid">Twilio Account SID *</Label>
                      <Input
                        id="account_sid"
                        value={twilioSettings.account_sid}
                        onChange={(e) =>
                          setTwilioSettings({ ...twilioSettings, account_sid: e.target.value })
                        }
                        placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        disabled={!isEditingSettings}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Found in your Twilio Console dashboard
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="auth_token">Twilio Auth Token *</Label>
                      <div className="relative">
                        <Input
                          id="auth_token"
                          type={showAuthToken ? 'text' : 'password'}
                          value={twilioSettings.auth_token}
                          onChange={(e) =>
                            setTwilioSettings({ ...twilioSettings, auth_token: e.target.value })
                          }
                          placeholder="Your auth token"
                          disabled={!isEditingSettings}
                          required
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowAuthToken(!showAuthToken)}
                          disabled={!isEditingSettings}
                        >
                          {showAuthToken ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Keep this secure. Found in Twilio Console
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="inbound_number">Inbound Phone Number *</Label>
                      <Input
                        id="inbound_number"
                        type="tel"
                        value={twilioSettings.inbound_number}
                        onChange={(e) =>
                          setTwilioSettings({ ...twilioSettings, inbound_number: e.target.value })
                        }
                        placeholder="+18889926082"
                        disabled={!isEditingSettings}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Number for receiving incoming calls
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="outbound_number">Outbound Phone Number *</Label>
                      <Input
                        id="outbound_number"
                        type="tel"
                        value={twilioSettings.outbound_number}
                        onChange={(e) =>
                          setTwilioSettings({ ...twilioSettings, outbound_number: e.target.value })
                        }
                        placeholder="+18889926082"
                        disabled={!isEditingSettings}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Number used as caller ID for outbound calls
                      </p>
                    </div>
                  </div>

                  {isEditingSettings && (
                    <div className="flex gap-2 pt-4">
                      <Button
                        type="submit"
                        disabled={saveSettingsMutation.isPending}
                      >
                        {saveSettingsMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Settings
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsEditingSettings(false);
                          // Reset to saved settings
                          if (savedTwilioSettings) {
                            setTwilioSettings(savedTwilioSettings);
                          }
                        }}
                        disabled={saveSettingsMutation.isPending}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}

                  {!isEditingSettings && savedTwilioSettings && (
                    <div className="pt-4 border-t">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>Settings saved and ready to use</span>
                      </div>
                    </div>
                  )}

                  {!isEditingSettings && !savedTwilioSettings && (
                    <div className="pt-4 border-t">
                      <div className="flex items-center gap-2 text-sm text-amber-600">
                        <XCircle className="h-4 w-4" />
                        <span>No settings configured. Click "Edit Settings" to get started.</span>
                      </div>
                    </div>
                  )}
                </form>
              )}
            </CardContent>
          </Card>

          {/* Settings Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Getting Your Twilio Credentials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">1. Account SID & Auth Token</h4>
                <p className="text-sm text-muted-foreground">
                  Go to your{' '}
                  <a
                    href="https://console.twilio.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Twilio Console
                  </a>
                  {' '}→ Dashboard. Your Account SID and Auth Token are displayed on the main dashboard.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-sm">2. Phone Numbers</h4>
                <p className="text-sm text-muted-foreground">
                  Navigate to Phone Numbers → Manage → Active Numbers in your Twilio Console.
                  Copy the phone number(s) you want to use for calling.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Voice Agent Tab */}
        <TabsContent value="voice-agent" className="space-y-4 mt-6">
          {/* Compact Agent Management */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    Voice Agents
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Create and manage your AI voice agents
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setIsCreatingAgent(true);
                    setEditingAgent({
                      id: `agent_${Date.now()}`,
                      name: '',
                      voiceProvider: 'deepgram',
                      systemPrompt: '',
                      greeting: '',
                      isActive: false,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    });
                    setAgentName('');
                    setSelectedVoiceProvider('deepgram');
                    setAgentSystemPrompt('');
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Agent
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Agents List */}
              {agentsLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground mt-2 text-xs">Loading agents...</p>
                </div>
              ) : agents.length === 0 && !isCreatingAgent ? (
                <div className="text-center py-8">
                  <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                  <p className="text-muted-foreground text-sm mb-4">No voice agents yet</p>
                  <Button
                    size="sm"
                    onClick={() => {
                      setIsCreatingAgent(true);
                      setEditingAgent({
                        id: `agent_${Date.now()}`,
                        name: '',
                        voiceProvider: 'deepgram',
                        systemPrompt: '',
                        greeting: '',
                        isActive: false,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                      });
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Agent
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Create/Edit Agent Form */}
                  {(isCreatingAgent || editingAgent) && (
                    <Card className="border-2 border-primary/30 bg-primary/5">
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold">
                              {isCreatingAgent ? 'Create New Agent' : 'Edit Agent'}
                            </Label>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setIsCreatingAgent(false);
                                setEditingAgent(null);
                                setAgentName('');
                                setAgentSystemPrompt('');
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Agent Name</Label>
                              <Input
                                value={agentName || editingAgent?.name || ''}
                                onChange={(e) => setAgentName(e.target.value)}
                                placeholder="e.g., Customer Support Agent"
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Voice Provider</Label>
                              <Select
                                value={selectedVoiceProvider}
                                onValueChange={(value: 'deepgram') => {
                                  setSelectedVoiceProvider(value);
                                  if (editingAgent) {
                                    setEditingAgent({ ...editingAgent, voiceProvider: value });
                                  }
                                }}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="deepgram">Deepgram</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs">System Instructions</Label>
                            <Textarea
                              value={agentSystemPrompt || editingAgent?.systemPrompt || ''}
                              onChange={(e) => {
                                setAgentSystemPrompt(e.target.value);
                                if (editingAgent) {
                                  setEditingAgent({ ...editingAgent, systemPrompt: e.target.value });
                                }
                              }}
                              placeholder="Enter system instructions for your voice agent..."
                              rows={4}
                              className="text-xs resize-none"
                            />
                          </div>

                          <div className="flex items-center gap-2 pt-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                if (!agentName && !editingAgent?.name) {
                                  toast({
                                    title: 'Name required',
                                    description: 'Please enter an agent name.',
                                    variant: 'destructive',
                                  });
                                  return;
                                }
                                
                                // Validate and merge settings based on provider
                                let finalSettings: VoiceAgent['settings'] = {};
                                
                                if (selectedVoiceProvider === 'deepgram') {
                                  // Merge with saved Deepgram settings to ensure completeness
                                  const mergedDeepgram = {
                                    ...savedDeepgramSettings,
                                    ...deepgramSettings,
                                    agent: {
                                      ...savedDeepgramSettings?.agent,
                                      ...deepgramSettings.agent,
                                      think: {
                                        ...savedDeepgramSettings?.agent?.think,
                                        ...deepgramSettings.agent.think,
                                        prompt: agentSystemPrompt || editingAgent?.systemPrompt || deepgramSettings.agent.think.prompt || '',
                                      },
                                      greeting: editingAgent?.greeting || deepgramSettings.agent.greeting || savedDeepgramSettings?.agent?.greeting || '',
                                    },
                                  };
                                  
                                  // Check if API key exists (from saved or current)
                                  if (!mergedDeepgram.api_key) {
                                    toast({
                                      title: 'Deepgram configuration required',
                                      description: 'Please configure Deepgram settings in the Deepgram section before creating an agent.',
                                      variant: 'destructive',
                                    });
                                    return;
                                  }
                                  
                                  finalSettings.deepgram = mergedDeepgram;
                                }
                                
                                const agentToSave: VoiceAgent = {
                                  id: editingAgent?.id || `agent_${Date.now()}`,
                                  name: agentName || editingAgent?.name || 'Untitled Agent',
                                  voiceProvider: selectedVoiceProvider,
                                  systemPrompt: agentSystemPrompt || editingAgent?.systemPrompt || '',
                                  greeting: editingAgent?.greeting || '',
                                  isActive: editingAgent?.isActive || false,
                                  createdAt: editingAgent?.createdAt || new Date().toISOString(),
                                  updatedAt: new Date().toISOString(),
                                  settings: finalSettings,
                                };
                                
                                saveAgentMutation.mutate(agentToSave);
                                setIsCreatingAgent(false);
                                setEditingAgent(null);
                                setAgentName('');
                                setAgentSystemPrompt('');
                              }}
                              disabled={saveAgentMutation.isPending}
                              className="flex-1"
                            >
                              {saveAgentMutation.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <Save className="mr-2 h-3 w-3" />
                                  Save Agent
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setIsCreatingAgent(false);
                                setEditingAgent(null);
                                setAgentName('');
                                setAgentSystemPrompt('');
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Agents List */}
                  {agents.map((agent) => (
                    <Card
                      key={agent.id}
                      className={`transition-all hover:shadow-md ${
                        selectedAgent?.id === agent.id ? 'ring-2 ring-primary' : ''
                      }`}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded-lg ${
                                agent.voiceProvider === 'deepgram' 
                                  ? 'bg-primary/10 text-primary' 
                                  : 'bg-purple-500/10 text-purple-600'
                              }`}>
                                {agent.voiceProvider === 'deepgram' ? (
                                  <Mic className="h-3.5 w-3.5" />
                                ) : (
                                  <Sparkles className="h-3.5 w-3.5" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-sm">{agent.name}</h4>
                                  {agent.isActive && (
                                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                                      <div className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1.5" />
                                      Active
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                  {agent.systemPrompt || 'No system instructions'}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingAgent(agent);
                                setSelectedAgent(agent);
                                setAgentName(agent.name);
                                setSelectedVoiceProvider(agent.voiceProvider);
                                setAgentSystemPrompt(agent.systemPrompt);
                                setIsCreatingAgent(false);
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete "${agent.name}"?`)) {
                                  deleteAgentMutation.mutate(agent.id);
                                }
                              }}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              disabled={deleteAgentMutation.isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>


          {/* Deepgram Section */}
          <div ref={deepgramSectionRef} className="scroll-mt-4">
            <Card className={selectedVoiceProvider === 'deepgram' ? 'ring-2 ring-primary ring-offset-2 transition-all' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Mic className="h-4 w-4" />
                    Deepgram Voice Agent
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Configure Deepgram voice agent for real-time voice conversations
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {isEditingDeepgram ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsEditingDeepgram(false);
                          // Reset to saved settings
                          if (savedDeepgramSettings) {
                            setDeepgramSettings(savedDeepgramSettings);
                          }
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => saveDeepgramMutation.mutate(deepgramSettings)}
                        disabled={saveDeepgramMutation.isPending}
                      >
                        {saveDeepgramMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingDeepgram(true)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Accordion type="single" collapsible className="w-full">
                {/* API Key Section */}
                <AccordionItem value="api" className="border-none">
                  <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      <span>API Configuration</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-4">
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="deepgram_api_key" className="text-xs">Deepgram API Key</Label>
                        <div className="flex gap-2">
                          <Input
                            id="deepgram_api_key"
                            type={showDeepgramApiKey ? 'text' : 'password'}
                            value={deepgramSettings.api_key || ''}
                            onChange={(e) =>
                              setDeepgramSettings({ ...deepgramSettings, api_key: e.target.value })
                            }
                            placeholder="Enter Deepgram API key"
                            disabled={!isEditingDeepgram}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setShowDeepgramApiKey(!showDeepgramApiKey)}
                            disabled={!isEditingDeepgram}
                          >
                            {showDeepgramApiKey ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Get your API key from{' '}
                          <a
                            href="https://console.deepgram.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            Deepgram Console
                          </a>
                        </p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Audio Settings */}
                <AccordionItem value="audio" className="border-none">
                  <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Volume2 className="h-4 w-4" />
                      <span>Audio Configuration</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-4">
                    <div className="space-y-4">
                      {/* Input Audio */}
                      <div className="space-y-2 p-3 border rounded-md bg-muted/30">
                        <Label className="text-xs font-medium">Input Audio</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Encoding</Label>
                            <Select
                              value={deepgramSettings.audio.input.encoding}
                              onValueChange={(value) =>
                                setDeepgramSettings({
                                  ...deepgramSettings,
                                  audio: {
                                    ...deepgramSettings.audio,
                                    input: { ...deepgramSettings.audio.input, encoding: value },
                                  },
                                })
                              }
                              disabled={!isEditingDeepgram}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="linear16" className="text-xs">linear16</SelectItem>
                                <SelectItem value="mulaw" className="text-xs">mulaw</SelectItem>
                                <SelectItem value="alaw" className="text-xs">alaw</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Sample Rate</Label>
                            <Select
                              value={deepgramSettings.audio.input.sample_rate.toString()}
                              onValueChange={(value) =>
                                setDeepgramSettings({
                                  ...deepgramSettings,
                                  audio: {
                                    ...deepgramSettings.audio,
                                    input: { ...deepgramSettings.audio.input, sample_rate: parseInt(value) },
                                  },
                                })
                              }
                              disabled={!isEditingDeepgram}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="8000" className="text-xs">8 kHz</SelectItem>
                                <SelectItem value="16000" className="text-xs">16 kHz</SelectItem>
                                <SelectItem value="24000" className="text-xs">24 kHz</SelectItem>
                                <SelectItem value="48000" className="text-xs">48 kHz</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      {/* Output Audio */}
                      <div className="space-y-2 p-3 border rounded-md bg-muted/30">
                        <Label className="text-xs font-medium">Output Audio</Label>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Encoding</Label>
                            <Select
                              value={deepgramSettings.audio.output.encoding}
                              onValueChange={(value) =>
                                setDeepgramSettings({
                                  ...deepgramSettings,
                                  audio: {
                                    ...deepgramSettings.audio,
                                    output: { ...deepgramSettings.audio.output, encoding: value },
                                  },
                                })
                              }
                              disabled={!isEditingDeepgram}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="linear16" className="text-xs">linear16</SelectItem>
                                <SelectItem value="mulaw" className="text-xs">mulaw</SelectItem>
                                <SelectItem value="alaw" className="text-xs">alaw</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Sample Rate</Label>
                            <Select
                              value={deepgramSettings.audio.output.sample_rate.toString()}
                              onValueChange={(value) =>
                                setDeepgramSettings({
                                  ...deepgramSettings,
                                  audio: {
                                    ...deepgramSettings.audio,
                                    output: { ...deepgramSettings.audio.output, sample_rate: parseInt(value) },
                                  },
                                })
                              }
                              disabled={!isEditingDeepgram}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="8000" className="text-xs">8 kHz</SelectItem>
                                <SelectItem value="16000" className="text-xs">16 kHz</SelectItem>
                                <SelectItem value="24000" className="text-xs">24 kHz</SelectItem>
                                <SelectItem value="48000" className="text-xs">48 kHz</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Container</Label>
                            <Select
                              value={deepgramSettings.audio.output.container}
                              onValueChange={(value) =>
                                setDeepgramSettings({
                                  ...deepgramSettings,
                                  audio: {
                                    ...deepgramSettings.audio,
                                    output: { ...deepgramSettings.audio.output, container: value },
                                  },
                                })
                              }
                              disabled={!isEditingDeepgram}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none" className="text-xs">none</SelectItem>
                                <SelectItem value="mp3" className="text-xs">mp3</SelectItem>
                                <SelectItem value="wav" className="text-xs">wav</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Agent Settings */}
                <AccordionItem value="agent" className="border-none">
                  <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      <span>Agent Configuration</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-4">
                    <div className="space-y-4">
                      {/* Language */}
                      <div className="space-y-1.5">
                        <Label htmlFor="agent_language" className="text-xs">Language</Label>
                        <Select
                          value={deepgramSettings.agent.language}
                          onValueChange={(value) =>
                            setDeepgramSettings({
                              ...deepgramSettings,
                              agent: { ...deepgramSettings.agent, language: value },
                            })
                          }
                          disabled={!isEditingDeepgram}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en" className="text-sm">English</SelectItem>
                            <SelectItem value="es" className="text-sm">Spanish</SelectItem>
                            <SelectItem value="fr" className="text-sm">French</SelectItem>
                            <SelectItem value="de" className="text-sm">German</SelectItem>
                            <SelectItem value="it" className="text-sm">Italian</SelectItem>
                            <SelectItem value="pt" className="text-sm">Portuguese</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Speak Provider */}
                      <div className="space-y-2 p-3 border rounded-md bg-muted/30">
                        <Label className="text-xs font-medium">Speak Provider (TTS)</Label>
                        <div className="space-y-2">
                          {/* Provider Type */}
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Provider Type</Label>
                            <Select
                              value={deepgramSettings.agent.speak.provider.type}
                              onValueChange={(value) => {
                                // Reset provider config when type changes
                                const baseProvider: any = { type: value };
                                
                                // Set defaults based on provider type
                                if (value === 'deepgram') {
                                  baseProvider.model = 'aura-2-thalia-en';
                                } else if (value === 'open_ai') {
                                  baseProvider.model = 'tts-1';
                                  baseProvider.voice = 'alloy';
                                } else if (value === 'eleven_labs') {
                                  baseProvider.model_id = 'eleven_turbo_v2_5';
                                  baseProvider.language_code = 'en-US';
                                } else if (value === 'aws_polly') {
                                  baseProvider.voice = 'Matthew';
                                  baseProvider.language_code = 'en-US';
                                  baseProvider.engine = 'standard';
                                }
                                
                                setDeepgramSettings({
                                  ...deepgramSettings,
                                  agent: {
                                    ...deepgramSettings.agent,
                                    speak: {
                                      ...deepgramSettings.agent.speak,
                                      provider: baseProvider,
                                      // Add endpoint for third-party providers
                                      endpoint: (value === 'open_ai' || value === 'eleven_labs') 
                                        ? { url: '', headers: {} }
                                        : undefined,
                                    },
                                  },
                                });
                              }}
                              disabled={!isEditingDeepgram}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="deepgram" className="text-xs">Deepgram (Default)</SelectItem>
                                <SelectItem value="open_ai" className="text-xs">OpenAI</SelectItem>
                                <SelectItem value="eleven_labs" className="text-xs">Eleven Labs</SelectItem>
                                <SelectItem value="aws_polly" className="text-xs">AWS Polly</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Test Voice Button */}
                          <div className="flex items-end gap-2">
                            <div className="flex-1 space-y-1">
                              <Label className="text-xs text-muted-foreground">Test Text</Label>
                              <Input
                                value={testText}
                                onChange={(e) => setTestText(e.target.value)}
                                disabled={!isEditingDeepgram || isTestingAgentVoice}
                                className="h-8 text-xs"
                                placeholder="Enter text to test voice..."
                              />
                            </div>
                            <Button
                              type="button"
                              onClick={testAgentVoice}
                              disabled={!isEditingDeepgram || isTestingAgentVoice || !deepgramSettings.agent?.speak?.provider?.type}
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs"
                            >
                              {isTestingAgentVoice ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  Testing...
                                </>
                              ) : (
                                <>
                                  <Volume2 className="h-3 w-3 mr-1" />
                                  Test Voice
                                </>
                              )}
                            </Button>
                          </div>

                          {/* Deepgram Provider Fields */}
                          {deepgramSettings.agent.speak.provider.type === 'deepgram' && (
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Model</Label>
                              <Select
                                value={deepgramSettings.agent.speak.provider.model || 'aura-2-thalia-en'}
                                onValueChange={(value) =>
                                  setDeepgramSettings({
                                    ...deepgramSettings,
                                    agent: {
                                      ...deepgramSettings.agent,
                                      speak: {
                                        ...deepgramSettings.agent.speak,
                                        provider: {
                                          ...deepgramSettings.agent.speak.provider,
                                          model: value,
                                        },
                                      },
                                    },
                                  })
                                }
                                disabled={!isEditingDeepgram}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                {/* Featured Aura-2 English Voices */}
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Featured Aura-2 (EN)</div>
                                <SelectItem value="aura-2-thalia-en" className="text-xs">Thalia - Clear, Confident, Energetic</SelectItem>
                                <SelectItem value="aura-2-andromeda-en" className="text-xs">Andromeda - Casual, Expressive</SelectItem>
                                <SelectItem value="aura-2-helena-en" className="text-xs">Helena - Caring, Natural, Friendly</SelectItem>
                                <SelectItem value="aura-2-apollo-en" className="text-xs">Apollo - Confident, Comfortable</SelectItem>
                                <SelectItem value="aura-2-arcas-en" className="text-xs">Arcas - Natural, Smooth, Clear</SelectItem>
                                <SelectItem value="aura-2-aries-en" className="text-xs">Aries - Warm, Energetic, Caring</SelectItem>
                                
                                {/* All Aura-2 English Voices */}
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">All Aura-2 English</div>
                                <SelectItem value="aura-2-amalthea-en" className="text-xs">Amalthea (Filipino) - Engaging, Cheerful</SelectItem>
                                <SelectItem value="aura-2-asteria-en" className="text-xs">Asteria - Clear, Confident, Knowledgeable</SelectItem>
                                <SelectItem value="aura-2-athena-en" className="text-xs">Athena - Calm, Smooth, Professional</SelectItem>
                                <SelectItem value="aura-2-atlas-en" className="text-xs">Atlas - Enthusiastic, Confident</SelectItem>
                                <SelectItem value="aura-2-aurora-en" className="text-xs">Aurora - Cheerful, Expressive</SelectItem>
                                <SelectItem value="aura-2-callista-en" className="text-xs">Callista - Clear, Energetic, Professional</SelectItem>
                                <SelectItem value="aura-2-cora-en" className="text-xs">Cora - Smooth, Melodic, Caring</SelectItem>
                                <SelectItem value="aura-2-cordelia-en" className="text-xs">Cordelia - Approachable, Warm</SelectItem>
                                <SelectItem value="aura-2-delia-en" className="text-xs">Delia - Casual, Friendly, Cheerful</SelectItem>
                                <SelectItem value="aura-2-draco-en" className="text-xs">Draco (British) - Warm, Trustworthy</SelectItem>
                                <SelectItem value="aura-2-electra-en" className="text-xs">Electra - Professional, Engaging</SelectItem>
                                <SelectItem value="aura-2-harmonia-en" className="text-xs">Harmonia - Empathetic, Clear, Calm</SelectItem>
                                <SelectItem value="aura-2-hera-en" className="text-xs">Hera - Smooth, Warm, Professional</SelectItem>
                                <SelectItem value="aura-2-hermes-en" className="text-xs">Hermes - Expressive, Engaging</SelectItem>
                                <SelectItem value="aura-2-hyperion-en" className="text-xs">Hyperion (Australian) - Caring, Warm</SelectItem>
                                <SelectItem value="aura-2-iris-en" className="text-xs">Iris - Cheerful, Positive</SelectItem>
                                <SelectItem value="aura-2-janus-en" className="text-xs">Janus - Southern, Smooth</SelectItem>
                                <SelectItem value="aura-2-juno-en" className="text-xs">Juno - Natural, Engaging, Melodic</SelectItem>
                                <SelectItem value="aura-2-jupiter-en" className="text-xs">Jupiter - Expressive, Knowledgeable</SelectItem>
                                <SelectItem value="aura-2-luna-en" className="text-xs">Luna - Friendly, Natural</SelectItem>
                                <SelectItem value="aura-2-mars-en" className="text-xs">Mars - Smooth, Patient, Trustworthy</SelectItem>
                                <SelectItem value="aura-2-minerva-en" className="text-xs">Minerva - Positive, Friendly</SelectItem>
                                <SelectItem value="aura-2-neptune-en" className="text-xs">Neptune - Professional, Patient</SelectItem>
                                <SelectItem value="aura-2-odysseus-en" className="text-xs">Odysseus - Calm, Smooth, Professional</SelectItem>
                                <SelectItem value="aura-2-ophelia-en" className="text-xs">Ophelia - Expressive, Enthusiastic</SelectItem>
                                <SelectItem value="aura-2-orion-en" className="text-xs">Orion - Approachable, Comfortable</SelectItem>
                                <SelectItem value="aura-2-orpheus-en" className="text-xs">Orpheus - Professional, Clear, Trustworthy</SelectItem>
                                <SelectItem value="aura-2-pandora-en" className="text-xs">Pandora (British) - Smooth, Calm</SelectItem>
                                <SelectItem value="aura-2-phoebe-en" className="text-xs">Phoebe - Energetic, Warm</SelectItem>
                                <SelectItem value="aura-2-pluto-en" className="text-xs">Pluto - Smooth, Calm, Empathetic</SelectItem>
                                <SelectItem value="aura-2-saturn-en" className="text-xs">Saturn - Knowledgeable, Confident</SelectItem>
                                <SelectItem value="aura-2-selene-en" className="text-xs">Selene - Expressive, Engaging</SelectItem>
                                <SelectItem value="aura-2-theia-en" className="text-xs">Theia (Australian) - Expressive, Polite</SelectItem>
                                <SelectItem value="aura-2-vesta-en" className="text-xs">Vesta - Natural, Expressive, Empathetic</SelectItem>
                                <SelectItem value="aura-2-zeus-en" className="text-xs">Zeus - Deep, Trustworthy, Smooth</SelectItem>
                                
                                {/* Featured Aura-2 Spanish Voices */}
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Featured Aura-2 (ES)</div>
                                <SelectItem value="aura-2-celeste-es" className="text-xs">Celeste (Colombian) - Clear, Energetic</SelectItem>
                                <SelectItem value="aura-2-estrella-es" className="text-xs">Estrella (Mexican) - Approachable, Natural</SelectItem>
                                <SelectItem value="aura-2-nestor-es" className="text-xs">Nestor (Peninsular) - Calm, Professional</SelectItem>
                                
                                {/* All Aura-2 Spanish Voices */}
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">All Aura-2 Spanish</div>
                                <SelectItem value="aura-2-sirio-es" className="text-xs">Sirio (Mexican) - Calm, Professional</SelectItem>
                                <SelectItem value="aura-2-carina-es" className="text-xs">Carina (Peninsular) - Professional, Energetic</SelectItem>
                                <SelectItem value="aura-2-alvaro-es" className="text-xs">Alvaro (Peninsular) - Calm, Professional</SelectItem>
                                <SelectItem value="aura-2-diana-es" className="text-xs">Diana (Peninsular) - Professional, Confident</SelectItem>
                                <SelectItem value="aura-2-aquila-es" className="text-xs">Aquila (Latin American) - Expressive, Enthusiastic</SelectItem>
                                <SelectItem value="aura-2-selena-es" className="text-xs">Selena (Latin American) - Approachable, Casual</SelectItem>
                                <SelectItem value="aura-2-javier-es" className="text-xs">Javier (Mexican) - Approachable, Professional</SelectItem>
                                
                                {/* Aura 1 English Voices */}
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Aura 1 English</div>
                                <SelectItem value="aura-asteria-en" className="text-xs">Asteria - Clear, Confident</SelectItem>
                                <SelectItem value="aura-luna-en" className="text-xs">Luna - Friendly, Natural</SelectItem>
                                <SelectItem value="aura-stella-en" className="text-xs">Stella - Clear, Professional</SelectItem>
                                <SelectItem value="aura-athena-en" className="text-xs">Athena (British) - Calm, Smooth</SelectItem>
                                <SelectItem value="aura-hera-en" className="text-xs">Hera - Smooth, Warm</SelectItem>
                                <SelectItem value="aura-orion-en" className="text-xs">Orion - Approachable, Comfortable</SelectItem>
                                <SelectItem value="aura-arcas-en" className="text-xs">Arcas - Natural, Smooth</SelectItem>
                                <SelectItem value="aura-perseus-en" className="text-xs">Perseus - Confident, Professional</SelectItem>
                                <SelectItem value="aura-angus-en" className="text-xs">Angus (Irish) - Warm, Friendly</SelectItem>
                                <SelectItem value="aura-orpheus-en" className="text-xs">Orpheus - Professional, Clear</SelectItem>
                                <SelectItem value="aura-helios-en" className="text-xs">Helios (British) - Professional, Clear</SelectItem>
                                <SelectItem value="aura-zeus-en" className="text-xs">Zeus - Deep, Trustworthy</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          )}

                          {/* Voice Actor Testing Section - Bubble Style */}
                          {deepgramSettings.agent.speak.provider.type === 'deepgram' && (
                            <div className="mt-6 space-y-4">
                              <div className="flex items-center gap-2">
                                <Volume2 className="h-4 w-4 text-primary" />
                                <Label className="text-sm font-semibold">Test Voice Actors</Label>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Enter text and test each voice actor to find the perfect voice for your agent.
                              </p>
                              
                              {/* Featured Voice Actors - Bubble Cards */}
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                                {[
                                  { id: 'aura-2-thalia-en', name: 'Thalia', description: 'Clear, Confident, Energetic', accent: 'US' },
                                  { id: 'aura-2-andromeda-en', name: 'Andromeda', description: 'Casual, Expressive', accent: 'US' },
                                  { id: 'aura-2-helena-en', name: 'Helena', description: 'Caring, Natural, Friendly', accent: 'US' },
                                  { id: 'aura-2-apollo-en', name: 'Apollo', description: 'Confident, Comfortable', accent: 'US' },
                                  { id: 'aura-2-arcas-en', name: 'Arcas', description: 'Natural, Smooth, Clear', accent: 'US' },
                                  { id: 'aura-2-aries-en', name: 'Aries', description: 'Warm, Energetic, Caring', accent: 'US' },
                                  { id: 'aura-2-athena-en', name: 'Athena', description: 'Calm, Smooth, Professional', accent: 'British' },
                                  { id: 'aura-2-zeus-en', name: 'Zeus', description: 'Deep, Trustworthy, Smooth', accent: 'US' },
                                  { id: 'aura-2-luna-en', name: 'Luna', description: 'Friendly, Natural', accent: 'US' },
                                  { id: 'aura-2-orion-en', name: 'Orion', description: 'Approachable, Comfortable', accent: 'US' },
                                  { id: 'aura-2-odysseus-en', name: 'Odysseus', description: 'Calm, Smooth, Professional', accent: 'US' },
                                  { id: 'aura-2-hera-en', name: 'Hera', description: 'Smooth, Warm, Professional', accent: 'US' },
                                ].map((voice) => (
                                  <Card
                                    key={voice.id}
                                    className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg group"
                                    style={{
                                      borderRadius: '24px',
                                      background: 'linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--card)) 100%)',
                                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                    }}
                                  >
                                    {/* Bubble effect overlay */}
                                    <div 
                                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-primary/5"
                                      style={{
                                        background: 'radial-gradient(circle at 50% 0%, hsl(var(--primary) / 0.1) 0%, transparent 70%)',
                                      }}
                                    />
                                    
                                    <CardContent className="p-4 relative z-10">
                                      {/* Voice Header */}
                                      <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                              <Mic className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                              <h4 className="font-semibold text-sm">{voice.name}</h4>
                                              <p className="text-xs text-muted-foreground">{voice.accent}</p>
                                            </div>
                                          </div>
                                          <p className="text-xs text-muted-foreground mt-1">{voice.description}</p>
                                        </div>
                                      </div>

                                      {/* Test Input */}
                                      <div className="space-y-2">
                                        <Textarea
                                          placeholder="Enter text to test this voice..."
                                          value={voiceActorTestTexts[voice.id] || ''}
                                          onChange={(e) => {
                                            setVoiceActorTestTexts({
                                              ...voiceActorTestTexts,
                                              [voice.id]: e.target.value,
                                            });
                                          }}
                                          className="min-h-[60px] text-xs resize-none border-muted"
                                          disabled={testingVoiceActor === voice.id}
                                        />
                                        
                                        {/* Play Button */}
                                        <Button
                                          onClick={() => testVoiceActor(voice.id, voiceActorTestTexts[voice.id] || 'Hello, this is a test of the voice.')}
                                          disabled={testingVoiceActor === voice.id || !voiceActorTestTexts[voice.id]?.trim()}
                                          className="w-full h-9 text-xs font-medium"
                                          variant={testingVoiceActor === voice.id ? "secondary" : "default"}
                                        >
                                          {testingVoiceActor === voice.id ? (
                                            <>
                                              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                              Generating...
                                            </>
                                          ) : (
                                            <>
                                              <Play className="mr-2 h-3.5 w-3.5" />
                                              Test Voice
                                            </>
                                          )}
                                        </Button>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          )}


                          {/* OpenAI Provider Fields */}
                          {deepgramSettings.agent.speak.provider.type === 'open_ai' && (
                            <>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Model</Label>
                                  <Select
                                    value={deepgramSettings.agent.speak.provider.model || 'tts-1'}
                                    onValueChange={(value) =>
                                      setDeepgramSettings({
                                        ...deepgramSettings,
                                        agent: {
                                          ...deepgramSettings.agent,
                                          speak: {
                                            ...deepgramSettings.agent.speak,
                                            provider: {
                                              ...deepgramSettings.agent.speak.provider,
                                              model: value,
                                            },
                                          },
                                        },
                                      })
                                    }
                                    disabled={!isEditingDeepgram}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="tts-1" className="text-xs">tts-1</SelectItem>
                                      <SelectItem value="tts-1-hd" className="text-xs">tts-1-hd</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Voice</Label>
                                  <Select
                                    value={typeof deepgramSettings.agent.speak.provider.voice === 'string' 
                                      ? deepgramSettings.agent.speak.provider.voice 
                                      : 'alloy'}
                                    onValueChange={(value) =>
                                      setDeepgramSettings({
                                        ...deepgramSettings,
                                        agent: {
                                          ...deepgramSettings.agent,
                                          speak: {
                                            ...deepgramSettings.agent.speak,
                                            provider: {
                                              ...deepgramSettings.agent.speak.provider,
                                              voice: value,
                                            },
                                          },
                                        },
                                      })
                                    }
                                    disabled={!isEditingDeepgram}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="alloy" className="text-xs">Alloy</SelectItem>
                                      <SelectItem value="echo" className="text-xs">Echo</SelectItem>
                                      <SelectItem value="fable" className="text-xs">Fable</SelectItem>
                                      <SelectItem value="onyx" className="text-xs">Onyx</SelectItem>
                                      <SelectItem value="nova" className="text-xs">Nova</SelectItem>
                                      <SelectItem value="shimmer" className="text-xs">Shimmer</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              {deepgramSettings.agent.speak.endpoint && (
                                <>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Endpoint URL</Label>
                                    <Input
                                      value={deepgramSettings.agent.speak.endpoint.url || ''}
                                      onChange={(e) =>
                                        setDeepgramSettings({
                                          ...deepgramSettings,
                                          agent: {
                                            ...deepgramSettings.agent,
                                            speak: {
                                              ...deepgramSettings.agent.speak,
                                              endpoint: {
                                                ...deepgramSettings.agent.speak.endpoint,
                                                url: e.target.value,
                                              },
                                            },
                                          },
                                        })
                                      }
                                      disabled={!isEditingDeepgram}
                                      className="h-8 text-xs"
                                      placeholder="https://api.openai.com/v1/audio/speech"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Authorization Header</Label>
                                    <Input
                                      value={deepgramSettings.agent.speak.endpoint?.headers?.['authorization'] || ''}
                                      onChange={(e) =>
                                        setDeepgramSettings({
                                          ...deepgramSettings,
                                          agent: {
                                            ...deepgramSettings.agent,
                                            speak: {
                                              ...deepgramSettings.agent.speak,
                                              endpoint: {
                                                ...deepgramSettings.agent.speak.endpoint!,
                                                headers: {
                                                  ...deepgramSettings.agent.speak.endpoint?.headers,
                                                  authorization: e.target.value,
                                                },
                                              },
                                            },
                                          },
                                        })
                                      }
                                      disabled={!isEditingDeepgram}
                                      className="h-8 text-xs"
                                      type="password"
                                      placeholder="Bearer YOUR_OPENAI_API_KEY"
                                    />
                                  </div>
                                </>
                              )}
                            </>
                          )}

                          {/* Eleven Labs Provider Fields */}
                          {deepgramSettings.agent.speak.provider.type === 'eleven_labs' && (
                            <>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Model ID</Label>
                                  <Select
                                    value={deepgramSettings.agent.speak.provider.model_id || 'eleven_turbo_v2_5'}
                                    onValueChange={(value) =>
                                      setDeepgramSettings({
                                        ...deepgramSettings,
                                        agent: {
                                          ...deepgramSettings.agent,
                                          speak: {
                                            ...deepgramSettings.agent.speak,
                                            provider: {
                                              ...deepgramSettings.agent.speak.provider,
                                              model_id: value,
                                            },
                                          },
                                        },
                                      })
                                    }
                                    disabled={!isEditingDeepgram}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="eleven_turbo_v2_5" className="text-xs">Turbo 2.5</SelectItem>
                                      <SelectItem value="eleven_monolingual_v1" className="text-xs">Monolingual v1</SelectItem>
                                      <SelectItem value="eleven_multilingual_v2" className="text-xs">Multilingual v2</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Language Code</Label>
                                  <Input
                                    value={deepgramSettings.agent.speak.provider.language_code || 'en-US'}
                                    onChange={(e) =>
                                      setDeepgramSettings({
                                        ...deepgramSettings,
                                        agent: {
                                          ...deepgramSettings.agent,
                                          speak: {
                                            ...deepgramSettings.agent.speak,
                                            provider: {
                                              ...deepgramSettings.agent.speak.provider,
                                              language_code: e.target.value,
                                            },
                                          },
                                        },
                                      })
                                    }
                                    disabled={!isEditingDeepgram}
                                    className="h-8 text-xs"
                                    placeholder="en-US"
                                  />
                                </div>
                              </div>
                              {deepgramSettings.agent.speak.endpoint && (
                                <>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">WebSocket URL</Label>
                                    <Input
                                      value={deepgramSettings.agent.speak.endpoint.url || ''}
                                      onChange={(e) =>
                                        setDeepgramSettings({
                                          ...deepgramSettings,
                                          agent: {
                                            ...deepgramSettings.agent,
                                            speak: {
                                              ...deepgramSettings.agent.speak,
                                              endpoint: {
                                                ...deepgramSettings.agent.speak.endpoint,
                                                url: e.target.value,
                                              },
                                            },
                                          },
                                        })
                                      }
                                      disabled={!isEditingDeepgram}
                                      className="h-8 text-xs"
                                      placeholder="wss://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream-input"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">API Key Header</Label>
                                    <Input
                                      value={deepgramSettings.agent.speak.endpoint?.headers?.['xi-api-key'] || ''}
                                      onChange={(e) =>
                                        setDeepgramSettings({
                                          ...deepgramSettings,
                                          agent: {
                                            ...deepgramSettings.agent,
                                            speak: {
                                              ...deepgramSettings.agent.speak,
                                              endpoint: {
                                                ...deepgramSettings.agent.speak.endpoint!,
                                                headers: {
                                                  ...deepgramSettings.agent.speak.endpoint?.headers,
                                                  'xi-api-key': e.target.value,
                                                },
                                              },
                                            },
                                          },
                                        })
                                      }
                                      disabled={!isEditingDeepgram}
                                      className="h-8 text-xs"
                                      type="password"
                                      placeholder="Eleven Labs API Key"
                                    />
                                  </div>
                                </>
                              )}
                            </>
                          )}

                          {/* AWS Polly Provider Fields */}
                          {deepgramSettings.agent.speak.provider.type === 'aws_polly' && (
                            <>
                              <div className="grid grid-cols-3 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Voice</Label>
                                  <Select
                                    value={deepgramSettings.agent.speak.provider.voice || 'Matthew'}
                                    onValueChange={(value) =>
                                      setDeepgramSettings({
                                        ...deepgramSettings,
                                        agent: {
                                          ...deepgramSettings.agent,
                                          speak: {
                                            ...deepgramSettings.agent.speak,
                                            provider: {
                                              ...deepgramSettings.agent.speak.provider,
                                              voice: value,
                                            },
                                          },
                                        },
                                      })
                                    }
                                    disabled={!isEditingDeepgram}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Matthew" className="text-xs">Matthew</SelectItem>
                                      <SelectItem value="Joanna" className="text-xs">Joanna</SelectItem>
                                      <SelectItem value="Amy" className="text-xs">Amy</SelectItem>
                                      <SelectItem value="Emma" className="text-xs">Emma</SelectItem>
                                      <SelectItem value="Brian" className="text-xs">Brian</SelectItem>
                                      <SelectItem value="Arthur" className="text-xs">Arthur</SelectItem>
                                      <SelectItem value="Aria" className="text-xs">Aria</SelectItem>
                                      <SelectItem value="Ayanda" className="text-xs">Ayanda</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Language Code</Label>
                                  <Input
                                    value={deepgramSettings.agent.speak.provider.language_code || 'en-US'}
                                    onChange={(e) =>
                                      setDeepgramSettings({
                                        ...deepgramSettings,
                                        agent: {
                                          ...deepgramSettings.agent,
                                          speak: {
                                            ...deepgramSettings.agent.speak,
                                            provider: {
                                              ...deepgramSettings.agent.speak.provider,
                                              language_code: e.target.value,
                                            },
                                          },
                                        },
                                      })
                                    }
                                    disabled={!isEditingDeepgram}
                                    className="h-8 text-xs"
                                    placeholder="en-US"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Engine</Label>
                                  <Select
                                    value={deepgramSettings.agent.speak.provider.engine || 'standard'}
                                    onValueChange={(value) =>
                                      setDeepgramSettings({
                                        ...deepgramSettings,
                                        agent: {
                                          ...deepgramSettings.agent,
                                          speak: {
                                            ...deepgramSettings.agent.speak,
                                            provider: {
                                              ...deepgramSettings.agent.speak.provider,
                                              engine: value,
                                            },
                                          },
                                        },
                                      })
                                    }
                                    disabled={!isEditingDeepgram}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="standard" className="text-xs">Standard</SelectItem>
                                      <SelectItem value="neural" className="text-xs">Neural</SelectItem>
                                      <SelectItem value="long-form" className="text-xs">Long-form</SelectItem>
                                      <SelectItem value="generative" className="text-xs">Generative</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Credential Type</Label>
                                  <Select
                                    value={deepgramSettings.agent.speak.provider.credentials?.type || 'sts'}
                                    onValueChange={(value) =>
                                      setDeepgramSettings({
                                        ...deepgramSettings,
                                        agent: {
                                          ...deepgramSettings.agent,
                                          speak: {
                                            ...deepgramSettings.agent.speak,
                                            provider: {
                                              ...deepgramSettings.agent.speak.provider,
                                              credentials: {
                                                ...deepgramSettings.agent.speak.provider.credentials!,
                                                type: value,
                                              },
                                            },
                                          },
                                        },
                                      })
                                    }
                                    disabled={!isEditingDeepgram}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="sts" className="text-xs">STS</SelectItem>
                                      <SelectItem value="iam" className="text-xs">IAM</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Region</Label>
                                  <Input
                                    value={deepgramSettings.agent.speak.provider.credentials?.region || ''}
                                    onChange={(e) =>
                                      setDeepgramSettings({
                                        ...deepgramSettings,
                                        agent: {
                                          ...deepgramSettings.agent,
                                          speak: {
                                            ...deepgramSettings.agent.speak,
                                            provider: {
                                              ...deepgramSettings.agent.speak.provider,
                                              credentials: {
                                                ...deepgramSettings.agent.speak.provider.credentials!,
                                                region: e.target.value,
                                              },
                                            },
                                          },
                                        },
                                      })
                                    }
                                    disabled={!isEditingDeepgram}
                                    className="h-8 text-xs"
                                    placeholder="us-west-2"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Access Key ID</Label>
                                  <Input
                                    value={deepgramSettings.agent.speak.provider.credentials?.access_key_id || ''}
                                    onChange={(e) =>
                                      setDeepgramSettings({
                                        ...deepgramSettings,
                                        agent: {
                                          ...deepgramSettings.agent,
                                          speak: {
                                            ...deepgramSettings.agent.speak,
                                            provider: {
                                              ...deepgramSettings.agent.speak.provider,
                                              credentials: {
                                                ...deepgramSettings.agent.speak.provider.credentials!,
                                                access_key_id: e.target.value,
                                              },
                                            },
                                          },
                                        },
                                      })
                                    }
                                    disabled={!isEditingDeepgram}
                                    className="h-8 text-xs"
                                    type="password"
                                    placeholder="AWS Access Key ID"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Secret Access Key</Label>
                                  <Input
                                    value={deepgramSettings.agent.speak.provider.credentials?.secret_access_key || ''}
                                    onChange={(e) =>
                                      setDeepgramSettings({
                                        ...deepgramSettings,
                                        agent: {
                                          ...deepgramSettings.agent,
                                          speak: {
                                            ...deepgramSettings.agent.speak,
                                            provider: {
                                              ...deepgramSettings.agent.speak.provider,
                                              credentials: {
                                                ...deepgramSettings.agent.speak.provider.credentials!,
                                                secret_access_key: e.target.value,
                                              },
                                            },
                                          },
                                        },
                                      })
                                    }
                                    disabled={!isEditingDeepgram}
                                    className="h-8 text-xs"
                                    type="password"
                                    placeholder="AWS Secret Access Key"
                                  />
                                </div>
                              </div>
                              {deepgramSettings.agent.speak.provider.credentials?.type === 'sts' && (
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Session Token</Label>
                                  <Input
                                    value={deepgramSettings.agent.speak.provider.credentials?.session_token || ''}
                                    onChange={(e) =>
                                      setDeepgramSettings({
                                        ...deepgramSettings,
                                        agent: {
                                          ...deepgramSettings.agent,
                                          speak: {
                                            ...deepgramSettings.agent.speak,
                                            provider: {
                                              ...deepgramSettings.agent.speak.provider,
                                              credentials: {
                                                ...deepgramSettings.agent.speak.provider.credentials!,
                                                session_token: e.target.value,
                                              },
                                            },
                                          },
                                        },
                                      })
                                    }
                                    disabled={!isEditingDeepgram}
                                    className="h-8 text-xs"
                                    type="password"
                                    placeholder="AWS Session Token (optional)"
                                  />
                                </div>
                              )}
                              {deepgramSettings.agent.speak.endpoint && (
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Endpoint URL</Label>
                                  <Input
                                    value={deepgramSettings.agent.speak.endpoint.url || ''}
                                    onChange={(e) =>
                                      setDeepgramSettings({
                                        ...deepgramSettings,
                                        agent: {
                                          ...deepgramSettings.agent,
                                          speak: {
                                            ...deepgramSettings.agent.speak,
                                            endpoint: {
                                              ...deepgramSettings.agent.speak.endpoint,
                                              url: e.target.value,
                                            },
                                          },
                                        },
                                      })
                                    }
                                    disabled={!isEditingDeepgram}
                                    className="h-8 text-xs"
                                    placeholder="https://polly.us-west-2.amazonaws.com/v1/speech"
                                  />
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Listen Provider */}
                      <div className="space-y-2 p-3 border rounded-md bg-muted/30">
                        <Label className="text-xs font-medium">Listen Provider (STT)</Label>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Type</Label>
                            <Input
                              value={deepgramSettings.agent.listen.provider.type}
                              onChange={(e) =>
                                setDeepgramSettings({
                                  ...deepgramSettings,
                                  agent: {
                                    ...deepgramSettings.agent,
                                    listen: {
                                      ...deepgramSettings.agent.listen,
                                      provider: {
                                        ...deepgramSettings.agent.listen.provider,
                                        type: e.target.value,
                                      },
                                    },
                                  },
                                })
                              }
                              disabled={!isEditingDeepgram}
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Version</Label>
                            <Input
                              value={deepgramSettings.agent.listen.provider.version || ''}
                              onChange={(e) =>
                                setDeepgramSettings({
                                  ...deepgramSettings,
                                  agent: {
                                    ...deepgramSettings.agent,
                                    listen: {
                                      ...deepgramSettings.agent.listen,
                                      provider: {
                                        ...deepgramSettings.agent.listen.provider,
                                        version: e.target.value,
                                      },
                                    },
                                  },
                                })
                              }
                              disabled={!isEditingDeepgram}
                              className="h-8 text-xs"
                              placeholder="v2"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Model</Label>
                            <Select
                              value={deepgramSettings.agent.listen.provider.model}
                              onValueChange={(value) =>
                                setDeepgramSettings({
                                  ...deepgramSettings,
                                  agent: {
                                    ...deepgramSettings.agent,
                                    listen: {
                                      ...deepgramSettings.agent.listen,
                                      provider: {
                                        ...deepgramSettings.agent.listen.provider,
                                        model: value,
                                      },
                                    },
                                  },
                                })
                              }
                              disabled={!isEditingDeepgram}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="flux-general-en" className="text-xs">Flux General (EN)</SelectItem>
                                <SelectItem value="nova-2" className="text-xs">Nova 2</SelectItem>
                                <SelectItem value="nova" className="text-xs">Nova</SelectItem>
                                <SelectItem value="enhanced" className="text-xs">Enhanced</SelectItem>
                                <SelectItem value="base" className="text-xs">Base</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      {/* Think Provider */}
                      <div className="space-y-2 p-3 border rounded-md bg-muted/30">
                        <Label className="text-xs font-medium">Think Provider (LLM)</Label>
                        <div className="space-y-2">
                          {/* Provider Type */}
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Provider Type</Label>
                            <Select
                              value={deepgramSettings.agent.think.provider.type}
                              onValueChange={(value) => {
                                // Reset provider config when type changes
                                const baseProvider: any = { type: value };
                                
                                // Set defaults based on provider type
                                if (value === 'open_ai') {
                                  baseProvider.model = 'gpt-4o-mini';
                                  baseProvider.temperature = 0.7;
                                  baseProvider.api_key = ''; // User will provide their own API key
                                } else if (value === 'openrouter') {
                                  baseProvider.model = 'openai/gpt-4o-mini';
                                  baseProvider.temperature = 0.7;
                                  baseProvider.api_key = ''; // User will provide their own API key
                                  baseProvider.endpoint = { 
                                    url: 'https://openrouter.ai/api/v1/chat/completions',
                                    headers: {}
                                  };
                                } else if (value === 'anthropic') {
                                  baseProvider.model = 'claude-3-5-haiku-latest';
                                  baseProvider.temperature = 0.7;
                                } else if (value === 'google') {
                                  baseProvider.temperature = 0.5;
                                  // Google doesn't use model field, it's in the URL
                                } else if (value === 'groq') {
                                  baseProvider.model = 'openai/gpt-oss-20b';
                                } else if (value === 'aws_bedrock') {
                                  baseProvider.credentials = {
                                    type: 'iam',
                                    region: 'us-east-2',
                                  };
                                }
                                
                                setDeepgramSettings({
                                  ...deepgramSettings,
                                  agent: {
                                    ...deepgramSettings.agent,
                                    think: {
                                      ...deepgramSettings.agent.think,
                                      provider: baseProvider,
                                      // Add endpoint for providers that require it
                                      endpoint: (value === 'google' || value === 'groq' || value === 'aws_bedrock') 
                                        ? { url: '', headers: {} }
                                        : undefined,
                                    },
                                  },
                                });
                              }}
                              disabled={!isEditingDeepgram}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="open_ai" className="text-xs">OpenAI (BYO API Key)</SelectItem>
                                <SelectItem value="openrouter" className="text-xs">OpenRouter (BYO API Key)</SelectItem>
                                <SelectItem value="anthropic" className="text-xs">Anthropic (Managed)</SelectItem>
                                <SelectItem value="google" className="text-xs">Google (BYO - Required)</SelectItem>
                                <SelectItem value="groq" className="text-xs">Groq (BYO - Required)</SelectItem>
                                <SelectItem value="aws_bedrock" className="text-xs">AWS Bedrock (BYO - Required)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* OpenAI Provider Fields */}
                          {deepgramSettings.agent.think.provider.type === 'open_ai' && (
                            <>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">OpenAI API Key *</Label>
                                <Input
                                  value={deepgramSettings.agent.think.provider.api_key || ''}
                                  onChange={(e) =>
                                    setDeepgramSettings({
                                      ...deepgramSettings,
                                      agent: {
                                        ...deepgramSettings.agent,
                                        think: {
                                          ...deepgramSettings.agent.think,
                                          provider: {
                                            ...deepgramSettings.agent.think.provider,
                                            api_key: e.target.value,
                                          },
                                        },
                                      },
                                    })
                                  }
                                  disabled={!isEditingDeepgram}
                                  className="h-8 text-xs"
                                  type="password"
                                  placeholder="sk-..."
                                />
                                <p className="text-xs text-muted-foreground">Your OpenAI API key from https://platform.openai.com/api-keys</p>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Model</Label>
                                  <Select
                                    value={deepgramSettings.agent.think.provider.model || 'gpt-4o-mini'}
                                    onValueChange={(value) =>
                                      setDeepgramSettings({
                                        ...deepgramSettings,
                                        agent: {
                                          ...deepgramSettings.agent,
                                          think: {
                                            ...deepgramSettings.agent.think,
                                            provider: {
                                              ...deepgramSettings.agent.think.provider,
                                              model: value,
                                            },
                                          },
                                        },
                                      })
                                    }
                                    disabled={!isEditingDeepgram}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Advanced Tier</div>
                                      <SelectItem value="gpt-5" className="text-xs">GPT-5</SelectItem>
                                      <SelectItem value="gpt-4.1" className="text-xs">GPT-4.1</SelectItem>
                                      <SelectItem value="gpt-4o" className="text-xs">GPT-4o</SelectItem>
                                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Standard Tier</div>
                                      <SelectItem value="gpt-5-mini" className="text-xs">GPT-5 Mini</SelectItem>
                                      <SelectItem value="gpt-5-nano" className="text-xs">GPT-5 Nano</SelectItem>
                                      <SelectItem value="gpt-4.1-mini" className="text-xs">GPT-4.1 Mini</SelectItem>
                                      <SelectItem value="gpt-4.1-nano" className="text-xs">GPT-4.1 Nano</SelectItem>
                                      <SelectItem value="gpt-4o-mini" className="text-xs">GPT-4o Mini</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Temperature</Label>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="2"
                                    value={deepgramSettings.agent.think.provider.temperature || 0.7}
                                    onChange={(e) =>
                                      setDeepgramSettings({
                                        ...deepgramSettings,
                                        agent: {
                                          ...deepgramSettings.agent,
                                          think: {
                                            ...deepgramSettings.agent.think,
                                            provider: {
                                              ...deepgramSettings.agent.think.provider,
                                              temperature: parseFloat(e.target.value) || 0.7,
                                            },
                                          },
                                        },
                                      })
                                    }
                                    disabled={!isEditingDeepgram}
                                    className="h-8 text-xs"
                                    placeholder="0.7"
                                  />
                                </div>
                              </div>
                              {deepgramSettings.agent.think.endpoint && (
                                <>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Custom Endpoint URL (Optional)</Label>
                                    <Input
                                      value={deepgramSettings.agent.think.endpoint.url || ''}
                                      onChange={(e) =>
                                        setDeepgramSettings({
                                          ...deepgramSettings,
                                          agent: {
                                            ...deepgramSettings.agent,
                                            think: {
                                              ...deepgramSettings.agent.think,
                                              endpoint: {
                                                ...deepgramSettings.agent.think.endpoint!,
                                                url: e.target.value,
                                              },
                                            },
                                          },
                                        })
                                      }
                                      disabled={!isEditingDeepgram}
                                      className="h-8 text-xs"
                                      placeholder="https://api.example.com/v1/chat/completions"
                                    />
                                  </div>
                                </>
                              )}
                            </>
                          )}

                          {/* OpenRouter Provider Fields */}
                          {deepgramSettings.agent.think.provider.type === 'openrouter' && (
                            <>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">OpenRouter API Key *</Label>
                                <Input
                                  value={deepgramSettings.agent.think.provider.api_key || ''}
                                  onChange={(e) =>
                                    setDeepgramSettings({
                                      ...deepgramSettings,
                                      agent: {
                                        ...deepgramSettings.agent,
                                        think: {
                                          ...deepgramSettings.agent.think,
                                          provider: {
                                            ...deepgramSettings.agent.think.provider,
                                            api_key: e.target.value,
                                          },
                                        },
                                      },
                                    })
                                  }
                                  disabled={!isEditingDeepgram}
                                  className="h-8 text-xs"
                                  type="password"
                                  placeholder="sk-or-..."
                                />
                                <p className="text-xs text-muted-foreground">Your OpenRouter API key from https://openrouter.ai/keys</p>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Model</Label>
                                  <Input
                                    value={deepgramSettings.agent.think.provider.model || 'openai/gpt-4o-mini'}
                                    onChange={(e) =>
                                      setDeepgramSettings({
                                        ...deepgramSettings,
                                        agent: {
                                          ...deepgramSettings.agent,
                                          think: {
                                            ...deepgramSettings.agent.think,
                                            provider: {
                                              ...deepgramSettings.agent.think.provider,
                                              model: e.target.value,
                                            },
                                          },
                                        },
                                      })
                                    }
                                    disabled={!isEditingDeepgram}
                                    className="h-8 text-xs"
                                    placeholder="openai/gpt-4o-mini"
                                  />
                                  <p className="text-xs text-muted-foreground">Format: provider/model (e.g., openai/gpt-4o-mini)</p>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Temperature</Label>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="2"
                                    value={deepgramSettings.agent.think.provider.temperature || 0.7}
                                    onChange={(e) =>
                                      setDeepgramSettings({
                                        ...deepgramSettings,
                                        agent: {
                                          ...deepgramSettings.agent,
                                          think: {
                                            ...deepgramSettings.agent.think,
                                            provider: {
                                              ...deepgramSettings.agent.think.provider,
                                              temperature: parseFloat(e.target.value) || 0.7,
                                            },
                                          },
                                        },
                                      })
                                    }
                                    disabled={!isEditingDeepgram}
                                    className="h-8 text-xs"
                                    placeholder="0.7"
                                  />
                                </div>
                              </div>
                              {deepgramSettings.agent.think.endpoint && (
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Endpoint URL</Label>
                                  <Input
                                    value={deepgramSettings.agent.think.endpoint.url || 'https://openrouter.ai/api/v1/chat/completions'}
                                    onChange={(e) =>
                                      setDeepgramSettings({
                                        ...deepgramSettings,
                                        agent: {
                                          ...deepgramSettings.agent,
                                          think: {
                                            ...deepgramSettings.agent.think,
                                            endpoint: {
                                              ...deepgramSettings.agent.think.endpoint!,
                                              url: e.target.value,
                                            },
                                          },
                                        },
                                      })
                                    }
                                    disabled={!isEditingDeepgram}
                                    className="h-8 text-xs"
                                    placeholder="https://openrouter.ai/api/v1/chat/completions"
                                  />
                                </div>
                              )}
                            </>
                          )}

                          {/* Anthropic Provider Fields */}
                          {deepgramSettings.agent.think.provider.type === 'anthropic' && (
                            <>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Model</Label>
                                  <Select
                                    value={deepgramSettings.agent.think.provider.model || 'claude-3-5-haiku-latest'}
                                    onValueChange={(value) =>
                                      setDeepgramSettings({
                                        ...deepgramSettings,
                                        agent: {
                                          ...deepgramSettings.agent,
                                          think: {
                                            ...deepgramSettings.agent.think,
                                            provider: {
                                              ...deepgramSettings.agent.think.provider,
                                              model: value,
                                            },
                                          },
                                        },
                                      })
                                    }
                                    disabled={!isEditingDeepgram}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Standard Tier</div>
                                      <SelectItem value="claude-4-5-haiku-latest" className="text-xs">Claude 4.5 Haiku</SelectItem>
                                      <SelectItem value="claude-3-5-haiku-latest" className="text-xs">Claude 3.5 Haiku</SelectItem>
                                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Advanced Tier</div>
                                      <SelectItem value="claude-sonnet-4-20250514" className="text-xs">Claude Sonnet 4</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Temperature</Label>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="2"
                                    value={deepgramSettings.agent.think.provider.temperature || 0.7}
                                    onChange={(e) =>
                                      setDeepgramSettings({
                                        ...deepgramSettings,
                                        agent: {
                                          ...deepgramSettings.agent,
                                          think: {
                                            ...deepgramSettings.agent.think,
                                            provider: {
                                              ...deepgramSettings.agent.think.provider,
                                              temperature: parseFloat(e.target.value) || 0.7,
                                            },
                                          },
                                        },
                                      })
                                    }
                                    disabled={!isEditingDeepgram}
                                    className="h-8 text-xs"
                                    placeholder="0.7"
                                  />
                                </div>
                              </div>
                              {deepgramSettings.agent.think.endpoint && (
                                <>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Custom Endpoint URL (Optional)</Label>
                                    <Input
                                      value={deepgramSettings.agent.think.endpoint.url || ''}
                                      onChange={(e) =>
                                        setDeepgramSettings({
                                          ...deepgramSettings,
                                          agent: {
                                            ...deepgramSettings.agent,
                                            think: {
                                              ...deepgramSettings.agent.think,
                                              endpoint: {
                                                ...deepgramSettings.agent.think.endpoint!,
                                                url: e.target.value,
                                              },
                                            },
                                          },
                                        })
                                      }
                                      disabled={!isEditingDeepgram}
                                      className="h-8 text-xs"
                                      placeholder="https://api.anthropic.com/v1/messages"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">x-api-key Header</Label>
                                    <Input
                                      value={deepgramSettings.agent.think.endpoint?.headers?.['x-api-key'] || ''}
                                      onChange={(e) =>
                                        setDeepgramSettings({
                                          ...deepgramSettings,
                                          agent: {
                                            ...deepgramSettings.agent,
                                            think: {
                                              ...deepgramSettings.agent.think,
                                              endpoint: {
                                                ...deepgramSettings.agent.think.endpoint!,
                                                headers: {
                                                  ...deepgramSettings.agent.think.endpoint?.headers,
                                                  'x-api-key': e.target.value,
                                                },
                                              },
                                            },
                                          },
                                        })
                                      }
                                      disabled={!isEditingDeepgram}
                                      className="h-8 text-xs"
                                      type="password"
                                      placeholder="Anthropic API Key"
                                    />
                                  </div>
                                </>
                              )}
                            </>
                          )}

                          {/* Google Provider Fields */}
                          {deepgramSettings.agent.think.provider.type === 'google' && (
                            <>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Temperature</Label>
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="2"
                                  value={deepgramSettings.agent.think.provider.temperature || 0.5}
                                  onChange={(e) =>
                                    setDeepgramSettings({
                                      ...deepgramSettings,
                                      agent: {
                                        ...deepgramSettings.agent,
                                        think: {
                                          ...deepgramSettings.agent.think,
                                          provider: {
                                            ...deepgramSettings.agent.think.provider,
                                            temperature: parseFloat(e.target.value) || 0.5,
                                          },
                                        },
                                      },
                                    })
                                  }
                                  disabled={!isEditingDeepgram}
                                  className="h-8 text-xs"
                                  placeholder="0.5"
                                />
                                <p className="text-xs text-muted-foreground">
                                  Note: Model is specified in the endpoint URL for Google
                                </p>
                              </div>
                              {deepgramSettings.agent.think.endpoint && (
                                <>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Endpoint URL (Required)</Label>
                                    <Select
                                      value={deepgramSettings.agent.think.endpoint.url || ''}
                                      onValueChange={(value) =>
                                        setDeepgramSettings({
                                          ...deepgramSettings,
                                          agent: {
                                            ...deepgramSettings.agent,
                                            think: {
                                              ...deepgramSettings.agent.think,
                                              endpoint: {
                                                ...deepgramSettings.agent.think.endpoint!,
                                                url: value,
                                              },
                                            },
                                          },
                                        })
                                      }
                                      disabled={!isEditingDeepgram}
                                    >
                                      <SelectTrigger className="h-8 text-xs">
                                        <SelectValue placeholder="Select model URL" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse" className="text-xs">Gemini 2.5 Flash</SelectItem>
                                        <SelectItem value="https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse" className="text-xs">Gemini 2.0 Flash</SelectItem>
                                        <SelectItem value="https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:streamGenerateContent?alt=sse" className="text-xs">Gemini 2.0 Flash Lite</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">x-goog-api-key Header (Required)</Label>
                                    <Input
                                      value={deepgramSettings.agent.think.endpoint?.headers?.['x-goog-api-key'] || ''}
                                      onChange={(e) =>
                                        setDeepgramSettings({
                                          ...deepgramSettings,
                                          agent: {
                                            ...deepgramSettings.agent,
                                            think: {
                                              ...deepgramSettings.agent.think,
                                              endpoint: {
                                                ...deepgramSettings.agent.think.endpoint!,
                                                headers: {
                                                  ...deepgramSettings.agent.think.endpoint?.headers,
                                                  'x-goog-api-key': e.target.value,
                                                },
                                              },
                                            },
                                          },
                                        })
                                      }
                                      disabled={!isEditingDeepgram}
                                      className="h-8 text-xs"
                                      type="password"
                                      placeholder="Google AI Studio API Key"
                                    />
                                  </div>
                                </>
                              )}
                            </>
                          )}

                          {/* Groq Provider Fields */}
                          {deepgramSettings.agent.think.provider.type === 'groq' && (
                            <>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Model</Label>
                                  <Select
                                    value={deepgramSettings.agent.think.provider.model || 'openai/gpt-oss-20b'}
                                    onValueChange={(value) =>
                                      setDeepgramSettings({
                                        ...deepgramSettings,
                                        agent: {
                                          ...deepgramSettings.agent,
                                          think: {
                                            ...deepgramSettings.agent.think,
                                            provider: {
                                              ...deepgramSettings.agent.think.provider,
                                              model: value,
                                            },
                                          },
                                        },
                                      })
                                    }
                                    disabled={!isEditingDeepgram}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="openai/gpt-oss-20b" className="text-xs">GPT OSS 20B</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Temperature</Label>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="2"
                                    value={deepgramSettings.agent.think.provider.temperature || 0.7}
                                    onChange={(e) =>
                                      setDeepgramSettings({
                                        ...deepgramSettings,
                                        agent: {
                                          ...deepgramSettings.agent,
                                          think: {
                                            ...deepgramSettings.agent.think,
                                            provider: {
                                              ...deepgramSettings.agent.think.provider,
                                              temperature: parseFloat(e.target.value) || 0.7,
                                            },
                                          },
                                        },
                                      })
                                    }
                                    disabled={!isEditingDeepgram}
                                    className="h-8 text-xs"
                                    placeholder="0.7"
                                  />
                                </div>
                              </div>
                              {deepgramSettings.agent.think.endpoint && (
                                <>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Endpoint URL (Required)</Label>
                                    <Input
                                      value={deepgramSettings.agent.think.endpoint.url || ''}
                                      onChange={(e) =>
                                        setDeepgramSettings({
                                          ...deepgramSettings,
                                          agent: {
                                            ...deepgramSettings.agent,
                                            think: {
                                              ...deepgramSettings.agent.think,
                                              endpoint: {
                                                ...deepgramSettings.agent.think.endpoint!,
                                                url: e.target.value,
                                              },
                                            },
                                          },
                                        })
                                      }
                                      disabled={!isEditingDeepgram}
                                      className="h-8 text-xs"
                                      placeholder="https://api.groq.com/openai/v1/chat/completions"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Authorization Header</Label>
                                    <Input
                                      value={deepgramSettings.agent.think.endpoint?.headers?.['authorization'] || ''}
                                      onChange={(e) =>
                                        setDeepgramSettings({
                                          ...deepgramSettings,
                                          agent: {
                                            ...deepgramSettings.agent,
                                            think: {
                                              ...deepgramSettings.agent.think,
                                              endpoint: {
                                                ...deepgramSettings.agent.think.endpoint!,
                                                headers: {
                                                  ...deepgramSettings.agent.think.endpoint?.headers,
                                                  authorization: e.target.value,
                                                },
                                              },
                                            },
                                          },
                                        })
                                      }
                                      disabled={!isEditingDeepgram}
                                      className="h-8 text-xs"
                                      type="password"
                                      placeholder="Bearer YOUR_GROQ_API_KEY"
                                    />
                                  </div>
                                </>
                              )}
                            </>
                          )}

                          {/* AWS Bedrock Provider Fields */}
                          {deepgramSettings.agent.think.provider.type === 'aws_bedrock' && (
                            <>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Model</Label>
                                  <Input
                                    value={deepgramSettings.agent.think.provider.model || ''}
                                    onChange={(e) =>
                                      setDeepgramSettings({
                                        ...deepgramSettings,
                                        agent: {
                                          ...deepgramSettings.agent,
                                          think: {
                                            ...deepgramSettings.agent.think,
                                            provider: {
                                              ...deepgramSettings.agent.think.provider,
                                              model: e.target.value,
                                            },
                                          },
                                        },
                                      })
                                    }
                                    disabled={!isEditingDeepgram}
                                    className="h-8 text-xs"
                                    placeholder="Custom model ID"
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    Any model string accepted (BYO)
                                  </p>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Temperature</Label>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="2"
                                    value={deepgramSettings.agent.think.provider.temperature || 0.7}
                                    onChange={(e) =>
                                      setDeepgramSettings({
                                        ...deepgramSettings,
                                        agent: {
                                          ...deepgramSettings.agent,
                                          think: {
                                            ...deepgramSettings.agent.think,
                                            provider: {
                                              ...deepgramSettings.agent.think.provider,
                                              temperature: parseFloat(e.target.value) || 0.7,
                                            },
                                          },
                                        },
                                      })
                                    }
                                    disabled={!isEditingDeepgram}
                                    className="h-8 text-xs"
                                    placeholder="0.7"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Credential Type</Label>
                                  <Select
                                    value={deepgramSettings.agent.think.provider.credentials?.type || 'iam'}
                                    onValueChange={(value) =>
                                      setDeepgramSettings({
                                        ...deepgramSettings,
                                        agent: {
                                          ...deepgramSettings.agent,
                                          think: {
                                            ...deepgramSettings.agent.think,
                                            provider: {
                                              ...deepgramSettings.agent.think.provider,
                                              credentials: {
                                                ...deepgramSettings.agent.think.provider.credentials!,
                                                type: value,
                                              },
                                            },
                                          },
                                        },
                                      })
                                    }
                                    disabled={!isEditingDeepgram}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="iam" className="text-xs">IAM</SelectItem>
                                      <SelectItem value="sts" className="text-xs">STS</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Region</Label>
                                  <Input
                                    value={deepgramSettings.agent.think.provider.credentials?.region || ''}
                                    onChange={(e) =>
                                      setDeepgramSettings({
                                        ...deepgramSettings,
                                        agent: {
                                          ...deepgramSettings.agent,
                                          think: {
                                            ...deepgramSettings.agent.think,
                                            provider: {
                                              ...deepgramSettings.agent.think.provider,
                                              credentials: {
                                                ...deepgramSettings.agent.think.provider.credentials!,
                                                region: e.target.value,
                                              },
                                            },
                                          },
                                        },
                                      })
                                    }
                                    disabled={!isEditingDeepgram}
                                    className="h-8 text-xs"
                                    placeholder="us-east-2"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Access Key ID</Label>
                                  <Input
                                    value={deepgramSettings.agent.think.provider.credentials?.access_key_id || ''}
                                    onChange={(e) =>
                                      setDeepgramSettings({
                                        ...deepgramSettings,
                                        agent: {
                                          ...deepgramSettings.agent,
                                          think: {
                                            ...deepgramSettings.agent.think,
                                            provider: {
                                              ...deepgramSettings.agent.think.provider,
                                              credentials: {
                                                ...deepgramSettings.agent.think.provider.credentials!,
                                                access_key_id: e.target.value,
                                              },
                                            },
                                          },
                                        },
                                      })
                                    }
                                    disabled={!isEditingDeepgram}
                                    className="h-8 text-xs"
                                    type="password"
                                    placeholder="AWS Access Key ID"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Secret Access Key</Label>
                                  <Input
                                    value={deepgramSettings.agent.think.provider.credentials?.secret_access_key || ''}
                                    onChange={(e) =>
                                      setDeepgramSettings({
                                        ...deepgramSettings,
                                        agent: {
                                          ...deepgramSettings.agent,
                                          think: {
                                            ...deepgramSettings.agent.think,
                                            provider: {
                                              ...deepgramSettings.agent.think.provider,
                                              credentials: {
                                                ...deepgramSettings.agent.think.provider.credentials!,
                                                secret_access_key: e.target.value,
                                              },
                                            },
                                          },
                                        },
                                      })
                                    }
                                    disabled={!isEditingDeepgram}
                                    className="h-8 text-xs"
                                    type="password"
                                    placeholder="AWS Secret Access Key"
                                  />
                                </div>
                              </div>
                              {deepgramSettings.agent.think.provider.credentials?.type === 'sts' && (
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Session Token (Required for STS)</Label>
                                  <Input
                                    value={deepgramSettings.agent.think.provider.credentials?.session_token || ''}
                                    onChange={(e) =>
                                      setDeepgramSettings({
                                        ...deepgramSettings,
                                        agent: {
                                          ...deepgramSettings.agent,
                                          think: {
                                            ...deepgramSettings.agent.think,
                                            provider: {
                                              ...deepgramSettings.agent.think.provider,
                                              credentials: {
                                                ...deepgramSettings.agent.think.provider.credentials!,
                                                session_token: e.target.value,
                                              },
                                            },
                                          },
                                        },
                                      })
                                    }
                                    disabled={!isEditingDeepgram}
                                    className="h-8 text-xs"
                                    type="password"
                                    placeholder="AWS Session Token"
                                  />
                                </div>
                              )}
                              {deepgramSettings.agent.think.endpoint && (
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Endpoint URL (Required)</Label>
                                  <Input
                                    value={deepgramSettings.agent.think.endpoint.url || ''}
                                    onChange={(e) =>
                                      setDeepgramSettings({
                                        ...deepgramSettings,
                                        agent: {
                                          ...deepgramSettings.agent,
                                          think: {
                                            ...deepgramSettings.agent.think,
                                            endpoint: {
                                              ...deepgramSettings.agent.think.endpoint,
                                              url: e.target.value,
                                            },
                                          },
                                        },
                                      })
                                    }
                                    disabled={!isEditingDeepgram}
                                    className="h-8 text-xs"
                                    placeholder="https://bedrock-runtime.us-east-2.amazonaws.com"
                                  />
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Prompt */}
                      <div className="space-y-1.5">
                        <Label htmlFor="agent_prompt" className="text-xs">Agent Prompt</Label>
                        <Textarea
                          id="agent_prompt"
                          value={deepgramSettings.agent.think.prompt}
                          onChange={(e) =>
                            setDeepgramSettings({
                              ...deepgramSettings,
                              agent: {
                                ...deepgramSettings.agent,
                                think: {
                                  ...deepgramSettings.agent.think,
                                  prompt: e.target.value,
                                },
                              },
                            })
                          }
                          placeholder="Enter the agent prompt..."
                          rows={10}
                          disabled={!isEditingDeepgram}
                          className="resize-none text-xs font-mono"
                        />
                        <p className="text-xs text-muted-foreground">
                          {deepgramSettings.agent.think.prompt.length} characters
                        </p>
                      </div>

                      {/* Greeting */}
                      <div className="space-y-1.5">
                        <Label htmlFor="agent_greeting" className="text-xs">Greeting Message</Label>
                        <Textarea
                          id="agent_greeting"
                          value={deepgramSettings.agent.greeting}
                          onChange={(e) =>
                            setDeepgramSettings({
                              ...deepgramSettings,
                              agent: {
                                ...deepgramSettings.agent,
                                greeting: e.target.value,
                              },
                            })
                          }
                          placeholder="Enter the greeting message..."
                          rows={3}
                          disabled={!isEditingDeepgram}
                          className="resize-none text-xs"
                        />
                        <p className="text-xs text-muted-foreground">
                          {deepgramSettings.agent.greeting.length} characters
                        </p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Agent Selection Dialog */}
      <Dialog 
        open={showAgentDialog} 
        onOpenChange={(open) => {
          setShowAgentDialog(open);
          if (!open) {
            setSelectedAgentForCall(null);
            setSelectedLeadForCall(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Select Voice Agent</DialogTitle>
            <DialogDescription>
              Choose an agent to call {selectedLeadForCall?.name || 'this lead'} with
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            {/* Option: Direct Call (No Agent) */}
            <button
              type="button"
              onClick={() => {
                setSelectedAgentForCall(null);
              }}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                selectedAgentForCall === null
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  selectedAgentForCall === null
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}>
                  <Phone className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">Direct Call</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Make a regular phone call without voice agent
                  </div>
                </div>
                {selectedAgentForCall === null && (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                )}
              </div>
            </button>

            {/* Agent Options */}
            {agentsLoading ? (
              <div className="text-center py-4">
                <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                <p className="text-muted-foreground mt-2 text-xs">Loading agents...</p>
              </div>
            ) : agents.length === 0 ? (
              <div className="text-center py-4">
                <Bot className="h-8 w-8 mx-auto text-muted-foreground mb-2 opacity-50" />
                <p className="text-muted-foreground text-xs mb-3">No voice agents configured</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowAgentDialog(false);
                    setActiveTab('voice-agent');
                  }}
                >
                  Create Agent
                </Button>
              </div>
            ) : (
              agents.map((agent) => (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => {
                    console.log('Agent selected:', agent.name, agent);
                    setSelectedAgentForCall(agent);
                  }}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    selectedAgentForCall?.id === agent.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      selectedAgentForCall?.id === agent.id
                        ? 'bg-primary text-primary-foreground'
                        : agent.voiceProvider === 'deepgram'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-purple-500/10 text-purple-600'
                    }`}>
                      {agent.voiceProvider === 'deepgram' ? (
                        <Mic className="h-4 w-4" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-sm">{agent.name}</div>
                        {agent.isActive && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0">
                            <div className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1.5" />
                            Active
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {agent.systemPrompt || 'No system instructions'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Provider: Deepgram
                      </div>
                    </div>
                    {selectedAgentForCall?.id === agent.id && (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAgentDialog(false);
                setSelectedAgentForCall(null);
                setSelectedLeadForCall(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!selectedLeadForCall) {
                  toast({
                    title: 'No lead selected',
                    description: 'Please select a lead to call.',
                    variant: 'destructive',
                  });
                  return;
                }

                if (isInitiatingCall) {
                  return; // Prevent multiple clicks
                }

                console.log('Start Call clicked:', {
                  lead: selectedLeadForCall.name,
                  leadPhone: selectedLeadForCall.phone,
                  agent: selectedAgentForCall?.name || 'Direct Call',
                  agentData: selectedAgentForCall
                });

                setIsInitiatingCall(true);
                
                // Close dialog first
                setShowAgentDialog(false);
                const leadToCall = selectedLeadForCall;
                const agentToUse = selectedAgentForCall || undefined;
                
                // Clear selections
                setSelectedAgentForCall(null);
                setSelectedLeadForCall(null);

                // Initiate call
                try {
                  await handleMakeCall(leadToCall, agentToUse);
                } catch (error) {
                  console.error('Error in handleMakeCall:', error);
                  toast({
                    title: 'Call failed',
                    description: error instanceof Error ? error.message : 'Unknown error occurred',
                    variant: 'destructive',
                  });
                } finally {
                  setIsInitiatingCall(false);
                }
              }}
              disabled={!selectedLeadForCall || isInitiatingCall}
            >
              {isInitiatingCall ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Initiating...
                </>
              ) : (
                <>
                  <Phone className="h-4 w-4 mr-2" />
                  Start Call
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Calling;
