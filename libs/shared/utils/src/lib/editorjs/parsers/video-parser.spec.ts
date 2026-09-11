import { VideoParser } from './video-parser'

describe('VideoParser', () => {
  it('rend une balise video pointant vers une URL https', () => {
    const html = VideoParser({ url: 'https://example.com/video.mp4' })
    expect(html).toContain('<div class="video">')
    expect(html).toContain('<video src="https://example.com/video.mp4" controls>')
  })

  it('accepte une URL relative (fichier uploadé servi par CourseFileController)', () => {
    const html = VideoParser({ url: '/api/v1/courses/abc/files/xyz.mp4' })
    expect(html).toContain('<video src="/api/v1/courses/abc/files/xyz.mp4" controls>')
  })

  it('rejette une URL protocol-relative (hôte arbitraire)', () => {
    expect(VideoParser({ url: '//evil.com/video.mp4' })).toBe('')
  })

  it('rejette une URL non https et non relative (ex: javascript:)', () => {
    expect(VideoParser({ url: 'javascript:alert(1)' })).toBe('')
    expect(VideoParser({ url: 'http://example.com/video.mp4' })).toBe('')
  })

  it('ne rend rien sans url', () => {
    expect(VideoParser({} as any)).toBe('')
  })

  it('affiche la légende quand elle est fournie', () => {
    const html = VideoParser({ url: 'https://example.com/video.mp4', caption: 'Ma vidéo' })
    expect(html).toContain('<div class="video-caption">Ma vidéo</div>')
  })

  it('échappe les caractères dangereux dans url et caption', () => {
    const html = VideoParser({
      url: 'https://example.com/"><script>alert(1)</script>',
      caption: '<img src=x onerror=alert(1)>',
    })
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<img src=x onerror=alert(1)>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('&lt;img')
  })
})
