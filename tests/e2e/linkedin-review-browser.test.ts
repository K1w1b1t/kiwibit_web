import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { BASE_URL } from './helpers/constants';
import { useAdminClient } from './helpers/crud';

describe('Post creation and LinkedIn review in the browser', () => {
  const admin = useAdminClient();

  it('returns to the list after creating posts and completing the LinkedIn flow', async () => {
    const creationCases = [
      {
        title: 'Novo rascunho pelo painel',
        status: 'draft',
        reviewOutcome: 'skip',
        evidence: '19-criar-rascunho-volta-listagem',
      },
      {
        title: 'Novo post sem perfil disponível',
        status: 'published',
        reviewOutcome: 'skip',
        evidence: '22-linkedin-sem-perfil-volta-listagem',
      },
      {
        title: 'Novo post com revisão cancelada',
        status: 'published',
        reviewOutcome: 'cancel',
        evidence: '36-linkedin-cancelar-volta-listagem',
      },
      {
        title: 'Novo post com resultado incerto',
        status: 'published',
        reviewOutcome: 'unknown',
        evidence: '31-linkedin-resultado-incerto-volta-listagem',
      },
    ] as const;
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
    async function fill(selector: string, text: string) {
      const element = await webdriver<Record<string, string>>(`/session/${sessionId}/element`, {
        using: 'css selector',
        value: selector,
      });
      const path = `/session/${sessionId}/element/${element['element-6066-11e4-a52e-4f735466cecf']}`;
      await webdriver(`${path}/clear`, {});
      await webdriver(`${path}/value`, { text });
    }

    async function mockAvailableProfile(outcome?: 'unknown') {
      await execute(`
        const request = window.fetch;
        window.fetch = async (url, options) => {
          if (typeof url !== 'string' || !url.startsWith('/api/admin/posts/') || !url.endsWith('/linkedin')) {
            return request(url, options);
          }
          if (options?.method === 'GET') {
            const response = await request(url, options);
            if (!response.ok) return response;
            const review = await response.json();
            return Response.json({ ...review, destinations: { personal: true } });
          }
          if (options?.method === 'POST' && ${JSON.stringify(outcome ?? null)} === 'unknown') {
            return Response.json({ review: { deliveries: [{ target: 'personal', status: 'unknown' }] } });
          }
          return request(url, options);
        };
      `);
    }

    async function screenshot(name: string) {
      if (!process.env.LINKEDIN_EVIDENCE_DIR) return;
      await execute(`
        document.querySelectorAll('nextjs-portal').forEach((element) => element.remove());
        const decline = [...document.querySelectorAll('button')]
          .find((button) => button.textContent.includes('No, thanks'));
        if (decline) decline.click();
      `);
      await new Promise((resolve) => setTimeout(resolve, 1200));
      const data = await webdriver<string>(`/session/${sessionId}/screenshot`);
      await mkdir(process.env.LINKEDIN_EVIDENCE_DIR, { recursive: true });
      await writeFile(join(process.env.LINKEDIN_EVIDENCE_DIR, name), Buffer.from(data, 'base64'));
    }
    async function screenshotBothViewports(name: string) {
      if (!process.env.LINKEDIN_EVIDENCE_DIR) return;
      await screenshot(`${name}-desktop.png`);
      const rect = (width: number, height: number) =>
        webdriver(`/session/${sessionId}/window/rect`, { width, height });
      await rect(390, 844);
      await delay();
      await screenshot(`${name}-mobile.png`);
      await rect(1440, 1400);
      await delay();
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
      await navigate(`${BASE_URL}/kiwi.png`);
      await waitFor(() =>
        execute<boolean>(`
          return location.origin === ${JSON.stringify(new URL(BASE_URL).origin)}
            && document.querySelector('img')?.naturalWidth > 0;
        `),
      );
      const session = admin.client.getCookie('next-auth.session-token');
      if (!session) throw new Error('Test administrator session was not established');
      await webdriver(`/session/${sessionId}/cookie`, {
        cookie: { name: 'next-auth.session-token', value: session, path: '/', httpOnly: true },
      });
      await navigate(`${BASE_URL}/admin/posts`);
      for (const { title, status, reviewOutcome, evidence } of creationCases) {
        await execute(`document.querySelector('a[href="/admin/posts/new"]').click()`);
        await waitFor(() =>
          execute<boolean>('return !!document.getElementById("new-post-title-Pt")'),
        );
        await fill('#new-post-title-Pt', title);
        await fill(
          '#new-post-content-Pt',
          'Conteúdo de exemplo para verificar a criação pelo painel.',
        );
        if (reviewOutcome !== 'skip') {
          await mockAvailableProfile(reviewOutcome === 'unknown' ? 'unknown' : undefined);
        }
        await execute(`
          window.linkedinReviewWasOpened = false;
          new MutationObserver(() => {
            if (document.querySelector('dialog[open]')) window.linkedinReviewWasOpened = true;
          }).observe(document.body, { attributes: true, childList: true, subtree: true });
          const status = document.getElementById('new-post-status');
          status.value = ${JSON.stringify(status)};
          status.dispatchEvent(new Event('change', { bubbles: true }));
        `);
        await execute('document.querySelector("form button[type=submit]").click()');
        if (reviewOutcome !== 'skip') {
          await waitFor(() =>
            execute<boolean>('return !!document.querySelector("dialog[open] textarea")'),
          );
          expect(await execute<string>('return location.pathname')).toBe('/admin/posts/new');
          if (reviewOutcome === 'cancel') {
            const original = await execute<string>(
              'return document.querySelector("dialog[open] textarea").value',
            );
            await fill('dialog[open] textarea', 'Texto longo demais. '.repeat(160));
            await waitFor(() =>
              execute<boolean>(
                'return document.querySelector("dialog[open] #linkedin-validation").textContent.includes("Remova")',
              ),
            );
            await screenshotBothViewports('27-linkedin-limite-excedido');
            await fill('dialog[open] textarea', original);
          }
          if (reviewOutcome === 'unknown') {
            await execute('document.querySelector("dialog[open] input[type=checkbox]").click()');
          }
          const label = reviewOutcome === 'cancel' ? 'Cancelar' : 'Confirmar envio';
          await waitFor(() =>
            execute<boolean>(`
              const button = [...document.querySelectorAll('dialog[open] button')]
                .find((item) => item.textContent === ${JSON.stringify(label)});
              if (!button || button.disabled) return false;
              button.click();
              return true;
            `),
          );
        }
        await waitFor(() =>
          execute<boolean>(`
          return location.pathname === '/admin/posts'
            && document.querySelector('main')?.textContent.includes(${JSON.stringify(title)})
            && !document.querySelector('dialog[open]');
        `),
        );
        expect(await execute<boolean>('return window.linkedinReviewWasOpened === true')).toBe(
          reviewOutcome !== 'skip',
        );
        await screenshotBothViewports(evidence);
      }

      await navigate(`${BASE_URL}/admin/posts/${post.id}/edit`);
      await waitFor(() => execute<boolean>('return !!document.querySelector("#edit-post-status")'));
      await execute(
        'const b=Array.from(document.querySelectorAll("button")).find(x=>x.textContent.includes("No, thanks"));if(b)b.click()',
      );
      expect(
        await execute<boolean>(`
          const input = document.querySelector('#edit-post-content-Pt');
          return input.clientWidth > innerWidth * 0.75 && input.clientHeight >= innerHeight * 0.5;
        `),
      ).toBe(true);
      await execute(`
        const input = document.querySelector('#edit-post-content-Pt');
        input.focus();
        input.setSelectionRange(4, 8);
        input.parentElement.querySelector('button[aria-label="Abrir prévia"]').click();
      `);
      await waitFor(() =>
        execute<boolean>(`
          return document.querySelector('#edit-post-content-Pt').parentElement
            .querySelector('.post-rich-content')?.textContent.includes('Uma publicação clara');
        `),
      );
      await execute(`
        document.querySelector('#edit-post-content-Pt').parentElement
          .querySelector('button[aria-label="Fechar prévia"]').click();
      `);
      await waitFor(() =>
        execute<boolean>(`
          const input = document.querySelector('#edit-post-content-Pt');
          return document.activeElement === input && input.selectionStart === 4 && input.selectionEnd === 8;
        `),
      );
      await execute('document.querySelector("#edit-post-status").scrollIntoView({block:"center"})');
      await screenshot('01-rascunho.png');
      await mockAvailableProfile();
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
      await execute(`
        document.querySelector('dialog[open] button[aria-label="Abrir prévia"]').click();
      `);
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
      await execute(`
        document.querySelector('dialog[open] button[aria-label="Fechar prévia"]').click();
      `);
      const revised = `Este texto foi revisado antes da publicação. A mensagem fica completa e pode ser alterada no modal.\n\nLeia o post no meu blog: https://www.kiwibit.com.br/pt/blog/${post.id}`;
      for (const [selector, text] of [
        ['dialog[open] textarea', revised],
        ['dialog[open] input:not([type=checkbox])', '#Kiwibit #Seguranca #Tecnologia'],
      ]) {
        await fill(selector, text);
      }
      await execute('document.querySelector("dialog[open] input[type=checkbox]").click()');
      expect(
        await execute<boolean>(
          'return !Array.from(document.querySelectorAll("dialog[open] button")).find(b=>b.textContent.includes("Confirmar envio")).disabled',
        ),
      ).toBe(true);
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

      await execute(`
        const request = window.fetch;
        window.fetch = async (url, options) => {
          if (url !== '/api/admin/posts/${post.id}/linkedin' || options.method === 'PUT') {
            return request(url, options);
          }
          if (options.method === 'POST') {
            return Response.json({ review: { deliveries: [{ target: 'personal', status: 'succeeded' }] } });
          }
          const response = await request(url, options);
          const review = await response.json();
          return Response.json({ ...review, destinations: { personal: true } });
        };
        Array.from(document.querySelectorAll('button'))
          .find((button) => button.textContent === 'Publicar no LinkedIn').click();
      `);
      await waitFor(() =>
        execute<boolean>('return !!document.querySelector("dialog[open] input[type=checkbox]")'),
      );
      await execute(`document.querySelector('dialog[open] input[type=checkbox]').click();`);
      await waitFor(() =>
        execute<boolean>(`
          return Array.from(document.querySelectorAll('dialog[open] button'))
            .some((button) => button.textContent === 'Confirmar envio' && !button.disabled);
        `),
      );
      await execute(`
        Array.from(document.querySelectorAll('dialog[open] button'))
          .find((button) => button.textContent === 'Confirmar envio').click();
      `);
      await waitFor(() =>
        execute<boolean>(
          'return location.pathname === "/admin/posts" && !document.querySelector("dialog[open]")',
        ),
      );
    } finally {
      if (sessionId)
        await fetch(`http://127.0.0.1:9522/session/${sessionId}`, { method: 'DELETE' }).catch(
          () => undefined,
        );
      driver.kill();
      await admin.client.delete(`/api/admin/posts/${post.id}`);
      for (const { title } of creationCases) {
        const response = await admin.client.get(
          `/api/admin/posts?search=${encodeURIComponent(title)}`,
        );
        const data = (await response.json()) as { items: { id: string; title: string }[] };
        for (const createdPost of data.items.filter((item) => item.title === title)) {
          await admin.client.delete(`/api/admin/posts/${createdPost.id}`);
        }
      }
    }
  }, 120000);
});
