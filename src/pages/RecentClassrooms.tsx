import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  Users,
  Search,
  RefreshCw,
  PlusCircle,
  LogIn,
  Filter,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { copyToClipboard } from '@/lib/utils';
import { toast } from '@/components/ui/Toast';
import { Classroom } from '@/types/classroom';

type StatusFilter = 'ALL' | 'ACTIVE' | 'ENDED';

export const RecentClassrooms: React.FC = () => {
  const { user } = useAuth();
  const isStudent = user?.role === 'STUDENT';

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchClassrooms = async (showRefreshToast = false) => {
    try {
      if (showRefreshToast) setIsRefreshing(true);
      else setIsLoading(true);

      let rooms: Classroom[] = [];

      // 1. Fetch from live /classrooms/recent endpoint
      try {
        const res = await api.get('/classrooms/recent');
        const raw = res.data?.classrooms || res.data?.data || res.data;
        if (Array.isArray(raw)) {
          rooms = raw.map((r: any) => ({
            id: r.id || r._id || r.classroomId,
            name: r.name,
            code: r.code,
            status: r.status,
            hostId: r.hostId || (typeof r.host === 'object' ? r.host?.id : r.host) || '',
            createdAt: r.createdAt,
            endedAt: r.endedAt,
          }));
        }
      } catch {
        // 2. Fallback to history endpoints
        try {
          const historyUrl = isStudent ? '/classrooms/history/student' : '/classrooms/history/teacher';
          const historyRes = await api.get(historyUrl);
          const historyRaw = historyRes.data?.data || historyRes.data;
          if (Array.isArray(historyRaw)) {
            rooms = historyRaw.map((r: any) => ({
              id: r.id || r._id || r.classroomId,
              name: r.name,
              code: r.code,
              status: r.status,
              hostId: r.hostId || (typeof r.host === 'object' ? r.host?.id : r.host) || '',
              createdAt: r.createdAt,
              endedAt: r.endedAt,
            }));
          }
        } catch {
          // Ignore
        }
      }

      const cacheKey = user?.id ? `tdp_recent_classrooms_${user.id}` : 'tdp_recent_classrooms';
      if (rooms.length > 0) {
        setClassrooms(rooms);
        localStorage.setItem(cacheKey, JSON.stringify(rooms));
      } else {
        // 3. Fallback to cached localStorage
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          setClassrooms(JSON.parse(cached));
        }
      }

      if (showRefreshToast) {
        toast.success('Recent classrooms refreshed');
      }
    } catch {
      const cacheKey = user?.id ? `tdp_recent_classrooms_${user.id}` : 'tdp_recent_classrooms';
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          setClassrooms(JSON.parse(cached));
        }
      } catch {}
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchClassrooms();
  }, [isStudent]);

  const handleCopy = async (code: string) => {
    const success = await copyToClipboard(code);
    if (success) {
      setCopiedCode(code);
      toast.success(`Copied classroom code ${code}`);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  // Counts for status tabs
  const activeCount = useMemo(
    () => classrooms.filter((r) => r.status === 'ACTIVE').length,
    [classrooms],
  );
  const endedCount = useMemo(
    () => classrooms.filter((r) => r.status === 'ENDED').length,
    [classrooms],
  );

  // Filtered list based on search and status filter
  const filteredClassrooms = useMemo(() => {
    return classrooms.filter((room) => {
      // Status filter
      if (statusFilter === 'ACTIVE' && room.status !== 'ACTIVE') return false;
      if (statusFilter === 'ENDED' && room.status !== 'ENDED') return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (room.name || '').toLowerCase().includes(q);
        const matchesCode = (room.code || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCode) return false;
      }

      return true;
    });
  }, [classrooms, statusFilter, searchQuery]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Top Navigation & Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <Link
            to="/dashboard"
            className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground mb-2 transition-colors"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Recent Classrooms
            </h1>
            <Badge variant="outline" className="text-xs">
              {classrooms.length} Total
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            View all active sessions you can enter, or review ended classes and their codes.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchClassrooms(true)}
            disabled={isRefreshing || isLoading}
            className="h-9 px-3 text-xs"
          >
            <RefreshCw
              className={`mr-1.5 h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-primary' : ''}`}
            />
            <span>Refresh</span>
          </Button>
          {!isStudent ? (
            <Link to="/create-classroom">
              <Button size="sm" className="h-9 text-xs">
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
                <span>Create Classroom</span>
              </Button>
            </Link>
          ) : (
            <Link to="/join-classroom">
              <Button size="sm" className="h-9 text-xs">
                <LogIn className="mr-1.5 h-3.5 w-3.5" />
                <span>Join Classroom</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Search Bar & Status Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or 6-character code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-lg placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg border border-border self-start sm:self-auto">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              statusFilter === 'ALL'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All ({classrooms.length})
          </button>
          <button
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              statusFilter === 'ACTIVE'
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Active ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter('ENDED')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              statusFilter === 'ENDED'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Ended ({endedCount})
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 text-center">
          <Clock className="h-8 w-8 animate-spin text-primary mb-3" />
          <p className="text-sm font-medium text-foreground">Loading classrooms...</p>
          <p className="text-xs text-muted-foreground mt-1">Retrieving recent classroom history</p>
        </div>
      ) : filteredClassrooms.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center bg-card space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground">
            {searchQuery ? <Filter className="h-6 w-6" /> : <Users className="h-6 w-6" />}
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">
              {searchQuery ? 'No classrooms match your search' : 'No classrooms found'}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `We couldn't find any classroom matching "${searchQuery}". Try searching with a different name or room code.`
                : statusFilter !== 'ALL'
                ? `There are currently no ${statusFilter.toLowerCase()} classrooms in your history.`
                : 'You have not hosted or participated in any classrooms yet.'}
            </p>
          </div>
          {searchQuery ? (
            <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
              Clear Search Query
            </Button>
          ) : (
            <div className="flex justify-center gap-2 pt-2">
              {!isStudent ? (
                <Link to="/create-classroom">
                  <Button size="sm">
                    <PlusCircle className="mr-1.5 h-4 w-4" />
                    Create Classroom
                  </Button>
                </Link>
              ) : (
                <Link to="/join-classroom">
                  <Button size="sm">
                    <LogIn className="mr-1.5 h-4 w-4" />
                    Join Classroom
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClassrooms.map((room) => {
            const isEnded = room.status === 'ENDED';
            const isHost = room.hostId && user?.id ? room.hostId === user.id : false;
            const createdFormatted = formatDate(room.createdAt);

            return (
              <div
                key={room.code || room.id}
                className={`flex flex-col justify-between rounded-xl border bg-card p-5 shadow-xs transition-all ${
                  isEnded
                    ? 'border-border/60 hover:border-border'
                    : 'border-border hover:border-primary/40 hover:shadow-md'
                }`}
              >
                <div>
                  {/* Card Header: Name + Badges */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <h3
                        className="font-semibold text-base text-foreground truncate"
                        title={room.name}
                      >
                        {room.name}
                      </h3>
                      {createdFormatted && (
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                          <Calendar className="h-3 w-3 shrink-0" />
                          <span>{createdFormatted}</span>
                        </div>
                      )}
                    </div>
                    <Badge
                      variant={isEnded ? 'secondary' : 'default'}
                      className={`text-[10px] uppercase font-bold tracking-wider shrink-0 ${
                        isEnded
                          ? 'bg-muted text-muted-foreground border-border'
                          : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      {isEnded ? 'Ended' : 'Active'}
                    </Badge>
                  </div>

                  {/* Room Details & Copy Code */}
                  <div className="my-4 p-2.5 rounded-lg bg-muted/40 border border-border/60 flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-muted-foreground">Room Code:</span>
                      <span className="font-mono font-bold tracking-wider text-foreground text-sm">
                        {room.code}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopy(room.code)}
                      className="p-1 rounded text-primary hover:bg-primary/10 transition-colors"
                      title="Copy room code"
                      aria-label="Copy room code"
                    >
                      {copiedCode === room.code ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Host or Participant Badge */}
                  <div className="mb-4 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Your Role:</span>
                    <Badge variant={isHost ? 'default' : 'secondary'} className="text-[10px] py-0 px-2">
                      {isHost ? 'Instructor / Host' : 'Student / Participant'}
                    </Badge>
                  </div>
                </div>

                {/* Card Action Button */}
                <div>
                  {isEnded ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs text-muted-foreground cursor-not-allowed opacity-60 bg-muted/30"
                      disabled
                    >
                      Classroom Ended
                    </Button>
                  ) : (
                    <Link to={`/classroom/${room.code}`} className="w-full block">
                      <Button size="sm" className="w-full text-xs font-semibold">
                        <span>Enter Classroom</span>
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RecentClassrooms;
