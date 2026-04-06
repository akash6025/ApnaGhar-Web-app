// Profile Page - Fresh Implementation
import { auth } from './firebase.js';
import { doc, getDoc, setDoc, getDocs, collection, query, where, orderBy, serverTimestamp, updateProfile } from './firebase.js';

// Wait for auth state
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    // Not logged in - show login prompt
    document.querySelector('.main-content').innerHTML = `
      <div class="container" style="text-align: center; padding: 100px 20px;">
        <h2>🔐 Login Required</h2>
        <p style="margin: 20px 0;">Please log in to view your profile.</p>
        <a href="login.html" class="btn btn-primary">Login</a>
        <a href="register.html" class="btn btn-secondary" style="margin-left: 10px;">Sign Up</a>
      </div>
    `;
    return;
  }

  // User is logged in - load profile
  await loadUserProfile(user);
});

async function loadUserProfile(user) {
  try {
    // Update basic info
    document.getElementById('userName').textContent = user.displayName || user.email.split('@')[0];
    document.getElementById('userEmail').textContent = user.email;
    
    // Update avatar
    const initials = (user.displayName || user.email)
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    document.getElementById('avatarInitials').textContent = initials;

    // Load user data from Firestore
    const userDoc = await getDoc(doc(window.db, 'users', user.uid));
    const userData = userDoc.exists() ? userDoc.data() : {};

    // Fill form fields
    document.getElementById('firstName').value = userData.firstName || '';
    document.getElementById('lastName').value = userData.lastName || '';
    document.getElementById('email').value = user.email;
    document.getElementById('phone').value = userData.phone || '';
    document.getElementById('bio').value = userData.bio || '';

    // Update member since
    const year = user.metadata?.creationTime 
      ? new Date(user.metadata.creationTime).getFullYear() 
      : new Date().getFullYear();
    document.getElementById('memberSince').textContent = year;

    // Load properties count
    const propertiesSnap = await getDocs(
      query(collection(window.db, 'properties'), where('ownerId', '==', user.uid))
    );
    document.getElementById('propertiesCount').textContent = propertiesSnap.size;

    // Load favorites count
    const favoritesSnap = await getDocs(collection(window.db, 'favorites', user.uid, 'properties'));
    document.getElementById('favoritesCount').textContent = favoritesSnap.size;

    // Load user properties
    await loadUserProperties(user.uid, propertiesSnap);

  } catch (error) {
    console.error('Error loading profile:', error);
  }
}

async function loadUserProperties(userId, propertiesSnap) {
  const grid = document.getElementById('propertiesGrid');
  
  if (propertiesSnap.empty) {
    grid.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <h3>No Properties Listed</h3>
        <p>You haven't listed any properties yet.</p>
        <a href="admin.html" class="btn btn-primary" style="margin-top: 20px;">List Your First Property</a>
      </div>
    `;
    return;
  }

  grid.innerHTML = '';
  propertiesSnap.forEach(doc => {
    const data = doc.data();
    const card = createPropertyCard(doc.id, data);
    grid.appendChild(card);
  });
}

function createPropertyCard(id, data) {
  const card = document.createElement('div');
  card.className = 'property-card';
  
  const img = (data.images && data.images[0]) || '/public/placeholder.jpg';
  const price = Number(data.price || 0).toLocaleString('en-IN');
  const priceText = data.listingType === 'rent' ? `₹${price}/month` : `₹${price}`;
  
  card.innerHTML = `
    <img src="${img}" alt="${data.title}" />
    <div class="property-info">
      <h4>${data.title}</h4>
      <p class="price">${priceText}</p>
      <p class="location">${data.locality}, ${data.city}</p>
      <div class="property-meta">
        <span>${data.bhk} BHK</span>
        <span>${data.area} sq.ft</span>
        <span>${data.furnished}</span>
      </div>
      <div class="property-actions">
        <a href="admin.html?edit=${id}" class="btn btn-secondary">Edit</a>
        <button onclick="deleteProperty('${id}')" class="btn btn-danger">Delete</button>
      </div>
    </div>
  `;
  
  return card;
}

// Tab switching
document.addEventListener('DOMContentLoaded', () => {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;

      // Update active button
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update active panel
      tabPanels.forEach(panel => {
        panel.classList.remove('active');
        if (panel.id === `${targetTab}-panel`) {
          panel.classList.add('active');
        }
      });
    });
  });

  const applyHashTab = () => {
    const hash = window.location.hash;
    const targetTab = hash === '#properties' ? 'properties' : (hash === '#settings' ? 'settings' : 'info');
    tabPanels.forEach(panel => {
      panel.classList.remove('active');
      if (panel.id === `${targetTab}-panel`) {
        panel.classList.add('active');
      }
    });
    tabBtns.forEach(b => {
      const tab = b.dataset.tab;
      b.classList.toggle('active', tab === targetTab);
    });
  };

  applyHashTab();
  window.addEventListener('hashchange', applyHashTab);

  // Profile form submission
  const profileForm = document.getElementById('profileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const user = auth.currentUser;
      if (!user) return;

      const formData = new FormData(e.target);
      const firstName = formData.get('firstName').trim();
      const lastName = formData.get('lastName').trim();
      const phone = formData.get('phone').trim();
      const bio = formData.get('bio').trim();

      try {
        // Update Firebase Auth profile
        await updateProfile(user, {
          displayName: `${firstName} ${lastName}`
        });

        // Update Firestore
        await setDoc(doc(window.db, 'users', user.uid), {
          firstName,
          lastName,
          phone,
          bio,
          updatedAt: serverTimestamp()
        }, { merge: true });

        // Update UI
        document.getElementById('userName').textContent = `${firstName} ${lastName}`;
        
        alert('Profile updated successfully!');
      } catch (error) {
        console.error('Error updating profile:', error);
        alert('Failed to update profile. Please try again.');
      }
    });
  }

  // Delete account
  const deleteBtn = document.getElementById('deleteAccount');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        alert('Account deletion feature will be implemented soon.');
      }
    });
  }
});

// Make deleteProperty global
window.deleteProperty = async function(propertyId) {
  if (!confirm('Are you sure you want to delete this property?')) return;
  
  try {
    const { deleteDoc, doc } = await import('./firebase.js');
    await deleteDoc(doc(window.db, 'properties', propertyId));
    alert('Property deleted successfully!');
    window.location.reload();
  } catch (error) {
    console.error('Error deleting property:', error);
    alert('Failed to delete property. Please try again.');
  }
};
