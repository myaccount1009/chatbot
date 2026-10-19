// ====== Supabase setting: Project Settings > API theke copy korun ======
const SUPABASE_URL = 'https://tuhkjwcdjjfgzlxqkxth.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_f5YVdM2TTbm8ehmstnvAgw_K5NQF5n-';
// =======================================================================

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = (id) => document.getElementById(id);
let services = [], activeCat = 'সব', current = null;

async function loadServices() {
  const { data, error } = await sb.from('services').select('*').order('id');
  if (error) { $('list').innerHTML = `<p class="empty">সেবার তালিকা লোড হয়নি। Supabase সেটিং ঠিক আছে কিনা দেখুন।</p>`; return; }
  services = data;
  renderChips(); renderList();
}

function renderChips() {
  const cats = ['সব', ...new Set(services.map(s => s.category))];
  $('chips').innerHTML = cats.map(c =>
    `<button class="chip" aria-pressed="${c === activeCat}" data-c="${c}">${c}</button>`).join('');
}

function renderList() {
  const q = $('q').value.trim().toLowerCase();
  const rows = services.filter(s =>
    (activeCat === 'সব' || s.category === activeCat) &&
    (!q || (s.name + s.description).toLowerCase().includes(q)));
  $('list').innerHTML = rows.length ? rows.map(s => `
    <article class="card">
      <h3>${esc(s.name)}</h3>
      <p>${esc(s.description)}</p>
      <div class="facts">ফি: ${esc(s.fee)} · সময়: ${esc(s.days)}<br>অফিস: ${esc(s.office)}</div>
      <button class="btn" data-id="${s.id}">আবেদন করুন</button>
    </article>`).join('') : `<p class="empty">কোনো সেবা পাওয়া যায়নি।</p>`;
}

function esc(t = '') { return String(t).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

$('chips').addEventListener('click', e => {
  const b = e.target.closest('.chip'); if (!b) return;
  activeCat = b.dataset.c; renderChips(); renderList();
});
$('q').addEventListener('input', renderList);

$('list').addEventListener('click', e => {
  const b = e.target.closest('button[data-id]'); if (!b) return;
  current = services.find(s => s.id == b.dataset.id);
  $('dlgTitle').textContent = current.name;
  $('dlgMeta').textContent = `ফি: ${current.fee} · সময়: ${current.days}`;
  $('applyForm').reset(); $('applyMsg').textContent = ''; $('applyMsg').className = 'result';
  $('dlg').showModal();
});
$('cancel').addEventListener('click', () => $('dlg').close());

$('applyForm').addEventListener('submit', async e => {
  e.preventDefault();
  const f = new FormData(e.target), msg = $('applyMsg'), btn = $('submitBtn');
  btn.disabled = true; msg.className = 'result'; msg.textContent = 'জমা হচ্ছে...';
  const { data, error } = await sb.rpc('submit_application', {
    p_service: current.id, p_name: f.get('name'), p_phone: f.get('phone'),
    p_nid: f.get('nid'), p_details: f.get('details')
  });
  btn.disabled = false;
  if (error) { msg.className = 'result err'; msg.textContent = 'আবেদন জমা হয়নি। আবার চেষ্টা করুন।'; return; }
  msg.className = 'result ok';
  msg.textContent = `আবেদন জমা হয়েছে। আপনার ট্র্যাকিং কোড: ${data} (এটি সংরক্ষণ করুন)`;
});

$('trackForm').addEventListener('submit', async e => {
  e.preventDefault();
  const out = $('trackResult'); out.className = 'result'; out.textContent = 'খোঁজা হচ্ছে...';
  const { data, error } = await sb.rpc('track_application', { p_code: $('code').value });
  if (error || !data.length) { out.className = 'result err'; out.textContent = 'এই কোডে কোনো আবেদন পাওয়া যায়নি।'; return; }
  const r = data[0];
  out.className = 'result ok';
  out.textContent = `${r.service} — অবস্থা: ${r.status} (জমা: ${new Date(r.created_at).toLocaleDateString('bn-BD')})`;
});

// ===== নিয়োগ =====
let jobs = [], currentJob = null;
const bn = (d) => new Date(d).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' });

async function loadJobs() {
  const { data, error } = await sb.from('jobs').select('*').order('deadline');
  if (error) { $('jobList').innerHTML = '<p class="empty">নিয়োগ বিজ্ঞপ্তি লোড হয়নি।</p>'; return; }
  jobs = data;
  $('jobList').innerHTML = jobs.length ? jobs.map(j => `
    <article class="card job">
      <h3>${esc(j.title)}</h3>
      <p>${esc(j.organization)}${j.location ? ' — ' + esc(j.location) : ''}</p>
      <div class="facts">পদ সংখ্যা: ${j.vacancies} · বেতন: ${esc(j.salary)}<br>যোগ্যতা: ${esc(j.requirements)}</div>
      <div class="deadline">আবেদনের শেষ তারিখ: ${bn(j.deadline)}</div>
      <button class="btn" data-job="${j.id}">আবেদন করুন</button>
    </article>`).join('') : '<p class="empty">এই মুহূর্তে কোনো নিয়োগ বিজ্ঞপ্তি নেই।</p>';
}

$('jobList').addEventListener('click', e => {
  const b = e.target.closest('button[data-job]'); if (!b) return;
  currentJob = jobs.find(j => j.id == b.dataset.job);
  $('jobTitle').textContent = currentJob.title;
  $('jobMeta').textContent = `${currentJob.organization} · শেষ তারিখ: ${bn(currentJob.deadline)}`;
  $('jobForm').reset(); $('jobMsg').textContent = ''; $('jobMsg').className = 'result';
  $('jobDlg').showModal();
});
$('jobCancel').addEventListener('click', () => $('jobDlg').close());

$('jobForm').addEventListener('submit', async e => {
  e.preventDefault();
  const f = new FormData(e.target), msg = $('jobMsg'), btn = $('jobSubmit');
  btn.disabled = true; msg.className = 'result'; msg.textContent = 'জমা হচ্ছে...';
  const { data, error } = await sb.rpc('submit_job_application', {
    p_job: currentJob.id, p_name: f.get('name'), p_phone: f.get('phone'),
    p_email: f.get('email'), p_education: f.get('education'), p_cv: f.get('cv')
  });
  btn.disabled = false;
  if (error) { msg.className = 'result err'; msg.textContent = 'আবেদন জমা হয়নি। শেষ তারিখ পার হয়ে গেছে কিনা দেখুন, অথবা আবার চেষ্টা করুন।'; return; }
  msg.className = 'result ok';
  msg.textContent = `আবেদন জমা হয়েছে। আপনার ট্র্যাকিং কোড: ${data} (এটি সংরক্ষণ করুন)`;
});

loadServices();
loadJobs();
