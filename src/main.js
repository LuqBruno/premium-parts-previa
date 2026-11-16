// Premium Parts Auto Peças — prévia de apresentação · v2 "A volta".
// Desktop: a rolagem vertical percorre a pista (painéis lado a lado) com amortecimento, para que os
// saltos da roda do mouse virem um movimento contínuo. Celular e movimento reduzido: fluxo vertical.

const CONFIG = {
  // WhatsApp ainda não confirmado pela loja: manter null. Quando confirmado, só dígitos com DDI, ex.: '5548999999999'.
  whatsapp: null,
  instagram: 'https://www.instagram.com/premium_parts_autopecas/',
  saudacao: 'Olá, Premium Parts! Gostaria de consultar uma peça.',
};

const root = document.documentElement;
const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
const trackMQ = matchMedia('(min-width: 900px) and (min-aspect-ratio: 1/1)');

const track = document.querySelector('[data-track]');
const rail = document.querySelector('[data-rail]');
const panels = [...document.querySelectorAll('[data-panel]')];
const zones = [...document.querySelectorAll('[data-zone]')];
const parallax = [...document.querySelectorAll('[data-parallax]')];
const specRows = [...document.querySelectorAll('[data-spec] .spec__row')];
const lap = document.querySelector('[data-lap]');
const lapPct = document.querySelector('[data-lap-pct]');
const lapLinks = [...document.querySelectorAll('[data-lap-link]')];
const navLinks = [...document.querySelectorAll('.site-nav a')];
const flags = [document.querySelector('[data-flag] svg')];
const finish = document.getElementById('bandeirada');

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

let isTrack = false;
let vw = 0, vh = 0, maxScroll = 1;
let trackTop = 0, dist = 0;
let railX = 0;          // posição exibida (amortecida)
let rafId = 0, lastT = 0;

function setMode() {
  isTrack = trackMQ.matches && !reduceMQ.matches;
  root.classList.toggle('is-track', isTrack);
}

function measure() {
  setMode();
  vw = root.clientWidth; vh = innerHeight;
  root.style.setProperty('--vw', `${vw}px`);
  if (isTrack) {
    rail.style.setProperty('--rail-x', '0px');
    dist = Math.max(0, rail.scrollWidth - vw);
    track.style.setProperty('--track-h', `${dist + vh}px`);
    // a faixa de luz da foto (62,7% da altura da imagem) vira a linha da pista: mesma altura em todos os painéis
    const hero = document.querySelector('[data-hero-img]');
    const ew = hero.offsetWidth, eh = hero.offsetHeight;
    const rh = 941 * Math.max(ew / 1672, eh / 941);
    const lineY = (eh - rh) / 2 + .627 * rh;
    rail.style.setProperty('--line-y', `${lineY.toFixed(1)}px`);
    // o bloco da largada termina logo acima da linha: ela sublinha o CTA como no logo
    const headerH = parseFloat(getComputedStyle(root).getPropertyValue('--header-h')) || 68;
    const room = lineY - 30 - (headerH + 20);   // espaço entre o cabeçalho e a linha de luz
    for (const pn of panels) {
      const copy = pn.querySelector('.panel__copy');
      pn.classList.remove('is-compact', 'is-compact-2');
      if (copy.offsetHeight > room) pn.classList.add('is-compact');
      if (copy.offsetHeight > room) pn.classList.add('is-compact-2');
      copy.style.setProperty('--copy-top', `${Math.max(headerH + 20, lineY - 30 - copy.offsetHeight).toFixed(0)}px`);
    }
  } else {
    dist = 0;
    panels.forEach((pn) => { pn.classList.remove('is-compact', 'is-compact-2'); pn.querySelector('.panel__copy').style.removeProperty('--copy-top'); });
    parallax.forEach((img) => { img.style.transform = ''; });   // sem deslocamentos herdados da pista
    track.style.removeProperty('--track-h');
    rail.style.removeProperty('--rail-x');
  }
  trackTop = track.getBoundingClientRect().top + scrollY;
  maxScroll = Math.max(1, root.scrollHeight - vh);
  railX = targetX();
}

const targetX = () => (isTrack ? clamp(scrollY - trackTop, 0, dist) : 0);

/* ---------------- Quadro a quadro ---------------- */
function render(t) {
  rafId = 0;
  const dt = lastT ? Math.min(64, t - lastT) : 16;
  lastT = t;
  const target = targetX();
  if (reduceMQ.matches) railX = target;
  else railX += (target - railX) * (1 - Math.exp(-dt / 120));
  if (Math.abs(target - railX) < .3) railX = target;

  if (isTrack) {
    rail.style.setProperty('--rail-x', `${(-railX).toFixed(1)}px`);
    // parallax: a foto anda mais devagar que a janela
    for (const img of parallax) {
      const win = img.closest('[data-window]');
      if (win.classList.contains('window--hero')) { img.style.transform = `translate3d(${(railX / vw * 4).toFixed(2)}%, 0, 0)`; continue; }
      const r = win.getBoundingClientRect();
      const off = (r.left + r.width / 2 - vw / 2) / vw;
      img.style.transform = `translate3d(${(off * -9).toFixed(2)}%, 0, 0)`;
    }
    // ficha do setor 1: linhas acendem conforme o painel chega
    const p1 = panels[1];
    const f = (railX - (p1.offsetLeft - vw * .7)) / (vw * .7);
    specRows.forEach((row, i) => row.classList.toggle('is-on', f > .25 + i * .22));
  } else if (!reduceMQ.matches) {
    for (const img of parallax) {
      const r = img.closest('[data-window]').getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) continue;
      const off = (r.top + r.height / 2 - vh / 2) / vh;
      img.style.transform = `translate3d(0, ${(off * -6).toFixed(2)}%, 0)`;
    }
  }

  // bandeira quadriculada corre conforme a página termina
  if (!reduceMQ.matches) {
    const fr = finish.getBoundingClientRect();
    if (fr.top < vh) {
      const d = (vh - fr.top) * .25;
      flags[0].style.setProperty('--flag-x', `${(-(d % 32)).toFixed(1)}px`);
    }
  }

  if (railX !== target) rafId = requestAnimationFrame(render);
  else lastT = 0;
}
function wake() { if (!rafId) rafId = requestAnimationFrame(render); }

/* ---------------- Volta e navegação ativa ---------------- */
let activeKey = '';
function onScroll() {
  const y = scrollY;
  const p = clamp(y / maxScroll, 0, 1);
  lap.style.setProperty('--lap', p.toFixed(4));
  lapPct.textContent = `${Math.round(p * 100)}%`;

  let key = 'largada';
  if (isTrack && y < trackTop + dist + vh * .5) {
    const x = targetX() + vw * .45;
    panels.forEach((pn) => { if (pn.offsetLeft <= x) key = pn.id; });
  } else {
    const probe = y + vh * .45;
    [...panels, ...zones].forEach((el) => { if (el.getBoundingClientRect().top + y <= probe) key = el.id; });
  }
  if (y >= maxScroll - 2) key = 'bandeirada';
  if (key !== activeKey) {
    activeKey = key;
    const order = ['largada', 'setor-1', 'setor-2', 'box', 'bandeirada'];
    const idx = order.indexOf(key === 'reta' ? 'setor-2' : key);
    lapLinks.forEach((a, i) => {
      if (i === idx) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      a.classList.toggle('is-past', i < idx);
    });
    navLinks.forEach((a) => {
      const h = a.getAttribute('href').slice(1);
      const on = h === key || (h === 'setor-1' && (key === 'setor-2' || key === 'reta'));
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  }
  if (!isTrack && specRows.length) {
    const r = specRows[0].closest('[data-spec]').getBoundingClientRect();
    specRows.forEach((row, i) => row.classList.toggle('is-on', reduceMQ.matches || r.top < vh * (.82 - i * .08)));
  }
  wake();
}

/* ---------------- Âncoras: a pista sabe onde cada painel está ---------------- */
function goTo(id, focus = false) {
  const el = document.getElementById(id);
  if (!el) return;
  const panel = el.closest('[data-panel]');
  let y;
  if (panel && isTrack) y = trackTop + Math.min(panel.offsetLeft, dist);
  else if (id === 'largada') y = 0;
  else {
    const headerH = parseFloat(getComputedStyle(root).getPropertyValue('--header-h')) || 64;
    y = el.getBoundingClientRect().top + scrollY - (el.id === 'box' || el.id === 'bandeirada' ? 0 : headerH);
  }
  scrollTo({ top: y, behavior: reduceMQ.matches ? 'auto' : 'smooth' });
  history.replaceState(null, '', `#${id}`);
  if (focus) {
    const target = el.querySelector('h1, h2') || el;
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a || a.getAttribute('href').length < 2) return;
  const id = a.getAttribute('href').slice(1);
  if (!document.getElementById(id)) return;
  e.preventDefault();
  goTo(id, true);
});
// teclado: ao focar algo num painel fora da tela, a pista leva até ele
rail.addEventListener('focusin', (e) => {
  if (!isTrack) return;
  const panel = e.target.closest('[data-panel]');
  if (!panel) return;
  const r = e.target.getBoundingClientRect();
  const xInRail = r.left - rail.getBoundingClientRect().left;   // posição do elemento na pista inteira
  const want = panel.offsetWidth <= vw + 2 ? panel.offsetLeft : xInRail - vw / 2 + r.width / 2;
  const y = trackTop + clamp(Math.round(want), 0, dist);
  if (Math.abs(scrollY - y) > 4) { scrollTo({ top: y, behavior: 'auto' }); railX = targetX(); rail.style.setProperty('--rail-x', `${(-railX).toFixed(1)}px`); }
  // o navegador rola sozinho a área da pista para mostrar o foco; a pista controla isso
  const vp = rail.parentElement;
  vp.scrollLeft = 0;
  requestAnimationFrame(() => { vp.scrollLeft = 0; });
});
rail.parentElement.addEventListener('scroll', (e) => { if (isTrack && e.target.scrollLeft) e.target.scrollLeft = 0; });

/* ---------------- Menu ---------------- */
function setupMenu() {
  const toggle = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-menu]');
  const close = menu.querySelector('[data-menu-close]');
  let lastFocus = null;
  const focusables = () => [...menu.querySelectorAll('a, button')];
  function open() {
    lastFocus = document.activeElement;
    menu.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    root.style.overflow = 'hidden';
    close.focus();
    document.addEventListener('keydown', onKey);
  }
  function shut(restore = true) {
    menu.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    root.style.overflow = '';
    document.removeEventListener('keydown', onKey);
    if (restore && lastFocus) lastFocus.focus();
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); shut(); return; }
    if (e.key !== 'Tab') return;
    const f = focusables(); const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  toggle.addEventListener('click', open);
  close.addEventListener('click', () => shut());
  menu.addEventListener('click', (e) => {
    if (e.target === menu) shut();
    else if (e.target.closest('a[href^="#"]')) shut(false);
  }, true);
  addEventListener('resize', () => { if (!menu.hidden && innerWidth > 1100) shut(false); });
}

/* ---------------- Consulta ---------------- */
function setupConsult() {
  const form = document.querySelector('[data-consult]');
  const summary = form.querySelector('[data-summary]');
  const status = form.querySelector('[data-status]');
  const copyLabel = form.querySelector('[data-copy-label]');
  const copyIcon = form.querySelector('[data-copy] use');
  const wa = form.querySelector('[data-whatsapp]');
  const F = {
    veiculo: form.querySelector('#c-veiculo'),
    ano: form.querySelector('#c-ano'),
    versao: form.querySelector('#c-versao'),
    peca: form.querySelector('#c-peca'),
  };
  const LABELS = { veiculo: 'Veículo', ano: 'Ano', versao: 'Versão', peca: 'Peça' };
  const clean = (v) => v.replace(/\s+/g, ' ').trim();
  const maxYear = new Date().getFullYear() + 1;
  const anoErr = document.getElementById('c-ano-erro');
  if (anoErr) anoErr.textContent = `Informe um ano entre 1950 e ${maxYear}, com quatro dígitos.`;
  const rules = {
    veiculo: (v) => v.length >= 2,
    ano: (v) => /^\d{4}$/.test(v) && +v >= 1950 && +v <= maxYear,
    peca: (v) => v.length >= 2,
  };

  function message() {
    const lines = [CONFIG.saudacao];
    for (const k of Object.keys(F)) {
      const v = clean(F[k].value);
      if (v) lines.push(`${LABELS[k]}: ${v}`);
    }
    return lines.join('\n');
  }

  function render() {
    summary.textContent = CONFIG.saudacao;
    for (const k of Object.keys(F)) {
      const v = clean(F[k].value);
      summary.append('\n');
      const line = document.createElement('span');
      if (v) line.textContent = `${LABELS[k]}: ${v}`;
      else { line.textContent = `${LABELS[k]}: ${k === 'versao' ? '(opcional)' : '____'}`; line.className = 'is-empty'; }
      summary.append(line);
    }
    if (CONFIG.whatsapp) wa.href = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(message())}`;
  }

  function setError(k, bad) {
    const input = F[k];
    const err = document.getElementById(input.getAttribute('aria-describedby'));
    if (bad) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    if (err) err.hidden = !bad;
  }
  function validate() {
    let firstBad = null;
    for (const k of Object.keys(rules)) {
      const bad = !rules[k](clean(F[k].value));
      setError(k, bad);
      if (bad && !firstBad) firstBad = F[k];
    }
    return firstBad;
  }
  function say(text, kind = '') { status.className = `ticket__status${kind ? ` is-${kind}` : ''}`; status.textContent = text; }

  F.ano.addEventListener('input', () => {
    const digits = F.ano.value.replace(/\D/g, '').slice(0, 4);
    if (digits !== F.ano.value) F.ano.value = digits;
  });
  Object.entries(F).forEach(([k, input]) => {
    input.addEventListener('input', () => {
      render();
      if (input.getAttribute('aria-invalid') === 'true' && rules[k]?.(clean(input.value))) setError(k, false);
      say('');
    });
    input.addEventListener('blur', () => { if (rules[k] && input.value && !rules[k](clean(input.value))) setError(k, true); });
  });

  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
    } catch { /* tenta o método antigo */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
      document.body.append(ta); ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch { return false; }
  }

  let resetTimer = 0;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bad = validate();
    if (bad) { bad.focus(); say('Confira os campos destacados para montar a ficha.', 'error'); return; }
    if (await copyText(message())) {
      say(CONFIG.whatsapp ? 'Ficha copiada. Cole e envie na conversa com a loja.' : 'Ficha copiada. Cole e envie no Direct do Instagram da loja.', 'ok');
      copyIcon.setAttribute('href', '#i-check');
      copyLabel.textContent = 'Ficha copiada';
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => { copyIcon.setAttribute('href', '#i-copy'); copyLabel.textContent = 'Copiar consulta'; }, 2600);
    } else {
      const range = document.createRange(); range.selectNodeContents(summary);
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
      say('Não foi possível copiar automaticamente. A ficha está selecionada: copie com Ctrl+C ou toque e segure.');
    }
  });

  if (CONFIG.whatsapp) {
    wa.hidden = false;
    wa.addEventListener('click', (e) => {
      const bad = validate();
      if (bad) { e.preventDefault(); bad.focus(); say('Confira os campos destacados para montar a ficha.', 'error'); }
    });
  }
  render();
}

/* ---------------- Entrada ---------------- */
// Só existe se o <head> marcou has-intro (JS ativo, sem movimento reduzido, primeira vez na sessão).
// O conteúdo já está no DOM; a entrada dura ~1,7 s e qualquer interação a encerra na hora.
function setupIntro() {
  const ready = () => requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));
  const intro = document.querySelector('[data-intro]');
  if (intro && location.hash.length > 1) root.classList.remove('has-intro');   // link direto: vai ao destino sem entrada
  if (!intro || !root.classList.contains('has-intro')) { intro?.remove(); ready(); return; }
  // a linha da entrada nasce na mesma altura da linha da pista, para virar a própria linha da página
  const ly = getComputedStyle(rail).getPropertyValue('--line-y');
  if (ly) intro.style.setProperty('--intro-line', ly.trim());
  try { sessionStorage.setItem('pp-intro', '1'); } catch { /* sem armazenamento: mostra de novo na próxima visita */ }
  let done = false;
  const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
  function leave() {
    if (done) return;
    done = true;
    events.forEach((ev) => removeEventListener(ev, leave));
    intro.classList.add('is-leaving');
    root.classList.add('is-ready');          // a largada acende enquanto a tela sai
    setTimeout(() => { root.classList.remove('has-intro'); intro.remove(); measure(); onScroll(); }, 620);
  }
  events.forEach((ev) => addEventListener(ev, leave, { passive: true }));
  setTimeout(leave, 1350);
}

/* ---------------- Início ---------------- */
function init() {
  setupMenu();
  setupConsult();
  measure();
  onScroll();
  render(performance.now());
  setupIntro();

  addEventListener('scroll', onScroll, { passive: true });
  let rt = 0;
  const onResize = () => {
    cancelAnimationFrame(rt);
    rt = requestAnimationFrame(() => {
      const ratio = scrollY / maxScroll;
      const wasTrack = isTrack;
      measure();
      if (wasTrack !== isTrack) scrollTo({ top: ratio * maxScroll, behavior: 'auto' });
      activeKey = ''; onScroll();
    });
  };
  addEventListener('resize', onResize);
  trackMQ.addEventListener('change', onResize);
  reduceMQ.addEventListener('change', onResize);
  addEventListener('load', onResize);
  document.fonts?.ready.then(onResize);
  // chegada por link com âncora (#box etc.)
  if (location.hash.length > 1) addEventListener('load', () => setTimeout(() => goTo(location.hash.slice(1)), 60), { once: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden && rafId) { cancelAnimationFrame(rafId); rafId = 0; lastT = 0; } else wake(); });
}

init();
