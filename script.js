// Simple front-end social feed app (frontend-only)
// Stores data in localStorage: users[], posts[], currentUser, theme

/* ----------------- Utilities ----------------- */
const $ = (s) => document.querySelector(s);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
const formatDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleString();
};

/* ----------------- Storage Helpers ----------------- */
const STORAGE = {
  get(key, fallback){
    const raw = localStorage.getItem(key);
    if(!raw) return fallback;
    try { return JSON.parse(raw); } catch(e){ return fallback; }
  },
  set(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
};
let users = STORAGE.get('ms_users', []);
let posts = STORAGE.get('ms_posts', []);
let currentUser = STORAGE.get('ms_currentUser', null);
let theme = STORAGE.get('ms_theme', 'light');

/* ----------------- Elements ----------------- */
const authView = $('#authView');
const feedView = $('#feedView');

const tabSignIn = $('#tabSignIn');
const tabSignUp = $('#tabSignUp');
const loginForm = $('#loginForm');
const signupForm = $('#signupForm');

const loginEmail = $('#loginEmail');
const loginPassword = $('#loginPassword');
const signupName = $('#signupName');
const signupEmail = $('#signupEmail');
const signupPassword = $('#signupPassword');

const welcomeName = $('#welcomeName');
const logoutBtn = $('#logoutBtn');
const themeToggle = $('#themeToggle');

const postText = $('#postText');
const postImage = $('#postImage');
const postBtn = $('#postBtn');
const previewHint = $('#previewHint');
const emojiPicker = $('#emojiPicker');

const feedEl = $('#feed');
const searchInput = $('#searchInput');
const sortSelect = $('#sortSelect');

const editModal = $('#editModal');
const editText = $('#editText');
const editImage = $('#editImage');
const saveEdit = $('#saveEdit');
const cancelEdit = $('#cancelEdit');

/* ----------------- Auth handlers ----------------- */
// Switch tabs
tabSignIn.addEventListener('click', ()=>{ tabSignIn.classList.add('active'); tabSignUp.classList.remove('active'); loginForm.classList.remove('hidden'); signupForm.classList.add('hidden'); });
tabSignUp.addEventListener('click', ()=>{ tabSignUp.classList.add('active'); tabSignIn.classList.remove('active'); signupForm.classList.remove('hidden'); loginForm.classList.add('hidden'); });

// Signup
signupForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = signupName.value.trim();
  const email = signupEmail.value.trim().toLowerCase();
  const pass = signupPassword.value;
  if(!name || !email || !pass) return alert('Fill all fields');
  if(users.some(u=>u.email === email)) return alert('Email already registered');
  users.push({id: uid(), name, email, password: pass});
  STORAGE.set('ms_users', users);
  alert('Account created. You can login now.');
  signupForm.reset();
  tabSignIn.click();
});

// Login
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = loginEmail.value.trim().toLowerCase();
  const pass = loginPassword.value;
  const user = users.find(u=>u.email === email && u.password === pass);
  if(!user) return alert('Invalid credentials');
  currentUser = user;
  STORAGE.set('ms_currentUser', currentUser);
  showFeed();
});

// Logout
logoutBtn.addEventListener('click', () => {
  currentUser = null;
  STORAGE.set('ms_currentUser', null);
  showAuth();
});

/* ----------------- Theme ----------------- */
function applyTheme(){
  if(theme === 'dark') document.body.classList.add('dark');
  else document.body.classList.remove('dark');
  STORAGE.set('ms_theme', theme);
}
themeToggle.addEventListener('click', ()=>{
  theme = (theme === 'dark') ? 'light' : 'dark';
  applyTheme();
});

/* ----------------- Posting ----------------- */
postImage.addEventListener('input', () => {
  previewHint.textContent = postImage.value.trim() ? 'Image attached' : 'No image';
});
emojiPicker.addEventListener('click', (e) => {
  if(e.target.matches('.emoji')){
    const em = e.target.textContent;
    postText.value += em;
    postText.focus();
  }
});

postBtn.addEventListener('click', () => {
  if(!currentUser) return alert('Login required');
  const text = postText.value.trim();
  const img = postImage.value.trim();
  if(!text && !img) return alert('Add text or image URL');
  const newPost = {
    id: uid(),
    authorName: currentUser.name,
    authorEmail: currentUser.email,
    content: text,
    image: img || null,
    createdAt: new Date().toISOString(),
    likes: 0,
    likedBy: [],
    reactions: { love: 0, angry: 0 }
  };
  posts.unshift(newPost); // latest-first
  STORAGE.set('ms_posts', posts);
  postText.value = '';
  postImage.value = '';
  previewHint.textContent = 'No image';
  renderFeed();
});

/* ----------------- Feed rendering ----------------- */
function renderFeed(){
  // apply search and sort
  const q = searchInput.value.trim().toLowerCase();
  let list = posts.slice();

  // filter by search
  if(q) list = list.filter(p => (p.content || '').toLowerCase().includes(q) || (p.authorName || '').toLowerCase().includes(q));

  // sort
  const sort = sortSelect.value;
  if(sort === 'latest') list.sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));
  else if(sort === 'oldest') list.sort((a,b)=> new Date(a.createdAt) - new Date(b.createdAt));
  else if(sort === 'mostLiked') list.sort((a,b)=> (b.likes - a.likes));

  feedEl.innerHTML = '';
  if(list.length === 0){
    feedEl.innerHTML = `<div class="card post"><div class="post-meta">No posts found.</div></div>`;
    return;
  }

  list.forEach(post => {
    const el = document.createElement('article');
    el.className = 'post card';
    el.dataset.id = post.id;

    el.innerHTML = `
      <div class="post-head">
        <div>
          <div style="font-weight:600">${escapeHtml(post.authorName)}</div>
          <div class="post-meta">${formatDate(post.createdAt)}</div>
        </div>
        <div class="tags">
          ${currentUser && post.authorEmail === currentUser.email ? `<button class="action-btn editBtn">Edit</button>` : ''}
          ${currentUser && post.authorEmail === currentUser.email ? `<button class="action-btn deleteBtn">Delete</button>` : ''}
        </div>
      </div>
      <div class="post-content">${escapeHtml(post.content || '')}</div>
      ${post.image ? `<img class="post-image" src="${escapeAttr(post.image)}" alt="post image" onerror="this.style.display='none'">` : ''}
      <div class="post-actions">
        <button class="action-btn like ${post.likedBy.includes(currentUser?.email) ? 'active' : ''}">${post.likedBy.includes(currentUser?.email) ? '❤️' : '🤍'} <span class="small-count likeCount">${post.likes}</span></button>
        <div class="reaction" data-type="love">😍 <span class="small-count loveCount">${post.reactions.love}</span></div>
        <div class="reaction" data-type="angry">😡 <span class="small-count angryCount">${post.reactions.angry}</span></div>
        <div class="muted" style="margin-left:auto">ID: ${post.id.slice(0,6)}</div>
      </div>
    `;

    // events
    const likeBtn = el.querySelector('.like');
    const deleteBtn = el.querySelector('.deleteBtn');
    const editBtn = el.querySelector('.editBtn');
    const reactionBtns = el.querySelectorAll('.reaction');

    likeBtn && likeBtn.addEventListener('click', ()=>{
      if(!currentUser) return alert('Login required to like');
      const idx = posts.findIndex(p=>p.id===post.id);
      if(idx === -1) return;
      const p = posts[idx];
      const uemail = currentUser.email;
      const liked = p.likedBy.includes(uemail);
      if(liked){
        p.likedBy = p.likedBy.filter(e=>e!==uemail);
        p.likes = Math.max(0, p.likes - 1);
      } else {
        p.likedBy.push(uemail);
        p.likes = (p.likes || 0) + 1;
      }
      STORAGE.set('ms_posts', posts);
      renderFeed();
    });

    reactionBtns.forEach(rb => {
      rb.addEventListener('click', ()=>{
        if(!currentUser) return alert('Login required to react');
        const type = rb.dataset.type;
        const idx = posts.findIndex(p=>p.id===post.id);
        if(idx === -1) return;
        posts[idx].reactions[type] = (posts[idx].reactions[type] || 0) + 1;
        STORAGE.set('ms_posts', posts);
        renderFeed();
      });
    });

    deleteBtn && deleteBtn.addEventListener('click', ()=>{
      if(!confirm('Delete this post?')) return;
      posts = posts.filter(p=>p.id !== post.id);
      STORAGE.set('ms_posts', posts);
      renderFeed();
    });

    editBtn && editBtn.addEventListener('click', ()=>{
        editModal.style.display = "block"
      openEditModal(post);
    });

    feedEl.appendChild(el);
  });
}

function escapeHtml(s = '') {
  return s.replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#039;"}[m]));
}
function escapeAttr(s = '') {
  return s.replace(/"/g, '&quot;');
}

/* ----------------- Edit modal ----------------- */
let editingPostId = null;
function openEditModal(post){
  editingPostId = post.id;
  editText.value = post.content || '';
  editImage.value = post.image || '';
  editModal.classList.remove('hidden');
}
saveEdit.addEventListener('click', ()=>{
  if(!editingPostId) return;
  const idx = posts.findIndex(p=>p.id===editingPostId);
  if(idx === -1) return;
  posts[idx].content = editText.value.trim();
  posts[idx].image = editImage.value.trim() || null;
  posts[idx].editedAt = new Date().toISOString();
  STORAGE.set('ms_posts', posts);
  editingPostId = null;
  editModal.classList.add('hidden');
  editModal.style.display = "none"
  renderFeed();
});
cancelEdit.addEventListener('click', ()=>{
  editingPostId = null;
  editModal.classList.add('hidden');
});

/* ----------------- View toggles ----------------- */
function showAuth(){
  feedView.classList.add('hidden');
  authView.classList.remove('hidden');
}
function showFeed(){
  authView.classList.add('hidden');
  feedView.classList.remove('hidden');
  welcomeName.textContent = currentUser?.name || '';
  renderFeed();
}

/* ----------------- Interactions ----------------- */
searchInput.addEventListener('input', renderFeed);
sortSelect.addEventListener('change', renderFeed);

/* ----------------- Auto-login on load ----------------- */
function init(){
  // apply theme
  applyTheme();

  // sample data fallback (only if no posts exist)
  if(!posts || posts.length === 0){
    // create an initial sample post once (only first time)
    if(!STORAGE.get('ms_init_demo', false)){
      const demo = {
        id: uid(),
        authorName: 'System',
        authorEmail: 'system@local',
        content: 'Welcome to Mini Social — create a post, like, search, and try dark mode!',
        image: null,
        createdAt: new Date().toISOString(),
        likes: 0,
        likedBy: [],
        reactions: { love: 0, angry: 0 }
      };
      posts = [demo];
      STORAGE.set('ms_posts', posts);
      STORAGE.set('ms_init_demo', true);
    }
  }

  // check currentUser from storage (already loaded at top)
  if(currentUser){
    showFeed();
  } else {
    showAuth();
  }
}
init();

/* ----------------- Small helpers for dev/test (optional) ----------------- */
// Expose some for console debugging
window.MiniSocial = {
  getUsers: ()=>users,
  getPosts: ()=>posts,
  logout: ()=>{ currentUser = null; STORAGE.set('ms_currentUser', null); showAuth(); }
};
