import { afterEach, describe, expect, it, vi } from 'vitest';

import { attachFileToIssue, createLinearIssue } from './linearClient';

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
    expect(body.variables.input.projectId).toBe('ce1d9541-40da-42c8-abed-6af5db509bca');
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

describe('attachFileToIssue', () => {
  it("obtient l'URL signée, PUT le fichier, puis le rattache au ticket", async () => {
    process.env.LINEAR_API_KEY = 'test-key';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            fileUpload: {
              success: true,
              uploadFile: {
                uploadUrl: 'https://upload.linear.app/signed-url',
                assetUrl: 'https://uploads.linear.app/asset-1',
                headers: [{ key: 'x-amz-foo', value: 'bar' }],
              },
            },
          },
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { attachmentCreate: { success: true } } }),
      });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const content = new TextEncoder().encode('{"hello":"world"}').buffer;
    await attachFileToIssue('issue-1', {
      filename: 'personnage.json',
      contentType: 'application/json',
      content,
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);

    const [uploadUrl, uploadInit] = fetchMock.mock.calls[0];
    expect(uploadUrl).toBe('https://api.linear.app/graphql');
    const uploadVariables = JSON.parse(uploadInit.body).variables;
    expect(uploadVariables).toEqual({
      contentType: 'application/json',
      filename: 'personnage.json',
      size: content.byteLength,
    });

    const [putUrl, putInit] = fetchMock.mock.calls[1];
    expect(putUrl).toBe('https://upload.linear.app/signed-url');
    expect(putInit.method).toBe('PUT');
    expect(putInit.headers).toEqual({
      'Content-Type': 'application/json',
      'x-amz-foo': 'bar',
    });
    expect(putInit.body).toBe(content);

    const [attachUrl, attachInit] = fetchMock.mock.calls[2];
    expect(attachUrl).toBe('https://api.linear.app/graphql');
    const attachVariables = JSON.parse(attachInit.body).variables;
    expect(attachVariables).toEqual({
      input: {
        issueId: 'issue-1',
        url: 'https://uploads.linear.app/asset-1',
        title: 'personnage.json',
      },
    });
  });

  it("lève une erreur si l'obtention de l'URL d'upload échoue", async () => {
    process.env.LINEAR_API_KEY = 'test-key';
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { fileUpload: { success: false, uploadFile: null } } }),
    }) as unknown as typeof fetch;

    await expect(
      attachFileToIssue('issue-1', {
        filename: 'x.png',
        contentType: 'image/png',
        content: new ArrayBuffer(0),
      }),
    ).rejects.toThrow();
  });

  it('lève une erreur si le rattachement au ticket échoue', async () => {
    process.env.LINEAR_API_KEY = 'test-key';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            fileUpload: {
              success: true,
              uploadFile: {
                uploadUrl: 'https://upload.linear.app/signed-url',
                assetUrl: 'https://uploads.linear.app/asset-1',
                headers: [],
              },
            },
          },
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { attachmentCreate: { success: false } } }),
      });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      attachFileToIssue('issue-1', {
        filename: 'x.png',
        contentType: 'image/png',
        content: new ArrayBuffer(0),
      }),
    ).rejects.toThrow();
  });
});
