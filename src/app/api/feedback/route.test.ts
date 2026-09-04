import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { getUserMock, createLinearIssueMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  createLinearIssueMock: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => ({
    auth: { getUser: getUserMock },
  }),
}));

vi.mock('@/lib/feedback/linearClient', () => ({
  createLinearIssue: createLinearIssueMock,
}));

const { POST } = await import('./route');

const postRequest = (body: unknown) =>
  new NextRequest('http://localhost/api/feedback', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', 'user-agent': 'test-agent' },
  });

const validBody = {
  kind: 'bug',
  zone: 'character-sheet',
  description: 'Le bonus de DEF ne se met pas à jour.',
  path: '/character/abc123',
};

afterEach(() => {
  getUserMock.mockReset();
  createLinearIssueMock.mockReset();
});

describe('POST /api/feedback', () => {
  it('refuse une requête sans session (401)', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const response = await POST(postRequest(validBody));

    expect(response.status).toBe(401);
    expect(createLinearIssueMock).not.toHaveBeenCalled();
  });

  it('refuse une session de projection (lecture seule, 401)', async () => {
    getUserMock.mockResolvedValue({
      data: { user: { app_metadata: { projection: true } } },
    });

    const response = await POST(postRequest(validBody));

    expect(response.status).toBe(401);
    expect(createLinearIssueMock).not.toHaveBeenCalled();
  });

  it('refuse un payload invalide (description vide, 400)', async () => {
    getUserMock.mockResolvedValue({ data: { user: { app_metadata: {}, email: 'mj@x.com' } } });

    const response = await POST(postRequest({ ...validBody, description: '' }));

    expect(response.status).toBe(400);
    expect(createLinearIssueMock).not.toHaveBeenCalled();
  });

  it('crée le ticket pour une session owner et renvoie 200 + url', async () => {
    getUserMock.mockResolvedValue({
      data: { user: { app_metadata: {}, email: 'mj@x.com' } },
    });
    createLinearIssueMock.mockResolvedValue({ id: 'issue-1', url: 'https://linear.app/x/PER-999' });

    const response = await POST(postRequest(validBody));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ url: 'https://linear.app/x/PER-999' });
    expect(createLinearIssueMock).toHaveBeenCalledTimes(1);
    const payload = createLinearIssueMock.mock.calls[0][0];
    expect(payload.title).toContain('[Bug]');
    expect(payload.description).toContain('mj@x.com');
  });

  it('crée aussi le ticket pour une session player', async () => {
    getUserMock.mockResolvedValue({
      data: { user: { app_metadata: { player_id: 'p1', campaign_id: 'c1' }, email: null } },
    });
    createLinearIssueMock.mockResolvedValue({ id: 'issue-2', url: 'https://linear.app/x/PER-998' });

    const response = await POST(postRequest(validBody));

    expect(response.status).toBe(200);
    expect(createLinearIssueMock).toHaveBeenCalledTimes(1);
  });
});
