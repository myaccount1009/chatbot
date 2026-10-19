const SUPABASE_URL = 'https://tuhkjwcdjjfgzlxqkxth.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_f5YVdM2TTbm8ehmstnvAgw_K5NQF5n-';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = (id) => document.getElementById(id);
const esc = (t = '') => String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STATUS = ['জমা হয়েছে', 'যাচাই চলছে', 'গৃহীত', 'বাতিল'];
const fmt = (d) => new Date(d).toLocaleDateString('bn-BD');

async function init() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return showLogin();
  const { data: ok } = await sb.rpc('is_admin');
  if (!ok) { await sb.auth.signOut(); return showLogin('এই অ্যাকাউন্টে অ্যাডমিন অনুমতি নেই।'); }
  $('loginForm').hidden = true; $('panel').hidden = false; $('logout').hidden = false;
  loadJobs();
}
function showLogin(msg = '') {
  $('loginForm').hidden = false; $('panel').hidden = true; $('logout').hidden = true;
  $('loginMsg').textContent = msg;
}

$('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const { error } = await sb.auth.signInWithPassword({ email: $('email').value, password: $('pass').value });
  if (error) return showLogin('ইমেইল বা পাসওয়ার্ড ভুল।');
  init();
});
$('logout').addEventListener('click', async () => { await sb.auth.signOut(); showLogin(); });

$('tabs').addEventListener('click', e => {
  const b = e.target.closest('.chip'); if (!b) return;
  document.querySelectorAll('#tabs .chip').forEach(x => x.setAttribute('aria-pressed', x === b));
  ['add', 'jobs', 'japps', 'sapps'].forEach(t => $('t-' + t).hidden = t !== b.dataset.t);
  if (b.dataset.t === 'jobs') loadJobs();
  if (b.dataset.t === 'japps') loadJobApps();
  if (b.dataset.t === 'sapps') loadServiceApps();
});

$('jobAdd').addEventListener('submit', async e => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  f.vacancies = Number(f.vacancies) || 1;
  const { error } = await sb.from('jobs').insert(f);
  const m = $('addMsg');
  if (error) { m.className = 'result err'; m.textContent = 'প্রকাশ হয়নি: ' + error.message; return; }
  m.className = 'result ok'; m.textContent = 'নিয়োগ বিজ্ঞপ্তি প্রকাশ হয়েছে।';
  e.target.reset();
});

async function loadJobs() {
  const { data, error } = await sb.from('jobs').select('*').order('created_at', { ascending: false });
  if (error) { $('jobsTbl').textContent = 'লোড হয়নি।'; return; }
  $('jobsTbl').innerHTML = `<table><tr><th>পদ</th><th>প্রতিষ্ঠান</th><th>শেষ তারিখ</th><th>চালু</th><th></th></tr>` +
    data.map(j => `<tr><td>${esc(j.title)}</td><td>${esc(j.organization)}</td><td>${fmt(j.deadline)}</td>
      <td><input type="checkbox" data-open="${j.id}" ${j.is_open ? 'checked' : ''} style="width:auto"></td>
      <td><button class="btn danger" data-del="${j.id}">মুছুন</button></td></tr>`).join('') + '</table>';
}
$('jobsTbl').addEventListener('change', async e => {
  if (e.target.dataset.open) await sb.from('jobs').update({ is_open: e.target.checked }).eq('id', e.target.dataset.open);
});
$('jobsTbl').addEventListener('click', async e => {
  const id = e.target.dataset.del; if (!id) return;
  if (!confirm('এই নিয়োগ বিজ্ঞপ্তি মুছে ফেলবেন? এর আবেদনগুলোও মুছে যেতে পারে।')) return;
  const { error } = await sb.from('jobs').delete().eq('id', id);
  if (error) alert('মোছা যায়নি। আবেদন থাকলে "চালু" টিক তুলে বন্ধ করুন।'); else loadJobs();
});

const statusSel = (table, id, cur) =>
  `<select data-table="${table}" data-id="${id}">${STATUS.map(s => `<option ${s === cur ? 'selected' : ''}>${s}</option>`).join('')}</select>`;

async function loadJobApps() {
  const { data, error } = await sb.from('job_applications').select('*, jobs(title)').order('created_at', { ascending: false });
  if (error) { $('japps').textContent = 'লোড হয়নি।'; return; }
  $('japps').innerHTML = data.length ? `<table><tr><th>কোড</th><th>পদ</th><th>নাম</th><th>মোবাইল</th><th>ইমেইল</th><th>যোগ্যতা</th><th>সিভি</th><th>তারিখ</th><th>অবস্থা</th></tr>` +
    data.map(a => `<tr><td>${esc(a.tracking_code)}</td><td>${esc(a.jobs?.title)}</td><td>${esc(a.name)}</td><td>${esc(a.phone)}</td><td>${esc(a.email)}</td><td>${esc(a.education)}</td>
      <td>${/^https?:\/\//.test(a.cv_link || '') ? `<a href="${esc(a.cv_link)}" target="_blank" rel="noopener">দেখুন</a>` : '-'}</td>
      <td>${fmt(a.created_at)}</td><td>${statusSel('job_applications', a.id, a.status)}</td></tr>`).join('') + '</table>' : '<p>কোনো আবেদন নেই।</p>';
}
async function loadServiceApps() {
  const { data, error } = await sb.from('applications').select('*, services(name)').order('created_at', { ascending: false });
  if (error) { $('sapps').textContent = 'লোড হয়নি।'; return; }
  $('sapps').innerHTML = data.length ? `<table><tr><th>কোড</th><th>সেবা</th><th>নাম</th><th>মোবাইল</th><th>এনআইডি</th><th>তথ্য</th><th>তারিখ</th><th>অবস্থা</th></tr>` +
    data.map(a => `<tr><td>${esc(a.tracking_code)}</td><td>${esc(a.services?.name)}</td><td>${esc(a.name)}</td><td>${esc(a.phone)}</td><td>${esc(a.nid)}</td><td>${esc(a.details)}</td>
      <td>${fmt(a.created_at)}</td><td>${statusSel('applications', a.id, a.status)}</td></tr>`).join('') + '</table>' : '<p>কোনো আবেদন নেই।</p>';
}
document.addEventListener('change', async e => {
  const s = e.target; if (s.tagName !== 'SELECT' || !s.dataset.table) return;
  const { error } = await sb.from(s.dataset.table).update({ status: s.value }).eq('id', s.dataset.id);
  if (error) alert('অবস্থা বদলানো যায়নি।');
});

init();
