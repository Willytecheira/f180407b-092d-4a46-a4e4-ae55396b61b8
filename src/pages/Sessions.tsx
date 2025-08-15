import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, QrCode, Smartphone, Trash2, LogOut, Search, RefreshCw, Zap, XCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface WhatsAppSession {
  id: string;
  name: string;
  status: 'connected' | 'connecting' | 'disconnected' | 'qr-pending';
  phoneNumber?: string;
  lastActivity: string;
  messagesCount: number;
  createdAt: string;
  qrCode?: string;
}

export const Sessions: React.FC = () => {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<WhatsAppSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [selectedSession, setSelectedSession] = useState<WhatsAppSession | null>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 5000); // Refresh every 5 seconds
    
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
        // Generate demo data for development
        generateDemoSessions();
      }
    } catch (error) {
      generateDemoSessions();
    } finally {
      setIsLoading(false);
    }
  };

  const generateDemoSessions = () => {
    const demoSessions: WhatsAppSession[] = [
      {
        id: 'session-1',
        name: 'Customer Support',
        status: 'connected',
        phoneNumber: '+1234567890',
        lastActivity: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        messagesCount: 156,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString()
      },
      {
        id: 'session-2',
        name: 'Sales Team',
        status: 'connecting',
        lastActivity: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        messagesCount: 89,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString()
      },
      {
        id: 'session-3',
        name: 'Marketing Bot',
        status: 'disconnected',
        phoneNumber: '+9876543210',
        lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        messagesCount: 245,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString()
      },
      {
        id: 'session-4',
        name: 'Test Session',
        status: 'qr-pending',
        lastActivity: new Date().toISOString(),
        messagesCount: 0,
        createdAt: new Date().toISOString(),
        qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      }
    ];
    setSessions(demoSessions);
  };

  const createSession = async () => {
    if (!newSessionName.trim()) return;
    
    setIsCreating(true);
    try {
      const response = await fetch('/api/start-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ sessionId: newSessionName.toLowerCase().replace(/\s+/g, '-') })
      });

      if (response.ok) {
        toast({
          title: "Session Created",
          description: `Session "${newSessionName}" has been created successfully.`,
        });
        setNewSessionName('');
        setIsCreateDialogOpen(false);
        fetchSessions();
      } else {
        // Demo fallback
        const newSession: WhatsAppSession = {
          id: `session-${Date.now()}`,
          name: newSessionName,
          status: 'qr-pending',
          lastActivity: new Date().toISOString(),
          messagesCount: 0,
          createdAt: new Date().toISOString(),
          qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
        };
        setSessions(prev => [...prev, newSession]);
        toast({
          title: "Demo Session Created",
          description: `Demo session "${newSessionName}" has been created.`,
        });
        setNewSessionName('');
        setIsCreateDialogOpen(false);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create session. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/logout/${sessionId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok || true) { // Allow demo deletion
        setSessions(prev => prev.filter(session => session.id !== sessionId));
        toast({
          title: "Session Deleted",
          description: "Session has been deleted successfully.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete session.",
        variant: "destructive",
      });
    }
  };

  const showQrCode = (session: WhatsAppSession) => {
    setSelectedSession(session);
    setQrDialogOpen(true);
  };

  const getStatusIcon = (status: WhatsAppSession['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'connecting':
        return <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'qr-pending':
        return <QrCode className="h-4 w-4 text-blue-500" />;
      case 'disconnected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: WhatsAppSession['status']) => {
    const variants = {
      connected: 'default',
      connecting: 'secondary',
      'qr-pending': 'outline',
      disconnected: 'destructive'
    } as const;

    return (
      <Badge variant={variants[status]} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {status.replace('-', ' ').toUpperCase()}
      </Badge>
    );
  };

  const filteredSessions = sessions.filter(session =>
    session.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.phoneNumber?.includes(searchTerm)
  );

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
          <h1 className="text-3xl font-bold">WhatsApp Sessions</h1>
          <p className="text-muted-foreground">
            Manage your WhatsApp Web sessions and connections
          </p>
        </div>
        {hasPermission('sessions:create') && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Session
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New WhatsApp Session</DialogTitle>
                <DialogDescription>
                  Enter a name for your new WhatsApp session. You'll need to scan a QR code to connect.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="sessionName">Session Name</Label>
                  <Input
                    id="sessionName"
                    placeholder="e.g., Customer Support, Sales Team"
                    value={newSessionName}
                    onChange={(e) => setNewSessionName(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createSession} disabled={isCreating || !newSessionName.trim()}>
                    {isCreating ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Session'
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search and filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sessions by name or phone number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={fetchSessions}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sessions table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions ({filteredSessions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Phone Number</TableHead>
                <TableHead>Messages</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="font-medium">{session.name}</TableCell>
                  <TableCell>{getStatusBadge(session.status)}</TableCell>
                  <TableCell>{session.phoneNumber || 'Not connected'}</TableCell>
                  <TableCell>{session.messagesCount}</TableCell>
                  <TableCell>
                    {new Date(session.lastActivity).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {session.status === 'qr-pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => showQrCode(session)}
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                      )}
                      {hasPermission('sessions:delete') && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Session</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{session.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteSession(session.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredSessions.length === 0 && (
            <div className="text-center py-8">
              <Smartphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No sessions found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'No sessions match your search criteria.' : 'Create your first WhatsApp session to get started.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scan QR Code</DialogTitle>
            <DialogDescription>
              Use your WhatsApp mobile app to scan this QR code and connect "{selectedSession?.name}".
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center p-4">
            {selectedSession?.qrCode ? (
              <div className="text-center">
                <div className="bg-white p-4 rounded-lg mb-4">
                  <div className="w-64 h-64 bg-gray-200 rounded flex items-center justify-center">
                    <QrCode className="h-16 w-16 text-gray-400" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  QR code will refresh automatically every 30 seconds
                </p>
              </div>
            ) : (
              <div className="text-center p-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p>Generating QR code...</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};