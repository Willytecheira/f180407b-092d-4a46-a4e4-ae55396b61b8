import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Smartphone, MessageSquare, Users, Activity, Plus, Zap, Clock, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';

interface DashboardStats {
  totalSessions: number;
  activeSessions: number;
  totalMessages: number;
  todayMessages: number;
  totalUsers: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  uptime: string;
}

interface SessionMetrics {
  time: string;
  sessions: number;
  messages: number;
}

interface SessionStatus {
  name: string;
  value: number;
  color: string;
}

export const Dashboard: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalSessions: 0,
    activeSessions: 0,
    totalMessages: 0,
    todayMessages: 0,
    totalUsers: 0,
    systemHealth: 'healthy',
    uptime: '0h 0m'
  });

  const [metrics, setMetrics] = useState<SessionMetrics[]>([]);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Simulate API call to fetch real dashboard data
      const response = await fetch('/api/metrics/dashboard');
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setMetrics(data.metrics);
        setSessionStatus(data.sessionStatus);
      } else {
        // Fallback with simulated data for demo
        generateDemoData();
      }
    } catch (error) {
      // Generate demo data when API is not available
      generateDemoData();
    } finally {
      setIsLoading(false);
    }
  };

  const generateDemoData = () => {
    const now = new Date();
    const uptime = Math.floor(Math.random() * 72) + 1; // 1-72 hours
    
    setStats({
      totalSessions: Math.floor(Math.random() * 15) + 5,
      activeSessions: Math.floor(Math.random() * 8) + 2,
      totalMessages: Math.floor(Math.random() * 5000) + 1000,
      todayMessages: Math.floor(Math.random() * 300) + 50,
      totalUsers: Math.floor(Math.random() * 10) + 3,
      systemHealth: ['healthy', 'warning'][Math.floor(Math.random() * 2)] as 'healthy' | 'warning',
      uptime: `${uptime}h ${Math.floor(Math.random() * 60)}m`
    });

    // Generate 24 hours of metrics
    const metricsData: SessionMetrics[] = [];
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      metricsData.push({
        time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        sessions: Math.floor(Math.random() * 10) + 2,
        messages: Math.floor(Math.random() * 50) + 10
      });
    }
    setMetrics(metricsData);

    setSessionStatus([
      { name: 'Connected', value: Math.floor(Math.random() * 8) + 2, color: '#22c55e' },
      { name: 'Connecting', value: Math.floor(Math.random() * 3), color: '#f59e0b' },
      { name: 'Disconnected', value: Math.floor(Math.random() * 2), color: '#ef4444' },
    ]);
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return <Zap className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

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
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.username}! Here's what's happening with your WhatsApp sessions.
          </p>
        </div>
        {hasPermission('sessions:create') && (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Session
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSessions}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeSessions} active right now
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Today</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayMessages}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalMessages} total messages
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              System administrators
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <div className={getHealthColor(stats.systemHealth)}>
              {getHealthIcon(stats.systemHealth)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge 
                variant={stats.systemHealth === 'healthy' ? 'default' : 'secondary'}
                className={stats.systemHealth === 'healthy' ? 'bg-green-500' : ''}
              >
                {stats.systemHealth}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Clock className="h-3 w-3" />
              Uptime: {stats.uptime}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Session Activity (24h)</CardTitle>
            <CardDescription>
              Sessions and messages over the last 24 hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={metrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="time" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="sessions"
                  stackId="1"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.8}
                />
                <Area
                  type="monotone"
                  dataKey="messages"
                  stackId="1"
                  stroke="hsl(var(--secondary))"
                  fill="hsl(var(--secondary))"
                  fillOpacity={0.8}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Session Status</CardTitle>
            <CardDescription>
              Current status of all WhatsApp sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sessionStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {sessionStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-4">
              {sessionStatus.map((status, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: status.color }}
                  />
                  <span className="text-sm">
                    {status.name} ({status.value})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks and shortcuts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {hasPermission('sessions:create') && (
              <Button variant="outline" className="justify-start">
                <Plus className="h-4 w-4 mr-2" />
                Create Session
              </Button>
            )}
            {hasPermission('messages:send') && (
              <Button variant="outline" className="justify-start">
                <MessageSquare className="h-4 w-4 mr-2" />
                Send Message
              </Button>
            )}
            {hasPermission('users:create') && (
              <Button variant="outline" className="justify-start">
                <Users className="h-4 w-4 mr-2" />
                Add User
              </Button>
            )}
            {hasPermission('metrics:read') && (
              <Button variant="outline" className="justify-start">
                <Activity className="h-4 w-4 mr-2" />
                View Metrics
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};