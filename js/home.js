// Home page functionality - Main property browsing page
import { collection, getDocs, query, orderBy, limit, startAfter, where } from './firebase.js';

let lastVisible = null;
let allProperties = [];
let filteredProperties = [];
let currentFilters = {
  search: '',
  propertyType: '',
  listingType: '',
  bhk: ''
};

document.addEventListener('DOMContentLoaded', () => {
  console.log('Home.js: DOM Content Loaded');
  
  // Wait for Firebase to initialize
  const initializeApp = () => {
    console.log('Checking Firebase... window.db =', typeof window.db);
    
    if (!window.db) {
      console.log('Waiting for Firebase to initialize...');
      setTimeout(initializeApp, 100);
      return;
    }
    
    console.log('Firebase initialized! Starting to load properties...');
    loadProperties();
    setupSearch();
    setupFilters();
    setupLoadMore();
    setupViewToggle();
    loadCategoryCounts();
    installViewButtonGuard();
  };
  
  initializeApp();
});

async function loadProperties() {
  console.log('📊 loadProperties() called');
  
  const grid = document.getElementById('propertiesGrid');
  if (!grid) {
    console.error('❌ propertiesGrid element not found!');
    return;
  }
  
  console.log('✅ Grid element found');
  
  // Show loading state
  showLoadingState(grid);
  
  try {
    console.log('🔄 Attempting to fetch properties from Firestore...');
    
    // Try to load properties without ordering first (in case createdAt doesn't exist)
    let snap;
    try {
      console.log('📝 Trying query with orderBy...');
      const q = query(collection(window.db, 'properties'), orderBy('createdAt', 'desc'));
      snap = await getDocs(q);
      console.log('✅ Query with orderBy succeeded');
    } catch (orderError) {
      console.warn('⚠️ Could not order by createdAt, loading without ordering:', orderError);
      // If ordering fails, just get all properties
      snap = await getDocs(collection(window.db, 'properties'));
      console.log('✅ Query without orderBy succeeded');
    }
    
    console.log('📦 Snapshot received. Size:', snap.size, 'Empty:', snap.empty);
    
    if (snap.empty) {
      console.warn('⚠️ No properties found in Firestore!');
      displayProperties([]);
      return;
    }
    
    allProperties = [];
    snap.forEach(doc => {
      const data = doc.data();
      console.log('📄 Property doc:', doc.id, data);
      allProperties.push({ 
        id: doc.id, 
        ...data,
        // Add default values for missing fields
        title: data.title || 'Untitled Property',
        price: data.price || 0,
        city: data.city || 'Unknown',
        locality: data.locality || 'Unknown',
        propertyType: data.propertyType || 'property',
        listingType: data.listingType || 'sale',
        images: data.images || ['https://via.placeholder.com/400x300?text=No+Image']
      });
    });
    
    console.log('✅ Loaded properties:', allProperties.length);
    console.log('📋 Properties array:', allProperties);
    
    filteredProperties = [...allProperties];
    displayProperties(filteredProperties);
    
    // Hide Load More since all properties are loaded
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
      loadMoreBtn.style.display = 'none';
    }
    
    // Disable pagination since all items are loaded
    lastVisible = null;
    
  } catch (error) {
    console.error('❌ Error loading properties:', error);
    console.error('Error details:', error.message, error.code);
    showErrorState(grid);
  }
}

function displayProperties(properties) {
  const grid = document.getElementById('propertiesGrid');
  if (!grid) return;
  
  grid.innerHTML = '';
  
  if (properties.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <h3>No Properties Found</h3>
        <p>Try adjusting your search criteria or check back later for new listings.</p>
      </div>
    `;
    return;
  }
  
  properties.forEach(property => {
    const card = createPropertyCard(property);
    grid.appendChild(card);
  });

  removeViewButtons();
}

function createPropertyCard(property) {
  const card = document.createElement('article');
  card.className = 'property-card fade-in';
  
  const img = (property.images && property.images[0]) || property.imageUrl || '/public/placeholder.jpg';
  const price = Number(property.price || 0).toLocaleString('en-IN');
  const priceText = property.listingType === 'rent' ? `₹${price}/month` : `₹${price}`;
  
  card.innerHTML = `
    <img src="${img}" alt="${property.title || 'Property'}" class="property-image" onerror="this.src='/public/placeholder.jpg'" />
    <div class="property-content">
      <div class="property-price">${priceText}</div>
      <div class="property-type">${property.propertyType || 'Property'} • ${property.listingType || ''}</div>
      <div class="property-location">${property.city || ''} ${property.locality ? '• ' + property.locality : ''}</div>
      ${property.area || property.bhk ? `
        <div class="property-details">
          ${property.area ? `<span class="property-detail">📐 ${property.area} sqft</span>` : ''}
          ${property.bhk ? `<span class="property-detail">🏠 ${property.bhk} BHK</span>` : ''}
        </div>
      ` : ''}
      <div class="property-actions">
        <button class="favorite-btn" onclick="toggleFavorite('${property.id}')" data-property-id="${property.id}">
          <span class="favorite-icon">♡</span>
        </button>
      </div>
    </div>
  `;
  
  return card;
}

function removeViewButtons() {
  try {
    const grid = document.getElementById('propertiesGrid');
    if (!grid) return;
    const cards = grid.querySelectorAll('article.property-card');
    cards.forEach(card => {
      const candidates = card.querySelectorAll('button, a, .property-details-btn, .btn, *');
      candidates.forEach(el => {
        const text = ((el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase());
        const title = (el.getAttribute('title') || '').toLowerCase();
        const aria = (el.getAttribute('aria-label') || '').toLowerCase();
        const cls = el.className || '';
        const href = (el.getAttribute('href') || '').toLowerCase();
        const looksLikeDetails =
          el.classList?.contains('property-details-btn') ||
          text === 'view details' ||
          text === 'details' ||
          text.startsWith('view') && text.includes('detail') ||
          title.includes('view details') ||
          aria.includes('view details') ||
          href.includes('property-details');
        if (looksLikeDetails) {
          el.remove();
        }
      });
    });
  } catch (e) {
  }
}

function installViewButtonGuard() {
  const grid = document.getElementById('propertiesGrid');
  if (!grid) return;
  // Initial cleanup
  removeViewButtons();
  // Observe future additions
  const observer = new MutationObserver(() => removeViewButtons());
  observer.observe(grid, { childList: true, subtree: true });
}

function setupSearch() {
  console.log('🔍 Setting up search...');
  
  const searchInput = document.getElementById('searchLocation');
  const searchBtn = document.getElementById('advancedSearchBtn');
  
  console.log('Search input:', searchInput);
  console.log('Search button:', searchBtn);
  
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentFilters.search = e.target.value.toLowerCase();
      applyFilters();
    });
    console.log('✅ Search input listener added');
  } else {
    console.warn('⚠️ Search input not found');
  }
  
  if (searchBtn) {
    searchBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('🔍 Search button clicked');
      applyFilters();
      // Scroll to properties section
      const propertiesSection = document.getElementById('properties');
      if (propertiesSection) {
        propertiesSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
    console.log('✅ Search button listener added');
  } else {
    console.warn('⚠️ Search button not found');
  }
}

function setupFilters() {
  console.log('🎛️ Setting up filters...');
  
  // Property category dropdown
  const categoryFilter = document.getElementById('propertyCategory');
  
  if (categoryFilter) {
    categoryFilter.addEventListener('change', (e) => {
      currentFilters.propertyType = e.target.value;
      console.log('Property type filter changed:', e.target.value);
      applyFilters();
    });
    console.log('✅ Category filter listener added');
  } else {
    console.warn('⚠️ Category filter not found');
  }
  
  // Search tabs (Buy/Rent/Commercial/Plots)
  const searchTabs = document.querySelectorAll('.search-tab');
  
  if (searchTabs.length > 0) {
    searchTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        // Remove active class from all tabs
        searchTabs.forEach(t => t.classList.remove('active'));
        // Add active class to clicked tab
        tab.classList.add('active');
        
        // Set listing type filter
        const type = tab.dataset.type;
        console.log('Search tab clicked:', type);
        
        if (type === 'sale') {
          currentFilters.listingType = 'sale';
        } else if (type === 'rent') {
          currentFilters.listingType = 'rent';
        } else if (type === 'commercial') {
          currentFilters.propertyType = 'commercial';
          currentFilters.listingType = '';
        } else if (type === 'plot') {
          currentFilters.propertyType = 'plot';
          currentFilters.listingType = '';
        }
        
        applyFilters();
      });
    });
    console.log('✅ Search tabs listeners added:', searchTabs.length);
  } else {
    console.warn('⚠️ Search tabs not found');
  }
}

function applyFilters() {
  console.log('🔍 Applying filters:', currentFilters);
  console.log('📊 Total properties:', allProperties.length);
  
  filteredProperties = allProperties.filter(property => {
    // Search filter
    if (currentFilters.search) {
      const searchTerm = currentFilters.search;
      const searchableText = [
        property.title,
        property.city,
        property.locality,
        property.address,
        property.description
      ].join(' ').toLowerCase();
      
      if (!searchableText.includes(searchTerm)) {
        return false;
      }
    }
    
    // Property type filter
    if (currentFilters.propertyType && property.propertyType !== currentFilters.propertyType) {
      return false;
    }
    
    // Listing type filter
    if (currentFilters.listingType && property.listingType !== currentFilters.listingType) {
      return false;
    }
    
    // BHK filter
    if (currentFilters.bhk && property.bhk !== parseInt(currentFilters.bhk)) {
      return false;
    }
    
    return true;
  });
  
  console.log('✅ Filtered properties:', filteredProperties.length);
  displayProperties(filteredProperties);
}

function setupLoadMore() {
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', loadMoreProperties);
  }
}

async function loadMoreProperties() {
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  if (!loadMoreBtn || !lastVisible) return;
  
  loadMoreBtn.textContent = 'Loading...';
  loadMoreBtn.disabled = true;
  
  try {
    const q = query(
      collection(window.db, 'properties'),
      orderBy('createdAt', 'desc'),
      startAfter(lastVisible),
      limit(12)
    );
    
    const snap = await getDocs(q);
    
    if (snap.empty) {
      loadMoreBtn.textContent = 'No More Properties';
      loadMoreBtn.disabled = true;
      return;
    }
    
    const newProperties = [];
    snap.forEach(doc => {
      newProperties.push({ id: doc.id, ...doc.data() });
    });
    
    allProperties.push(...newProperties);
    filteredProperties = [...allProperties];
    displayProperties(filteredProperties);
    
    lastVisible = snap.docs[snap.docs.length - 1];
    loadMoreBtn.textContent = 'Load More Properties';
    loadMoreBtn.disabled = false;
    
  } catch (error) {
    console.error('Error loading more properties:', error);
    loadMoreBtn.textContent = 'Error Loading';
    loadMoreBtn.disabled = false;
  }
}

function setupViewToggle() {
  const viewBtns = document.querySelectorAll('.view-btn');
  const grid = document.getElementById('propertiesGrid');
  
  viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      viewBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const view = btn.dataset.view;
      if (view === 'list') {
        grid.classList.add('list-view');
      } else {
        grid.classList.remove('list-view');
      }
    });
  });
}

// (Removed delegated handler; using direct anchor links for navigation.)

function showLoadingState(container) {
  container.innerHTML = `
    <div class="loading-grid">
      ${Array(8).fill(0).map(() => `
        <div class="loading-card">
          <div style="height: 200px; background: var(--ring); border-radius: 8px; margin-bottom: 16px;"></div>
          <div style="height: 20px; background: var(--ring); border-radius: 4px; margin-bottom: 8px;"></div>
          <div style="height: 16px; background: var(--ring); border-radius: 4px; margin-bottom: 8px; width: 60%;"></div>
          <div style="height: 16px; background: var(--ring); border-radius: 4px; width: 40%;"></div>
        </div>
      `).join('')}
    </div>
  `;
}

function showErrorState(container) {
  container.innerHTML = `
    <div class="empty-state">
      <h3>Failed to Load Properties</h3>
      <p>Please check your connection and try again.</p>
      <button class="btn btn-primary" onclick="location.reload()">Retry</button>
    </div>
  `;
}

// Advanced Search Setup
function setupAdvancedSearch() {
  const searchTabs = document.querySelectorAll('.search-tab');
  const searchBtn = document.getElementById('advancedSearchBtn');
  const searchLocation = document.getElementById('searchLocation');
  const propertyCategory = document.getElementById('propertyCategory');

  // Search tab switching
  if (searchTabs) {
    searchTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        searchTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const type = tab.dataset.type;
        currentFilters.listingType = type === 'plot' ? 'sale' : type;
        if (type === 'plot') {
          currentFilters.propertyType = 'plot';
        } else if (type === 'commercial') {
          currentFilters.propertyType = 'commercial';
        }
      });
    });
  }

  // Advanced search button
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      const location = searchLocation?.value || '';
      const category = propertyCategory?.value || '';
      const activeTab = document.querySelector('.search-tab.active');
      const type = activeTab?.dataset.type || 'sale';
      
      // Redirect to search results page with parameters
      const params = new URLSearchParams();
      if (location) params.set('location', location);
      if (category) params.set('category', category);
      params.set('type', type);
      
      window.location.href = `search-results.html?${params.toString()}`;
    });
  }
  
  // Advanced filters button
  const advancedFiltersBtn = document.getElementById('advancedFiltersBtn');
  if (advancedFiltersBtn) {
    advancedFiltersBtn.addEventListener('click', () => {
      window.location.href = 'search-results.html';
    });
  }

  // Category cards click
  document.querySelectorAll('.category-card').forEach(card => {
    card.addEventListener('click', () => {
      const category = card.dataset.category;
      currentFilters.propertyType = category;
      applyFilters();
      document.getElementById('properties')?.scrollIntoView({ behavior: 'smooth' });
    });
  });
}

// Load category counts
async function loadCategoryCounts() {
  try {
    const snap = await getDocs(collection(window.db, 'properties'));
    const counts = { apartment: 0, house: 0, villa: 0, plot: 0, commercial: 0 };
    
    snap.forEach(doc => {
      const type = doc.data().propertyType;
      if (type === 'house' || type === 'villa') {
        counts.house++;
      } else if (counts.hasOwnProperty(type)) {
        counts[type]++;
      }
    });

    const apartmentEl = document.getElementById('apartmentCount');
    const houseEl = document.getElementById('houseCount');
    const plotEl = document.getElementById('plotCount');
    const commercialEl = document.getElementById('commercialCount');

    if (apartmentEl) apartmentEl.textContent = `${counts.apartment} Properties`;
    if (houseEl) houseEl.textContent = `${counts.house} Properties`;
    if (plotEl) plotEl.textContent = `${counts.plot} Properties`;
    if (commercialEl) commercialEl.textContent = `${counts.commercial} Properties`;
  } catch (error) {
    console.error('Error loading category counts:', error);
  }
}

// Global functions for property actions
// Removed View Details navigation from Home cards per requirement.

window.toggleFavorite = async function(propertyId) {
  const user = window.appState?.user;
  if (!user) {
    window.location.href = 'auth.html';
    return;
  }
  
  const favoriteBtn = document.querySelector(`[data-property-id="${propertyId}"]`);
  const favoriteIcon = favoriteBtn?.querySelector('.favorite-icon');
  
  try {
    // Toggle favorite logic here
    if (favoriteIcon) {
      favoriteIcon.textContent = favoriteIcon.textContent === '♡' ? '♥' : '♡';
      favoriteBtn.classList.toggle('active');
    }
    
    if (window.sharedUtils && window.sharedUtils.showNotification) {
      window.sharedUtils.showNotification('Favorite updated!', 'success');
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    if (window.sharedUtils && window.sharedUtils.showNotification) {
      window.sharedUtils.showNotification('Failed to update favorite', 'error');
    }
  }
};

window.performSearch = function() {
  applyFilters();
  document.getElementById('properties').scrollIntoView({ behavior: 'smooth' });
};

window.clearFilters = function() {
  currentFilters = {
    search: '',
    propertyType: '',
    listingType: '',
    bhk: ''
  };
  
  // Reset form inputs
  const searchInput = document.getElementById('homeLocation');
  const typeFilter = document.getElementById('homeType');
  const purposeFilter = document.getElementById('homePurpose');
  
  if (searchInput) searchInput.value = '';
  if (typeFilter) typeFilter.value = '';
  if (purposeFilter) purposeFilter.value = 'sale';
  
  applyFilters();
};

// Export functions for global access
window.homeUtils = {
  loadProperties,
  displayProperties,
  applyFilters,
  toggleFavorite
};