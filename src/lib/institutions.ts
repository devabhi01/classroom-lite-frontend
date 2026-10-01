import api from './api';
import {
  Institution,
  InstitutionMembership,
  InstitutionStats,
} from '@/types/institution';
import { Classroom } from '@/types/classroom';

export const institutionsApi = {
  /**
   * Search active institutions (public)
   */
  async search(query: string = ''): Promise<Institution[]> {
    const res = await api.get('/institutions/search', {
      params: { q: query },
    });
    return res.data?.data || res.data || [];
  },

  /**
   * Get all institutions current user belongs to (accepted or requested)
   */
  async getMy(): Promise<InstitutionMembership[]> {
    const res = await api.get('/institutions/my');
    const rawList = res.data?.data || res.data || [];
    if (!Array.isArray(rawList)) return [];

    return rawList.map((item: any) => {
      // If already nested with item.institution
      if (item.institution) {
        return item as InstitutionMembership;
      }

      // If flat structure returned by NestJS backend: { id, name, code, role, status, logo, joinedAt }
      const institution: Institution = {
        id: item.id || item.institutionId,
        name: item.name || 'Institution',
        code: item.code || '',
        description: item.description || null,
        logo: item.logo || null,
        email: item.email || null,
        phone: item.phone || null,
        address: item.address || null,
        website: item.website || null,
        ownerId: item.ownerId || '',
        status: (item.status === 'ACTIVE' || item.status === 'SUSPENDED') ? item.status : 'ACTIVE',
        createdAt: item.createdAt || item.joinedAt || new Date().toISOString(),
        updatedAt: item.updatedAt || item.joinedAt || new Date().toISOString(),
      };

      return {
        id: item.membershipId || item.id,
        institutionId: item.id || item.institutionId,
        userId: item.userId || '',
        role: item.role || 'STUDENT',
        status: item.status || 'ACCEPTED',
        requestedAt: item.requestedAt || item.joinedAt || new Date().toISOString(),
        acceptedAt: item.acceptedAt || item.joinedAt || null,
        createdAt: item.createdAt || item.joinedAt || new Date().toISOString(),
        updatedAt: item.updatedAt || item.joinedAt || new Date().toISOString(),
        institution,
      } as InstitutionMembership;
    });
  },

  /**
   * Get institution profile
   */
  async getById(id: string): Promise<Institution> {
    const res = await api.get(`/institutions/${id}`);
    return res.data?.data || res.data;
  },

  /**
   * Create a new institution (Teacher only)
   */
  async create(data: {
    name: string;
    description?: string;
    email?: string;
    phone?: string;
    address?: string;
    website?: string;
  }): Promise<Institution> {
    const res = await api.post('/institutions', data);
    return res.data?.data || res.data;
  },

  /**
   * Update institution details (Owner or Admin)
   */
  async update(
    id: string,
    data: Partial<{
      name: string;
      description?: string;
      logo?: string;
      email?: string;
      phone?: string;
      address?: string;
      website?: string;
    }>,
  ): Promise<Institution> {
    const res = await api.patch(`/institutions/${id}`, data);
    return res.data?.data || res.data;
  },

  /**
   * Delete an institution (Owner only)
   */
  async delete(id: string): Promise<{ success: boolean; message: string }> {
    const res = await api.delete(`/institutions/${id}`);
    return res.data?.data || res.data;
  },

  /**
   * Join an institution using unique code (e.g. TDP82K4)
   */
  async joinByCode(
    code: string,
    role?: 'STUDENT' | 'TEACHER',
  ): Promise<InstitutionMembership> {
    const res = await api.post('/institutions/join-by-code', {
      code: code.trim().toUpperCase(),
      role,
    });
    return res.data?.data || res.data;
  },

  /**
   * Request to join an institution by ID
   */
  async joinById(
    id: string,
    role?: 'STUDENT' | 'TEACHER',
  ): Promise<InstitutionMembership> {
    const res = await api.post(`/institutions/${id}/join`, { role });
    return res.data?.data || res.data;
  },

  /**
   * Get pending join requests (Owner / Admin)
   */
  async getRequests(id: string): Promise<InstitutionMembership[]> {
    const res = await api.get(`/institutions/${id}/requests`);
    const raw = res.data?.data || res.data || [];
    if (!Array.isArray(raw)) return [];
    return raw.map((r: any) => ({
      id: r.id,
      institutionId: id,
      userId: r.userId || r.user?.id,
      role: r.role || 'STUDENT',
      status: r.status || 'REQUESTED',
      requestedAt: r.requestedAt || new Date().toISOString(),
      createdAt: r.requestedAt || new Date().toISOString(),
      updatedAt: r.requestedAt || new Date().toISOString(),
      user: r.user || {
        id: r.userId,
        name: r.name || 'Applicant',
        email: r.email || '',
        avatar: r.avatar || null,
        role: r.role || 'STUDENT',
      },
    } as InstitutionMembership));
  },

  /**
   * Accept a pending join request (Owner / Admin)
   */
  async acceptRequest(
    id: string,
    userId: string,
  ): Promise<InstitutionMembership> {
    const res = await api.post(`/institutions/${id}/requests/${userId}/accept`);
    return res.data?.data || res.data;
  },

  /**
   * Reject a pending join request (Owner / Admin)
   */
  async rejectRequest(
    id: string,
    userId: string,
  ): Promise<InstitutionMembership> {
    const res = await api.post(`/institutions/${id}/requests/${userId}/reject`);
    return res.data?.data || res.data;
  },

  /**
   * Get members of an institution
   */
  async getMembers(id: string): Promise<InstitutionMembership[]> {
    const res = await api.get(`/institutions/${id}/members`);
    const rawList = res.data?.data || res.data || [];
    if (!Array.isArray(rawList)) return [];

    return rawList.map((m: any) => ({
      id: m.id,
      institutionId: id,
      userId: m.id || m.userId,
      role: m.role || 'STUDENT',
      status: 'ACCEPTED',
      requestedAt: m.joinedAt || new Date().toISOString(),
      acceptedAt: m.joinedAt || new Date().toISOString(),
      createdAt: m.joinedAt || new Date().toISOString(),
      updatedAt: m.joinedAt || new Date().toISOString(),
      user: {
        id: m.id || m.userId,
        name: m.name || m.user?.name || 'Member',
        email: m.email || m.user?.email || '',
        avatar: m.avatar || m.user?.avatar || null,
        role: m.role || 'STUDENT',
      },
    } as InstitutionMembership));
  },

  /**
   * Leave an institution (POST :id/leave on backend)
   */
  async leave(id: string): Promise<{ success: boolean; message: string }> {
    const res = await api.post(`/institutions/${id}/leave`);
    return res.data?.data || res.data;
  },

  /**
   * Remove a member from institution (Owner or Admin)
   */
  async removeMember(id: string, userId: string): Promise<{ success: boolean; message: string }> {
    const res = await api.delete(`/institutions/${id}/members/${userId}`);
    return res.data?.data || res.data;
  },

  /**
   * Appoint or remove Admin role for a teacher (Owner only)
   */
  async setAdminRole(
    id: string,
    userId: string,
    isAdmin: boolean,
  ): Promise<{ success: boolean; message: string }> {
    const res = await api.patch(`/institutions/${id}/members/${userId}/admin`, { isAdmin });
    return res.data?.data || res.data;
  },

  /**
   * Transfer institution ownership to another teacher (Owner only)
   */
  async transferOwnership(
    id: string,
    newOwnerId: string,
  ): Promise<{ success: boolean; message: string }> {
    const res = await api.post(`/institutions/${id}/transfer-ownership`, { newOwnerId });
    return res.data?.data || res.data;
  },

  /**
   * Get institution classrooms
   */
  async getClassrooms(id: string): Promise<Classroom[]> {
    try {
      const res = await api.get(`/institutions/${id}/classrooms`);
      return res.data?.data || res.data || [];
    } catch {
      // Fallback to recent classrooms
      try {
        const res = await api.get('/classrooms');
        return res.data?.data || res.data?.classrooms || (Array.isArray(res.data) ? res.data : []);
      } catch {
        return [];
      }
    }
  },

  /**
   * Get institution stats (Owner / Admin)
   */
  async getStats(id: string): Promise<InstitutionStats> {
    const res = await api.get(`/institutions/${id}/stats`);
    const d = res.data?.data || res.data || {};
    return {
      totalMembers: d.totalMembers ?? ((d.teachers || 0) + (d.students || 0)),
      totalTeachers: d.teachers ?? d.totalTeachers ?? 0,
      totalStudents: d.students ?? d.totalStudents ?? 0,
      totalClassrooms: d.totalClassrooms ?? 0,
      pendingRequests: d.pendingRequests ?? 0,
    };
  },
};
