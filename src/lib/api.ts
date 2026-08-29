import type { Child, ChildWithGuardians, Guardian, PickupLog } from '../types';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  listChildren: () => request<Child[]>('/children'),
  getChild: (id: number) => request<ChildWithGuardians>(`/children/${id}`),
  createChild: (data: { name: string; grade?: string; notes?: string }) =>
    request<Child>('/children', { method: 'POST', body: JSON.stringify(data) }),
  deleteChild: (id: number) => request<void>(`/children/${id}`, { method: 'DELETE' }),

  listGuardians: () => request<Guardian[]>('/guardians'),
  addGuardian: (
    childId: number,
    data: { name: string; relationship?: string; phone?: string; photoDataUrl: string; descriptor: number[] }
  ) => request<Guardian>(`/children/${childId}/guardians`, { method: 'POST', body: JSON.stringify(data) }),
  deleteGuardian: (id: number) => request<void>(`/guardians/${id}`, { method: 'DELETE' }),

  listPickupLogs: (limit = 50) => request<PickupLog[]>(`/pickup-logs?limit=${limit}`),
  createPickupLog: (data: {
    childId?: number | null;
    guardianId?: number | null;
    matched: boolean;
    confidence?: number | null;
    snapshotDataUrl?: string;
    note?: string;
  }) => request<{ id: number }>('/pickup-logs', { method: 'POST', body: JSON.stringify(data) }),
};
