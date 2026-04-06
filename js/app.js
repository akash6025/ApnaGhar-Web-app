import { auth, db, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, serverTimestamp, collection, addDoc, doc, getDoc, getDocs, query, where, orderBy, limit, updateDoc, deleteDoc, startAfter } from './firebase.js';

const view = document.getElementById('view');
const year = document.getElementById('year');
year.textContent = new Date().getFullYear();

const routes = {
  home: renderHome,
  listings: renderListings,
  favorites: renderFavorites,
  profile: renderProfile,
  admin: renderAdmin,
};

// Router
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => navigate(btn.dataset.route));
});

function navigate(route) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.route === route));
  window.history.pushState({ route }, '', `#${route}`);
  routes[route]?.();
}

window.addEventListener('popstate', () => {
  const route = location.hash.replace('#', '') || 'home';
  routes[route]?.();
});

// Auth
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userBadge = document.getElementById('userBadge');
const adminNav = document.getElementById('adminNav');

loginBtn.addEventListener('click', async () => showAuthDialog());

logoutBtn.addEventListener('click', async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, async (user) => {
  if (user) {
    loginBtn.style.display = 'none';
    logoutBtn.style.display = 'inline-flex';
    userBadge.style.display = 'inline-flex';
    userBadge.textContent = user.displayName || user.email;

    // Simple role check from custom claims-like collection
    const roleDoc = await getDoc(doc(db, 'roles', user.uid));
    const isAdmin = roleDoc.exists() && roleDoc.data().role === 'admin';
    adminNav.style.display = isAdmin ? 'inline-flex' : 'none';
  } else {
    loginBtn.style.display = 'inline-flex';
    logoutBtn.style.display = 'none';
    userBadge.style.display = 'none';
    adminNav.style.display = 'none';
  }

  const route = location.hash.replace('#', '') || 'home';
  routes[route]?.();
});

function showAuthDialog() {
  const wrapper = document.createElement('div');
  Object.assign(wrapper.style, { position: 'fixed', inset: '0', display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.5)', zIndex: '100' });
  wrapper.innerHTML = `
    <div class="card" style="width: 420px; max-width: 94vw;">
      <h3 style="margin-top:0;">Login / Sign up</h3>
      <div class="field">
        <label>Email</label>
        <input id="dlgEmail" class="input" type="email" />
      </div>
      <div class="field">
        <label>Password</label>
        <input id="dlgPass" class="input" type="password" />
      </div>
      <div class="actions" style="display:flex; gap:8px; margin-top:12px;">
        <button class="primary" id="dlgLogin">Login</button>
        <button class="ghost" id="dlgSignup">Sign up</button>
        <div style="flex:1;"></div>
        <button class="ghost" id="dlgGoogle">Continue with Google</button>
        <button class="ghost" id="dlgClose">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(wrapper);
  const close = () => wrapper.remove();
  wrapper.querySelector('#dlgClose').addEventListener('click', close);
  wrapper.addEventListener('click', (e) => { if (e.target === wrapper) close(); });
  wrapper.querySelector('#dlgGoogle').addEventListener('click', async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      close();
    } catch (e) { alert(e.message); }
  });
  wrapper.querySelector('#dlgLogin').addEventListener('click', async () => {
    const email = wrapper.querySelector('#dlgEmail').value.trim();
    const pass = wrapper.querySelector('#dlgPass').value;
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      close();
    } catch (e) { alert(e.message); }
  });
  wrapper.querySelector('#dlgSignup').addEventListener('click', async () => {
    const email = wrapper.querySelector('#dlgEmail').value.trim();
    const pass = wrapper.querySelector('#dlgPass').value;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      if (email.includes('@')) {
        await updateProfile(cred.user, { displayName: email.split('@')[0] });
      }
      close();
    } catch (e) { alert(e.message); }
  });
}

function renderHome() {
  view.innerHTML = `
    <section class="hero card">
      <div>
        <h2>Find your dream home with ApnaGhar</h2>
        <p>Browse verified listings for rent and sale across India. Save favorites and contact owners or agents directly.</p>
        <div class="actions">
          <button class="primary" data-route="listings" id="startBrowsing">Start Browsing</button>
          <button class="ghost" data-route="admin" id="addListing">List a Property</button>
        </div>
      </div>
      <div class="card">
        <div class="row">
          <div class="field" style="flex:2;">
            <label>Location</label>
            <input class="input" id="homeLocation" placeholder="City, locality or project" />
          </div>
          <div class="field">
            <label>Type</label>
            <select id="homeType">
              <option value="">Any</option>
              <option>Apartment</option>
              <option>Villa</option>
              <option>Plot</option>
              <option>Commercial</option>
            </select>
          </div>
          <div class="field">
            <label>Purpose</label>
            <select id="homePurpose">
              <option>Buy</option>
              <option>Rent</option>
            </select>
          </div>
        </div>
        <div class="actions">
          <button class="primary" id="homeSearchBtn">Search</button>
        </div>
      </div>
    </section>
    <section style="margin-top:20px;">
      <h3>Latest Listings</h3>
      <div class="grid" id="latestGrid"></div>
    </section>
  `;

  document.getElementById('startBrowsing').addEventListener('click', () => navigate('listings'));
  document.getElementById('addListing').addEventListener('click', () => navigate('admin'));
  document.getElementById('homeSearchBtn').addEventListener('click', () => navigate('listings'));

  loadLatest();
}

async function loadLatest() {
  let snap;
  try {
    const q = query(collection(db, 'properties'), orderBy('createdAt', 'desc'), limit(8));
    snap = await getDocs(q);
  } catch (e) {
    alert('Failed to load latest listings. Please try again.');
    return;
  }
  const grid = document.getElementById('latestGrid');
  grid.innerHTML = '';
  snap.forEach(docSnap => {
    const data = docSnap.data();
    grid.appendChild(renderListingCard(docSnap.id, data));
  });
}

function renderListings() {
  view.innerHTML = `
    <section class="card">
      <div class="row">
        <div class="field" style="flex:2;">
          <label>Search</label>
          <input id="q" class="input" placeholder="City, locality, project, RERA" />
        </div>
        <div class="field">
          <label>Property Type</label>
          <select id="type">
            <option value="">Any</option>
            <option value="apartment">Apartment</option>
            <option value="house">House</option>
            <option value="villa">Villa</option>
            <option value="plot">Plot</option>
          </select>
        </div>
        <div class="field">
          <label>Listing Type</label>
          <select id="purpose">
            <option value="">Any</option>
            <option value="sale">Buy</option>
            <option value="rent">Rent</option>
          </select>
        </div>
        <div class="field">
          <label>Min Price (₹)</label>
          <input id="pmin" class="input" type="number" min="0" />
        </div>
        <div class="field">
          <label>Max Price (₹)</label>
          <input id="pmax" class="input" type="number" min="0" />
        </div>
        <div class="field">
          <label>BHK</label>
          <select id="bhk">
            <option value="">Any</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>
        </div>
      </div>
    </section>
    <div class="grid" style="margin-top:16px;" id="listGrid"></div>
    <div style="display:flex; justify-content:center; margin:16px 0;">
      <button class="ghost" id="loadMore">Load More</button>
    </div>
  `;

  const inputs = ['q','type','purpose','pmin','pmax','bhk'].map(id => document.getElementById(id));
  inputs.forEach(el => el.addEventListener('input', refreshListings));
  refreshListings();
}

let lastCursor = null;
let currentConstraints = [];
let currentTerm = '';

async function refreshListings() {
  const qEl = document.getElementById('q');
  const typeEl = document.getElementById('type');
  const purposeEl = document.getElementById('purpose');
  const pminEl = document.getElementById('pmin');
  const pmaxEl = document.getElementById('pmax');
  const bhkEl = document.getElementById('bhk');

  let constraints = [];
  if (typeEl.value) constraints.push(where('propertyType', '==', typeEl.value));
  if (purposeEl.value) constraints.push(where('listingType', '==', purposeEl.value));
  if (bhkEl && bhkEl.value) constraints.push(where('bhk', '==', Number(bhkEl.value)));
  const minVal = pminEl && pminEl.value ? Number(pminEl.value) : null;
  const maxVal = pmaxEl && pmaxEl.value ? Number(pmaxEl.value) : null;
  if (minVal !== null) constraints.push(where('price', '>=', minVal));
  if (maxVal !== null) constraints.push(where('price', '<=', maxVal));

  const qRef = constraints.length
    ? query(collection(db, 'properties'), ...constraints, orderBy('createdAt','desc'), limit(24))
    : query(collection(db, 'properties'), orderBy('createdAt','desc'), limit(24));

  let snap;
  try {
    snap = await getDocs(qRef);
  } catch (e) {
    alert('Failed to load listings. Please try again.');
    return;
  }
  const grid = document.getElementById('listGrid');
  grid.innerHTML = '';

  const term = (qEl.value || '').toLowerCase().trim();
  snap.forEach(docSnap => {
    const data = docSnap.data();
    const hay = `${data.city||''} ${data.locality||''} ${data.address||''} ${data.title||''}`.toLowerCase();
    if (!term || hay.includes(term)) {
      grid.appendChild(renderListingCard(docSnap.id, data));
    }
  });
  lastCursor = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;
  currentConstraints = constraints;
  currentTerm = term;
  const loadMoreBtn = document.getElementById('loadMore');
  loadMoreBtn.style.display = lastCursor ? 'inline-flex' : 'none';
  loadMoreBtn.onclick = loadMore;
}

async function loadMore() {
  if (!lastCursor) return;
  const qRef = currentConstraints.length
    ? query(collection(db, 'properties'), ...currentConstraints, orderBy('createdAt','desc'), startAfter(lastCursor), limit(24))
    : query(collection(db, 'properties'), orderBy('createdAt','desc'), startAfter(lastCursor), limit(24));

  let snap;
  try {
    snap = await getDocs(qRef);
  } catch (e) {
    alert('Failed to load more listings');
    return;
  }
  const grid = document.getElementById('listGrid');
  snap.forEach(docSnap => {
    const data = docSnap.data();
    const hay = `${data.city||''} ${data.locality||''} ${data.address||''} ${data.title||''}`.toLowerCase();
    if (!currentTerm || hay.includes(currentTerm)) {
      grid.appendChild(renderListingCard(docSnap.id, data));
    }
  });
  lastCursor = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;
  const loadMoreBtn = document.getElementById('loadMore');
  loadMoreBtn.style.display = lastCursor ? 'inline-flex' : 'none';
}

function renderListingCard(id, data) {
  const card = document.createElement('article');
  card.className = 'card listing-card';
  const img = (data.images && data.images[0]) || data.imageUrl || '/public/placeholder.jpg';
  card.innerHTML = `
    <img src="${img}" alt="${data.title||'Listing'}" />
    <div class="listing-meta">
      <div>
        <div class="price">₹ ${Number(data.price||0).toLocaleString('en-IN')}</div>
        <div class="pill">${data.propertyType||'property'} • ${data.listingType||''}</div>
        <div style="color:var(--muted); font-size:12px;">${data.city||''} ${data.locality? '• '+data.locality: ''}</div>
      </div>
      <div style="display:flex; gap:6px;">
        <button class="ghost" data-id="${id}" data-action="view">Details</button>
        <button class="fav-btn" data-id="${id}" aria-label="favorite">❤</button>
      </div>
    </div>
  `;

  const favBtn = card.querySelector('.fav-btn');
  favBtn.addEventListener('click', () => toggleFavorite(id, favBtn));
  syncFavoriteState(id, favBtn);

  card.querySelector('[data-action="view"]').addEventListener('click', () => showDetails(id, data));
  return card;
}

async function syncFavoriteState(listingId, buttonEl) {
  const user = auth.currentUser;
  if (!user) { buttonEl.classList.remove('active'); return; }
  try {
    const favDoc = await getDoc(doc(db, 'favorites', user.uid, 'properties', listingId));
    buttonEl.classList.toggle('active', favDoc.exists());
  } catch (e) {
    buttonEl.classList.remove('active');
  }
}

async function toggleFavorite(listingId, buttonEl) {
  const user = auth.currentUser;
  if (!user) { alert('Login to save favorites'); return; }
  const favRef = doc(db, 'favorites', user.uid, 'properties', listingId);
  const exists = (await getDoc(favRef)).exists();
  if (exists) {
    try { await deleteDoc(favRef); } catch (e) { alert('Failed to remove favorite'); }
  } else {
    try { await setDocSafe(favRef, { propertyId: listingId, createdAt: serverTimestamp() }); } catch (e) { alert('Failed to save favorite'); }
  }
  syncFavoriteState(listingId, buttonEl);
}

async function setDocSafe(refObj, data) {
  // Lazy import to avoid circular
  const { setDoc } = await import('https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js');
  return setDoc(refObj, data);
}

function renderFavorites() {
  const user = auth.currentUser;
  if (!user) {
    view.innerHTML = `<div class="card">Please login to see your favorites.</div>`;
    return;
  }
  view.innerHTML = `
    <section class="card">
      <h3>Your Favorites</h3>
      <div class="grid" id="favGrid"></div>
    </section>
  `;
  loadFavorites();
}

async function loadFavorites() {
  const user = auth.currentUser; if (!user) return;
  let favSnap;
  try {
    favSnap = await getDocs(collection(db, 'favorites', user.uid, 'properties'));
  } catch (e) {
    alert('Failed to load favorites');
    return;
  }
  const ids = favSnap.docs.map(d => d.id);
  const grid = document.getElementById('favGrid');
  grid.innerHTML = '';
  for (const id of ids) {
    const docSnap = await getDoc(doc(db, 'properties', id));
    if (docSnap.exists()) grid.appendChild(renderListingCard(id, docSnap.data()));
  }
}

function showDetails(id, data) {
  const wrapper = document.createElement('div');
  Object.assign(wrapper.style, { position: 'fixed', inset: '0', display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.5)', zIndex: '100' });
  const gallery = (data.images && data.images.length) ? data.images : (data.imageUrl ? [data.imageUrl] : []);
  const slides = gallery.map(u => `<img src="${u}" style="width:100%; height:240px; object-fit:cover; border-radius:10px;" />`).join('');
  const canDelete = auth.currentUser && data.ownerId === auth.currentUser.uid;
  wrapper.innerHTML = `
    <div class="card" style="width: 720px; max-width: 95vw;">
      <div class="row" style="justify-content: space-between; align-items:center;">
        <h3 style="margin:0;">${data.title||'Property'}</h3>
        <button class="ghost" id="dlgClose">Close</button>
      </div>
      <div style="margin-top:10px;">${slides || `<img src="/public/placeholder.jpg" style="width:100%; height:240px; object-fit:cover; border-radius:10px;" />`}</div>
      <div class="row" style="margin-top:10px; align-items:center; justify-content:space-between;">
        <div>
          <div class="price">₹ ${Number(data.price||0).toLocaleString('en-IN')}</div>
          <div class="pill">${data.propertyType||''} • ${data.listingType||''}</div>
          <div style="color:var(--muted); font-size:12px;">${data.city||''} ${data.locality? '• '+data.locality: ''}</div>
          <div style="color:var(--muted); font-size:12px;">${data.area? data.area+' sqft • ': ''}${data.bhk? data.bhk+' BHK • ': ''}${data.furnished||''}</div>
        </div>
        <div class="row">
          <button class="fav-btn" id="dlgFav">❤</button>
          ${canDelete ? '<button class="ghost" id="dlgDelete" style="border-color:#e5534b; color:#e5534b;">Delete</button>' : ''}
        </div>
      </div>
      <p style="margin-top:10px;">${data.description||''}</p>
      ${data.contactPhone || data.contactName ? `<div class="card" style="margin-top:10px;"><b>Contact:</b> ${data.contactName||''} ${data.contactPhone? '• '+data.contactPhone: ''}</div>` : ''}
    </div>
  `;
  document.body.appendChild(wrapper);
  const close = () => wrapper.remove();
  wrapper.querySelector('#dlgClose').addEventListener('click', close);
  wrapper.addEventListener('click', (e) => { if (e.target === wrapper) close(); });
  const favBtn = wrapper.querySelector('#dlgFav');
  favBtn.addEventListener('click', async () => toggleFavorite(id, favBtn));
  syncFavoriteState(id, favBtn);
  const delBtn = wrapper.querySelector('#dlgDelete');
  if (delBtn) {
    delBtn.addEventListener('click', async () => {
      if (!confirm('Delete this property?')) return;
      try {
        await deleteDoc(doc(db, 'properties', id));
        alert('Deleted');
        close();
        const route = location.hash.replace('#','') || 'home';
        if (route === 'listings') refreshListings();
        if (route === 'admin') loadMyListings();
      } catch (e) { alert(e.message); }
    });
  }
}

function renderProfile() {
  const user = auth.currentUser;
  if (!user) { view.innerHTML = `<div class="card">Please login.</div>`; return; }
  view.innerHTML = `
    <section class="card">
      <h3>Your Profile</h3>
      <div class="row">
        <div class="field" style="flex:2;">
          <label>Display Name</label>
          <input id="pName" class="input" value="${user.displayName || ''}" />
        </div>
        <div class="field" style="flex:2;">
          <label>Email</label>
          <input class="input" value="${user.email || ''}" disabled />
        </div>
      </div>
      <div class="actions" style="margin-top:12px;">
        <button class="primary" id="pSave">Save</button>
      </div>
    </section>
  `;
  document.getElementById('pSave').addEventListener('click', async () => {
    const name = document.getElementById('pName').value.trim();
    try {
      await updateProfile(user, { displayName: name });
      alert('Profile updated');
    } catch (e) { alert(e.message); }
  });
}

function renderAdmin() {
  const user = auth.currentUser;
  if (!user) { view.innerHTML = `<div class="card">Please login.</div>`; return; }

  view.innerHTML = `
    <section class="card">
      <h3>Add Property</h3>
      <div class="row">
        <div class="field" style="flex:2;">
          <label>Title</label>
          <input id="lTitle" class="input" />
        </div>
        <div class="field">
          <label>Property Type</label>
          <select id="lType">
            <option value="apartment">Apartment</option>
            <option value="house">House</option>
            <option value="villa">Villa</option>
            <option value="plot">Plot</option>
          </select>
        </div>
        <div class="field">
          <label>Listing Type</label>
          <select id="lPurpose">
            <option value="sale">Buy</option>
            <option value="rent">Rent</option>
          </select>
        </div>
      </div>
      <div class="row">
        <div class="field">
          <label>Price (₹)</label>
          <input id="lPrice" class="input" type="number" />
        </div>
        <div class="field">
          <label>City</label>
          <input id="lCity" class="input" />
        </div>
        <div class="field" style="flex:2;">
          <label>Locality</label>
          <input id="lLocality" class="input" />
        </div>
      </div>
      <div class="row">
        <div class="field">
          <label>Area (sqft)</label>
          <input id="lArea" class="input" type="number" />
        </div>
        <div class="field">
          <label>BHK</label>
          <select id="lBhk">
            <option value="">Select</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>
        </div>
        <div class="field">
          <label>Furnished</label>
          <select id="lFurnished">
            <option value="">Select</option>
            <option value="unfurnished">Unfurnished</option>
            <option value="semi-furnished">Semi-furnished</option>
            <option value="fully-furnished">Fully-furnished</option>
          </select>
        </div>
      </div>
      <div class="field">
        <label>Description</label>
        <textarea id="lDesc" rows="4"></textarea>
      </div>
      <div class="field">
        <label>Image URLs (comma separated, max 10)</label>
        <textarea id="lImages" rows="3" placeholder="https://... , https://..."></textarea>
      </div>
      <div class="row">
        <div class="field" style="flex:2;">
          <label>Contact Name</label>
          <input id="lContactName" class="input" />
        </div>
        <div class="field" style="flex:2;">
          <label>Contact Phone</label>
          <input id="lContactPhone" class="input" />
        </div>
      </div>
      <div class="actions">
        <button class="primary" id="saveListing">Save Listing</button>
      </div>
    </section>
    <section class="card" style="margin-top:16px;">
      <h3>Your Properties</h3>
      <div id="myList" class="grid"></div>
    </section>
  `;

  document.getElementById('saveListing').addEventListener('click', saveListing);
  loadMyListings();
}

async function saveListing() {
  const user = auth.currentUser; if (!user) return;
  const title = document.getElementById('lTitle').value.trim();
  const type = document.getElementById('lType').value;
  const purpose = document.getElementById('lPurpose').value;
  const price = Number(document.getElementById('lPrice').value || 0);
  const city = document.getElementById('lCity').value.trim();
  const locality = document.getElementById('lLocality').value.trim();
  const description = document.getElementById('lDesc').value.trim();
  const imagesInput = document.getElementById('lImages').value.trim();
  const images = imagesInput ? imagesInput.split(',').map(s => s.trim()).filter(Boolean).slice(0,10) : [];
  const area = Number(document.getElementById('lArea').value || 0) || null;
  const bhk = document.getElementById('lBhk').value ? Number(document.getElementById('lBhk').value) : null;
  const furnished = document.getElementById('lFurnished').value || null;
  const contactName = document.getElementById('lContactName').value.trim();
  const contactPhone = document.getElementById('lContactPhone').value.trim();

  await addDoc(collection(db, 'properties'), {
    title,
    propertyType: type,
    listingType: purpose,
    price,
    city,
    locality,
    description,
    images,
    area: area ?? undefined,
    bhk: bhk ?? undefined,
    furnished: furnished ?? undefined,
    contactName: contactName || undefined,
    contactPhone: contactPhone || undefined,
    ownerId: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  alert('Listing saved');
  navigate('listings');
}

async function loadMyListings() {
  const user = auth.currentUser; if (!user) return;
  let snap;
  try {
    snap = await getDocs(query(collection(db, 'properties'), where('ownerId', '==', user.uid), orderBy('createdAt','desc')));
  } catch (e) {
    alert('Failed to load your properties');
    return;
  }
  const container = document.getElementById('myList');
  container.innerHTML = '';
  snap.forEach(d => container.appendChild(renderListingCard(d.id, d.data())));
}

// Initial route
const initialRoute = location.hash.replace('#','') || 'home';
routes[initialRoute]?.();



