import { Participant, JoinRequest } from './participant';
import { PdfState } from './pdf';
import { WhiteboardOperation } from './whiteboard';

export interface Classroom {
  id: string;
  name: string;
  code: string;
  hostId: string;
  status: 'ACTIVE' | 'ENDED';
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateClassroomDto {
  name: string;
}

export type WorkspaceTab = 'pdf' | 'whiteboard' | 'screenshare';

export interface ClassroomFullState {
  classroom: Classroom;
  participants: Participant[];
  pendingRequests?: JoinRequest[];
  activeTab: WorkspaceTab;
  pdf: PdfState | null;
  whiteboard: WhiteboardOperation[];
  screenShare: {
    isSharing: boolean;
    streamHostId?: string;
  };
}
