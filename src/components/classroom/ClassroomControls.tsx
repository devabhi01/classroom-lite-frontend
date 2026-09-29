import React from 'react';
import { FileText, Edit3, Monitor, MonitorStop } from 'lucide-react';
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
    <footer className="flex h-16 w-full items-center justify-between border-t border-border bg-card px-4 sm:px-6 shadow-sm select-none">
      {/* Workspace Switcher Tabs */}
      <div className="flex items-center space-x-1 sm:space-x-2 rounded-lg bg-muted p-1">
        <button
          onClick={() => onTabChange('whiteboard')}
          className={`flex items-center space-x-1.5 rounded-md px-3 py-1.5 text-xs sm:text-sm font-medium transition-all cursor-pointer ${
            activeTab === 'whiteboard'
              ? 'bg-background text-foreground shadow-sm font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title="Whiteboard"
        >
          <Edit3 className="h-4 w-4 text-primary" />
          <span>Whiteboard</span>
        </button>

        <button
          onClick={() => onTabChange('pdf')}
          className={`flex items-center space-x-1.5 rounded-md px-3 py-1.5 text-xs sm:text-sm font-medium transition-all cursor-pointer ${
            activeTab === 'pdf'
              ? 'bg-background text-foreground shadow-sm font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title="PDF Presentation"
        >
          <FileText className="h-4 w-4 text-blue-500" />
          <span>PDF Presentation</span>
        </button>

        <button
          onClick={() => onTabChange('screenshare')}
          className={`flex items-center space-x-1.5 rounded-md px-3 py-1.5 text-xs sm:text-sm font-medium transition-all cursor-pointer ${
            activeTab === 'screenshare'
              ? 'bg-background text-foreground shadow-sm font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title="Screen Share"
        >
          <Monitor className="h-4 w-4 text-emerald-500" />
          <span>Screen Share</span>
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
