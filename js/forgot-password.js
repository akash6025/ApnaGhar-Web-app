// Forgot Password Functionality
import { auth } from './firebase.js';
import { sendPasswordResetEmail } from './firebase.js';

let currentStep = 1;
let resetEmail = '';
let resetPhone = '';
let generatedOTP = '';

document.addEventListener('DOMContentLoaded', () => {
  // Add small delay to ensure DOM is fully loaded
  setTimeout(() => {
    setupForgotPasswordModal();
    setupOTPInputs();
  }, 100);
});

function setupForgotPasswordModal() {
  // Open modal when "Forgot password?" is clicked
  const forgotLinks = document.querySelectorAll('.forgot-password');
  
  if (forgotLinks.length === 0) {
    console.warn('No forgot password links found');
    return;
  }
  
  console.log('Setting up forgot password for', forgotLinks.length, 'links');
  
  forgotLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Forgot password clicked');
      openForgotPasswordModal();
    });
  });

  // Close modal
  const closeBtn = document.getElementById('closeForgotModal');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeForgotPasswordModal);
  }
  
  // Click outside to close
  const modal = document.getElementById('forgotPasswordModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target.id === 'forgotPasswordModal') {
        closeForgotPasswordModal();
      }
    });
  }

  // Step 1: Send reset link/OTP
  const forgotForm = document.getElementById('forgotPasswordForm');
  if (forgotForm) {
    forgotForm.addEventListener('submit', handleSendReset);
  }

  // Step 2: Verify OTP
  const otpForm = document.getElementById('otpVerifyForm');
  if (otpForm) {
    otpForm.addEventListener('submit', handleVerifyOTP);
  }

  // Step 3: Set new password
  const newPassForm = document.getElementById('newPasswordForm');
  if (newPassForm) {
    newPassForm.addEventListener('submit', handleSetNewPassword);
  }

  // Resend OTP
  const resendBtn = document.getElementById('resendOTP');
  if (resendBtn) {
    resendBtn.addEventListener('click', resendOTP);
  }

  // Password strength indicator
  const newPassInput = document.getElementById('newPassword');
  if (newPassInput) {
    newPassInput.addEventListener('input', checkPasswordStrength);
  }
}

function openForgotPasswordModal() {
  const modal = document.getElementById('forgotPasswordModal');
  if (modal) {
    modal.style.display = 'flex';
    currentStep = 1;
    showStep(1);
    console.log('Modal opened');
  } else {
    console.error('Forgot password modal not found');
    alert('Forgot password feature is not available. Please refresh the page and try again.');
  }
}

function closeForgotPasswordModal() {
  const modal = document.getElementById('forgotPasswordModal');
  if (modal) {
    modal.style.display = 'none';
    resetForm();
  }
}

function showStep(step) {
  // Hide all steps
  document.querySelectorAll('.reset-step').forEach(s => s.style.display = 'none');
  
  // Show current step
  document.getElementById(`step${step}`).style.display = 'block';
  currentStep = step;
}

async function handleSendReset(e) {
  e.preventDefault();
  
  resetEmail = document.getElementById('resetEmail').value.trim();
  resetPhone = document.getElementById('resetPhone').value.trim();

  if (!resetEmail && !resetPhone) {
    alert('Please enter either email or phone number');
    return;
  }

  try {
    if (resetEmail) {
      // Send password reset email via Firebase
      await sendPasswordResetEmail(auth, resetEmail);
      alert('Password reset link sent to your email! Please check your inbox.');
      closeForgotPasswordModal();
    } else if (resetPhone) {
      // For phone: Generate OTP and move to step 2
      generatedOTP = generateOTP();
      console.log('Generated OTP:', generatedOTP); // In production, send via SMS API
      
      // Simulate sending OTP
      alert(`OTP sent to ${resetPhone}: ${generatedOTP}\n(In production, this will be sent via SMS)`);
      showStep(2);
    }
  } catch (error) {
    console.error('Error sending reset:', error);
    if (error.code === 'auth/user-not-found') {
      alert('No account found with this email address');
    } else {
      alert('Failed to send reset link. Please try again.');
    }
  }
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function setupOTPInputs() {
  const inputs = document.querySelectorAll('.otp-input');
  
  inputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
      if (e.target.value.length === 1 && index < inputs.length - 1) {
        inputs[index + 1].focus();
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && index > 0) {
        inputs[index - 1].focus();
      }
    });

    // Only allow numbers
    input.addEventListener('keypress', (e) => {
      if (!/[0-9]/.test(e.key)) {
        e.preventDefault();
      }
    });
  });
}

function handleVerifyOTP(e) {
  e.preventDefault();
  
  const inputs = document.querySelectorAll('.otp-input');
  const enteredOTP = Array.from(inputs).map(input => input.value).join('');

  if (enteredOTP.length !== 6) {
    alert('Please enter complete 6-digit OTP');
    return;
  }

  if (enteredOTP === generatedOTP) {
    showStep(3);
  } else {
    alert('Invalid OTP. Please try again.');
    // Clear OTP inputs
    inputs.forEach(input => input.value = '');
    inputs[0].focus();
  }
}

function resendOTP() {
  generatedOTP = generateOTP();
  console.log('Resent OTP:', generatedOTP);
  alert(`New OTP sent to ${resetPhone}: ${generatedOTP}\n(In production, this will be sent via SMS)`);
  
  // Clear OTP inputs
  document.querySelectorAll('.otp-input').forEach(input => input.value = '');
  document.querySelector('.otp-input').focus();
}

async function handleSetNewPassword(e) {
  e.preventDefault();
  
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (newPassword !== confirmPassword) {
    alert('Passwords do not match');
    return;
  }

  if (newPassword.length < 6) {
    alert('Password must be at least 6 characters long');
    return;
  }

  try {
    // For phone-based reset, we need to update the password
    // In a real app, you'd need to:
    // 1. Verify the user's identity via OTP
    // 2. Get a custom token from your backend
    // 3. Sign in with that token
    // 4. Update the password
    
    // For email-based reset, Firebase handles it automatically via the reset link
    
    // For now, show success (in production, implement proper password update)
    if (resetPhone) {
      // Simulate password update
      console.log('Password would be updated for phone:', resetPhone);
      showStep(4);
    }
  } catch (error) {
    console.error('Error updating password:', error);
    alert('Failed to update password. Please try again.');
  }
}

function checkPasswordStrength(e) {
  const password = e.target.value;
  const strengthDiv = document.getElementById('passwordStrength');
  
  let strength = 0;
  let message = '';
  let color = '';

  if (password.length >= 6) strength++;
  if (password.length >= 10) strength++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;

  switch (strength) {
    case 0:
    case 1:
      message = 'Weak password';
      color = '#dc2626';
      break;
    case 2:
    case 3:
      message = 'Medium password';
      color = '#f59e0b';
      break;
    case 4:
    case 5:
      message = 'Strong password';
      color = '#27b38a';
      break;
  }

  strengthDiv.innerHTML = `
    <div class="strength-bar">
      <div class="strength-fill" style="width: ${strength * 20}%; background: ${color};"></div>
    </div>
    <p style="color: ${color}; font-size: 13px; margin-top: 5px;">${message}</p>
  `;
}

function resetForm() {
  document.getElementById('forgotPasswordForm').reset();
  document.getElementById('otpVerifyForm').reset();
  document.getElementById('newPasswordForm').reset();
  document.querySelectorAll('.otp-input').forEach(input => input.value = '');
  document.getElementById('passwordStrength').innerHTML = '';
  resetEmail = '';
  resetPhone = '';
  generatedOTP = '';
}
