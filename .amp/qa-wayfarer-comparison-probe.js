(async () => {
  const wait = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const ids = [...new Set([...document.querySelectorAll('dialog .game-card[data-upgraded="false"]')].map(c => c.dataset.def))];
  const results = [];
  for (const id of ids) {
    const card = document.querySelector(`dialog .game-card[data-def="${id}"][data-upgraded="false"]`);
    card.click();
    await wait();
    for (const c of document.querySelectorAll('.upgrade-compare .game-card')) {
      const header = c.querySelector('.card-heading');
      const text = header.lastElementChild;
      const h = header.getBoundingClientRect(), t = text.getBoundingClientRect();
      const a = c.querySelector('.card-art').getBoundingClientRect();
      const rules = c.querySelector('.card-rules').getBoundingClientRect();
      const footer = c.querySelector('.card-keywords').getBoundingClientRect();
      const frame = c.getBoundingClientRect();
      results.push({id, upgraded: c.dataset.upgraded, header: h.toJSON(), title: t.toJSON(), art: a.toJSON(),
        errors: [t.top < h.top - 1 && 'title above header', t.bottom > h.bottom + 1 && 'title below header',
          t.right > h.right + 1 && 'title beyond width', t.bottom > a.top + 1 && 'title overlaps art',
          rules.bottom > footer.top + 1 && 'rules overlap footer', footer.bottom > frame.bottom && 'footer outside card'].filter(Boolean)});
    }
    const back = [...document.querySelectorAll('dialog button')].find(b => ['Choose another', 'Back to cards'].includes(b.textContent.trim()));
    if (!back) throw Error(`Missing back for ${id}`);
    back.click();
    await wait();
  }
  return {width: innerWidth, count: results.length, errors: results.filter(r => r.errors.length), results};
})()
