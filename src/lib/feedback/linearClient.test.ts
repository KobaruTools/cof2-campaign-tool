import { afterEach, describe, expect, it, vi } from 'vitest';

import { createLinearIssue } from './linearClient';

const originalFetch = globalThis.fetch;
const originalEnv = process.env.LINEAR_API_KEY;

afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env.LINEAR_API_KEY = originalEnv;
});

describe('createLinearIssue', () => {
  it('appelle l’API Linear avec la team Perso, le statut Triage et les vrais IDs de label', async () => {
    process.env.LINEAR_API_KEY = 'test-key';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          issueCreate: {
            success: true,
            issue: { id: 'issue-1', url: 'https://linear.app/x/issue/PER-999' },
          },
        },
      }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await createLinearIssue({
      title: '[Bug] Titre',
      description: 'Description',
      labelIds: ['bug', 'retour-joueur'],
    });

    expect(result).toEqual({ id: 'issue-1', url: 'https://linear.app/x/issue/PER-999' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.linear.app/graphql');
    expect(init.headers.Authorization).toBe('test-key');
    const body = JSON.parse(init.body);
    expect(body.variables.input.teamId).toBe('61a44dcb-8d5b-4dea-bb37-b97c936746b0');
    expect(body.variables.input.stateId).toBe('895f4308-868e-47bb-9e7e-294a378cc893');
    expect(body.variables.input.labelIds).toEqual([
      '3871021b-53da-403b-8014-80d73a54ccd6',
      '0685039a-7380-476e-b6db-480ee685ca2e',
    ]);
    expect(body.variables.input.title).toBe('[Bug] Titre');
  });

  it('lève une erreur si Linear répond success:false', async () => {
    process.env.LINEAR_API_KEY = 'test-key';
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { issueCreate: { success: false, issue: null } } }),
    }) as unknown as typeof fetch;

    await expect(
      createLinearIssue({ title: 't', description: 'd', labelIds: ['bug', 'retour-joueur'] }),
    ).rejects.toThrow();
  });
});
