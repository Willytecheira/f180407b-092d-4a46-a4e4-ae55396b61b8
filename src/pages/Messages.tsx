import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Send, MessageSquare, Search, Filter, Plus, Image, FileText, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  sessionId: string;
  sessionName: string;
  from: string;
  to: string;
  content: string;
  type: 'text' | 'image' | 'document' | 'audio' | 'video';
  timestamp: string;
  direction: 'inbound' | 'outbound';
  status: 'sent' | 'delivered' | 'read' | 'failed';
}

interface Session {
  id: string;
  name: string;
  status: 'connected' | 'disconnected';
}

export const Messages: React.FC = () => {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState<string>('all');
  const [directionFilter, setDirectionFilter] = useState<string>('all');
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  
  // Send message form state
  const [sendSessionId, setSendSessionId] = useState('');
  const [recipientNumber, setRecipientNumber] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    fetchMessages();
    fetchSessions();
    
    const interval = setInterval(fetchMessages, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/sessions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions);
      } else {
        // Demo sessions
        setSessions([
          { id: 'session-1', name: 'Customer Support', status: 'connected' },
          { id: 'session-2', name: 'Sales Team', status: 'connected' },
          { id: 'session-3', name: 'Marketing Bot', status: 'disconnected' }
        ]);
      }
    } catch (error) {
      setSessions([
        { id: 'session-1', name: 'Customer Support', status: 'connected' },
        { id: 'session-2', name: 'Sales Team', status: 'connected' }
      ]);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch('/api/messages', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
      } else {
        generateDemoMessages();
      }
    } catch (error) {
      generateDemoMessages();
    } finally {
      setIsLoading(false);
    }
  };

  const generateDemoMessages = () => {
    const demoMessages: Message[] = [
      {
        id: 'msg-1',
        sessionId: 'session-1',
        sessionName: 'Customer Support',
        from: '+1234567890',
        to: '+9876543210',
        content: 'Hello, I need help with my order',
        type: 'text',
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        direction: 'inbound',
        status: 'read'
      },
      {
        id: 'msg-2',
        sessionId: 'session-1',
        sessionName: 'Customer Support',
        from: '+9876543210',
        to: '+1234567890',
        content: 'Hi! I\'d be happy to help you with your order. Could you please provide your order number?',
        type: 'text',
        timestamp: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
        direction: 'outbound',
        status: 'read'
      },
      {
        id: 'msg-3',
        sessionId: 'session-2',
        sessionName: 'Sales Team',
        from: '+5555555555',
        to: '+9876543210',
        content: 'Are you still interested in our premium package?',
        type: 'text',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        direction: 'inbound',
        status: 'delivered'
      },
      {
        id: 'msg-4',
        sessionId: 'session-1',
        sessionName: 'Customer Support',
        from: '+1234567890',
        to: '+9876543210',
        content: 'My order number is #12345',
        type: 'text',
        timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
        direction: 'inbound',
        status: 'read'
      },
      {
        id: 'msg-5',
        sessionId: 'session-2',
        sessionName: 'Sales Team',
        from: '+9876543210',
        to: '+5555555555',
        content: 'Thank you for your interest! Let me send you our latest pricing information.',
        type: 'text',
        timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
        direction: 'outbound',
        status: 'read'
      }
    ];
    setMessages(demoMessages);
  };

  const sendMessage = async () => {
    if (!sendSessionId || !recipientNumber || !messageContent.trim()) return;

    setIsSending(true);
    try {
      const response = await fetch('/api/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          sessionId: sendSessionId,
          number: recipientNumber,
          message: messageContent
        })
      });

      if (response.ok) {
        toast({
          title: "Message Sent",
          description: `Message sent successfully to ${recipientNumber}`,
        });
        
        // Add message to local state for immediate feedback
        const newMessage: Message = {
          id: `msg-${Date.now()}`,
          sessionId: sendSessionId,
          sessionName: sessions.find(s => s.id === sendSessionId)?.name || 'Unknown',
          from: 'WhatsApp API',
          to: recipientNumber,
          content: messageContent,
          type: 'text',
          timestamp: new Date().toISOString(),
          direction: 'outbound',
          status: 'sent'
        };
        setMessages(prev => [newMessage, ...prev]);
        
        // Reset form
        setRecipientNumber('');
        setMessageContent('');
        setIsSendDialogOpen(false);
        
      } else {
        // Demo mode - still add message
        const newMessage: Message = {
          id: `msg-${Date.now()}`,
          sessionId: sendSessionId,
          sessionName: sessions.find(s => s.id === sendSessionId)?.name || 'Unknown',
          from: 'WhatsApp API',
          to: recipientNumber,
          content: messageContent,
          type: 'text',
          timestamp: new Date().toISOString(),
          direction: 'outbound',
          status: 'sent'
        };
        setMessages(prev => [newMessage, ...prev]);
        
        toast({
          title: "Demo Message Sent",
          description: `Demo message sent to ${recipientNumber}`,
        });
        
        setRecipientNumber('');
        setMessageContent('');
        setIsSendDialogOpen(false);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const getStatusBadge = (status: Message['status']) => {
    const variants = {
      sent: 'secondary',
      delivered: 'default',
      read: 'outline',
      failed: 'destructive'
    } as const;

    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  const getDirectionBadge = (direction: Message['direction']) => {
    return direction === 'inbound' ? (
      <Badge variant="outline" className="bg-blue-50 text-blue-700">Inbound</Badge>
    ) : (
      <Badge variant="outline" className="bg-green-50 text-green-700">Outbound</Badge>
    );
  };

  const getTypeIcon = (type: Message['type']) => {
    switch (type) {
      case 'image':
        return <Image className="h-4 w-4" />;
      case 'document':
        return <FileText className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const filteredMessages = messages.filter(message => {
    const matchesSearch = 
      message.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.from.includes(searchTerm) ||
      message.to.includes(searchTerm);
    
    const matchesSession = selectedSession === 'all' || message.sessionId === selectedSession;
    const matchesDirection = directionFilter === 'all' || message.direction === directionFilter;
    
    return matchesSearch && matchesSession && matchesDirection;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Messages</h1>
          <p className="text-muted-foreground">
            View and manage WhatsApp messages across all sessions
          </p>
        </div>
        {hasPermission('messages:send') && (
          <Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Send className="h-4 w-4 mr-2" />
                Send Message
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send WhatsApp Message</DialogTitle>
                <DialogDescription>
                  Send a message through one of your connected WhatsApp sessions.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="session">Session</Label>
                  <Select value={sendSessionId} onValueChange={setSendSessionId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a session" />
                    </SelectTrigger>
                    <SelectContent>
                      {sessions.filter(s => s.status === 'connected').map((session) => (
                        <SelectItem key={session.id} value={session.id}>
                          {session.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="recipient">Recipient Phone Number</Label>
                  <Input
                    id="recipient"
                    placeholder="+1234567890"
                    value={recipientNumber}
                    onChange={(e) => setRecipientNumber(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="content">Message</Label>
                  <Textarea
                    id="content"
                    placeholder="Type your message here..."
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsSendDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={sendMessage} 
                    disabled={isSending || !sendSessionId || !recipientNumber || !messageContent.trim()}
                  >
                    {isSending ? 'Sending...' : 'Send Message'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search messages by content, phone number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedSession} onValueChange={setSelectedSession}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Sessions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sessions</SelectItem>
                {sessions.map((session) => (
                  <SelectItem key={session.id} value={session.id}>
                    {session.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={directionFilter} onValueChange={setDirectionFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="inbound">Inbound</SelectItem>
                <SelectItem value="outbound">Outbound</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Messages table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Messages ({filteredMessages.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Content</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMessages.map((message) => (
                <TableRow key={message.id}>
                  <TableCell className="font-medium">{message.sessionName}</TableCell>
                  <TableCell>{getDirectionBadge(message.direction)}</TableCell>
                  <TableCell className="font-mono text-sm">{message.from}</TableCell>
                  <TableCell className="font-mono text-sm">{message.to}</TableCell>
                  <TableCell className="max-w-xs truncate">{message.content}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {getTypeIcon(message.type)}
                      <span className="capitalize">{message.type}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(message.status)}</TableCell>
                  <TableCell>
                    {new Date(message.timestamp).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredMessages.length === 0 && (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No messages found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'No messages match your search criteria.' : 'Messages will appear here as they are sent and received.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};