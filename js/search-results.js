// Search Results Page
import { collection, getDocs, query, where, orderBy, limit, startAfter } from './firebase.js';

let allResults = [];
let filteredResults = [];
let lastVisible = null;
let currentFilters = {
  search: '',
  minPrice: null,
  maxPrice: null,
  bhk: [],
  propertyType: [],
  furnished: [],
  parking: false,
  listingType: 'sale'
};

document.addEventListener('DOMContentLoaded', () => {
  // Wait for Firebase to initialize
  const initializeApp = () => {
    if (!window.db) {
      console.log('Waiting for Firebase to initialize...');
      setTimeout(initializeApp, 100);
      return;
    }
    
    console.log('Firebase initialized, loading search results...');
    loadSearchParams();
    setupFilters();
    setupSort();
    setupViewToggle();
    performSearch();
  };
  
  initializeApp();
});

function loadSearchParams() {
  const urlParams = new URLSearchParams(window.location.search);
  
  currentFilters.search = urlParams.get('location') || '';
  currentFilters.listingType = urlParams.get('type') || 'sale';
  currentFilters.propertyType = urlParams.get('category') ? [urlParams.get('category')] : [];
  
  // Update search query display
  if (currentFilters.search) {
    document.getElementById('searchQuery').textContent = `Searching in: ${currentFilters.search}`;
  }
  
  // Update quick search input
  document.getElementById('quickSearch').value = currentFilters.search;
}

function setupFilters() {
  // Quick search
  document.getElementById('quickSearchBtn').addEventListener('click', () => {
    currentFilters.search = document.getElementById('quickSearch').value;
    performSearch();
  });

  // Price filters
  document.getElementById('minPrice').addEventListener('change', (e) => {
    currentFilters.minPrice = e.target.value ? Number(e.target.value) : null;
  });
  
  document.getElementById('maxPrice').addEventListener('change', (e) => {
    currentFilters.maxPrice = e.target.value ? Number(e.target.value) : null;
  });

  // BHK filters
  document.querySelectorAll('.bhk-filter').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      currentFilters.bhk = Array.from(document.querySelectorAll('.bhk-filter:checked'))
        .map(cb => parseInt(cb.value));
    });
  });

  // Property type filters
  document.querySelectorAll('.type-filter').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      currentFilters.propertyType = Array.from(document.querySelectorAll('.type-filter:checked'))
        .map(cb => cb.value);
    });
  });

  // Furnished filters
  document.querySelectorAll('.furnished-filter').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      currentFilters.furnished = Array.from(document.querySelectorAll('.furnished-filter:checked'))
        .map(cb => cb.value);
    });
  });

  // Parking filter
  document.getElementById('parkingFilter').addEventListener('change', (e) => {
    currentFilters.parking = e.target.checked;
  });

  // Apply filters button
  document.getElementById('applyFiltersBtn').addEventListener('click', () => {
    applyFilters();
    updateActiveFiltersDisplay();
  });

  // Clear all filters
  document.getElementById('clearAllFilters').addEventListener('click', () => {
    clearAllFilters();
  });
}

function setupSort() {
  document.getElementById('sortBy').addEventListener('change', (e) => {
    sortResults(e.target.value);
  });
}

function setupViewToggle() {
  const viewBtns = document.querySelectorAll('.view-btn');
  const grid = document.getElementById('resultsGrid');
  
  viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      viewBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      if (btn.dataset.view === 'list') {
        grid.classList.add('list-view');
      } else {
        grid.classList.remove('list-view');
      }
    });
  });
}

async function performSearch() {
  const grid = document.getElementById('resultsGrid');
  grid.innerHTML = '<div class="loading">Loading properties...</div>';

  try {
    let snap;
    try {
      let q = query(collection(window.db, 'properties'), orderBy('createdAt', 'desc'), limit(20));
      snap = await getDocs(q);
    } catch (orderError) {
      console.warn('Could not order by createdAt, loading without ordering:', orderError);
      let q = query(collection(window.db, 'properties'), limit(20));
      snap = await getDocs(q);
    }
    
    allResults = [];
    snap.forEach(doc => {
      const data = doc.data();
      allResults.push({ 
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

    console.log('Loaded search results:', allResults.length);
    
    filteredResults = [...allResults];
    applyFilters();
    
    lastVisible = snap.docs[snap.docs.length - 1];
  } catch (error) {
    console.error('Error searching properties:', error);
    grid.innerHTML = '<div class="error-state">Failed to load properties. Please try again.</div>';
  }
}

function applyFilters() {
  filteredResults = allResults.filter(property => {
    // Search filter
    if (currentFilters.search) {
      const searchTerm = currentFilters.search.toLowerCase();
      const searchable = [
        property.title,
        property.city,
        property.locality,
        property.address
      ].join(' ').toLowerCase();
      
      if (!searchable.includes(searchTerm)) return false;
    }

    // Price filter
    if (currentFilters.minPrice && property.price < currentFilters.minPrice) return false;
    if (currentFilters.maxPrice && property.price > currentFilters.maxPrice) return false;

    // BHK filter
    if (currentFilters.bhk.length > 0 && !currentFilters.bhk.includes(property.bhk)) return false;

    // Property type filter
    if (currentFilters.propertyType.length > 0 && !currentFilters.propertyType.includes(property.propertyType)) return false;

    // Furnished filter
    if (currentFilters.furnished.length > 0 && !currentFilters.furnished.includes(property.furnished)) return false;

    // Parking filter
    if (currentFilters.parking && !property.parking) return false;

    return true;
  });

  displayResults(filteredResults);
  updateActiveFiltersDisplay();
}

function displayResults(results) {
  const grid = document.getElementById('resultsGrid');
  const countEl = document.getElementById('resultsCount');
  
  countEl.textContent = results.length;

  if (results.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <h3>No Properties Found</h3>
        <p>Try adjusting your filters or search criteria</p>
        <button onclick="location.href='index.html'" class="btn btn-primary">Back to Home</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = '';
  results.forEach(property => {
    const card = createPropertyCard(property);
    grid.appendChild(card);
  });
}

function createPropertyCard(property) {
  const card = document.createElement('article');
  card.className = 'property-card';
  
  const img = (property.images && property.images[0]) || '/public/placeholder.jpg';
  const price = Number(property.price || 0).toLocaleString('en-IN');
  const priceText = property.listingType === 'rent' ? `₹${price}/month` : `₹${price}`;
  
  card.innerHTML = `
    <img src="${img}" alt="${property.title}" class="property-image" />
    <div class="property-content">
      <h3>${property.title}</h3>
      <p class="property-location">📍 ${property.locality}, ${property.city}</p>
      <div class="property-price">${priceText}</div>
      <div class="property-meta">
        ${property.bhk ? `<span>🛏️ ${property.bhk} BHK</span>` : ''}
        ${property.area ? `<span>📐 ${property.area} sq.ft</span>` : ''}
        ${property.bathrooms ? `<span>🚿 ${property.bathrooms} Bath</span>` : ''}
      </div>
      <div class="property-actions">
        <button onclick="toggleFavorite('${property.id}')" class="btn-icon">♡</button>
      </div>
    </div>
  `;
  
  return card;
}

function sortResults(sortType) {
  switch (sortType) {
    case 'price-low':
      filteredResults.sort((a, b) => (a.price || 0) - (b.price || 0));
      break;
    case 'price-high':
      filteredResults.sort((a, b) => (b.price || 0) - (a.price || 0));
      break;
    case 'newest':
      filteredResults.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      break;
    case 'oldest':
      filteredResults.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
      break;
    default:
      // relevance - keep current order
      break;
  }
  
  displayResults(filteredResults);
}

function updateActiveFiltersDisplay() {
  const container = document.getElementById('activeFilters');
  const chips = [];

  if (currentFilters.minPrice || currentFilters.maxPrice) {
    const min = currentFilters.minPrice ? `₹${currentFilters.minPrice.toLocaleString('en-IN')}` : 'Any';
    const max = currentFilters.maxPrice ? `₹${currentFilters.maxPrice.toLocaleString('en-IN')}` : 'Any';
    chips.push(`Price: ${min} - ${max}`);
  }

  if (currentFilters.bhk.length > 0) {
    chips.push(`BHK: ${currentFilters.bhk.join(', ')}`);
  }

  if (currentFilters.propertyType.length > 0) {
    chips.push(`Type: ${currentFilters.propertyType.join(', ')}`);
  }

  if (currentFilters.furnished.length > 0) {
    chips.push(`Furnished: ${currentFilters.furnished.join(', ')}`);
  }

  if (currentFilters.parking) {
    chips.push('Parking Available');
  }

  container.innerHTML = chips.map(chip => `
    <span class="filter-chip">${chip} <button onclick="removeFilter('${chip}')">×</button></span>
  `).join('');
}

function clearAllFilters() {
  currentFilters = {
    search: currentFilters.search,
    minPrice: null,
    maxPrice: null,
    bhk: [],
    propertyType: [],
    furnished: [],
    parking: false,
    listingType: currentFilters.listingType
  };

  // Reset form inputs
  document.getElementById('minPrice').value = '';
  document.getElementById('maxPrice').value = '';
  document.querySelectorAll('.bhk-filter').forEach(cb => cb.checked = false);
  document.querySelectorAll('.type-filter').forEach(cb => cb.checked = false);
  document.querySelectorAll('.furnished-filter').forEach(cb => cb.checked = false);
  document.getElementById('parkingFilter').checked = false;

  applyFilters();
}

window.toggleFavorite = async function(propertyId) {
  const user = window.appState?.user;
  if (!user) {
    alert('Please login to save favorites');
    window.location.href = 'auth.html';
    return;
  }
  alert('Favorite feature will be implemented soon!');
};
