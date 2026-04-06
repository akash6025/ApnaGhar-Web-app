import { auth, collection, query, where, getDocs, deleteDoc, doc } from './firebase.js';

function setYear() {
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
}

function showLoginRequired() {
  const main = document.querySelector('.main-content .container');
  if (!main) return;
  main.innerHTML = `
    <div style="text-align:center; padding:80px 20px;">
      <h2>🔐 Login Required</h2>
      <p style="margin: 16px 0;">Please log in to view your properties.</p>
      <a href="auth.html" class="btn btn-primary">Login / Sign Up</a>
    </div>
  `;
}

async function loadProperties(uid) {
  const tbody = document.querySelector('#propertiesTable tbody');
  const empty = document.getElementById('emptyState');
  if (!tbody) return;

  tbody.innerHTML = '';

  const q = query(collection(window.db, 'properties'), where('ownerId', '==', uid));
  const snap = await getDocs(q);

  if (snap.empty) {
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  snap.forEach(d => {
    const p = d.data();
    const tr = document.createElement('tr');
    const price = Number(p.price || 0).toLocaleString('en-IN');
    tr.innerHTML = `
      <td>${p.title || '-'}</td>
      <td>${p.propertyType || '-'}</td>
      <td>${p.listingType || '-'}</td>
      <td>${p.city || '-'}</td>
      <td>${p.listingType === 'rent' ? `₹${price}/month` : `₹${price}`}</td>
      <td>${p.bhk ?? '-'}</td>
      <td>
        <div class="actions">
          <a class="btn btn-secondary" href="admin.html?edit=${d.id}">Edit</a>
          <button class="btn btn-danger" data-delete="${d.id}">Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Attach delete handlers
  tbody.querySelectorAll('button[data-delete]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-delete');
      if (!confirm('Are you sure you want to delete this property?')) return;
      try {
        await deleteDoc(doc(window.db, 'properties', id));
        btn.closest('tr')?.remove();
        if (!tbody.querySelector('tr')) {
          const empty = document.getElementById('emptyState');
          if (empty) empty.style.display = 'block';
        }
        alert('Property deleted successfully!');
      } catch (e) {
        console.error(e);
        alert('Failed to delete property.');
      }
    });
  });
}

function bindControls(user) {
  const refresh = document.getElementById('refreshBtn');
  if (refresh) refresh.addEventListener('click', () => loadProperties(user.uid));
}

// Initialize
setYear();

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    showLoginRequired();
    return;
  }
  bindControls(user);
  await loadProperties(user.uid);
});
