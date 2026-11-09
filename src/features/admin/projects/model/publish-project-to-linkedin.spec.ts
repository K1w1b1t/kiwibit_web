import { publishProjectToLinkedIn } from './publish-project-to-linkedin';
import { triggerLinkedInAutoPost, triggerPersonalAutoPost } from '@/shared/lib/linkedin';
import { reportServerError } from '@/shared/lib/discord';

jest.mock('@/shared/lib/linkedin', () => ({
  triggerLinkedInAutoPost: jest.fn(),
  triggerPersonalAutoPost: jest.fn(),
}));
jest.mock('@/shared/lib/discord', () => ({ reportServerError: jest.fn().mockResolvedValue(true) }));
const project = {
  id: 'project-1',
  title: 'Original',
  description: 'Original description',
  titlePt: 'Projeto',
  descriptionPt: 'Descrição pública do projeto.',
  titleEn: 'Project',
  descriptionEn: 'Public project description.',
};

describe('Project announcement on the company page', () => {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://www.kiwibit.com.br';
    jest
      .mocked(triggerLinkedInAutoPost)
      .mockResolvedValue({ ok: true, sent: true, target: 'company' });
  });
  afterAll(() => {
    if (site === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = site;
  });
  it('announces a bilingual project in Portuguese and only targets the organization', async () => {
    await publishProjectToLinkedIn(project);
    expect(triggerLinkedInAutoPost).toHaveBeenCalledTimes(1);
    expect(triggerLinkedInAutoPost).toHaveBeenCalledWith('company', {
      title: 'Novo projeto da Kiwibit: Projeto',
      summary: project.descriptionPt,
      url: 'https://www.kiwibit.com.br/pt/projects/project-1',
    });
    expect(triggerPersonalAutoPost).not.toHaveBeenCalled();
  });
  it('uses English and its localized link for an English-only project', async () => {
    await publishProjectToLinkedIn({ ...project, titlePt: null, descriptionPt: null });
    expect(triggerLinkedInAutoPost).toHaveBeenCalledWith(
      'company',
      expect.objectContaining({
        title: 'New Kiwibit project: Project',
        url: 'https://www.kiwibit.com.br/en/projects/project-1',
      }),
    );
  });
  it('supports a legacy project', async () => {
    await publishProjectToLinkedIn({
      id: project.id,
      title: 'Legacy',
      description: 'Legacy description',
    });
    expect(triggerLinkedInAutoPost).toHaveBeenCalledWith(
      'company',
      expect.objectContaining({
        title: 'Novo projeto da Kiwibit: Legacy',
        summary: 'Legacy description',
      }),
    );
  });
  it('reports only safe diagnostic metadata when LinkedIn rejects the request', async () => {
    jest.mocked(triggerLinkedInAutoPost).mockResolvedValue({
      ok: false,
      status: 403,
      code: 'LINKEDIN_POST_FAILED',
      detail: 'Sensitive provider body',
    });
    await publishProjectToLinkedIn(project);
    expect(reportServerError).toHaveBeenCalledWith({
      source: 'linkedinProjectAutoPost',
      status: 403,
      code: 'LINKEDIN_POST_FAILED',
      message: 'LinkedIn company publication failed after project creation.',
    });
    expect(JSON.stringify(jest.mocked(reportServerError).mock.calls)).not.toContain(
      'Sensitive provider body',
    );
  });
  it('does not report a disabled destination as an error', async () => {
    jest.mocked(triggerLinkedInAutoPost).mockResolvedValue({ ok: false, skipped: true });
    await publishProjectToLinkedIn(project);
    expect(reportServerError).not.toHaveBeenCalled();
  });
});
