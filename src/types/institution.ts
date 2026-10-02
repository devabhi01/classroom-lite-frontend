export type InstitutionMemberRole = 'OWNER' | 'ADMIN' | 'TEACHER' | 'STUDENT';
export type InstitutionMemberStatus = 'REQUESTED' | 'ACCEPTED' | 'REJECTED' | 'LEFT';
export type InstitutionStatus = 'ACTIVE' | 'SUSPENDED';

export interface Institution {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  logo?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
  ownerId: string;
  owner?: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
  } | null;
  status: InstitutionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface InstitutionMembership {
  id: string;
  institutionId: string;
  userId: string;
  role: InstitutionMemberRole;
  status: InstitutionMemberStatus;
  requestedAt: string;
  acceptedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  institution?: Institution;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
    role: string;
  };
}

export interface InstitutionStats {
  totalMembers: number;
  totalTeachers: number;
  totalStudents: number;
  totalClassrooms: number;
  pendingRequests: number;
}
