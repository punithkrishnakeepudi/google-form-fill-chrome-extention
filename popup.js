const DEFAULTS = ['name', 'phone', 'email', 'college', 'class'];
// Keys are stored normalised, the way content.js looks a question title up.
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9@.+ ]/g, ' ').replace(/\s+/g, ' ').trim();
const $ = id => document.getElementById(id);

function say(text, tone = '') {
  $('sub').textContent = text;
  $('sub').className = tone;
}

function row(parent, { key, title, value = '' }) {
  const wrap = document.createElement('div');
  wrap.className = 'row';
  const lab = document.createElement('label');
  lab.className = 'lab';
  if (key) {
    wrap.dataset.key = key;
    lab.append(title ?? key);
  } else {
    lab.append(Object.assign(document.createElement('input'), { className: 'key', placeholder: 'Question' }));
  }
  lab.append(Object.assign(document.createElement('input'), { className: 'val', placeholder: 'Answer', value }));
  wrap.append(lab);
  parent.append(wrap);
  return wrap;
}

function collect() {
  const profile = {};
  // "Needs an answer" is read last so a fresh answer wins over the stale saved one.
  for (const box of [$('fields'), $('extra'), $('missing')]) for (const r of box.querySelectorAll('.row')) {
    const key = norm(r.dataset.key ?? r.querySelector('.key').value);
    const raw = r.querySelector('.val').value.trim();
    if (!key || (!raw && !DEFAULTS.includes(key))) continue;
    profile[key] = raw.includes(';') ? raw.split(';').map(s => s.trim()).filter(Boolean) : raw;
  }
  return profile;
}

async function load() {
  const { profile = {} } = await chrome.storage.local.get('profile');
  const keys = [...new Set([...DEFAULTS, ...Object.keys(profile)])];
  $('fields').replaceChildren();
  $('extra').replaceChildren();
  for (const key of keys) row($('fields'), { key, value: [].concat(profile[key] ?? '').join('; ') });
  $('n-fields').textContent = keys.filter(k => profile[k]?.length).length;
}

async function fillNow() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let r;
  try {
    try {
      r = await chrome.tabs.sendMessage(tab.id, 'fill');
    } catch {
      // Form was already open when the extension was installed or updated.
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
      r = await chrome.tabs.sendMessage(tab.id, 'fill');
    }
  } catch {
    return say('Open a Google Form to fill it.');
  }
  $('missing').replaceChildren();
  $('missing-sec').hidden = !r.missing.length;
  $('n-missing').textContent = r.missing.length;
  // Keep the questions this form is waiting on in view.
  $('mine').open = !r.missing.length;
  for (const m of r.missing) row($('missing'), m);
  if (!r.missing.length) say(`Filled all ${r.filled} questions.`, 'ok');
  else say(`Filled ${r.filled} · ${r.missing.length} still need you.`, 'warn');
}

$('add').onclick = () => row($('extra'), {}).querySelector('.key').focus();
$('save').onclick = async () => {
  await chrome.storage.local.set({ profile: collect() });
  await load();
  await fillNow();
};
$('copy').onclick = async () => {
  await navigator.clipboard.writeText(JSON.stringify(collect(), null, 2));
  say('Copied to clipboard.', 'ok');
};

load().then(fillNow);
