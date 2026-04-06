// Navigation functionality
document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.getElementById('hamburger');
  const navMenu = document.getElementById('nav-menu');
  
  // Ensure "My Properties" link exists between Favorites and Profile in desktop nav
  if (navMenu && !navMenu.querySelector('#myPropertiesNav')) {
    const favoritesLink = Array.from(navMenu.querySelectorAll('a.nav-link')).find(a => a.getAttribute('href') === 'favorites.html');
    const myPropsLink = document.createElement('a');
    myPropsLink.href = 'admin.html';
    myPropsLink.className = 'nav-link';
    myPropsLink.id = 'myPropertiesNav';
    myPropsLink.textContent = 'My Properties';
    if (favoritesLink && favoritesLink.nextSibling) {
      navMenu.insertBefore(myPropsLink, favoritesLink.nextSibling);
    } else if (favoritesLink) {
      navMenu.appendChild(myPropsLink);
    }
  }

  if (hamburger) {
    hamburger.addEventListener('click', toggleMobileMenu);
  }
  
  // Close mobile menu when clicking outside
  document.addEventListener('click', (e) => {
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu && mobileMenu.classList.contains('active') && 
        !hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
      closeMobileMenu();
    }
  });
  
  // Close mobile menu on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMobileMenu();
    }
  });
  
  // Update active nav link based on current page
  updateActiveNavLink();
  
  // Also update after a short delay to ensure all elements are loaded
  setTimeout(updateActiveNavLink, 100);
});

function toggleMobileMenu() {
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  
  if (!mobileMenu) {
    createMobileMenu();
    return;
  }
  
  const isActive = mobileMenu.classList.contains('active');
  
  if (isActive) {
    closeMobileMenu();
  } else {
    openMobileMenu();
  }
}

function createMobileMenu() {
  const navContainer = document.querySelector('.nav-container');
  const mobileMenu = document.createElement('div');
  mobileMenu.id = 'mobile-menu';
  mobileMenu.className = 'mobile-menu';
  
  const currentPage = getCurrentPage();
  
  mobileMenu.innerHTML = `
    <div class="mobile-menu-content">
      <a href="index.html" class="mobile-nav-link ${currentPage === 'home' ? 'active' : ''}">Home</a>
      <a href="listings.html" class="mobile-nav-link ${currentPage === 'listings' ? 'active' : ''}">Listings</a>
      <a href="favorites.html" class="mobile-nav-link ${currentPage === 'favorites' ? 'active' : ''}">Favorites</a>
      <a href="admin.html" class="mobile-nav-link ${currentPage === 'admin' ? 'active' : ''}" id="mobileMyPropsNav">My Properties</a>
      <a href="profile.html" class="mobile-nav-link ${currentPage === 'profile' ? 'active' : ''}">Profile</a>
      <a href="admin.html" class="mobile-nav-link ${currentPage === 'admin' ? 'active' : ''}" id="mobileAdminNav" style="display: none;">My Dashboard</a>
    </div>
    <div class="mobile-auth">
      <button class="btn btn-primary" id="mobileLogin">Login</button>
    </div>
  `;
  
  navContainer.appendChild(mobileMenu);
  
  // Add event listeners
  mobileMenu.querySelector('#mobileLogin').addEventListener('click', () => {
    if (window.sharedUtils && window.sharedUtils.showAuthDialog) {
      window.sharedUtils.showAuthDialog();
    }
    closeMobileMenu();
  });
  
  // Add click listeners to mobile nav links
  mobileMenu.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', closeMobileMenu);
  });
  
  openMobileMenu();
}

function openMobileMenu() {
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  
  if (hamburger) hamburger.classList.add('active');
  if (mobileMenu) mobileMenu.classList.add('active');
  
  // Prevent body scroll
  document.body.style.overflow = 'hidden';
}

function closeMobileMenu() {
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  
  if (hamburger) hamburger.classList.remove('active');
  if (mobileMenu) mobileMenu.classList.remove('active');
  
  // Restore body scroll
  document.body.style.overflow = '';
}

function getCurrentPage() {
  const path = window.location.pathname;
  const filename = path.split('/').pop();
  const hash = window.location.hash;
  
  if (filename === 'index.html' || filename === '' || path === '/') {
    return 'home';
  } else if (filename === 'listings.html') {
    return 'listings';
  } else if (filename === 'favorites.html') {
    return 'favorites';
  } else if (filename === 'profile.html') {
    return hash === '#properties' ? 'profile-properties' : 'profile';
  } else if (filename === 'admin.html') {
    return 'admin';
  } else if (filename === 'auth.html') {
    return 'auth';
  }
  
  return 'home';
}

function updateActiveNavLink() {
  const currentPage = getCurrentPage();
  
  // Update desktop nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    
    const href = link.getAttribute('href');
    if ((currentPage === 'home' && (href === 'index.html' || href === '/')) ||
        (currentPage === 'listings' && href === 'listings.html') ||
        (currentPage === 'favorites' && href === 'favorites.html') ||
        (currentPage === 'admin' && link.id === 'myPropertiesNav') ||
        (currentPage === 'profile' && href === 'profile.html') ||
        (currentPage === 'profile-properties' && href === 'profile.html#properties') ||
        (currentPage === 'admin' && href === 'admin.html')) {
      link.classList.add('active');
    }
  });
  
  // Update mobile nav links
  document.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.classList.remove('active');
    
    const href = link.getAttribute('href');
    if ((currentPage === 'home' && (href === 'index.html' || href === '/')) ||
        (currentPage === 'listings' && href === 'listings.html') ||
        (currentPage === 'favorites' && href === 'favorites.html') ||
        (currentPage === 'admin' && href === 'admin.html') ||
        (currentPage === 'profile' && href === 'profile.html') ||
        (currentPage === 'profile-properties' && href === 'profile.html#properties') ||
        (currentPage === 'admin' && href === 'admin.html')) {
      link.classList.add('active');
    }
  });
}

// Smooth scrolling for anchor links
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
});

// Update mobile menu when auth state changes
if (window.appState) {
  const originalUpdateMobileMenu = window.updateMobileMenu;
  window.updateMobileMenu = function() {
    if (originalUpdateMobileMenu) originalUpdateMobileMenu();
    
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu) {
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
              const { signOut } = await import('./firebase.js');
              await signOut(window.auth);
              if (window.sharedUtils && window.sharedUtils.showNotification) {
                window.sharedUtils.showNotification('Logged out successfully', 'info');
              }
            } catch (error) {
              if (window.sharedUtils && window.sharedUtils.showNotification) {
                window.sharedUtils.showNotification('Failed to logout', 'error');
              }
            }
          });
        } else {
          mobileAuth.innerHTML = `
            <button class="btn btn-primary" id="mobileLogin">Login</button>
          `;
          
          mobileAuth.querySelector('#mobileLogin').addEventListener('click', () => {
            if (window.sharedUtils && window.sharedUtils.showAuthDialog) {
              window.sharedUtils.showAuthDialog();
            }
            closeMobileMenu();
          });
        }
      }
      
      // Update admin link visibility
      const adminLink = mobileMenu.querySelector('#mobileAdminNav');
      if (adminLink) {
        adminLink.style.display = isAdmin ? 'block' : 'none';
      }
    }
  };
}

// Export functions for global access
window.navigationUtils = {
  toggleMobileMenu,
  openMobileMenu,
  closeMobileMenu,
  updateActiveNavLink,
  getCurrentPage
};
