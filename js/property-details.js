// Property Details Page
import { doc, getDoc, getDocs, collection, query, where, limit, addDoc, serverTimestamp } from './firebase.js';
import { auth } from './firebase.js';

let currentProperty = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Wait for Firebase to initialize
  const initializeApp = async () => {
    if (!window.db) {
      console.log('Waiting for Firebase to initialize...');
      setTimeout(initializeApp, 100);
      return;
    }
    
    console.log('Firebase initialized, loading property details...');
    const urlParams = new URLSearchParams(window.location.search);
    const propertyId = urlParams.get('id');
    console.debug('[property-details] propertyId =', propertyId);

    if (!propertyId) {
      console.error('[property-details] No property id in URL');
      showErrorState('Missing property id.');
      setTimeout(() => window.location.href = 'index.html', 1000);
      return;
    }

    await loadPropertyDetails(propertyId);
    setupEventListeners();
  };
  
  initializeApp();
});

async function loadPropertyDetails(propertyId) {
  try {
    const propertyDoc = await getDoc(doc(window.db, 'properties', propertyId));
    
    if (!propertyDoc.exists()) {
      console.warn('[property-details] Property not found:', propertyId);
      showErrorState('Property not found.');
      setTimeout(() => window.location.href = 'index.html', 1200);
      return;
    }

    currentProperty = { id: propertyId, ...propertyDoc.data() };
    displayPropertyDetails(currentProperty);
    await loadSimilarProperties(currentProperty);
    await checkFavoriteStatus(propertyId);
    hidePageLoader();
  } catch (error) {
    console.error('[property-details] Error loading property:', error);
    showErrorState(error && error.message ? error.message : 'Failed to load property details');
    hidePageLoader();
  }
}

function displayPropertyDetails(property) {
  // Update title and meta
  document.title = `${property.title} - ApnaGhar`;
  
  // Breadcrumb
  const bcCity = document.getElementById('breadcrumbCity');
  const bcTitle = document.getElementById('breadcrumbTitle');
  if (bcCity) bcCity.textContent = property.city || '';
  if (bcTitle) bcTitle.textContent = property.title || '';

  // Images
  const images = property.images || ['/public/placeholder.jpg'];
  document.getElementById('mainImage').src = images[0];
  document.getElementById('imageCounter').textContent = `1 / ${images.length}`;
  
  const thumbnailGrid = document.getElementById('thumbnailGrid');
  if (thumbnailGrid) thumbnailGrid.innerHTML = '';
  images.forEach((img, index) => {
    const thumb = document.createElement('img');
    thumb.src = img;
    thumb.className = index === 0 ? 'thumbnail active' : 'thumbnail';
    thumb.addEventListener('click', () => {
      document.getElementById('mainImage').src = img;
      document.getElementById('imageCounter').textContent = `${index + 1} / ${images.length}`;
      document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
    });
    if (thumbnailGrid) thumbnailGrid.appendChild(thumb);
  });

  // Basic info
  const elTitle = document.getElementById('propertyTitle');
  const elLoc = document.getElementById('propertyLocation');
  if (elTitle) elTitle.textContent = property.title || '';
  if (elLoc) elLoc.textContent = `${property.locality || ''}${property.city ? (property.locality ? ', ' : '') + property.city : ''}`;
  
  const price = Number(property.price || 0).toLocaleString('en-IN');
  const priceText = property.listingType === 'rent' ? `₹${price}/month` : `₹${price}`;
  const elPrice = document.getElementById('propertyPrice');
  if (elPrice) elPrice.textContent = priceText;

  // Key features
  const elType = document.getElementById('propertyType');
  const elBhk = document.getElementById('propertyBHK');
  const elArea = document.getElementById('propertyArea');
  const elPark = document.getElementById('propertyParking');
  const elFurn = document.getElementById('propertyFurnished');
  const elBath = document.getElementById('propertyBathrooms');
  if (elType) elType.textContent = capitalize(property.propertyType || 'N/A');
  if (elBhk) elBhk.textContent = property.bhk ? `${property.bhk} BHK` : 'N/A';
  if (elArea) elArea.textContent = property.area ? `${property.area} sq.ft` : 'N/A';
  if (elPark) elPark.textContent = property.parking ? 'Available' : 'Not Available';
  if (elFurn) elFurn.textContent = capitalize(property.furnished || 'N/A');
  if (elBath) elBath.textContent = property.bathrooms || 'N/A';

  // Description
  const elDesc = document.getElementById('propertyDescription');
  if (elDesc) elDesc.textContent = property.description || 'No description available.';

  // Address
  const elAddr = document.getElementById('propertyAddress');
  if (elAddr) elAddr.textContent = property.address || `${property.locality || ''}${property.city ? (property.locality ? ', ' : '') + property.city : ''}`;

  // Amenities
  const amenitiesGrid = document.getElementById('amenitiesGrid');
  const amenities = [
    property.parking && '🚗 Parking',
    property.balcony && `🌿 ${property.balcony} Balcony`,
    property.furnished === 'fully-furnished' && '🪑 Fully Furnished',
    property.furnished === 'semi-furnished' && '🛋️ Semi Furnished',
    '🔒 Security',
    '💧 Water Supply',
    '⚡ Power Backup',
    '🏋️ Gym'
  ].filter(Boolean);

  if (amenitiesGrid) amenitiesGrid.innerHTML = amenities.map(a => `<div class="amenity-item">${a}</div>`).join('');

  // Owner info
  const elOwner = document.getElementById('ownerName');
  const elPhone = document.getElementById('ownerPhone');
  if (elOwner) elOwner.textContent = property.contactName || 'Property Owner';
  if (elPhone) elPhone.textContent = property.contactPhone || 'Contact for details';
  
  const initials = (property.contactName || 'Owner')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const elInit = document.getElementById('ownerInitials');
  if (elInit) elInit.textContent = initials;
  // Data is rendered; ensure loader is hidden in case it's still visible
  hidePageLoader();
}

async function loadSimilarProperties(property) {
  try {
    const q = query(
      collection(window.db, 'properties'),
      where('city', '==', property.city),
      where('propertyType', '==', property.propertyType),
      limit(4)
    );
    
    const snap = await getDocs(q);
    const similarGrid = document.getElementById('similarPropertiesGrid');
    similarGrid.innerHTML = '';

    snap.forEach(doc => {
      if (doc.id === property.id) return; // Skip current property
      
      const data = doc.data();
      const card = createSimilarPropertyCard(doc.id, data);
      similarGrid.appendChild(card);
    });

    if (similarGrid.children.length === 0) {
      similarGrid.innerHTML = '<p style="color: var(--muted);">No similar properties found</p>';
    }
  } catch (error) {
    console.error('Error loading similar properties:', error);
  }
}

function createSimilarPropertyCard(id, data) {
  const card = document.createElement('a');
  card.href = `property-details.html?id=${id}`;
  card.className = 'similar-card';
  
  const img = (data.images && data.images[0]) || '/public/placeholder.jpg';
  const price = Number(data.price || 0).toLocaleString('en-IN');
  const priceText = data.listingType === 'rent' ? `₹${price}/mo` : `₹${price}`;
  
  card.innerHTML = `
    <img src="${img}" alt="${data.title}" />
    <div class="similar-info">
      <h4>${data.title}</h4>
      <p class="similar-price">${priceText}</p>
      <p class="similar-meta">${data.bhk} BHK • ${data.area} sq.ft</p>
    </div>
  `;
  
  return card;
}

async function checkFavoriteStatus(propertyId) {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const favoriteDoc = await getDoc(doc(window.db, 'favorites', user.uid, 'properties', propertyId));
    const favoriteBtn = document.getElementById('favoriteBtn');
    
    if (favoriteDoc.exists()) {
      favoriteBtn.textContent = '♥';
      favoriteBtn.classList.add('active');
    }
  } catch (error) {
    console.error('Error checking favorite:', error);
  }
}

function setupEventListeners() {
  // Favorite button
  const fav = document.getElementById('favoriteBtn');
  if (fav) fav.addEventListener('click', toggleFavorite);

  // Contact owner
  const contactBtn = document.getElementById('contactOwnerBtn');
  if (contactBtn) {
    contactBtn.addEventListener('click', () => {
      const modal = document.getElementById('contactModal');
      if (modal) modal.style.display = 'flex';
    });
  }

  // Schedule visit
  document.getElementById('scheduleVisitBtn').addEventListener('click', () => {
    alert('Schedule visit feature coming soon!');
  });

  // Share property
  document.getElementById('sharePropertyBtn').addEventListener('click', () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: currentProperty.title, url });
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  });

  // Contact modal
  const closeModal = document.getElementById('closeContactModal');
  if (closeModal) {
    closeModal.addEventListener('click', () => {
      const modal = document.getElementById('contactModal');
      if (modal) modal.style.display = 'none';
    });
  }

  const contactForm = document.getElementById('contactForm');
  if (contactForm) contactForm.addEventListener('submit', handleContactSubmit);
}

async function toggleFavorite() {
  const user = auth.currentUser;
  
  if (!user) {
    alert('Please login to save favorites');
    window.location.href = 'login.html';
    return;
  }

  const favoriteBtn = document.getElementById('favoriteBtn');
  const propertyId = currentProperty.id;

  try {
    const favoriteRef = doc(window.db, 'favorites', user.uid, 'properties', propertyId);
    const favoriteDoc = await getDoc(favoriteRef);

    if (favoriteDoc.exists()) {
      // Remove from favorites
      const { deleteDoc } = await import('./firebase.js');
      await deleteDoc(favoriteRef);
      favoriteBtn.textContent = '♡';
      favoriteBtn.classList.remove('active');
    } else {
      // Add to favorites
      const { setDoc } = await import('./firebase.js');
      await setDoc(favoriteRef, {
        addedAt: serverTimestamp()
      });
      favoriteBtn.textContent = '♥';
      favoriteBtn.classList.add('active');
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    alert('Failed to update favorites');
  }
}

async function handleContactSubmit(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const contactData = {
    propertyId: currentProperty.id,
    propertyTitle: currentProperty.title,
    name: formData.get('contactName'),
    email: formData.get('contactEmail'),
    phone: formData.get('contactPhone'),
    message: formData.get('contactMessage'),
    createdAt: serverTimestamp()
  };

  try {
    await addDoc(collection(window.db, 'inquiries'), contactData);
    alert('Message sent successfully! The owner will contact you soon.');
    document.getElementById('contactModal').style.display = 'none';
    e.target.reset();
  } catch (error) {
    console.error('Error sending message:', error);
    alert('Failed to send message. Please try again.');
  }
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ');
}

function showErrorState(message) {
  const container = document.querySelector('.main-content .container') || document.querySelector('.main-content') || document.body;
  if (!container) return;
  const div = document.createElement('div');
  div.className = 'empty-state';
  div.style.margin = '24px 0';
  div.innerHTML = `
    <h3>Failed to Load Property</h3>
    <p>${message || 'Please try again later.'}</p>
  `;
  container.prepend(div);
}

function hidePageLoader() {
  const loader = document.getElementById('pageLoader');
  if (loader) loader.style.display = 'none';
}
