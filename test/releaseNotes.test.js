import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '../src/renderer/src/utils/apiClient';
import {
  fetchDesktopReleaseNotes,
  releaseDateForDisplay,
  getLocalizedReleaseNote,
  mergeDesktopReleaseNotes,
  normalizeReleaseVersion,
} from '../src/renderer/src/utils/releaseNotes';

vi.mock('../src/renderer/src/utils/apiClient', () => ({ apiFetch: vi.fn() }));

const githubRelease = {
  id: 14,
  tag_name: '1.2.3',
  name: 'GitHub title',
  body: 'GitHub body',
  published_at: '2026-09-01T00:00:00Z',
  html_url: 'https://github.com/rigelra15/hypertopia-installer-releases/releases/tag/1.2.3',
  assets: [{ id: 27, name: 'installer.exe', browser_download_url: 'https://example.test/setup.exe' }],
};

const note = {
  id: 'desktop-1-2-3',
  platform: 'desktop',
  version: ' v1.2.3 ',
  releaseDate: '2026-09-02',
  title: { id: 'Pembaruan 1.2.3', en: 'Update 1.2.3' },
  body: { id: 'Catatan Indonesia', en: 'English notes' },
  status: 'published',
};

describe('Desktop release-note resolver', () => {
  beforeEach(() => vi.clearAllMocks());

  it('keeps date-only release dates on the selected calendar day west of UTC', () => {
    const originalTimezone = process.env.TZ
    process.env.TZ = 'America/Los_Angeles'
    try {
      expect(releaseDateForDisplay('2026-09-02').toLocaleDateString('en-US')).toBe('9/2/2026')
    } finally {
      if (originalTimezone === undefined) delete process.env.TZ
      else process.env.TZ = originalTimezone
    }
  })

  it('normalizes surrounding whitespace and one lowercase v prefix', () => {
    expect(normalizeReleaseVersion('  v1.2.3  ')).toBe('1.2.3');
    expect(normalizeReleaseVersion('vv1.2.3')).toBe('v1.2.3');
  });

  it('matches the exact normalized version and preserves the GitHub release metadata', () => {
    const [merged] = mergeDesktopReleaseNotes([githubRelease], [note], 'en');
    expect(merged).toMatchObject({
      id: githubRelease.id,
      tag_name: githubRelease.tag_name,
      html_url: githubRelease.html_url,
      assets: githubRelease.assets,
      releaseNoteTitle: 'Update 1.2.3',
      releaseNoteBody: 'English notes',
      releaseNoteDate: '2026-09-02',
      hasAuthoredReleaseNote: true,
    });
  });

  it('uses the other language for each blank localized field', () => {
    expect(
      getLocalizedReleaseNote(
        { title: { id: 'Judul', en: '' }, body: { id: '', en: 'English body' } },
        'en',
      ),
    ).toEqual({ title: 'Judul', body: 'English body' });
  });

  it('keeps unmatched Admin notes separate from GitHub release metadata', () => {
    const merged = mergeDesktopReleaseNotes(
      [githubRelease],
      [{ ...note, version: '1.2.4' }],
      'id',
    );
    const githubVersion = merged.find(
      (release) => normalizeReleaseVersion(release.tag_name) === '1.2.3',
    );
    const authoredVersion = merged.find(
      (release) => normalizeReleaseVersion(release.tag_name) === '1.2.4',
    );

    expect(githubVersion).toMatchObject({
      name: 'GitHub title',
      body: 'GitHub body',
      html_url: githubRelease.html_url,
      assets: githubRelease.assets,
      releaseNoteTitle: '1.2.3',
      releaseNoteBody: '',
      releaseNoteDate: githubRelease.published_at,
      hasAuthoredReleaseNote: false,
    });
    expect(authoredVersion).toMatchObject({
      releaseNoteBody: 'Catatan Indonesia',
      hasAuthoredReleaseNote: true,
    });
  });

  it('keeps the GitHub list when no authored notes are returned', () => {
    expect(mergeDesktopReleaseNotes([githubRelease], [], 'id')).toHaveLength(1);
    expect(mergeDesktopReleaseNotes([githubRelease], [], 'id')[0].body).toBe('GitHub body');
  });

  it('shows published notes when GitHub has no available releases', () => {
    expect(mergeDesktopReleaseNotes([], [note], 'id')).toEqual([
      expect.objectContaining({
        id: 'authored-desktop-1-2-3',
        tag_name: 'v1.2.3',
        releaseNoteTitle: 'Pembaruan 1.2.3',
        releaseNoteBody: 'Catatan Indonesia',
        hasAuthoredReleaseNote: true,
      }),
    ]);
  });

  it('uses the public Desktop feed and rejects invalid or failed responses', async () => {
    apiFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, notes: [note] }),
    });
    await expect(fetchDesktopReleaseNotes()).resolves.toEqual([note]);
    expect(apiFetch).toHaveBeenCalledWith('/api/v1/release-notes?platform=desktop');

    apiFetch.mockResolvedValue({ ok: true, json: async () => ({ success: false, notes: [note] }) });
    await expect(fetchDesktopReleaseNotes()).rejects.toThrow();

    apiFetch.mockResolvedValue({ ok: false, json: async () => ({ success: true, notes: [note] }) });
    await expect(fetchDesktopReleaseNotes()).rejects.toThrow();
  });
});
