import { Participant, JoinRequest } from './participant';
import { PdfState } from './pdf';
import { WhiteboardOperation } from './whiteboard';

export interface Classroom {
  id: string;
  name: string;
  code: string;
  hostId: string;
  type?: 'INDEPENDENT' | 'INSTITUTION';
  institutionId?: string | null;
  institution?: {
    id: string;
    name: string;
    code: string;
  } | null;
  status: 'ACTIVE' | 'ENDED';
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateClassroomDto {
  name: string;
  type?: 'INDEPENDENT' | 'INSTITUTION';
  institutionId?: string;
}

export type WorkspaceTab = 'pdf' | 'whiteboard' | 'screenshare' | 'interaction';

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
