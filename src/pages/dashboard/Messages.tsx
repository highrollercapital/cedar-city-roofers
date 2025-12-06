import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, Message } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

const Messages = () => {
  const { user } = useAuth();
  const [selectedProject, setSelectedProject] = useState<string>('');

  // Fetch messages
  const { data: messages, isLoading } = useQuery({
    queryKey: ['messages', user?.id, selectedProject],
    queryFn: async () => {
      let query = supabase
        .from('messages')
        .select('*, projects(name)')
        .or(`sender_id.eq.${user?.id},recipient_id.eq.${user?.id}`)
        .order('created_at', { ascending: false });

      if (selectedProject) {
        query = query.eq('project_id', selectedProject);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (Message & { projects?: { name: string } })[];
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-6 bg-background min-h-full">
      <div>
        <h1 className="text-3xl font-bold">Messages</h1>
        <p className="text-muted-foreground">Communicate with your team and clients</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Messages List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Messages</CardTitle>
            <CardDescription>Your conversation history</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">Loading messages...</div>
            ) : messages && messages.length > 0 ? (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-4 border rounded-lg ${
                      message.sender_id === user?.id ? 'bg-muted' : 'bg-background'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium">
                          {message.sender_id === user?.id ? 'You' : 'Other'}
                        </p>
                        {message.projects && (
                          <p className="text-sm text-muted-foreground">
                            Project: {message.projects.name}
                          </p>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(message.created_at), 'MMM d, h:mm a')}
                      </div>
                    </div>
                    {message.subject && (
                      <p className="font-semibold mb-1">{message.subject}</p>
                    )}
                    <p className="text-sm">{message.content}</p>
                    {!message.read && message.recipient_id === user?.id && (
                      <Badge variant="outline" className="mt-2">
                        New
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No messages yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Send Message */}
        <Card>
          <CardHeader>
            <CardTitle>Send Message</CardTitle>
            <CardDescription>Send a message to a project</CardDescription>
          </CardHeader>
          <CardContent>
            <MessageForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const MessageForm = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    project_id: '',
    recipient_id: '',
    subject: '',
    content: '',
  });
  const queryClient = useQueryClient();

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase.from('messages').insert({
        ...formData,
        sender_id: user.id,
      }).select();

      if (error) {
        console.error('Error sending message to Supabase:', error);
        if (error.message.includes('relation') || error.message.includes('does not exist')) {
          throw new Error('Database tables not set up. Please run supabase/schema.sql in Supabase SQL Editor.');
        }
        throw error;
      }

      console.log('Message saved to Supabase:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      toast({
        title: 'Message sent',
        description: 'Your message has been sent successfully.',
      });
      setFormData({ project_id: '', recipient_id: '', subject: '', content: '' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="subject">Subject</Label>
        <Input
          id="subject"
          value={formData.subject}
          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="content">Message *</Label>
        <Textarea
          id="content"
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          rows={6}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={sendMutation.isPending}>
        <Send className="mr-2 h-4 w-4" />
        {sendMutation.isPending ? 'Sending...' : 'Send Message'}
      </Button>
    </form>
  );
};

export default Messages;

