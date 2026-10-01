import React, { useState, useEffect } from 'react';
import { Copy, Check, Users, LogOut, Power, Clock } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { copyToClipboard } from '@/lib/utils';
import { toast } from '@/components/ui/Toast';

interface ClassroomHeaderProps {
  classroomName: string;
  classroomCode: string;
  participantCount: number;
  isHost: boolean;
  createdAt?: string;
  isEnded?: boolean;
  onLeave: () => void;
  onEndClassroom?: () => void;
  onToggleParticipants?: () => void;
  isParticipantOpen?: boolean;
  isMobileParticipantOpen?: boolean;
}

export const ClassroomHeader: React.FC<ClassroomHeaderProps> = ({
  classroomName,
  classroomCode,
  participantCount,
  isHost,
  createdAt,
  isEnded = false,
  onLeave,
  onEndClassroom,
  onToggleParticipants,
  isParticipantOpen = true,
}) => {
  const [copied, setCopied] = useState(false);
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Initialize and tick timer
  useEffect(() => {
    if (isEnded) return;

    const startTimestamp = createdAt ? new Date(createdAt).getTime() : Date.now();
    const computeElapsed = () => Math.max(0, Math.floor((Date.now() - startTimestamp) / 1000));

    setElapsedSeconds(computeElapsed());

    const interval = setInterval(() => {
      setElapsedSeconds(computeElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [createdAt, isEnded]);

  const formatDuration = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => String(n).padStart(2, '0');

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  const handleCopyCode = async () => {
    const success = await copyToClipboard(classroomCode);
    if (success) {
      setCopied(true);
      toast.success(`Classroom code ${classroomCode} copied to clipboard!`);
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Could not copy code');
    }
  };

  const handleConfirmEnd = () => {
    setConfirmEndOpen(false);
    onEndClassroom?.();
  };

  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-border bg-card px-3 sm:px-6 shadow-sm select-none gap-2">
      {/* Left: Logo & Classroom Name */}
      <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
        <Logo size="sm" withLink={false} />
        <div className="hidden sm:block h-5 w-[1px] bg-border" />
        <div className="min-w-0">
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <h1 className="truncate text-sm sm:text-base font-semibold text-foreground max-w-[120px] xs:max-w-[160px] sm:max-w-[240px] md:max-w-[320px]">
              {classroomName}
            </h1>
            {isHost && (
              <Badge variant="default" className="text-[9px] sm:text-[10px] px-1.5 py-0 shrink-0">
                Host
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-1.5 sm:space-x-2 text-[11px] sm:text-xs text-muted-foreground">
            <span>Code:</span>
            <span className="font-mono font-medium text-foreground tracking-wide">{classroomCode}</span>
            <button
              onClick={handleCopyCode}
              className="inline-flex items-center text-primary hover:opacity-80 p-0.5 rounded transition-opacity cursor-pointer"
              title="Copy Classroom Code"
              aria-label="Copy Classroom Code"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>
        </div>
      </div>

      {/* Center: Live Classroom Session Timer */}
      <div
        className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-muted/60 dark:bg-muted/40 border border-border text-[11px] sm:text-xs font-mono font-medium text-foreground shadow-2xs shrink-0 select-none"
        title={isEnded ? 'Classroom session ended' : `Session duration: ${formatDuration(elapsedSeconds)}`}
      >
        {isEnded ? (
          <span className="h-2 w-2 rounded-full bg-destructive" />
        ) : (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        )}
        <Clock className="h-3.5 w-3.5 text-muted-foreground hidden xs:inline" />
        <span className="font-semibold tracking-wider">
          {formatDuration(elapsedSeconds)}
        </span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
        {/* Toggle participants button (Desktop & Mobile) */}
        {onToggleParticipants && (
          <Button
            variant={isParticipantOpen ? 'secondary' : 'outline'}
            size="sm"
            onClick={onToggleParticipants}
            className="flex items-center gap-1.5 px-2 sm:px-2.5 h-8 text-xs font-medium transition-all"
            aria-label={isParticipantOpen ? 'Hide participants' : 'Show participants'}
            title={isParticipantOpen ? 'Hide participants panel' : 'Show participants panel'}
          >
            <Users className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold text-foreground">{participantCount}</span>
            <span className="hidden sm:inline text-muted-foreground">
              {isParticipantOpen ? 'Hide' : 'Participants'}
            </span>
          </Button>
        )}

        {/* Host: End Classroom Button */}
        {isHost && onEndClassroom && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirmEndOpen(true)}
            className="h-8 text-xs sm:text-sm px-2 sm:px-3 font-medium shadow-none"
            aria-label="End Classroom Session"
          >
            <Power className="mr-1 sm:mr-1.5 h-3.5 w-3.5" />
            <span className="hidden sm:inline">End Classroom</span>
            <span className="sm:hidden">End</span>
          </Button>
        )}

        {/* Leave Classroom Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onLeave}
          className="h-8 text-xs sm:text-sm px-2 sm:px-3 text-muted-foreground hover:text-destructive"
          aria-label="Leave Classroom"
        >
          <LogOut className="mr-1 sm:mr-1.5 h-3.5 w-3.5" />
          <span className="hidden sm:inline">Leave</span>
        </Button>
      </div>

      {/* Confirm End Modal Dialog */}
      <Dialog
        isOpen={confirmEndOpen}
        onClose={() => setConfirmEndOpen(false)}
        title="End Classroom Session"
        description="Are you sure you want to end this classroom for everyone? All participants will be disconnected."
      >
        <div className="mt-4 flex justify-end space-x-3">
          <Button variant="outline" onClick={() => setConfirmEndOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirmEnd}>
            End Classroom
          </Button>
        </div>
      </Dialog>
    </header>
  );
};
