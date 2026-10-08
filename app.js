(() => {
  'use strict';

  const STORAGE_KEY = 'miu-ir-community-v1';
  const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
  const PUBLIC_SHARE_URL = 'https://tinyurl.com/miu-ir-community';
  const demoProfileIds = new Set(['maya-chen', 'bat-erdene', 'saraa-altan', 'temuulen-b']);
  const emptyData = () => ({ accounts: [], currentUserId: '', profiles: [], posts: [] });
  const colorClasses = ['teal', 'lilac', 'peach', 'blue'];
  const state = { page: 'feed', feedType: 'all', roleFilter: 'all', search: '', sortOldest: false, data: loadData(), toastTimer: null, dialogMode: 'post' };
  const byId = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const initials = name => name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  const currentAccount = () => state.data.accounts.find(account => account.id === state.data.currentUserId);
  const currentProfile = () => state.data.profiles.find(profile => profile.id === currentAccount()?.profileId);
  const profileById = id => state.data.profiles.find(profile => profile.id === id);

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyData();
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.profiles) || !Array.isArray(parsed.posts)) throw new Error('Stored data has an invalid format.');
      const profiles = parsed.profiles.filter(profile => !demoProfileIds.has(profile.id) && profile.ownerId);
      const removedIds = new Set(parsed.profiles.filter(profile => !profiles.includes(profile)).map(profile => profile.id));
      const data = {
        accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
        currentUserId: parsed.currentUserId || '',
        profiles,
        posts: parsed.posts.filter(post => !String(post.id).startsWith('welcome-') && !removedIds.has(post.authorId) && profiles.some(profile => profile.id === post.authorId))
      };
      if (!data.accounts.some(account => account.id === data.currentUserId)) data.currentUserId = '';
      if (removedIds.size || !Array.isArray(parsed.accounts)) localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return data;
    } catch (error) {
      console.error('Could not load saved MIU community data.', error);
      return emptyData();
    }
  }

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
      return true;
    } catch (error) {
      console.error('Could not save MIU community data.', error);
      showToast(error.name === 'QuotaExceededError' ? 'Browser storage is full. Remove an image or post and try again.' : 'Could not save. Check your browser storage settings.');
      return false;
    }
  }

  function avatarMarkup(profile, extraClass = '') {
    const label = esc(profile?.name || 'Community member');
    if (profile?.image) return `<img class="avatar ${extraClass}" src="${esc(profile.image)}" alt="${label}">`;
    const color = colorClasses.includes(profile?.color) ? profile.color : 'teal';
    return `<span class="avatar avatar-${color} ${extraClass}" aria-label="${label}">${esc(profile?.initials || initials(profile?.name || 'MI'))}</span>`;
  }

  function profilePhotoButton(profile) {
    return `<button class="profile-photo-trigger" type="button" data-action="view-profile-photo" data-id="${esc(profile.id)}" aria-label="View ${esc(profile.name)}'s profile picture">${avatarMarkup(profile)}</button>`;
  }

  function openProfilePhoto(profile) {
    if (!profile?.image) {
      showToast(`${profile?.name || 'This member'} hasn’t added a profile picture yet.`);
      return;
    }
    byId('largeProfilePhoto').src = profile.image;
    byId('largeProfilePhoto').alt = `${profile.name}'s profile picture`;
    byId('largeProfileName').textContent = profile.name;
    byId('profilePhotoDialog').showModal();
  }

  function displayDate(value) {
    const date = new Date(value);
    const elapsed = Date.now() - date.getTime();
    if (elapsed >= 0 && elapsed < 60 * 60 * 1000) return `${Math.max(1, Math.floor(elapsed / 60000))} min ago`;
    if (elapsed >= 0 && elapsed < 24 * 60 * 60 * 1000) return `${Math.floor(elapsed / 3600000)}h ago`;
    return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date);
  }

  function render() {
    renderPosts();
    renderPeople();
    renderCurrentUser();
    byId('announcementCount').textContent = state.data.posts.filter(post => post.type === 'announcement').length;
    const isPeople = state.page === 'people';
    byId('feedPage').hidden = isPeople;
    byId('peoplePage').hidden = !isPeople;
    byId('pageEyebrow').textContent = isPeople ? 'GET TO KNOW EACH OTHER' : state.page === 'announcements' ? 'WHAT’S HAPPENING AT MIU' : 'YOUR CAMPUS, CONNECTED';
    byId('pageTitle').textContent = isPeople ? 'People' : state.page === 'announcements' ? 'Announcements' : 'News feed';
    byId('pageDescription').textContent = isPeople ? 'Students and teachers from the International Relations department.' : state.page === 'announcements' ? 'The latest news and updates from our department.' : 'A little closer to the people and ideas shaping our world.';
    byId('createButtonText').textContent = isPeople ? 'Edit profile' : state.page === 'announcements' ? 'Add announcement' : 'Create post';
    document.querySelectorAll('[data-page]').forEach(button => button.classList.toggle('active', button.dataset.page === state.page && button.classList.contains('nav-item')));
    document.querySelectorAll('.feed-tab').forEach(button => {
      const active = button.dataset.feed === state.feedType;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
  }

  function renderCurrentUser() {
    const profile = currentProfile();
    const signedIn = Boolean(profile);
    byId('authScreen').hidden = signedIn;
    byId('communityApp').hidden = !signedIn;
    if (!profile) return;
    byId('topAvatar').innerHTML = avatarMarkup(profile, 'avatar-small');
    byId('topUserName').textContent = profile.name;
    byId('composerAvatar').innerHTML = avatarMarkup(profile);
    byId('postingAvatar').innerHTML = avatarMarkup(profile, 'avatar-small');
    byId('postingName').textContent = profile.name;
    const visibleMembers = state.data.profiles.slice(0, 3);
    byId('miniPeople').innerHTML = visibleMembers.map(member => `<i>${esc(member.initials || initials(member.name))}</i>`).join('');
    byId('communityPeople').innerHTML = visibleMembers.map(member => `<div class="community-person">${avatarMarkup(member, 'avatar-small')}<span><strong>${esc(member.name)}</strong><small>${esc(member.role)}${member.year ? ` · ${esc(member.year)}` : ''}</small></span>${member.id === profile.id ? '<span class="presence"></span>' : ''}</div>`).join('') || '<p class="community-empty">Create a profile to introduce yourself.</p>';
  }

  function renderPosts() {
    let posts = [...state.data.posts];
    if (state.page === 'announcements') posts = posts.filter(post => post.type === 'announcement');
    else if (state.page === 'feed' && state.feedType !== 'all') posts = posts.filter(post => post.type === state.feedType);
    if (state.search) posts = posts.filter(post => {
      const author = profileById(post.authorId);
      return `${post.body} ${author?.name || ''} ${author?.focus || ''}`.toLowerCase().includes(state.search);
    });
    posts.sort((a, b) => state.sortOldest ? new Date(a.createdAt) - new Date(b.createdAt) : new Date(b.createdAt) - new Date(a.createdAt));
    byId('sortButton').innerHTML = `${state.sortOldest ? 'Oldest' : 'Latest'} <span>⌄</span>`;
    byId('feedList').innerHTML = posts.length ? posts.map(post => {
      const author = profileById(post.authorId) || { name: 'Community member', role: 'Member', color: 'teal', initials: 'MI' };
      const isLiked = post.likedByMe === true;
      return `<article class="post-card" data-post-id="${esc(post.id)}">
        <div class="post-head">${avatarMarkup(author)}<div class="post-identity"><strong>${esc(author.name)}</strong><div class="post-meta"><span class="role-label">${esc(author.role)}${author.focus ? ` · ${esc(author.focus)}` : ''}</span><span class="meta-dot"></span><span>${esc(displayDate(post.createdAt))}</span></div></div><span class="post-type-label ${post.type === 'announcement' ? 'announcement' : ''}">${post.type === 'announcement' ? 'ANNOUNCEMENT' : 'COMMUNITY'}</span></div>
        <div class="post-body"><p>${esc(post.body)}</p></div>
        ${post.image ? `<img class="post-image" src="${esc(post.image)}" alt="Photo shared by ${esc(author.name)}">` : ''}
        <div class="post-footer"><span class="post-reaction">♡</span><span>${post.likes || 0} ${post.likes === 1 ? 'like' : 'likes'}</span><div class="post-actions"><button class="${isLiked ? 'liked' : ''}" data-action="like" data-id="${esc(post.id)}">${isLiked ? '♥ Liked' : '♡ Like'}</button>${post.authorId === currentProfile()?.id ? `<button data-action="delete-post" data-id="${esc(post.id)}">Delete</button>` : ''}</div></div>
      </article>`;
    }).join('') : `<div class="empty-state"><div class="empty-illustration">✦</div><h3>${state.search ? 'No matches just yet' : state.feedType === 'announcement' || state.page === 'announcements' ? 'No announcements yet' : 'The conversation starts here'}</h3><p>${state.search ? 'Try another search term.' : 'Be the first to share something with the MIU IR community.'}</p><button class="button button-primary" data-action="create-post">Create a post <span>→</span></button></div>`;
  }

  function renderPeople() {
    const people = state.data.profiles.filter(profile => {
      const matchesRole = state.roleFilter === 'all' || profile.role === state.roleFilter;
      const matchesSearch = !state.search || `${profile.name} ${profile.role} ${profile.focus} ${profile.year} ${profile.bio}`.toLowerCase().includes(state.search);
      return matchesRole && matchesSearch;
    });
    byId('peopleTotal').textContent = `${state.data.profiles.length} ${state.data.profiles.length === 1 ? 'member' : 'members'}`;
    byId('peopleGrid').innerHTML = people.length ? people.map(profile => `<article class="person-card">${profilePhotoButton(profile)}<h3>${esc(profile.name)}</h3><span class="person-role">${esc(profile.role)}${profile.year ? ` · ${esc(profile.year)}` : ''}</span><p class="person-focus">${esc(profile.focus || 'International Relations')}</p><p class="person-bio">${esc(profile.bio || 'Part of the MIU International Relations community.')}</p>${profile.email ? `<a class="person-contact" href="mailto:${esc(profile.email)}">Say hello ↗</a>` : '<span class="person-contact disabled">MIU IR member</span>'}${profile.id === currentProfile()?.id ? '<button class="person-delete" data-action="edit-profile" aria-label="Edit your profile">✎</button>' : ''}</article>`).join('') : `<div class="empty-state"><div class="empty-illustration">♙</div><h3>${state.search ? 'No members found' : 'Introduce yourself'}</h3><p>${state.search ? 'Try a different search.' : 'Your profile will appear here once you add a few details.'}</p><button class="button button-primary" data-action="edit-profile">Complete your profile <span>→</span></button></div>`;
  }

  function setPage(page) {
    state.page = page;
    if (page === 'announcements') state.feedType = 'announcement';
    else if (page === 'feed') state.feedType = 'all';
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function syncFormType() {
    const type = state.dialogMode === 'profile' ? 'profile' : byId('entryType').value;
    const isProfile = state.dialogMode === 'profile';
    byId('postFields').hidden = isProfile;
    byId('profileFields').hidden = !isProfile;
    byId('typeField').hidden = isProfile || state.page === 'announcements' || state.page === 'people';
    byId('dialogTitle').textContent = isProfile ? 'Edit your profile' : type === 'announcement' ? 'Share an announcement' : 'Share an update';
    byId('dialogKicker').textContent = isProfile ? 'YOUR COMMUNITY' : type === 'announcement' ? 'DEPARTMENT NEWS' : 'COMMUNITY';
    byId('submitButton').innerHTML = isProfile ? 'Save profile <span>→</span>' : type === 'announcement' ? 'Post announcement <span>→</span>' : 'Share post <span>→</span>';
  }

  function openDialog(type) {
    byId('createForm').reset();
    byId('formError').hidden = true;
    byId('postPreview').hidden = true;
    byId('profilePreview').hidden = true;
    state.dialogMode = type === 'profile' ? 'profile' : 'post';
    byId('entryType').value = type === 'announcement' || state.page === 'announcements' ? 'announcement' : 'post';
    if (state.dialogMode === 'profile') {
      const profile = currentProfile();
      byId('profileName').value = profile?.name || '';
      byId('profileRole').value = profile?.role || 'Student';
      byId('profileFocus').value = profile?.focus || '';
      byId('profileYear').value = profile?.year || '';
      byId('profileEmail').value = profile?.email || '';
      byId('profileBio').value = profile?.bio || '';
    }
    syncFormType();
    byId('createDialog').showModal();
    const focusTarget = state.dialogMode === 'profile' ? byId('profileName') : byId('postBody');
    focusTarget.focus();
  }

  function showError(message) {
    byId('formError').textContent = message;
    byId('formError').hidden = false;
  }

  function showToast(message) {
    const toast = byId('toast');
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => toast.classList.remove('visible'), 2700);
  }

  function readImage(file) {
    return new Promise((resolve, reject) => {
      if (!file) return resolve('');
      if (!file.type.startsWith('image/')) return reject(new Error('Choose an image file.'));
      if (file.size > MAX_IMAGE_BYTES) return reject(new Error('Photos must be 2 MB or smaller.'));
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read that image. Please try another file.'));
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
    });
  }

  function bytesToBase64(bytes) {
    return btoa(String.fromCharCode(...new Uint8Array(bytes)));
  }

  function base64ToBytes(value) {
    return Uint8Array.from(atob(value), character => character.charCodeAt(0));
  }

  async function hashPassword(password, salt) {
    if (!globalThis.crypto?.subtle) throw new Error('Secure password hashing is not available here. Open the app through localhost or HTTPS.');
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const digest = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' }, key, 256);
    return bytesToBase64(digest);
  }

  function hashesMatch(left, right) {
    if (left.length !== right.length) return false;
    let difference = 0;
    for (let i = 0; i < left.length; i++) difference |= left.charCodeAt(i) ^ right.charCodeAt(i);
    return difference === 0;
  }

  function setAuthMode(mode) {
    const signup = mode === 'signup';
    byId('signinForm').hidden = signup;
    byId('signupForm').hidden = !signup;
    byId('passwordRecovery').hidden = true;
    byId('authTabs').hidden = false;
    byId('authTitle').textContent = signup ? 'Join your IR community.' : 'Your IR community starts here.';
    byId('authDescription').textContent = signup ? 'Create your account, introduce yourself, and meet the department.' : 'Sign in or create an account to meet your department and join the conversation.';
    document.querySelectorAll('[data-auth-mode]').forEach(button => {
      const active = button.dataset.authMode === mode && button.classList.contains('auth-tab');
      button.classList.toggle('active', active);
      if (button.classList.contains('auth-tab')) button.setAttribute('aria-selected', String(active));
    });
    byId(signup ? 'signupName' : 'signinEmail').focus();
  }

  function showPasswordRecovery() {
    byId('signinForm').hidden = true;
    byId('signupForm').hidden = true;
    byId('authTabs').hidden = true;
    byId('passwordRecovery').hidden = false;
    byId('recoveryNotice').hidden = true;
    byId('recoveryEmail').value = byId('signinEmail').value.trim();
    byId('recoveryEmail').focus();
  }

  function explainPasswordRecovery(event) {
    event.preventDefault();
    byId('recoveryNotice').textContent = 'Email recovery is not available yet: the app has no server or email service connected, so no reset link was sent.';
    byId('recoveryNotice').hidden = false;
  }

  function canShareCurrentPage() {
    return !['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  }

  async function shareAppLink() {
    const help = byId('shareLinkHelp');
    if (!canShareCurrentPage()) {
      help.textContent = 'This local preview only works on this computer. A public community link has not been published yet.';
      help.hidden = false;
      return;
    }
    const shareData = {
      title: 'MIU IR COMMUNITY',
      text: 'MIU IR COMMUNITY · Mongolian International University',
      url: canShareCurrentPage() ? PUBLIC_SHARE_URL : window.location.href
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareData.url);
        help.textContent = 'Community link copied. Send it to your MIU IR classmates.';
        help.hidden = false;
      } else {
        help.textContent = `Copy and share this link: ${shareData.url}`;
        help.hidden = false;
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('Could not share the community link.', error);
      help.textContent = `Copy and share this link: ${shareData.url}`;
      help.hidden = false;
    }
  }

  async function signUp(event) {
    event.preventDefault();
    byId('signupError').hidden = true;
    const name = byId('signupName').value.trim();
    const email = byId('signupEmail').value.trim().toLowerCase();
    const password = byId('signupPassword').value;
    if (state.data.accounts.some(account => account.email.toLowerCase() === email)) {
      byId('signupError').textContent = 'An account with that email already exists on this device. Sign in instead.';
      byId('signupError').hidden = false;
      return;
    }
    try {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const id = `account-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const account = { id, email, salt: bytesToBase64(salt), passwordHash: await hashPassword(password, salt), profileId: id };
      const profile = {
        id,
        ownerId: id,
        name,
        role: byId('signupRole').value,
        focus: '',
        year: '',
        email: '',
        bio: '',
        color: colorClasses[state.data.profiles.length % colorClasses.length],
        initials: initials(name),
        createdAt: new Date().toISOString()
      };
      state.data.accounts.push(account);
      state.data.profiles.push(profile);
      state.data.currentUserId = id;
      if (!saveData()) {
        state.data.accounts.pop();
        state.data.profiles.pop();
        state.data.currentUserId = '';
        return;
      }
      byId('signupForm').reset();
      render();
      showToast('Welcome to the MIU IR community.');
    } catch (error) {
      console.error('Could not create the local account.', error);
      byId('signupError').textContent = error.message || 'Could not create your account on this device.';
      byId('signupError').hidden = false;
    }
  }

  async function signIn(event) {
    event.preventDefault();
    byId('signinError').hidden = true;
    const email = byId('signinEmail').value.trim().toLowerCase();
    const password = byId('signinPassword').value;
    const account = state.data.accounts.find(item => item.email.toLowerCase() === email);
    try {
      if (!account) throw new Error('Email or password is incorrect.');
      const digest = await hashPassword(password, base64ToBytes(account.salt));
      if (!hashesMatch(digest, account.passwordHash)) throw new Error('Email or password is incorrect.');
      state.data.currentUserId = account.id;
      if (!saveData()) { state.data.currentUserId = ''; return; }
      byId('signinForm').reset();
      render();
    } catch (error) {
      byId('signinError').textContent = error.message || 'Could not sign in on this device.';
      byId('signinError').hidden = false;
    }
  }

  function previewImage(fileInput, preview) {
    const file = fileInput.files[0];
    preview.innerHTML = '';
    if (!file) { preview.hidden = true; return; }
    if (!file.type.startsWith('image/') || file.size > MAX_IMAGE_BYTES) {
      showError(!file.type.startsWith('image/') ? 'Choose an image file.' : 'Photos must be 2 MB or smaller.');
      fileInput.value = '';
      preview.hidden = true;
      return;
    }
    byId('formError').hidden = true;
    const image = document.createElement('img');
    image.alt = 'Selected photo preview';
    image.src = URL.createObjectURL(file);
    image.onload = () => URL.revokeObjectURL(image.src);
    preview.append(image);
    preview.hidden = false;
  }

  async function submitForm(event) {
    event.preventDefault();
    byId('formError').hidden = true;
    const type = state.dialogMode === 'profile' ? 'profile' : byId('entryType').value;
    if (type === 'profile') {
      const name = byId('profileName').value.trim();
      if (!name) return showError('Add a name for this profile.');
      const profile = currentProfile();
      if (!profile) return showError('Sign in to edit your profile.');
      const file = byId('profileImage').files[0];
      let image;
      try { image = file ? await readImage(file) : profile.image || ''; }
      catch (error) { return showError(error.message); }
      const previous = { ...profile };
      profile.name = name;
      profile.role = byId('profileRole').value;
      profile.focus = byId('profileFocus').value.trim();
      profile.year = byId('profileYear').value.trim();
      profile.email = byId('profileEmail').value.trim();
      profile.bio = byId('profileBio').value.trim();
      profile.initials = initials(name);
      profile.image = image;
      if (!saveData()) { Object.assign(profile, previous); return; }
      byId('createDialog').close();
      render();
      showToast('Your profile was updated.');
      return;
    }

    const body = byId('postBody').value.trim();
    if (!body) return showError('Write a message before sharing.');
    const file = byId('postImage').files[0];
    let image;
    try { image = await readImage(file); }
    catch (error) { return showError(error.message); }
    const post = { id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, authorId: currentProfile().id, type, body, image, likes: 0, likedByMe: false, createdAt: new Date().toISOString() };
    state.data.posts.push(post);
    if (!saveData()) { state.data.posts.pop(); return; }
    byId('createDialog').close();
    state.page = type === 'announcement' ? 'announcements' : 'feed';
    if (type === 'announcement') state.feedType = 'announcement';
    render();
    showToast(type === 'announcement' ? 'Announcement shared in this browser.' : 'Post shared in this browser.');
  }

  byId('createButton').addEventListener('click', () => openDialog());
  byId('composerButton').addEventListener('click', () => openDialog('post'));
  byId('currentUserButton').addEventListener('click', () => openDialog('profile'));
  byId('signoutButton').addEventListener('click', () => {
    const signedOutUserId = state.data.currentUserId;
    state.data.currentUserId = '';
    if (saveData()) {
      render();
      setAuthMode('signin');
    } else {
      state.data.currentUserId = signedOutUserId;
    }
  });
  byId('closeDialog').addEventListener('click', () => byId('createDialog').close());
  byId('closeProfilePhoto').addEventListener('click', () => byId('profilePhotoDialog').close());
  byId('profilePhotoDialog').addEventListener('click', event => {
    if (event.target === byId('profilePhotoDialog')) byId('profilePhotoDialog').close();
  });
  byId('entryType').addEventListener('change', syncFormType);
  byId('createForm').addEventListener('submit', submitForm);
  byId('signinForm').addEventListener('submit', signIn);
  byId('signupForm').addEventListener('submit', signUp);
  byId('recoveryForm').addEventListener('submit', explainPasswordRecovery);
  byId('showRecovery').addEventListener('click', showPasswordRecovery);
  byId('backToSignin').addEventListener('click', () => setAuthMode('signin'));
  byId('shareAppLink').addEventListener('click', shareAppLink);
  document.querySelectorAll('[data-auth-mode]').forEach(button => button.addEventListener('click', () => setAuthMode(button.dataset.authMode)));
  byId('postImage').addEventListener('change', event => previewImage(event.currentTarget, byId('postPreview')));
  byId('profileImage').addEventListener('change', event => previewImage(event.currentTarget, byId('profilePreview')));
  byId('dismissNotice').addEventListener('click', () => document.querySelector('.local-notice').remove());
  byId('sortButton').addEventListener('click', () => { state.sortOldest = !state.sortOldest; renderPosts(); });
  byId('searchInput').addEventListener('input', event => { state.search = event.target.value.trim().toLowerCase(); render(); });
  byId('searchInput').addEventListener('keydown', event => { if (event.key === 'Escape') { event.currentTarget.value = ''; state.search = ''; render(); } });
  document.addEventListener('keydown', event => {
    if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) && !byId('createDialog').open) {
      event.preventDefault();
      byId('searchInput').focus();
    }
  });
  document.addEventListener('click', event => {
    const pageButton = event.target.closest('[data-page]');
    if (pageButton) { setPage(pageButton.dataset.page); return; }
    const feedButton = event.target.closest('[data-feed]');
    if (feedButton) {
      state.page = 'feed';
      state.feedType = feedButton.dataset.feed;
      document.querySelectorAll('.feed-tab').forEach(button => {
        const active = button === feedButton;
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', String(active));
      });
      render();
      return;
    }
    const roleButton = event.target.closest('[data-role-filter]');
    if (roleButton) {
      state.roleFilter = roleButton.dataset.roleFilter;
      document.querySelectorAll('.people-filter').forEach(button => button.classList.toggle('active', button === roleButton));
      renderPeople();
      return;
    }
    const action = event.target.closest('[data-action]');
    if (!action) return;
    if (action.dataset.action === 'view-profile-photo') {
      openProfilePhoto(profileById(action.dataset.id));
    } else if (action.dataset.action === 'edit-profile') {
      openDialog('profile');
    } else if (action.dataset.action === 'like') {
      const post = state.data.posts.find(item => item.id === action.dataset.id);
      if (!post) return;
      post.likedByMe = !post.likedByMe;
      post.likes = Math.max(0, (post.likes || 0) + (post.likedByMe ? 1 : -1));
      if (saveData()) renderPosts();
    } else if (action.dataset.action === 'delete-post') {
      state.data.posts = state.data.posts.filter(post => post.id !== action.dataset.id);
      if (saveData()) { render(); showToast('Post removed from this browser.'); }
    } else if (action.dataset.action === 'create-post') openDialog('post');
    else if (action.dataset.action === 'create-profile') openDialog('profile');
  });
  byId('calendarButton').addEventListener('click', () => showToast('Event details are sample content for this local demo.'));

  render();
})();
