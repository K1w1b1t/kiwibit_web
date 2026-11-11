import { classifyMcpClient } from './mcp-connection';

describe('MCP client provenance', () => {
  it.each([
    ['https://chatgpt.com/oauth/codex/example/client.json', 'codex'],
    ['https://claude.ai/oauth/client.json', 'claude'],
    ['https://antigravity.google/oauth/client-metadata.json', 'antigravity'],
  ])('recognizes %s', (clientId, expected) => {
    expect(classifyMcpClient(clientId)).toBe(expected);
  });

  it.each([
    'codex',
    'https://chatgpt.com.attacker.example/oauth/codex/client.json',
    'https://attacker.example/claude.ai/client.json',
    'https://attacker@chatgpt.com/oauth/codex/client.json',
    'http://claude.ai/oauth/client.json',
  ])('does not trust a misleading identifier %s', (clientId) => {
    expect(classifyMcpClient(clientId)).toBe('other');
  });
});
