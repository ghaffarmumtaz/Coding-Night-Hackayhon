// ----------------- Call Elements -----------------
const authView = document.querySelector('#authView');
const feedView = document.querySelector('#feedView');

const tabSignIn = document.querySelector('#tabSignIn');
const tabSignUp = document.querySelector('#tabSignUp');
const loginForm = document.querySelector('#loginForm');
const signupForm = document.querySelector('#signupForm');

const loginEmail = document.querySelector('#loginEmail');
const loginPassword = document.querySelector('#loginPassword');
const signupName = document.querySelector('#signupName');
const signupEmail = document.querySelector('#signupEmail');
const signupPassword = document.querySelector('#signupPassword');

const welcomeName = document.querySelector('#welcomeName');
const logoutBtn = document.querySelector('#logoutBtn');
const themeToggle = document.querySelector('#themeToggle');

const postText = document.querySelector('#postText');
const postImage = document.querySelector('#postImage');
const postBtn = document.querySelector('#postBtn');
const previewHint = document.querySelector('#previewHint');
const emojiPicker = document.querySelector('#emojiPicker');

const feedEl = document.querySelector('#feed');
const searchInput = document.querySelector('#searchInput');
const searchBtn = document.querySelector('#searchBtn');
const sortSelect = document.querySelector('#sortSelect');

const editModal = document.querySelector('#editModal');
const editText = document.querySelector('#editText');
const editImage = document.querySelector('#editImage');
const saveEdit = document.querySelector('#saveEdit');
const cancelEdit = document.querySelector('#cancelEdit');

// ----------------- Data -----------------
let users = JSON.parse(localStorage.getItem('ms_users')) || [];
let posts = JSON.parse(localStorage.getItem('ms_posts')) || [];
let currentUser = JSON.parse(localStorage.getItem('ms_currentUser')) || null;
let theme = localStorage.getItem('ms_theme') || 'light';

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function formatDate(iso) { return new Date(iso).toLocaleString(); }

// ----------------- Auth -----------------

authView.style.display = 'flex';
authView.style.flexDirection = 'column';

// Switch tabs
tabSignIn.addEventListener('click', ()=>{
    tabSignIn.classList.add('active');
    tabSignUp.classList.remove('active');
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
});
tabSignUp.addEventListener('click', ()=>{
    tabSignUp.classList.add('active');
    tabSignIn.classList.remove('active');
    signupForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
});

// Signup
signupForm.addEventListener('submit', e=>{
    e.preventDefault();
    const name = signupName.value.trim();
    const email = signupEmail.value.trim().toLowerCase();
    const pass = signupPassword.value;
    if(!name || !email || !pass) return alert('Fill all fields');
    if(users.some(u=>u.email===email)) return alert('Email already registered');

    users.push({id: uid(), name, email, password: pass});
    localStorage.setItem('ms_users', JSON.stringify(users));

    alert('Account created. Login now.');
    signupForm.reset();
    tabSignIn.click();
    authView.style.display = 'none';
    showFeed();
});

// Login
loginForm.addEventListener('submit', e=>{
    e.preventDefault();
    const email = loginEmail.value.trim().toLowerCase();
    const pass = loginPassword.value;
    const user = users.find(u=>u.email===email && u.password===pass);
    if(!user) return alert('Invalid credentials');

    currentUser = user;
    localStorage.setItem('ms_currentUser', JSON.stringify(currentUser));
    
authView.style.display = 'none';

    showFeed();
});

// Logout
logoutBtn.addEventListener('click', ()=>{
    currentUser = null;
    localStorage.removeItem('ms_currentUser');
    showAuth();
});

// ----------------- Theme -----------------
function applyTheme(){
    document.body.classList.toggle('dark', theme==='dark');
    localStorage.setItem('ms_theme', theme);
    themeToggle.classList.toggle('themeWhite');
}

themeToggle.addEventListener('click', ()=>{
    theme = (theme==='dark')?'light':'dark';
    applyTheme();
});

// ----------------- Posting -----------------
postImage.addEventListener('input', ()=>{
    const url = postImage.value.trim();
    if(url.startsWith('http')){
        postImage.dataset.img = url;
        previewHint.textContent = 'Image attached';
    }
});

emojiPicker.addEventListener('click', e=>{
    if(e.target.matches('.emoji')){
        postText.value += e.target.textContent;
        postText.focus();
    }
});

postBtn.addEventListener('click', ()=>{
    if(!currentUser) return alert('Login required');
    const text = postText.value.trim();
    const img = postImage.dataset.img || null;
    if(!text && !img) return alert('Add text or image');

    const newPost = {
        id: uid(),
        authorName: currentUser.name,
        authorEmail: currentUser.email,
        content: text,
        image: img,
        createdAt: new Date().toISOString(),
        likes: 0,
        likedBy: [],
        reactions: {love:0, angry:0}
    };
    posts.unshift(newPost);
    localStorage.setItem('ms_posts', JSON.stringify(posts));

    postText.value = '';
    postImage.value = '';
    delete postImage.dataset.img;
    previewHint.textContent = 'No image';
    renderFeed();
});

// ----------------- Feed -----------------
function renderFeed(){
    const q = searchInput.value.trim().toLowerCase();
    let list = posts.slice();

    if(q){
        list = list.filter(p=>(p.content||'').toLowerCase().includes(q) || (p.authorName||'').toLowerCase().includes(q));
        if(list.length===0){
            feedEl.innerHTML='<div>Post not found</div>';
            feedEl.style.marginLeft = "45%";
            return;
        }
    }

    const sort = sortSelect.value;
    if(sort==='latest') list.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    else if(sort==='oldest') list.sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
    else if(sort==='mostLiked') list.sort((a,b)=>b.likes-a.likes);

    feedEl.innerHTML='';
    list.forEach(post=>{
        const el = document.createElement('article');
        el.className='post';
        el.dataset.id=post.id;
        el.innerHTML=`
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <div><strong>${post.authorName}</strong> <small>${formatDate(post.createdAt)}</small></div>
            <div>
                ${post.authorEmail===currentUser?.email?'<button class="editBtn">Edit</button> <button class="deleteBtn">Delete</button>':''}
            </div>
        </div>
        <div>${post.content||''}</div>
        ${post.image?`<img src="${post.image}" style="max-width:100%; display:block; margin:8px 0;">`:''}
        <button class="likeBtn" style="width:12%;">${post.likedBy.includes(currentUser?.email)?'❤️':'🤍'} (${post.likes})</button>
        `;

        const likeBtn = el.querySelector('.likeBtn');
        const deleteBtn = el.querySelector('.deleteBtn');
        const editBtn = el.querySelector('.editBtn');

        likeBtn?.addEventListener('click', ()=>{
            if(!currentUser) return alert('Login required');
            const idx = posts.findIndex(p=>p.id===post.id);
            const uemail = currentUser.email;
            if(posts[idx].likedBy.includes(uemail)){
                posts[idx].likedBy = posts[idx].likedBy.filter(e=>e!==uemail);
                posts[idx].likes--;
            } else {
                posts[idx].likedBy.push(uemail);
                posts[idx].likes++;
            }
            localStorage.setItem('ms_posts', JSON.stringify(posts));
            renderFeed();
        });

        deleteBtn?.addEventListener('click', ()=>{
            if(!confirm('Delete post?')) return;
            posts = posts.filter(p=>p.id!==post.id);
            localStorage.setItem('ms_posts', JSON.stringify(posts));
            renderFeed();
        });

        editBtn?.addEventListener('click', ()=>{
            editModal.style.display='block';
            editText.value=post.content||'';
            editImage.value='';
            editImage.dataset.img = post.image||'';
            editingPostId = post.id;
        });

        feedEl.appendChild(el);
    });
}

// ----------------- Edit -----------------
let editingPostId = null;
saveEdit.addEventListener('click', ()=>{
    if(!editingPostId) return;
    const idx = posts.findIndex(p=>p.id===editingPostId);
    posts[idx].content = editText.value.trim();
    posts[idx].image = editImage.dataset.img || null;
    localStorage.setItem('ms_posts', JSON.stringify(posts));
    editingPostId = null;
    editModal.style.display='none';
    renderFeed();
});

editImage.addEventListener('change', e=>{
    const file = e.target.files[0];
    if(!file){ delete editImage.dataset.img; return; }
    const reader = new FileReader();
    reader.onload = function(evt){ editImage.dataset.img = evt.target.result; }
    reader.readAsDataURL(file);
});

cancelEdit.addEventListener('click', ()=>{
    editingPostId = null;
    editModal.style.display='none';
});

// ----------------- Views -----------------
function showAuth(){ feedView.classList.add('hidden'); authView.classList.remove('hidden'); }
function showFeed(){ authView.classList.add('hidden'); feedView.classList.remove('hidden'); welcomeName.textContent=currentUser?.name||''; renderFeed(); }

if(currentUser){ showFeed(); } else { showAuth(); }

// ----------------- Search & Sort -----------------
searchInput.addEventListener('input', renderFeed);
sortSelect.addEventListener('change', renderFeed);
