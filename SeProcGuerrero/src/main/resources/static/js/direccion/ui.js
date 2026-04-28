function addCacheBuster(url) {
  if (!url) return url;
  return url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
}

export function openModal(modalEl, backdropEl) {
  modalEl?.classList.add('open');
  backdropEl?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

export function closeModal(modalEl, backdropEl) {
  modalEl?.classList.remove('open');
  backdropEl?.classList.remove('open');
  document.body.style.overflow = '';
}

export function renderProfilePhoto(url) {
  const profileImg = document.getElementById('profileImg');
  const profileFallback = document.getElementById('profileFallback');
  if (!profileImg || !profileFallback) return;

  if (!url || url.trim() === '') {
    profileImg.style.display = 'none';
    profileFallback.style.display = 'block';
    return;
  }

  profileImg.onload = () => {
    profileImg.style.display = 'block';
    profileFallback.style.display = 'none';
  };

  profileImg.onerror = () => {
    profileImg.style.display = 'none';
    profileFallback.style.display = 'block';
  };

  profileImg.src = addCacheBuster(url);
}

export function showCustomAlert(message, title = 'Atención') {
  const customAlert = document.getElementById('customAlert');
  const customAlertBackdrop = document.getElementById('customAlertBackdrop');
  const customAlertTitle = document.getElementById('customAlertTitle');
  const customAlertMessage = document.getElementById('customAlertMessage');
  const customAlertOk = document.getElementById('customAlertOk');
  const customAlertCancel = document.getElementById('customAlertCancel');

  return new Promise((resolve) => {
    if (!customAlert || !customAlertBackdrop) {
      window.alert(message);
      resolve(true);
      return;
    }

    if (customAlertTitle) customAlertTitle.textContent = title;
    if (customAlertMessage) customAlertMessage.textContent = message;
    if (customAlertCancel) customAlertCancel.style.display = 'none';

    openModal(customAlert, customAlertBackdrop);

    const handleOk = () => {
      customAlertOk?.removeEventListener('click', handleOk);
      closeCustomAlert();
      resolve(true);
    };

    customAlertOk?.addEventListener('click', handleOk);
  });
}

export function showCustomConfirm(message, title = 'Confirmar acción') {
  const customAlert = document.getElementById('customAlert');
  const customAlertBackdrop = document.getElementById('customAlertBackdrop');
  const customAlertTitle = document.getElementById('customAlertTitle');
  const customAlertMessage = document.getElementById('customAlertMessage');
  const customAlertOk = document.getElementById('customAlertOk');
  const customAlertCancel = document.getElementById('customAlertCancel');

  return new Promise((resolve) => {
    if (!customAlert || !customAlertBackdrop || !customAlertCancel) {
      resolve(window.confirm(message));
      return;
    }

    if (customAlertTitle) customAlertTitle.textContent = title;
    if (customAlertMessage) customAlertMessage.textContent = message;
    customAlertCancel.style.display = 'inline-flex';

    openModal(customAlert, customAlertBackdrop);

    const handleOk = () => { cleanup(); resolve(true); };
    const handleCancel = () => { cleanup(); resolve(false); };

    const cleanup = () => {
      customAlertOk?.removeEventListener('click', handleOk);
      customAlertCancel?.removeEventListener('click', handleCancel);
      closeCustomAlert();
    };

    customAlertOk?.addEventListener('click', handleOk);
    customAlertCancel?.addEventListener('click', handleCancel);
  });
}

export function closeCustomAlert() {
  const customAlert = document.getElementById('customAlert');
  const customAlertBackdrop = document.getElementById('customAlertBackdrop');
  closeModal(customAlert, customAlertBackdrop);
}

export function closeProfileMenu() {
  document.getElementById('profileMenuDropdown')?.classList.remove('open');
}

export function toggleProfileMenu() {
  document.getElementById('profileMenuDropdown')?.classList.toggle('open');
}

export function closeMobileMenu() {
  if (window.matchMedia('(max-width: 768px)').matches) {
    document.getElementById('sidebar')?.classList.remove('menu-open');
  }
}

document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('profileMenuDropdown');
  if (dropdown?.classList.contains('open') && !e.target.closest('.userbox')) {
    closeProfileMenu();
  }
});
