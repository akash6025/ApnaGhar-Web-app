import { auth, collection, getDocs, query, where, deleteDoc, doc } from './firebase.js';

function $(sel) { return document.querySelector(sel); }

async function ensureAuth() {
  return new Promise((resolve) => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) {
        unsub();
        resolve(user);
      }
    });
  });
}

function renderCard(id, p) {
  const img = (p.images && p.images[0]) || '/public/placeholder.jpg';
  const price = Number(p.price || 0).toLocaleString('en-IN');
  const priceText = p.listingType === 'rent' ? `₹${price}/month` : `₹${price}`;
  const el = document.createElement('article');
  el.className = 'property-card';
  el.innerHTML = `
    <img src="${img}" alt="${p.title || 'Property'}" class="property-image" onerror="this.src='/public/placeholder.jpg'" />
    <div class="property-content">
      <div class="property-price">${priceText}</div>
      <div class="property-type">${p.propertyType || 'Property'} • ${p.listingType || ''}</div>
      <div class="property-location">${p.city || ''}${p.locality ? ' • ' + p.locality : ''}</div>
      ${(p.area || p.bhk) ? `<div class="property-details">${p.area ? `<span class='property-detail'>📐 ${p.area} sqft</span>` : ''}${p.bhk ? ` <span class='property-detail'>🏠 ${p.bhk} BHK</span>` : ''}</div>` : ''}
      <div class="property-actions">
        <a class="btn btn-secondary btn-sm" href="add-property.html?edit=${id}">Edit</a>
        <button class="btn btn-ghost btn-sm" data-delete="${id}">Delete</button>
      </div>
    </div>
  `;
  return el;
}

async function loadMyProperties(uid) {
  const grid = $('#adminPropertiesGrid');
  const empty = $('#adminEmptyState');
  if (!grid) return;
  grid.innerHTML = '';

  const q = query(collection(window.db, 'properties'), where('ownerId', '==', uid));
  const snap = await getDocs(q);

  if (snap.empty) {
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  snap.forEach(d => {
    const card = renderCard(d.id, d.data());
    grid.appendChild(card);
  });

  grid.querySelectorAll('button[data-delete]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-delete');
      if (!confirm('Delete this property?')) return;
      try {
        await deleteDoc(doc(window.db, 'properties', id));
        btn.closest('.property-card')?.remove();
        if (!grid.querySelector('.property-card')) {
          if (empty) empty.style.display = 'block';
        }
        alert('Property deleted.');
      } catch (e) {
        console.error(e);
        alert('Failed to delete property.');
      }
    });
  });
}

async function init() {
  const user = await ensureAuth();
  await loadMyProperties(user.uid);
  const refresh = $('#refreshProperties');
  if (refresh) refresh.addEventListener('click', () => loadMyProperties(user.uid));
}

document.addEventListener('DOMContentLoaded', init);
