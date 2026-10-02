import React from 'react';
import { FileText, Edit3, Monitor, MonitorStop, Video } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { WorkspaceTab } from '@/types/classroom';

interface ClassroomControlsProps {
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  isHost: boolean;
  isScreenSharing: boolean;
  onStartScreenShare: () => void;
  onStopScreenShare: () => void;
}

export const ClassroomControls: React.FC<ClassroomControlsProps> = ({
  activeTab,
  onTabChange,
  isHost,
  isScreenSharing,
  onStartScreenShare,
  onStopScreenShare,
}) => {
  return (
    <footer className="flex h-16 w-full items-center justify-between border-t border-border bg-card px-3 sm:px-6 shadow-sm select-none gap-2">
      {/* Workspace Switcher Tabs */}
      <div className="flex items-center space-x-1 sm:space-x-2 rounded-lg bg-muted p-1 overflow-x-auto">
        <button
          onClick={() => onTabChange('whiteboard')}
          className={`flex items-center space-x-1.5 rounded-md px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'whiteboard'
              ? 'bg-background text-foreground shadow-sm font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title="Whiteboard"
        >
          <Edit3 className="h-4 w-4 text-primary shrink-0" />
          <span className="hidden xs:inline">Whiteboard</span>
        </button>

        <button
          onClick={() => onTabChange('pdf')}
          className={`flex items-center space-x-1.5 rounded-md px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'pdf'
              ? 'bg-background text-foreground shadow-sm font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title="PDF Presentation"
        >
          <FileText className="h-4 w-4 text-blue-500 shrink-0" />
          <span className="hidden xs:inline">PDF</span>
          <span className="hidden md:inline">Presentation</span>
        </button>

        <button
          onClick={() => onTabChange('screenshare')}
          className={`flex items-center space-x-1.5 rounded-md px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'screenshare'
              ? 'bg-background text-foreground shadow-sm font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title="Screen Share"
        >
          <Monitor className="h-4 w-4 text-purple-500 shrink-0" />
          <span className="hidden xs:inline">Screen Share</span>
        </button>

        <button
          onClick={() => onTabChange('interaction')}
          className={`flex items-center space-x-1.5 rounded-md px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'interaction'
              ? 'bg-emerald-600 text-white shadow-sm font-semibold'
              : 'text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
          }`}
          title="Interaction Mode (WhatsApp-style Video Call)"
        >
          <Video className={`h-4 w-4 shrink-0 ${activeTab === 'interaction' ? 'text-white' : 'text-emerald-500'}`} />
          <span className="font-semibold">Interaction</span>
          <span className="hidden sm:inline">Mode</span>
        </button>
      </div>

      {/* Screen Sharing Quick Toggle (Host Only) */}
      <div className="flex items-center space-x-2">
        {isHost ? (
          isScreenSharing ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={onStopScreenShare}
              className="h-9 px-3 text-xs sm:text-sm font-medium animate-pulse"
            >
              <MonitorStop className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">Stop Screen Share</span>
              <span className="sm:hidden">Stop Share</span>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onTabChange('screenshare');
                onStartScreenShare();
              }}
              className="h-9 px-3 text-xs sm:text-sm font-medium"
            >
              <Monitor className="mr-1.5 h-4 w-4 text-emerald-600" />
              <span className="hidden sm:inline">Share Screen</span>
              <span className="sm:hidden">Share</span>
            </Button>
          )
        ) : (
          <div className="text-xs text-muted-foreground hidden sm:block">
            {isScreenSharing ? (
              <span className="flex items-center text-emerald-600 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping mr-1.5" />
                Live Screen Stream Active
              </span>
            ) : (
              <span>Following Host View</span>
            )}
          </div>
        )}
      </div>
    </footer>
  );
};
