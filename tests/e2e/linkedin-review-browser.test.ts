import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { BASE_URL } from './helpers/constants';
import { useAdminClient } from './helpers/crud';

describe('LinkedIn review when publishing a draft in the browser', () => {
  const admin = useAdminClient();

  it('opens the editable review, preserves the blog publication on Escape and does not send', async () => {
    const created = await admin.client.post('/api/admin/posts', {
      titlePt: 'Segurança que começa na revisão',
      contentPt:
        'Uma publicação clara ajuda a compartilhar conhecimento. Uma revisão antes do envio mantém a mensagem completa e coerente.',
      contentFormat: 'text',
      linkedinIntroPt:
        'Antes de compartilhar uma ideia, vale revisar o texto e garantir que a mensagem esteja completa.',
      coverImageUrl: `${BASE_URL}/kiwi.png`,
      coverImageAltPt: 'Ilustração da Kiwibit',
    });
    expect(created.status).toBe(201);
    const { data: post } = (await created.json()) as { data: { id: string } };
    const driver = spawn(
      process.env.CHROMEDRIVER_PATH ?? 'chromedriver',
      ['--port=9522', '--allowed-ips=127.0.0.1'],
      { stdio: 'ignore' },
    );
    let sessionId = '';
    const delay = () => new Promise((resolve) => setTimeout(resolve, 100));
    async function waitFor(operation: () => Promise<boolean>) {
      for (let attempt = 0; attempt < 200; attempt++) {
        try {
          if (await operation()) return;
        } catch {
          /* driver may still be starting */
        }
        await delay();
      }
      throw new Error('Browser condition timed out');
    }
    async function webdriver<T>(path: string, body?: object): Promise<T> {
      const response = await fetch(`http://127.0.0.1:9522${path}`, {
        method: body ? 'POST' : 'GET',
        headers: { 'content-type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!response.ok) throw new Error(`WebDriver command failed: ${path} ${response.status}`);
      return ((await response.json()) as { value: T }).value;
    }
    const execute = <T>(script: string) =>
      webdriver<T>(`/session/${sessionId}/execute/sync`, { script, args: [] });
    const navigate = (url: string) => webdriver(`/session/${sessionId}/url`, { url });
    async function screenshot(name: string) {
      if (!process.env.LINKEDIN_EVIDENCE_DIR) return;
      const data = await webdriver<string>(`/session/${sessionId}/screenshot`);
      await mkdir(process.env.LINKEDIN_EVIDENCE_DIR, { recursive: true });
      await writeFile(join(process.env.LINKEDIN_EVIDENCE_DIR, name), Buffer.from(data, 'base64'));
    }

    try {
      await waitFor(async () => (await fetch('http://127.0.0.1:9522/status')).ok);
      const browser = await webdriver<{ sessionId: string }>('/session', {
        capabilities: {
          alwaysMatch: {
            browserName: 'chrome',
            'goog:chromeOptions': {
              args: [
                '--headless=new',
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--window-size=1440,1400',
              ],
            },
          },
        },
      });
      sessionId = browser.sessionId;
      await navigate(`${BASE_URL}/login`);
      const session = admin.client.getCookie('next-auth.session-token');
      if (!session) throw new Error('Test administrator session was not established');
      await webdriver(`/session/${sessionId}/cookie`, {
        cookie: { name: 'next-auth.session-token', value: session, path: '/', httpOnly: true },
      });
      await navigate(`${BASE_URL}/admin/posts/${post.id}/edit`);
      await waitFor(() => execute<boolean>('return !!document.querySelector("#edit-post-status")'));
      await execute(
        'const b=Array.from(document.querySelectorAll("button")).find(x=>x.textContent.includes("No, thanks"));if(b)b.click()',
      );
      await execute('document.querySelector("#edit-post-status").scrollIntoView({block:"center"})');
      await screenshot('01-rascunho.png');
      await execute(
        'const s=document.querySelector("#edit-post-status");s.value="published";s.dispatchEvent(new Event("change",{bubbles:true}));',
      );
      await execute(
        'const b=document.querySelector("form button[type=submit]");b.focus();b.click()',
      );
      await waitFor(() =>
        execute<boolean>('return !!document.querySelector("dialog[open] textarea")'),
      );
      expect(
        await execute<boolean>(
          'return document.querySelector("dialog[open]").textContent.includes("Revisar publicação no LinkedIn")',
        ),
      ).toBe(true);
      expect(
        await execute<string>('return document.querySelector("dialog[open] textarea").value'),
      ).toContain('mensagem esteja completa');
      expect(
        await execute<string>(
          'return document.querySelector("dialog[open] input:not([type=checkbox])").value',
        ),
      ).toContain('#Kiwibit');
      await waitFor(() =>
        execute<boolean>(
          'const img=document.querySelector("dialog[open] img");return !!img && img.complete && img.naturalWidth>0',
        ),
      );
      expect(
        await execute<boolean>(
          'return document.querySelector("dialog[open]").contains(document.activeElement)',
        ),
      ).toBe(true);
      await screenshot('02-modal-texto-hashtags.png');
      const revised = `Este texto foi revisado antes da publicação. A mensagem fica completa e pode ser alterada no modal.\n\nLeia o post no meu blog: https://www.kiwibit.com.br/pt/blog/${post.id}`;
      for (const [selector, text] of [
        ['dialog[open] textarea', revised],
        ['dialog[open] input:not([type=checkbox])', '#Kiwibit #Seguranca #Tecnologia'],
      ]) {
        const element = await webdriver<Record<string, string>>(`/session/${sessionId}/element`, {
          using: 'css selector',
          value: selector,
        });
        const path = `/session/${sessionId}/element/${element['element-6066-11e4-a52e-4f735466cecf']}`;
        await webdriver(`${path}/clear`, {});
        await webdriver(`${path}/value`, { text });
      }
      await execute('document.querySelector("dialog[open] input[type=checkbox]").click()');
      const available = await execute<boolean>(
        'return document.querySelector("dialog[open]").textContent.includes("Página da empresa: disponível") || document.querySelector("dialog[open]").textContent.includes("Perfil do autor: disponível")',
      );
      expect(
        await execute<boolean>(
          'return !Array.from(document.querySelectorAll("dialog[open] button")).find(b=>b.textContent.includes("Confirmar envio")).disabled',
        ),
      ).toBe(available);
      await execute('const d=document.querySelector("dialog[open]");d.scrollTop=d.scrollHeight');
      await screenshot('03-modal-confirmacao.png');
      await webdriver(`/session/${sessionId}/actions`, {
        actions: [
          {
            type: 'key',
            id: 'keyboard',
            actions: [
              { type: 'keyDown', value: '\uE004' },
              { type: 'keyUp', value: '\uE004' },
            ],
          },
        ],
      });
      expect(
        await execute<boolean>(
          'return document.querySelector("dialog[open]").contains(document.activeElement)',
        ),
      ).toBe(true);
      await webdriver(`/session/${sessionId}/actions`, {
        actions: [
          {
            type: 'key',
            id: 'keyboard',
            actions: [
              { type: 'keyDown', value: '\uE00C' },
              { type: 'keyUp', value: '\uE00C' },
            ],
          },
        ],
      });
      await waitFor(() => execute<boolean>('return !document.querySelector("dialog[open]")'));
      const saved = await (await admin.client.get(`/api/admin/posts/${post.id}`)).json();
      expect(saved.status).toBe('published');
      const review = await (await admin.client.get(`/api/admin/posts/${post.id}/linkedin`)).json();
      expect(review.deliveries).toEqual([]);
      expect(review.hashtags).toBe('#Kiwibit #Seguranca #Tecnologia');
      expect(review.text).toBe(revised);
      await waitFor(() =>
        execute<boolean>('return !!document.activeElement?.matches("form button[type=submit]")'),
      );
    } finally {
      if (sessionId)
        await fetch(`http://127.0.0.1:9522/session/${sessionId}`, { method: 'DELETE' }).catch(
          () => undefined,
        );
      driver.kill();
      await admin.client.delete(`/api/admin/posts/${post.id}`);
    }
  }, 90000);
});
