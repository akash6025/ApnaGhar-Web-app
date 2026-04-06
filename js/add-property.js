import { auth, collection, addDoc, serverTimestamp } from './firebase.js';

function $(sel) { return document.querySelector(sel); }
function setYear() { const y = $('#year'); if (y) y.textContent = new Date().getFullYear(); }

let selectedFiles = [];
const CLOUD_NAME = window.CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = window.CLOUDINARY_UPLOAD_PRESET;

function ensureAuth() {
  return new Promise((resolve) => {
    const unsub = auth.onAuthStateChanged((user) => {
      unsub();
      if (!user) {
        // Redirect to login if not authenticated
        window.location.href = 'auth.html';
      } else {
        resolve(user);
      }
    });
  });
}

function bindImagePicker() {
  const input = $('#images');
  const preview = $('#preview');
  if (!input || !preview) return;

  input.addEventListener('change', () => {
    selectedFiles = Array.from(input.files || []).slice(0, 10);
    preview.innerHTML = '';
    selectedFiles.forEach(file => {
      const url = URL.createObjectURL(file);
      const img = document.createElement('img');
      img.src = url;
      img.onload = () => URL.revokeObjectURL(url);
      preview.appendChild(img);
    });
  });
}

async function uploadImages(userId) {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary is not configured. Please set window.CLOUDINARY_CLOUD_NAME and window.CLOUDINARY_UPLOAD_PRESET.');
  }
  const urls = [];
  for (let i = 0; i < selectedFiles.length; i++) {
    const file = selectedFiles[i];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', `properties/${userId}`);
    const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`;
    console.debug('[add-property] cloudinary uploading', { index: i, name: file.name, size: file.size, endpoint });
    const res = await fetch(endpoint, { method: 'POST', body: formData });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Cloudinary upload failed (${res.status}): ${txt}`);
    }
    const data = await res.json();
    if (!data.secure_url) {
      throw new Error('Cloudinary response missing secure_url');
    }
    urls.push(data.secure_url);
    console.debug('[add-property] cloudinary uploaded', { index: i, url: data.secure_url });
  }
  return urls;
}

function collectFormData(form) {
  const data = new FormData(form);
  const get = (k) => (data.get(k) || '').toString().trim();
  const num = (k) => {
    const v = get(k);
    return v === '' ? null : Number(v);
  };
  const boolSel = (k) => {
    const v = get(k);
    if (v === 'true') return true;
    if (v === 'false') return false;
    return null;
  };

  return {
    title: get('title'),
    propertyType: get('propertyType') || null,
    listingType: get('listingType') || null,
    price: num('price'),
    area: num('area'),
    bhk: num('bhk'),
    bathrooms: num('bathrooms'),
    furnished: get('furnished') || null,
    parking: boolSel('parking'),
    city: get('city') || null,
    locality: get('locality') || null,
    floor: num('floor'),
    address: get('address') || null,
    contactName: get('contactName') || null,
    contactPhone: get('contactPhone') || null,
    description: get('description') || null,
  };
}

function disableForm(disabled) {
  const submit = $('#submitBtn');
  const cancel = $('#cancelBtn');
  if (submit) submit.disabled = disabled;
  if (cancel) cancel.disabled = disabled;
}

async function handleSubmit(user, e) {
  e.preventDefault();
  const form = e.target;
  disableForm(true);
  try {
    console.debug('[add-property] submit start');
    const docData = collectFormData(form);
    if (!docData.title) {
      alert('Title is required.');
      disableForm(false);
      return;
    }

    // Upload images if any
    const imageUrls = await uploadImages(user.uid);
    console.debug('[add-property] images uploaded', { count: imageUrls.length });

    const payload = {
      ...docData,
      images: imageUrls,
      ownerId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      views: 0,
    };

    console.debug('[add-property] adding firestore doc', payload);
    await addDoc(collection(window.db, 'properties'), payload);
    console.debug('[add-property] firestore doc added');
    alert('Property added successfully!');
    window.location.href = 'admin.html';
  } catch (err) {
    console.error('Add property failed:', err);
    alert(`Failed to add property: ${err && err.message ? err.message : 'Unknown error'}`);
    disableForm(false);
  }
}

function bindForm(user) {
  const form = $('#addPropertyForm');
  const cancel = $('#cancelBtn');
  if (form) form.addEventListener('submit', (e) => handleSubmit(user, e));
  if (cancel) cancel.addEventListener('click', () => {
    if (confirm('Discard changes and go back to My Dashboard?')) {
      window.location.href = 'admin.html';
    }
  });
}

async function init() {
  setYear();
  const user = await ensureAuth();
  bindImagePicker();
  bindForm(user);
}

init();
