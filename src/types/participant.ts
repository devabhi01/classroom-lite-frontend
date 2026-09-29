export type ParticipantRole = 'HOST' | 'STUDENT';
export type ParticipantStatus = 'REQUESTED' | 'ACCEPTED' | 'REJECTED' | 'LEFT';

export interface Participant {
  userId: string;
  name: string;
  role: ParticipantRole;
  status: ParticipantStatus;
  avatar?: string;
  email?: string;
}

export interface JoinRequest {
  userId: string;
  name: string;
  email?: string;
  requestedAt?: string;
}
