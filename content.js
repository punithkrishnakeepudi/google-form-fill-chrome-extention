// Words that map a question title to one of the basic profile fields.
const ALIASES = {
  name: ['name', 'full name', 'your name', 'student name'],
  phone: ['phone', 'mobile', 'contact', 'whatsapp', 'phone number', 'mobile number'],
  email: ['email', 'e mail', 'mail', 'gmail', 'email address', 'mail id'],
  college: ['college', 'university', 'institute', 'school', 'college name'],
  class: ['class', 'year', 'semester', 'standard', 'course'],
};
// Someone else's details, or a second one of yours: never guess these from an alias.
const SOMEONE_ELSE = /\b(father|mother|parent|guardian|spouse|sibling|brother|sister|friend|referee|reference|teacher|faculty|mentor|hod|principal|emergency|alternate|alternative|second|secondary|other|team|teammate|partner|member|nominee|manager|previous|school name)\b/;

const norm = s => String(s).toLowerCase().replace(/[^a-z0-9@.+ ]/g, ' ').replace(/\s+/g, ' ').trim();
const FILLER = new Set(['of', 'the', 'a', 'an', 'your', 'my', 'please', 'enter', 'in', 'is']);
const SHORT_FOR = { no: 'number', nos: 'number', num: 'number', mob: 'mobile', yr: 'year', dept: 'department' };
const words = t => [...new Set(norm(t).split(/[^a-z0-9@+]+/).filter(Boolean).map(w => SHORT_FOR[w] ?? w).filter(w => !FILLER.has(w)))];
const covers = (a, b) => a.length && a.every(w => b.includes(w));

// A learned answer should also fit the same question worded differently:
// "roll number" answers "Your Roll No.". Only learned keys, never the broad
// built-in ones, and the title may add at most one word of its own — so
// "campus" answers "Your campus" but not "Interested in campus placement?".
function learnedKey(title, profile) {
  const tw = words(title);
  let best = null, len = 0;
  for (const key of Object.keys(profile)) {
    if (key in ALIASES) continue;
    const kw = words(key);
    if ((covers(kw, tw) && tw.length <= kw.length + 1 || covers(tw, kw)) && kw.length > len) { best = key; len = kw.length; }
  }
  return best;
}
const same = (a, b) => JSON.stringify([].concat(a).map(norm).sort()) === JSON.stringify([].concat(b).map(norm).sort());
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Exact saved question wins, else the longest alias found in the title.
function findKey(title, profile) {
  const t = norm(title);
  if (t in profile) return t;
  if (SOMEONE_ELSE.test(t)) return null;
  // A specific learned key beats a broad alias: "College Roll Number" is the roll number.
  const learned = learnedKey(t, profile);
  if (learned) return learned;
  let best = null, len = 0;
  for (const [key, words] of Object.entries(ALIASES))
    for (const w of words) if (w.length > len && new RegExp(`\\b${w}\\b`).test(t)) { best = key; len = w.length; }
  return best;
}

// --- Google Forms DOM ---
const questions = () => [...document.querySelectorAll('[role="listitem"]')].filter(q => q.querySelector('[role="heading"]'));
const title = q => q.querySelector('[role="heading"]').innerText.split('\n')[0];
const label = o => o.getAttribute('data-value') ?? o.getAttribute('data-answer-value') ?? o.getAttribute('aria-label') ?? '';
const checked = o => o.getAttribute('aria-checked') === 'true';
const optionsOf = el => [...el.querySelectorAll('[role="radio"],[role="checkbox"]')];
const listboxOf = el => el.querySelector('[role="listbox"]');
const boxOf = el => el.querySelector('input[type="text"],input[type="email"],input[type="tel"],input[type="url"],input[type="number"],input[type="date"],input[type="time"],textarea');
// A grid row carries its own label; a plain choice question has only one such group.
const rowsOf = q => [...q.querySelectorAll('[role="radiogroup"],[role="group"]')]
  .filter(r => r.getAttribute('aria-label') && optionsOf(r).length);

// Each answerable part of a question: one per grid row, otherwise the question itself.
function units(q) {
  const t = title(q), rows = rowsOf(q);
  return rows.length > 1 ? rows.map(r => ({ key: `${t} - ${r.getAttribute('aria-label')}`, el: r })) : [{ key: t, el: q }];
}

function answer(el) {
  const opts = optionsOf(el);
  if (opts.length) {
    const on = opts.filter(checked).map(label);
    return opts[0].getAttribute('role') === 'radio' ? on[0] || '' : on;
  }
  const lb = listboxOf(el);
  if (lb) return label([...lb.querySelectorAll('[role="option"]')].find(o => o.getAttribute('aria-selected') === 'true') ?? lb);
  const box = boxOf(el);
  return box ? box.value.trim() : '';
}

async function fill(el, value) {
  const opts = optionsOf(el);
  if (opts.length) {
    const want = [].concat(value).map(norm);
    let hit = false;
    for (const o of opts) {
      const wanted = want.includes(norm(label(o)));
      hit ||= wanted;
      // Radios can only be turned on; checkboxes are toggled to match the saved list.
      if (wanted ? !checked(o) : checked(o) && o.getAttribute('role') === 'checkbox') o.click();
    }
    return hit;
  }
  const lb = listboxOf(el);
  if (lb) {
    const want = norm([].concat(value)[0]);
    if (same(answer(el), want)) return true;
    lb.click();
    // The open dropdown is rendered outside the question, so search the whole page.
    await sleep(250);
    const opt = [...document.querySelectorAll('[role="option"]')].find(o => norm(label(o)) === want);
    if (opt) opt.click();
    else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    return !!opt;
  }
  const box = boxOf(el);
  if (!box) return false;
  // Use the native setter so Google Forms' own listeners see the change.
  Object.getOwnPropertyDescriptor(Object.getPrototypeOf(box), 'value').set.call(box, [].concat(value).join(', '));
  box.dispatchEvent(new Event('input', { bubbles: true }));
  box.dispatchEvent(new Event('change', { bubbles: true }));
  return box.value !== '';
}

const getProfile = async () => (await chrome.storage.local.get('profile')).profile || {};
const signature = () => questions().map(title).join('|');
let lastSignature = null;

async function run() {
  const profile = await getProfile();
  let filled = 0;
  const missing = [];
  for (const q of questions()) for (const u of units(q)) {
    const key = findKey(u.key, profile);
    const v = key && profile[key];
    if (v && v.length && await fill(u.el, v)) filled++;
    // A saved answer that matched no option still needs you, so show its value too.
    else missing.push({ key: key || norm(u.key), title: u.key, value: [].concat(v || '').join('; ') });
  }
  listen();
  lastSignature = signature();
  return { filled, missing };
}

function listen() {
  if (lastSignature !== null) return;
  document.addEventListener('change', e => e.target.matches?.('input,textarea') && offerSave(e.target), true);
  document.addEventListener('click', e => {
    const o = e.target.closest?.('[role="radio"],[role="checkbox"],[role="option"]');
    // Let Google Forms update aria-checked/aria-selected before reading the answer.
    if (o) setTimeout(() => offerSave(o), 150);
  }, true);
  // A later page of the form replaces the questions in place, so fill it too.
  let timer;
  new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(() => signature() !== lastSignature && run(), 400);
  }).observe(document.body, { childList: true, subtree: true });
}

// --- Ask before saving a new or changed answer ---
function unitOf(target) {
  // An open dropdown sits outside its question, so fall back to the one being edited.
  const q = target.closest('[role="listitem"]')
    ?? questions().find(q => listboxOf(q)?.getAttribute('aria-expanded') === 'true');
  return q && units(q).find(u => u.el.contains(target) || u.el === q);
}

async function offerSave(target) {
  const u = unitOf(target);
  if (!u) return;
  const profile = await getProfile();
  const key = findKey(u.key, profile) || norm(u.key), val = answer(u.el);
  const old = document.querySelector(`[data-formfill-key="${CSS.escape(key)}"]`);
  if (!val.length || same(val, profile[key] ?? '')) return old?.remove();
  toast(old, key, u.key, val);
}

function toast(box, key, title, val) {
  let wrap = document.getElementById('formfill-toasts');
  if (!wrap) {
    wrap = Object.assign(document.createElement('div'), { id: 'formfill-toasts' });
    wrap.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:99999;display:flex;flex-direction:column;gap:8px;max-width:320px;font:14px sans-serif';
    document.body.append(wrap);
  }
  if (!box) {
    box = document.createElement('div');
    box.dataset.formfillKey = key;
    box.setAttribute('role', 'status');
    box.style.cssText = 'background:#fff;color:#202124;border:1px solid #673ab7;border-radius:8px;padding:10px;box-shadow:0 2px 8px #0003';
    wrap.append(box);
  }
  box.replaceChildren();
  const msg = document.createElement('div');
  msg.textContent = `Save answer for "${title}"? → ${[].concat(val).join(', ')}`;
  const yes = Object.assign(document.createElement('button'), { textContent: 'Save' });
  const no = Object.assign(document.createElement('button'), { textContent: 'No' });
  for (const b of [yes, no]) b.style.cssText = 'margin:8px 8px 0 0;padding:4px 12px;cursor:pointer';
  yes.onclick = async () => {
    const profile = await getProfile();
    profile[key] = val;
    await chrome.storage.local.set({ profile });
    box.remove();
  };
  no.onclick = () => box.remove();
  box.append(msg, yes, no);
}

if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
    if (msg === 'fill') { run().then(reply); return true; }
  });
}
if (typeof module !== 'undefined') module.exports = { norm, same, findKey };
