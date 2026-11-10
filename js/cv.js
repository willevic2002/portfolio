// Rendering only. All data goes in via textContent; links only when https:// (or mailto: for contact).

const isTodo = (v) => typeof v === 'string' && v.startsWith('TODO');

function el(tag, { cls, text, attrs } = {}, children = []) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  for (const [k, v] of Object.entries(attrs ?? {})) node.setAttribute(k, v);
  node.append(...children);
  return node;
}

/** Plain text, or a `.todo` span when the value is a TODO placeholder. */
function val(text) {
  return isTodo(text) ? el('span', { cls: 'todo', text }) : document.createTextNode(String(text ?? ''));
}

function link(url, label, extra = {}) {
  if (typeof url !== 'string' || !/^(https:\/\/|mailto:)/.test(url)) return document.createTextNode(label);
  return el('a', { text: label, attrs: { href: url, rel: 'noopener', ...extra } });
}

function section(id, title) {
  const h = el('h3', { cls: 'sec', attrs: { id: `${id}-h` } }, [
    el('span', { text: '#', attrs: { 'aria-hidden': 'true' } }),
    document.createTextNode(title),
  ]);
  return el('section', { attrs: { id, 'aria-labelledby': `${id}-h` } }, [h]);
}

const validDate = (s) => typeof s === 'string' && /^\d{4}(-\d{2})?$/.test(s);

function logItem({ tag, tagKind, start, end, head, detail, current }) {
  const hasTime = start !== undefined;
  const bad = hasTime && !validDate(start);
  const time = el('time', { attrs: validDate(start) ? { datetime: start } : {} });
  if (hasTime) {
    time.textContent = bad ? '????-??' : start + (end === null ? ' → nu' : validDate(end) ? ` → ${end}` : '');
  }
  const kind = bad ? 'todo' : tagKind;
  const body = el('div', { cls: 'body' }, [el('div', { cls: 'head' }, head)]);
  if (detail != null) body.append(el('div', { cls: 'detail' }, [val(detail)]));
  const li = el('li', { cls: current && !bad ? 'current' : '' }, [
    hasTime ? time : el('span'),
    el('span', { cls: `tag tag--${kind}`, text: `[${bad ? 'todo' : tag}]` }),
    body,
  ]);
  return li;
}

function entries(list, tag) {
  return (list ?? []).map((e) =>
    logItem({ tag, tagKind: tag, start: e.start, end: e.end, current: e.end === null,
      head: [val(e.title), document.createTextNode(' — '), val(e.org)], detail: e.detail }));
}

export function renderCV(root, cv) {
  root.replaceChildren();
  const set = (sel, t) => { const n = document.querySelector(sel); if (n && t) n.textContent = t; };
  set('#guide-name', cv.name);
  set('#guide-role', cv.title);
  if (cv.name) {
    set('#hero-name', `${cv.name} — portfolio`);
    document.title = `${cv.name} — cv & rummet`;
  }

  const about = section('about', 'om mig');
  about.append(el('p', { cls: 'about-cmd', text: '$ cat om-mig.txt' }), el('p', { cls: 'about' }, [val(cv.about)]));
  root.append(about);

  for (const [id, title, key, tag] of [['education', 'utbildning', 'education', 'edu'], ['experience', 'erfarenhet', 'experience', 'work']]) {
    const s = section(id, title);
    s.append(el('ol', { cls: 'log' }, entries(cv[key], tag)));
    root.append(s);
  }

  const skills = section('skills', 'kunskaper');
  skills.append(el('ol', { cls: 'log' }, (cv.skills ?? []).map(skillLine)));
  root.append(skills);

  const contact = section('contact', 'kontakt');
  const rows = (cv.contact ?? []).map((c) =>
    logItem({ tag: c.url?.startsWith('mailto:') ? 'mail' : 'link', tagKind: 'contact',
      head: [document.createTextNode(`${c.label}: `), link(c.url, c.url?.replace(/^(https:\/\/|mailto:)/, '') ?? '')] }));
  if (cv.location) rows.push(logItem({ tag: 'info', tagKind: 'contact', head: [document.createTextNode(`plats: ${cv.location}`)] }));
  contact.append(el('ol', { cls: 'log' }, rows));
  root.append(contact);
}

function skillLine(g) {
  return logItem({ tag: 'skill', tagKind: 'skill', head: [document.createTextNode(`${g.group}: ${(g.items ?? []).join(' · ')}`)] });
}

/** One <li><button> per item, in data order. onPick(id, button); onHover(id|null) optional. */
export function renderProjectList(ul, projects, onPick, onHover) {
  ul.replaceChildren();
  if (!projects.length) {
    ul.append(el('li', { cls: 'empty', text: 'inga projekt än.' }));
    return;
  }
  for (const p of projects) {
    const btn = el('button', { attrs: { type: 'button', 'data-project-id': p.id, 'aria-pressed': 'false', 'aria-controls': 'project-panel' } }, [
      el('span', { cls: 'ttl', text: p.title }),
      ...(p.year ? [el('span', { cls: 'yr', text: String(p.year) })] : []),
    ]);
    btn.addEventListener('click', () => onPick(p.id, btn));
    if (onHover) {
      btn.addEventListener('mouseenter', () => onHover(p.id));
      btn.addEventListener('focus', () => onHover(p.id));
      btn.addEventListener('mouseleave', () => onHover(null));
      btn.addEventListener('blur', () => onHover(null));
    }
    ul.append(el('li', {}, [btn]));
  }
}

/** project=null hides the card. The close button carries data-close; main.js wires it. */
export function renderProjectPanel(panel, project) {
  panel.replaceChildren();
  panel.hidden = !project;
  if (!project) return;
  const hasUrl = typeof project.url === 'string' && project.url.startsWith('https://');
  const interest = project.category === 'intresse';
  panel.append(
    el('span', { cls: 'esc', text: 'esc', attrs: { 'aria-hidden': 'true' } }),
    el('button', { cls: 'close x', text: '×', attrs: { type: 'button', 'data-close': '', 'aria-label': 'stäng' } }),
    el('p', { cls: 'cmd', text: `$ cat projekt/${project.id}.md` }),
    el('h2', { text: project.title, attrs: { id: 'project-title', tabindex: '-1' } }),
    el('p', { cls: 'meta' }, [
      el('span', { cls: `tag tag--${interest ? 'skill' : 'proj'}`, text: interest ? '[intresse]' : '[projekt]' }),
      ...(project.year ? [el('span', { text: `· ${project.year}` })] : []),
    ]),
    el('p', {}, [val(project.summary ?? '')]),
  );
  if (project.tech?.length) panel.append(el('p', { cls: 'tech', text: project.tech.map((t) => String(t).toLowerCase()).join(' · ') }));
  panel.append(hasUrl
    ? el('p', {}, [el('a', { attrs: { href: project.url, target: '_blank', rel: 'noopener' } }, [
        document.createTextNode('öppna på github ↗'), el('span', { cls: 'sr-only', text: ' (öppnas i ny flik)' })])])
    : el('p', {}, [el('span', { cls: 'tag tag--contact', text: '[privat] ' }), document.createTextNode('ingen publik länk')]));
}
