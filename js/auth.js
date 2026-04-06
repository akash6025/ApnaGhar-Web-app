// Unified Authentication functionality
import { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, updateProfile, onAuthStateChanged, doc, setDoc, serverTimestamp } from './firebase.js';

// Global state
let isProcessing = false;

document.addEventListener('DOMContentLoaded', () => {
  setupAuthTabs();
  setupAuthForms();
  setupPasswordStrength();
  setupFormValidation();
  setupPasswordToggles();
  
  // Redirect if already logged in
  onAuthStateChanged(auth, (user) => {
    if (user && !isProcessing) {
      // Small delay to ensure auth state is properly set
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 100);
    }
  });
});

function setupAuthTabs() {
  const tabBtns = document.querySelectorAll('.auth-tab-btn');
  const formContainers = document.querySelectorAll('.auth-form-container');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      
      // Update active tab button
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Update active form container
      formContainers.forEach(container => {
        container.classList.remove('active');
        if (container.id === `${targetTab}-form`) {
          container.classList.add('active');
        }
      });
      
      // Clear any existing form errors
      clearAllErrors();
    });
  });
}

function setupAuthForms() {
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const registerForm = document.getElementById('registerForm');
  const googleLoginBtn = document.getElementById('googleLoginBtn');
  const googleSignupBtn = document.getElementById('googleSignupBtn');
  const googleRegisterBtn = document.getElementById('googleRegisterBtn');
  
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
  
  if (signupForm) {
    signupForm.addEventListener('submit', handleSignup);
  }
  
  if (registerForm) {
    registerForm.addEventListener('submit', handleSignup);
  }
  
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', () => handleGoogleAuth('login'));
  }
  
  if (googleSignupBtn) {
    googleSignupBtn.addEventListener('click', () => handleGoogleAuth('signup'));
  }
  
  if (googleRegisterBtn) {
    googleRegisterBtn.addEventListener('click', () => handleGoogleAuth('signup'));
  }
}

async function handleLogin(e) {
  e.preventDefault();
  if (isProcessing) return;
  
  // Support both tabbed interface (loginEmail) and separate page (email)
  const emailInput = document.getElementById('loginEmail') || document.getElementById('email');
  const passwordInput = document.getElementById('loginPassword') || document.getElementById('password');
  
  if (!emailInput || !passwordInput) {
    showError('Form elements not found');
    return;
  }
  
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  
  // Support different button selectors
  const loginBtn = document.querySelector('#loginForm .auth-btn') || 
                   document.querySelector('#loginForm .btn-primary') || 
                   document.getElementById('loginBtn');
  
  if (!email || !password) {
    showError('Please fill in all fields');
    return;
  }
  
  setLoading(loginBtn, true);
  isProcessing = true;
  
  try {
    await signInWithEmailAndPassword(auth, email, password);
    showSuccess('Welcome back!');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 500);
  } catch (error) {
    console.error('Login error:', error);
    showError(getErrorMessage(error.code));
  } finally {
    setLoading(loginBtn, false);
    isProcessing = false;
  }
}

async function handleSignup(e) {
  e.preventDefault();
  if (isProcessing) return;
  
  // Support both tabbed interface and separate page
  const firstNameInput = document.getElementById('signupFirstName') || document.getElementById('firstName');
  const lastNameInput = document.getElementById('signupLastName') || document.getElementById('lastName');
  const emailInput = document.getElementById('signupEmail') || document.getElementById('email');
  const phoneInput = document.getElementById('signupPhone') || document.getElementById('phone');
  const passwordInput = document.getElementById('signupPassword') || document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const agreeTermsInput = document.getElementById('agreeTerms');
  
  if (!firstNameInput || !lastNameInput || !emailInput || !passwordInput || !confirmPasswordInput) {
    showError('Form elements not found');
    return;
  }
  
  const firstName = firstNameInput.value.trim();
  const lastName = lastNameInput.value.trim();
  const email = emailInput.value.trim();
  const phone = phoneInput ? phoneInput.value.trim() : '';
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;
  const agreeTerms = agreeTermsInput ? agreeTermsInput.checked : false;
  
  // Support different button selectors
  const signupBtn = document.querySelector('#signupForm .auth-btn') || 
                    document.querySelector('#registerForm .btn-primary') || 
                    document.getElementById('registerBtn');
  
  // Validation
  if (!firstName || !lastName || !email || !password || !confirmPassword) {
    showError('Please fill in all required fields');
    return;
  }
  
  if (password !== confirmPassword) {
    showError('Passwords do not match');
    return;
  }
  
  if (password.length < 6) {
    showError('Password must be at least 6 characters long');
    return;
  }
  
  if (agreeTermsInput && !agreeTerms) {
    showError('Please agree to the terms and conditions');
    return;
  }
  
  setLoading(signupBtn, true);
  isProcessing = true;
  
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update profile with name
    await updateProfile(user, {
      displayName: `${firstName} ${lastName}`
    });
    
    // Store additional user data in Firestore
    try {
      await setDoc(doc(window.db, 'users', user.uid), {
        firstName,
        lastName,
        email,
        phone: phone || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (dbError) {
      console.warn('Could not save user data to Firestore:', dbError);
    }
    
    showSuccess('Account created successfully!');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1000);
    
  } catch (error) {
    console.error('Registration error:', error);
    showError(getErrorMessage(error.code));
  } finally {
    setLoading(signupBtn, false);
    isProcessing = false;
  }
}

async function handleGoogleAuth(type) {
  if (isProcessing) return;
  
  const buttonId = type === 'login' ? 'googleLoginBtn' : 'googleSignupBtn';
  const button = document.getElementById(buttonId);
  
  setLoading(button, true);
  isProcessing = true;
  
  try {
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    // If it's signup, save additional user data
    if (type === 'signup') {
      try {
        await setDoc(doc(window.db, 'users', user.uid), {
          firstName: user.displayName?.split(' ')[0] || '',
          lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
          email: user.email,
          phone: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } catch (dbError) {
        console.warn('Could not save user data to Firestore:', dbError);
      }
    }
    
    showSuccess(type === 'login' ? 'Welcome back!' : 'Account created successfully!');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 500);
    
  } catch (error) {
    console.error('Google auth error:', error);
    if (error.code !== 'auth/popup-closed-by-user') {
      showError(getErrorMessage(error.code));
    }
  } finally {
    setLoading(button, false);
    isProcessing = false;
  }
}

function setupPasswordStrength() {
  // Support both signupPassword (auth.html) and password (register.html)
  const passwordInput = document.getElementById('signupPassword') || 
                        (document.getElementById('registerForm') ? document.getElementById('password') : null);
  const strengthFill = document.querySelector('.strength-fill');
  const strengthText = document.querySelector('.strength-text');
  
  if (!passwordInput || !strengthFill || !strengthText) return;
  
  passwordInput.addEventListener('input', () => {
    const password = passwordInput.value;
    const strength = calculatePasswordStrength(password);
    
    strengthFill.className = 'strength-fill';
    strengthFill.classList.add(strength.level);
    strengthText.textContent = strength.text;
  });
}

function calculatePasswordStrength(password) {
  let score = 0;
  let feedback = [];
  
  if (password.length >= 8) score += 1;
  else feedback.push('at least 8 characters');
  
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('lowercase letters');
  
  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('uppercase letters');
  
  if (/[0-9]/.test(password)) score += 1;
  else feedback.push('numbers');
  
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  else feedback.push('special characters');
  
  if (score <= 1) {
    return { level: 'weak', text: 'Weak password' };
  } else if (score <= 2) {
    return { level: 'fair', text: 'Fair password' };
  } else if (score <= 3) {
    return { level: 'good', text: 'Good password' };
  } else {
    return { level: 'strong', text: 'Strong password' };
  }
}

function setupFormValidation() {
  const forms = document.querySelectorAll('.auth-form');
  
  forms.forEach(form => {
    const inputs = form.querySelectorAll('input[required]');
    
    inputs.forEach(input => {
      input.addEventListener('blur', () => validateField(input));
      input.addEventListener('input', () => clearFieldError(input));
    });
  });
}

function validateField(input) {
  const value = input.value.trim();
  const type = input.type;
  const name = input.name;
  
  clearFieldError(input);
  
  if (!value && input.required) {
    showFieldError(input, 'This field is required');
    return false;
  }
  
  if (type === 'email' && value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      showFieldError(input, 'Please enter a valid email address');
      return false;
    }
  }
  
  if (name === 'phone' && value) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(value.replace(/\s/g, ''))) {
      showFieldError(input, 'Please enter a valid phone number');
      return false;
    }
  }
  
  if (name === 'password' && value) {
    if (value.length < 6) {
      showFieldError(input, 'Password must be at least 6 characters');
      return false;
    }
  }
  
  if (name === 'confirmPassword' && value) {
    const passwordInput = document.getElementById('signupPassword') || document.getElementById('password');
    if (passwordInput && value !== passwordInput.value) {
      showFieldError(input, 'Passwords do not match');
      return false;
    }
  }
  
  showFieldSuccess(input);
  return true;
}

function showFieldError(input, message) {
  const formGroup = input.closest('.form-group');
  formGroup.classList.add('error');
  formGroup.classList.remove('success');
  
  let errorElement = formGroup.querySelector('.error-message');
  if (!errorElement) {
    errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    formGroup.appendChild(errorElement);
  }
  errorElement.textContent = message;
}

function showFieldSuccess(input) {
  const formGroup = input.closest('.form-group');
  formGroup.classList.add('success');
  formGroup.classList.remove('error');
  
  const errorElement = formGroup.querySelector('.error-message');
  if (errorElement) {
    errorElement.remove();
  }
}

function clearFieldError(input) {
  const formGroup = input.closest('.form-group');
  formGroup.classList.remove('error', 'success');
  
  const errorElement = formGroup.querySelector('.error-message');
  if (errorElement) {
    errorElement.remove();
  }
}

function clearAllErrors() {
  const errorElements = document.querySelectorAll('.error-message');
  errorElements.forEach(el => el.remove());
  
  const errorGroups = document.querySelectorAll('.form-group.error');
  errorGroups.forEach(group => {
    group.classList.remove('error', 'success');
  });
}

function setLoading(button, loading) {
  if (!button) return;
  
  const btnText = button.querySelector('.btn-text');
  const btnLoading = button.querySelector('.btn-loading');
  
  if (loading) {
    button.disabled = true;
    button.classList.add('loading');
    if (btnText) btnText.style.display = 'none';
    if (btnLoading) btnLoading.style.display = 'block';
  } else {
    button.disabled = false;
    button.classList.remove('loading');
    if (btnText) btnText.style.display = 'block';
    if (btnLoading) btnLoading.style.display = 'none';
  }
}

function showError(message) {
  showNotification(message, 'error');
}

function showSuccess(message) {
  showNotification(message, 'success');
}

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
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        animation: slideInRight 0.3s ease-out;
      }
      
      .notification-success {
        background: var(--success);
        color: white;
      }
      
      .notification-error {
        background: var(--danger);
        color: white;
      }
      
      .notification-info {
        background: var(--info);
        color: white;
      }
      
      .notification-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
      }
      
      .notification-close {
        background: none;
        border: none;
        color: inherit;
        font-size: 20px;
        cursor: pointer;
        margin-left: 12px;
        padding: 4px;
        border-radius: 4px;
        transition: background 0.2s ease;
      }
      
      .notification-close:hover {
        background: rgba(255, 255, 255, 0.2);
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

function setupPasswordToggles() {
  const passwordToggle = document.getElementById('passwordToggle');
  const confirmPasswordToggle = document.getElementById('confirmPasswordToggle');
  
  if (passwordToggle) {
    passwordToggle.addEventListener('click', () => {
      const passwordInput = document.getElementById('password') || 
                           document.getElementById('loginPassword') || 
                           document.getElementById('signupPassword');
      if (passwordInput) {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        passwordToggle.textContent = type === 'password' ? '👁️' : '🙈';
      }
    });
  }
  
  if (confirmPasswordToggle) {
    confirmPasswordToggle.addEventListener('click', () => {
      const confirmPasswordInput = document.getElementById('confirmPassword');
      if (confirmPasswordInput) {
        const type = confirmPasswordInput.type === 'password' ? 'text' : 'password';
        confirmPasswordInput.type = type;
        confirmPasswordToggle.textContent = type === 'password' ? '👁️' : '🙈';
      }
    });
  }
}

function getErrorMessage(errorCode) {
  const errorMessages = {
    'auth/user-not-found': 'No account found with this email address',
    'auth/wrong-password': 'Incorrect password',
    'auth/email-already-in-use': 'An account with this email already exists',
    'auth/weak-password': 'Password is too weak',
    'auth/invalid-email': 'Invalid email address',
    'auth/user-disabled': 'This account has been disabled',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later',
    'auth/network-request-failed': 'Network error. Please check your connection',
    'auth/popup-closed-by-user': 'Sign-in was cancelled',
    'auth/cancelled-popup-request': 'Sign-in was cancelled'
  };
  
  return errorMessages[errorCode] || 'An error occurred. Please try again';
}

// Export for global access
window.authUtils = {
  handleLogin,
  handleSignup,
  handleGoogleAuth,
  showError,
  showSuccess
};