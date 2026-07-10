import { describe, expect, it, vi } from 'vitest';
import { parseLlmContent, synthesize, type ChatClient } from './synthesize';

const validPayload = JSON.stringify({
  category: 'Architecture',
  summary: {
    impactAnalysis: 'Shifts coordination cost from writes to reads.',
    bulletPoints: ['Uses CRDTs for merge', 'No central sequencer'],
  },
});

function fakeClient(responses: Array<string | null>): ChatClient {
  const create = vi.fn();
  for (const content of responses) {
    create.mockResolvedValueOnce({ choices: [{ message: { content } }] });
  }
  return { chat: { completions: { create } } };
}

describe('parseLlmContent', () => {
  it('parses clean JSON', () => {
    expect(parseLlmContent(validPayload).category).toBe('Architecture');
  });

  it('tolerates accidental markdown fences', () => {
    expect(parseLlmContent('```json\n' + validPayload + '\n```').category).toBe('Architecture');
  });

  it('rejects schema-invalid JSON', () => {
    expect(() => parseLlmContent('{"category":"Gaming","summary":{}}')).toThrow();
  });

  it('rejects non-JSON', () => {
    expect(() => parseLlmContent('Here is your summary!')).toThrow();
  });
});

describe('synthesize', () => {
  it('returns parsed output on first valid response', async () => {
    const client = fakeClient([validPayload]);
    const out = await synthesize(client, 'article text');
    expect(out.summary.bulletPoints).toHaveLength(2);
  });

  it('retries once with the validation error, then succeeds', async () => {
    const client = fakeClient(['not json at all', validPayload]);
    const out = await synthesize(client, 'article text');
    expect(out.category).toBe('Architecture');
    const create = client.chat.completions.create as ReturnType<typeof vi.fn>;
    expect(create).toHaveBeenCalledTimes(2);
    const retryMessage = create.mock.calls[1]![0].messages[1].content as string;
    expect(retryMessage).toContain('previous response was invalid');
  });

  it('throws after two invalid responses', async () => {
    const client = fakeClient(['bad', 'still bad']);
    await expect(synthesize(client, 'article text')).rejects.toThrow(/invalid after retry/);
  });
});
