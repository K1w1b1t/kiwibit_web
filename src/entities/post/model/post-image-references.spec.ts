import { postImageReferences } from './post-image-references';

describe('Post image references', () => {
  it('collects body, cover and both translation images after HTML decoding', () => {
    const references = postImageReferences({
      contentFormat: 'html',
      content: '<p>Body</p><img src="https://media.example/a.png?a=1&amp;b=2">',
      contentPt: '<img src="https://media.example/pt.png">',
      contentEn: '<img src="https://media.example/en.png">',
      coverImageUrl: 'https://media.example/cover.png',
    });
    expect([...references]).toEqual(
      expect.arrayContaining([
        'https://media.example/a.png?a=1&b=2',
        'https://media.example/pt.png',
        'https://media.example/en.png',
        'https://media.example/cover.png',
      ]),
    );
  });

  it('collects Markdown images and ignores image-looking legacy text', () => {
    expect([
      ...postImageReferences({
        contentFormat: 'markdown',
        content: '![image](https://media.example/body.png)',
      }),
    ]).toEqual(['https://media.example/body.png']);
    expect([
      ...postImageReferences({
        contentFormat: 'text',
        content: '<img src="https://media.example/body.png">',
      }),
    ]).toEqual([]);
  });

  it('does not treat unsafe image schemes or script text as attachments', () => {
    expect([
      ...postImageReferences({
        contentFormat: 'html',
        content:
          '<img src="javascript:alert(1)"><script>https://media.example/private.png</script>',
      }),
    ]).toEqual([]);
  });
});
