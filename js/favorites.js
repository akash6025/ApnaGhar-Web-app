// Favorites page functionality
import { collection, getDocs, doc, getDoc, deleteDoc, query, where, orderBy } from './firebase.js';

let allFavorites = [];
let filteredFavorites = [];
let currentView = 'grid';

document.addEventListener('DOMContentLoaded', () => {
  setupFilters();
  setupViewToggle();
  
  // Register auth handler to be called when auth state is ready
  window.appState = window.appState || {};
  
  // Store the previous handler if it exists
  const previousHandler = window.appState.authHandler;
  
  window.appState.authHandler = (user) => {
    // Call previous handler if it exists
    if (previousHandler && typeof previousHandler === 'function') {
      previousHandler(user);
    }
    // Call our handler
    checkAuthAndLoadFavorites(user);
  };
  
  // If user is already loaded, call immediately
  if (window.appState.user !== undefined) {
    checkAuthAndLoadFavorites(window.appState.user);
  }
});

async function checkAuthAndLoadFavorites(user) {
  if (!user) {
    showLoginPrompt();
    return;
  }
  
  await loadFavorites();
}

function showLoginPrompt() {
  const grid = document.getElementById('favoritesGrid');
  const emptyState = document.getElementById('emptyState');
  
  if (grid) {
    grid.innerHTML = '';
  }
  
  if (emptyState) {
    emptyState.style.display = 'block';
    emptyState.innerHTML = `
      <div class="empty-content">
        <div class="empty-icon">🔐</div>
        <h3>Login Required</h3>
        <p>Please log in to view your favorite properties.</p>
        <div class="empty-actions">
          <a href="login.html" class="btn btn-primary">Login</a>
          <a href="register.html" class="btn btn-secondary">Sign Up</a>
        </div>
      </div>
    `;
  }
}

async function loadFavorites() {
  const user = window.appState?.user;
  if (!user) return;
  
  const grid = document.getElementById('favoritesGrid');
  const emptyState = document.getElementById('emptyState');
  const favoritesCount = document.getElementById('favoritesCount');
  
  if (!grid) return;
  
  // Show loading state
  showLoadingState(grid);
  
  try {
    // Get user's favorites
    const favoritesSnap = await getDocs(collection(window.db, 'favorites', user.uid, 'properties'));
    const favoriteIds = favoritesSnap.docs.map(doc => doc.id);
    
    if (favoriteIds.length === 0) {
      showEmptyState();
      updateFavoritesCount(0);
      return;
    }
    
    // Get property details for each favorite
    allFavorites = [];
    for (const id of favoriteIds) {
      try {
        const propertyDoc = await getDoc(doc(window.db, 'properties', id));
        if (propertyDoc.exists()) {
          const propertyData = propertyDoc.data();
          allFavorites.push({
            id: id,
            ...propertyData,
            favoriteId: favoritesSnap.docs.find(d => d.id === id)?.id
          });
        }
      } catch (error) {
        console.warn(`Could not load property ${id}:`, error);
      }
    }
    
    filteredFavorites = [...allFavorites];
    displayFavorites();
    updateFavoritesCount(allFavorites.length);
    
  } catch (error) {
    console.error('Error loading favorites:', error);
    showErrorState();
  }
}

function displayFavorites() {
  const grid = document.getElementById('favoritesGrid');
  const emptyState = document.getElementById('emptyState');
  
  if (!grid) return;
  
  if (filteredFavorites.length === 0) {
    showEmptyState();
    return;
  }
  
  grid.innerHTML = '';
  emptyState.style.display = 'none';
  
  filteredFavorites.forEach(property => {
    const card = createFavoriteCard(property);
    grid.appendChild(card);
  });
  
  updateResultsCount(filteredFavorites.length);
}

function createFavoriteCard(property) {
  const card = document.createElement('article');
  card.className = 'property-card fade-in';
  card.dataset.propertyId = property.id;
  
  const img = (property.images && property.images[0]) || property.imageUrl || '/public/placeholder.jpg';
  
  card.innerHTML = `
    <img src="${img}" alt="${property.title || 'Property'}" class="property-image" onerror="this.src='/public/placeholder.jpg'" />
    <div class="property-content">
      <div class="property-price">₹ ${Number(property.price || 0).toLocaleString('en-IN')}</div>
      <div class="property-type">${property.propertyType || 'Property'} • ${property.listingType || ''}</div>
      <div class="property-location">${property.city || ''} ${property.locality ? '• ' + property.locality : ''}</div>
      ${property.area || property.bhk || property.furnished ? `
        <div class="property-details">
          ${property.area ? `<span class="property-detail">📐 ${property.area} sqft</span>` : ''}
          ${property.bhk ? `<span class="property-detail">🏠 ${property.bhk} BHK</span>` : ''}
          ${property.furnished ? `<span class="property-detail">🪑 ${property.furnished}</span>` : ''}
        </div>
      ` : ''}
      <div class="property-actions">
        <button class="favorite-btn active" data-id="${property.id}" title="Remove from favorites">❤</button>
      </div>
    </div>
  `;
  
  // Add event listeners
  const favoriteBtn = card.querySelector('.favorite-btn');
  
  favoriteBtn.addEventListener('click', () => removeFromFavorites(property.id, card));
  
  return card;
}

async function removeFromFavorites(propertyId, cardElement) {
  const user = window.appState?.user;
  if (!user) return;
  
  try {
    await deleteDoc(doc(window.db, 'favorites', user.uid, 'properties', propertyId));
    
    // Remove from local arrays
    allFavorites = allFavorites.filter(p => p.id !== propertyId);
    filteredFavorites = filteredFavorites.filter(p => p.id !== propertyId);
    
    // Animate removal
    cardElement.classList.add('removing');
    setTimeout(() => {
      cardElement.remove();
      updateFavoritesCount(allFavorites.length);
      updateResultsCount(filteredFavorites.length);
      
      if (filteredFavorites.length === 0) {
        showEmptyState();
      }
    }, 500);
    
    if (window.sharedUtils && window.sharedUtils.showNotification) {
      window.sharedUtils.showNotification('Removed from favorites', 'info');
    }
    
  } catch (error) {
    console.error('Error removing favorite:', error);
    if (window.sharedUtils && window.sharedUtils.showNotification) {
      window.sharedUtils.showNotification('Failed to remove from favorites', 'error');
    }
  }
}

function setupFilters() {
  const typeFilter = document.getElementById('typeFilter');
  const purposeFilter = document.getElementById('purposeFilter');
  const priceFilter = document.getElementById('priceFilter');
  const sortFilter = document.getElementById('sortFilter');
  const clearBtn = document.getElementById('clearFilters');
  
  [typeFilter, purposeFilter, priceFilter, sortFilter].forEach(filter => {
    if (filter) {
      filter.addEventListener('change', applyFilters);
    }
  });
  
  if (clearBtn) {
    clearBtn.addEventListener('click', clearFilters);
  }
}

function applyFilters() {
  const typeFilter = document.getElementById('typeFilter');
  const purposeFilter = document.getElementById('purposeFilter');
  const priceFilter = document.getElementById('priceFilter');
  const sortFilter = document.getElementById('sortFilter');
  
  let filtered = [...allFavorites];
  
  // Filter by type
  if (typeFilter?.value) {
    filtered = filtered.filter(property => property.propertyType === typeFilter.value);
  }
  
  // Filter by purpose
  if (purposeFilter?.value) {
    filtered = filtered.filter(property => property.listingType === purposeFilter.value);
  }
  
  // Filter by price range
  if (priceFilter?.value) {
    const [min, max] = priceFilter.value.split('-').map(Number);
    filtered = filtered.filter(property => {
      const price = Number(property.price || 0);
      return price >= min && price <= max;
    });
  }
  
  // Sort
  if (sortFilter?.value) {
    switch (sortFilter.value) {
      case 'price-low':
        filtered.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
        break;
      case 'price-high':
        filtered.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
        break;
      case 'area':
        filtered.sort((a, b) => Number(b.area || 0) - Number(a.area || 0));
        break;
      case 'recent':
      default:
        filtered.sort((a, b) => (b.createdAt?.toDate?.() || new Date(0)) - (a.createdAt?.toDate?.() || new Date(0)));
        break;
    }
  }
  
  filteredFavorites = filtered;
  displayFavorites();
}

function clearFilters() {
  const filters = ['typeFilter', 'purposeFilter', 'priceFilter', 'sortFilter'];
  filters.forEach(id => {
    const element = document.getElementById(id);
    if (element) element.value = '';
  });
  
  filteredFavorites = [...allFavorites];
  displayFavorites();
}

function setupViewToggle() {
  const gridViewBtn = document.getElementById('gridView');
  const listViewBtn = document.getElementById('listView');
  
  if (gridViewBtn) {
    gridViewBtn.addEventListener('click', () => {
      currentView = 'grid';
      updateViewToggle();
      updateViewLayout();
    });
  }
  
  if (listViewBtn) {
    listViewBtn.addEventListener('click', () => {
      currentView = 'list';
      updateViewToggle();
      updateViewLayout();
    });
  }
}

function updateViewToggle() {
  const gridViewBtn = document.getElementById('gridView');
  const listViewBtn = document.getElementById('listView');
  
  if (gridViewBtn && listViewBtn) {
    gridViewBtn.classList.toggle('active', currentView === 'grid');
    listViewBtn.classList.toggle('active', currentView === 'list');
  }
}

function updateViewLayout() {
  const grid = document.getElementById('favoritesGrid');
  if (!grid) return;
  
  if (currentView === 'list') {
    grid.classList.add('list-view');
  } else {
    grid.classList.remove('list-view');
  }
}

function showLoadingState(container) {
  container.innerHTML = `
    <div class="loading-grid">
      ${Array(4).fill(0).map(() => `
        <div class="loading-card">
          <div style="height: 220px; background: var(--ring); border-radius: 8px; margin-bottom: 16px;"></div>
          <div style="height: 20px; background: var(--ring); border-radius: 4px; margin-bottom: 8px;"></div>
          <div style="height: 16px; background: var(--ring); border-radius: 4px; margin-bottom: 8px; width: 60%;"></div>
          <div style="height: 16px; background: var(--ring); border-radius: 4px; width: 40%;"></div>
        </div>
      `).join('')}
    </div>
  `;
}

function showEmptyState() {
  const grid = document.getElementById('favoritesGrid');
  const emptyState = document.getElementById('emptyState');
  
  if (grid) {
    grid.innerHTML = '';
  }
  
  if (emptyState) {
    emptyState.style.display = 'block';
    emptyState.innerHTML = `
      <div class="empty-content">
        <div class="empty-icon">❤️</div>
        <h3>No Favorites Yet</h3>
        <p>Start exploring properties and save your favorites to see them here.</p>
        <div class="empty-actions">
          <a href="listings.html" class="btn btn-primary">Browse Properties</a>
          <a href="index.html" class="btn btn-secondary">Go Home</a>
        </div>
      </div>
    `;
  }
  
  updateResultsCount(0);
}

function showErrorState() {
  const grid = document.getElementById('favoritesGrid');
  const emptyState = document.getElementById('emptyState');
  
  if (grid) {
    grid.innerHTML = '';
  }
  
  if (emptyState) {
    emptyState.style.display = 'block';
    emptyState.innerHTML = `
      <div class="empty-content">
        <div class="empty-icon">⚠️</div>
        <h3>Failed to Load Favorites</h3>
        <p>Please check your connection and try again.</p>
        <div class="empty-actions">
          <button class="btn btn-primary" onclick="location.reload()">Retry</button>
          <a href="index.html" class="btn btn-secondary">Go Home</a>
        </div>
      </div>
    `;
  }
}

function updateFavoritesCount(count) {
  const countElement = document.getElementById('favoritesCount');
  if (countElement) {
    animateCount(countElement, count);
  }
}

function updateResultsCount(count) {
  const resultsCount = document.getElementById('resultsCount');
  if (!resultsCount) return;
  
  const countText = count === 1 ? 'favorite' : 'favorites';
  resultsCount.innerHTML = `Showing <span class="results-count">${count}</span> ${countText}`;
  
  // Animate count
  const countElement = resultsCount.querySelector('.results-count');
  if (countElement) {
    animateCount(countElement, count);
  }
}

function animateCount(element, targetCount) {
  let currentCount = 0;
  const increment = targetCount / 30;
  
  const timer = setInterval(() => {
    currentCount += increment;
    if (currentCount >= targetCount) {
      currentCount = targetCount;
      clearInterval(timer);
    }
    element.textContent = Math.floor(currentCount).toLocaleString();
  }, 50);
}

// Listen for auth state changes
if (window.appState) {
  const originalAuthHandler = window.appState.authHandler;
  window.appState.authHandler = function(user) {
    if (originalAuthHandler) originalAuthHandler(user);
    
    if (user) {
      loadFavorites();
    } else {
      showLoginPrompt();
    }
  };
}

// Export functions for global access
window.favoritesUtils = {
  loadFavorites,
  removeFromFavorites,
  applyFilters,
  clearFilters,
  updateViewLayout
};
