// Shared utilities and Firebase initialization
import { auth, db, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, serverTimestamp, collection, addDoc, doc, getDoc, getDocs, query, where, orderBy, limit, updateDoc, deleteDoc, startAfter } from './firebase.js';

// Global state
window.appState = {
  user: null,
  isAdmin: false,
  currentPage: 'home'
};

// Initialize year in footer
document.addEventListener('DOMContentLoaded', () => {
  const yearElement = document.getElementById('year');
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }
});

// Auth state management
onAuthStateChanged(auth, async (user) => {
  window.appState.user = user;
  
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const userBadge = document.getElementById('userBadge');
  const adminNav = document.getElementById('adminNav');
  
  if (user) {
    // User is signed in
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'inline-flex';
    if (userBadge) {
      userBadge.style.display = 'inline-flex';
      userBadge.textContent = user.displayName || user.email;
    }
    
    // Check admin role
    try {
      const roleDoc = await getDoc(doc(db, 'roles', user.uid));
      window.appState.isAdmin = roleDoc.exists() && roleDoc.data().role === 'admin';
      if (adminNav) {
        adminNav.style.display = window.appState.isAdmin ? 'inline-flex' : 'none';
      }
    } catch (error) {
      // Silently fail - permissions error is expected for non-admin users
      window.appState.isAdmin = false;
      if (adminNav) {
        adminNav.style.display = 'none';
      }
    }
  } else {
    // User is signed out
    if (loginBtn) loginBtn.style.display = 'inline-flex';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (userBadge) userBadge.style.display = 'none';
    if (adminNav) adminNav.style.display = 'none';
    window.appState.isAdmin = false;
  }
  
  // Update mobile menu if it exists
  updateMobileMenu();
  
  // Call page-specific auth handler if it exists
  if (window.appState.authHandler) {
    window.appState.authHandler(user);
  }
});

// Login/Logout handlers
document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  
  if (loginBtn) {
    loginBtn.addEventListener('click', showAuthDialog);
  }
  
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await signOut(auth);
      } catch (error) {
        showNotification('Failed to logout', 'error');
      }
    });
  }
});

// Auth dialog
function showAuthDialog() {
  const wrapper = document.createElement('div');
  wrapper.className = 'modal';
  wrapper.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Login / Sign up</h3>
        <button class="modal-close" id="authClose">&times;</button>
      </div>
      <div class="modal-body">
        <div class="field">
          <label>Email</label>
          <input id="authEmail" class="input" type="email" placeholder="Enter your email" />
        </div>
        <div class="field">
          <label>Password</label>
          <input id="authPassword" class="input" type="password" placeholder="Enter your password" />
        </div>
        <div class="row" style="margin-top: 20px;">
          <button class="btn btn-primary" id="authLogin">Login</button>
          <button class="btn btn-secondary" id="authSignup">Sign up</button>
          <div style="flex: 1;"></div>
          <button class="btn btn-ghost" id="authGoogle">Continue with Google</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(wrapper);
  
  const close = () => wrapper.remove();
  
  wrapper.querySelector('#authClose').addEventListener('click', close);
  wrapper.addEventListener('click', (e) => {
    if (e.target === wrapper) close();
  });
  
  // Google sign in
  wrapper.querySelector('#authGoogle').addEventListener('click', async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      close();
      showNotification('Welcome!', 'success');
    } catch (error) {
      showNotification(error.message, 'error');
    }
  });
  
  // Email login
  wrapper.querySelector('#authLogin').addEventListener('click', async () => {
    const email = wrapper.querySelector('#authEmail').value.trim();
    const password = wrapper.querySelector('#authPassword').value;
    
    if (!email || !password) {
      showNotification('Please fill in all fields', 'error');
      return;
    }
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      close();
      showNotification('Welcome back!', 'success');
    } catch (error) {
      showNotification(error.message, 'error');
    }
  });
  
  // Email signup
  wrapper.querySelector('#authSignup').addEventListener('click', async () => {
    const email = wrapper.querySelector('#authEmail').value.trim();
    const password = wrapper.querySelector('#authPassword').value;
    
    if (!email || !password) {
      showNotification('Please fill in all fields', 'error');
      return;
    }
    
    if (password.length < 6) {
      showNotification('Password must be at least 6 characters', 'error');
      return;
    }
    
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (email.includes('@')) {
        await updateProfile(cred.user, { displayName: email.split('@')[0] });
      }
      close();
      showNotification('Account created successfully!', 'success');
    } catch (error) {
      showNotification(error.message, 'error');
    }
  });
}

// Notification system
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-message">${message}</span>
      <button class="notification-close">&times;</button>
    </div>
  `;
  
  // Add styles if not already added
  if (!document.getElementById('notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        max-width: 400px;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        animation: slideInRight 0.3s ease-out;
      }
      
      .notification-success {
        background: #10b981;
        color: white;
      }
      
      .notification-error {
        background: #ef4444;
        color: white;
      }
      
      .notification-info {
        background: #3b82f6;
        color: white;
      }
      
      .notification-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
      }
      
      .notification-close {
        background: none;
        border: none;
        color: inherit;
        font-size: 20px;
        cursor: pointer;
        margin-left: 12px;
      }
      
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(notification);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 5000);
  
  // Close button
  notification.querySelector('.notification-close').addEventListener('click', () => {
    notification.remove();
  });
}

// Property card rendering
function renderPropertyCard(id, data) {
  const card = document.createElement('article');
  card.className = 'property-card fade-in';
  
  const img = (data.images && data.images[0]) || data.imageUrl || '/public/placeholder.jpg';
  
  card.innerHTML = `
    <img src="${img}" alt="${data.title || 'Property'}" class="property-image" onerror="this.src='/public/placeholder.jpg'" />
    <div class="property-content">
      <div class="property-price">₹ ${Number(data.price || 0).toLocaleString('en-IN')}</div>
      <div class="property-type">${data.propertyType || 'Property'} • ${data.listingType || ''}</div>
      <div class="property-location">${data.city || ''} ${data.locality ? '• ' + data.locality : ''}</div>
      <div class="property-actions">
        <button class="favorite-btn" data-id="${id}" aria-label="Add to favorites">❤</button>
      </div>
    </div>
  `;
  
  // Add event listeners
  const favoriteBtn = card.querySelector('.favorite-btn');
  favoriteBtn.addEventListener('click', () => toggleFavorite(id, favoriteBtn));
  
  // Sync favorite state
  syncFavoriteState(id, favoriteBtn);
  
  return card;
}

// Property details modal
function showPropertyDetails(id, data) {
  const wrapper = document.createElement('div');
  wrapper.className = 'modal';
  
  const gallery = (data.images && data.images.length) ? data.images : (data.imageUrl ? [data.imageUrl] : []);
  const slides = gallery.map(url => `<img src="${url}" style="width:100%; height:300px; object-fit:cover; border-radius:8px;" onerror="this.src='/public/placeholder.jpg'" />`).join('');
  const canDelete = window.appState.user && data.ownerId === window.appState.user.uid;
  
  wrapper.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>${data.title || 'Property Details'}</h3>
        <button class="modal-close" id="detailsClose">&times;</button>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 20px;">
          ${slides || `<img src="/public/placeholder.jpg" style="width:100%; height:300px; object-fit:cover; border-radius:8px;" />`}
        </div>
        <div class="row" style="align-items: center; justify-content: space-between; margin-bottom: 20px;">
          <div>
            <div class="property-price" style="font-size: 24px; margin-bottom: 8px;">₹ ${Number(data.price || 0).toLocaleString('en-IN')}</div>
            <div class="property-type" style="margin-bottom: 8px;">${data.propertyType || ''} • ${data.listingType || ''}</div>
            <div class="property-location">${data.city || ''} ${data.locality ? '• ' + data.locality : ''}</div>
            ${data.area || data.bhk || data.furnished ? `<div style="color: var(--muted); font-size: 14px; margin-top: 8px;">${data.area ? data.area + ' sqft • ' : ''}${data.bhk ? data.bhk + ' BHK • ' : ''}${data.furnished || ''}</div>` : ''}
          </div>
          <div class="row">
            <button class="favorite-btn" id="detailsFav" data-id="${id}">❤</button>
            ${canDelete ? '<button class="btn btn-danger" id="detailsDelete">Delete</button>' : ''}
          </div>
        </div>
        <p style="margin-bottom: 20px; line-height: 1.6;">${data.description || 'No description available.'}</p>
        ${data.contactPhone || data.contactName ? `
          <div class="card" style="background: rgba(39, 179, 138, 0.1); border-color: rgba(39, 179, 138, 0.3);">
            <h4 style="margin-bottom: 8px; color: var(--primary);">Contact Information</h4>
            <p style="margin: 0;">${data.contactName || ''} ${data.contactPhone ? '• ' + data.contactPhone : ''}</p>
          </div>
        ` : ''}
      </div>
    </div>
  `;
  
  document.body.appendChild(wrapper);
  
  const close = () => wrapper.remove();
  
  wrapper.querySelector('#detailsClose').addEventListener('click', close);
  wrapper.addEventListener('click', (e) => {
    if (e.target === wrapper) close();
  });
  
  // Favorite button
  const favBtn = wrapper.querySelector('#detailsFav');
  favBtn.addEventListener('click', () => toggleFavorite(id, favBtn));
  syncFavoriteState(id, favBtn);
  
  // Delete button
  const deleteBtn = wrapper.querySelector('#detailsDelete');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to delete this property?')) return;
      
      try {
        await deleteDoc(doc(db, 'properties', id));
        showNotification('Property deleted successfully', 'success');
        close();
        // Refresh the current page
        if (window.refreshCurrentPage) {
          window.refreshCurrentPage();
        }
      } catch (error) {
        showNotification('Failed to delete property', 'error');
      }
    });
  }
}

// Favorite management
async function syncFavoriteState(listingId, buttonEl) {
  const user = window.appState.user;
  if (!user) {
    buttonEl.classList.remove('active');
    return;
  }
  
  try {
    const favDoc = await getDoc(doc(db, 'favorites', user.uid, 'properties', listingId));
    buttonEl.classList.toggle('active', favDoc.exists());
  } catch (error) {
    buttonEl.classList.remove('active');
  }
}

async function toggleFavorite(listingId, buttonEl) {
  const user = window.appState.user;
  if (!user) {
    showNotification('Please login to save favorites', 'error');
    return;
  }
  
  const favRef = doc(db, 'favorites', user.uid, 'properties', listingId);
  
  try {
    const exists = (await getDoc(favRef)).exists();
    if (exists) {
      await deleteDoc(favRef);
      showNotification('Removed from favorites', 'info');
    } else {
      await setDocSafe(favRef, { propertyId: listingId, createdAt: serverTimestamp() });
      showNotification('Added to favorites', 'success');
    }
    syncFavoriteState(listingId, buttonEl);
  } catch (error) {
    showNotification('Failed to update favorites', 'error');
  }
}

async function setDocSafe(refObj, data) {
  const { setDoc } = await import('https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js');
  return setDoc(refObj, data);
}

// Mobile menu management
function updateMobileMenu() {
  const mobileMenu = document.getElementById('mobile-menu');
  if (!mobileMenu) return;
  
  const user = window.appState.user;
  const isAdmin = window.appState.isAdmin;
  
  // Update auth section
  const mobileAuth = mobileMenu.querySelector('.mobile-auth');
  if (mobileAuth) {
    if (user) {
      mobileAuth.innerHTML = `
        <div class="user-badge">${user.displayName || user.email}</div>
        <button class="btn btn-ghost" id="mobileLogout">Logout</button>
      `;
      
      mobileAuth.querySelector('#mobileLogout').addEventListener('click', async () => {
        try {
          await signOut(auth);
          showNotification('Logged out successfully', 'info');
        } catch (error) {
          showNotification('Failed to logout', 'error');
        }
      });
    } else {
      mobileAuth.innerHTML = `
        <button class="btn btn-primary" id="mobileLogin">Login</button>
      `;
      
      mobileAuth.querySelector('#mobileLogin').addEventListener('click', showAuthDialog);
    }
  }
  
  // Update admin link visibility
  const adminLink = mobileMenu.querySelector('[href="admin.html"]');
  if (adminLink) {
    adminLink.style.display = isAdmin ? 'block' : 'none';
  }
}

// Export for use in other files
window.sharedUtils = {
  renderPropertyCard,
  showPropertyDetails,
  toggleFavorite,
  syncFavoriteState,
  showNotification,
  showAuthDialog
};
