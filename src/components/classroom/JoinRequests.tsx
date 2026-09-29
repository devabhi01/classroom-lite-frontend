import React, { useState } from 'react';
import { UserPlus, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { JoinRequest } from '@/types/participant';

interface JoinRequestsProps {
  requests: JoinRequest[];
  onAccept: (userId: string) => Promise<void>;
  onReject: (userId: string) => Promise<void>;
}

export const JoinRequests: React.FC<JoinRequestsProps> = ({ requests, onAccept, onReject }) => {
  const [processingId, setProcessingId] = useState<string | null>(null);

  if (requests.length === 0) return null;

  const handleAction = async (userId: string, action: 'accept' | 'reject') => {
    try {
      setProcessingId(userId);
      if (action === 'accept') {
        await onAccept(userId);
      } else {
        await onReject(userId);
      }
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="w-full border-b border-border bg-amber-50/80 dark:bg-amber-950/30 p-3">
      <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-amber-900 dark:text-amber-200">
        <UserPlus className="h-4 w-4" />
        <span>Pending Join Requests ({requests.length})</span>
      </div>

      <div className="space-y-2">
        {requests.map((req) => {
          const isProcessing = processingId === req.userId;

          return (
            <div
              key={req.userId}
              className="flex items-center justify-between rounded-lg border border-amber-200/80 dark:border-amber-900/60 bg-background/90 p-2.5 shadow-sm"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <Avatar name={req.name} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{req.name}</p>
                  {req.email && <p className="text-xs text-muted-foreground truncate">{req.email}</p>}
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleAction(req.userId, 'accept')}
                  disabled={isProcessing}
                  className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAction(req.userId, 'reject')}
                  disabled={isProcessing}
                  className="h-7 px-2.5 text-xs text-rose-600 hover:text-rose-700 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Reject
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
