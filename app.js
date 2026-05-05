// NRD Control de Stock
const logger = window.logger || console;

import { initializeInventory, cleanupInventory } from './views/inventory/index.js';

function setupNavigationButtons() {
  const navContainer = document.getElementById('app-nav-container');
  if (!navContainer) {
    logger.warn('Navigation container not found');
    return;
  }
  navContainer.className = 'bg-white border-b border-gray-200 flex overflow-x-auto';
  navContainer.innerHTML = `
    <button class="nav-btn flex-1 px-3 sm:px-4 py-3 sm:py-3.5 border-b-2 border-red-600 text-red-600 bg-red-50 font-medium transition-colors uppercase tracking-wider text-xs sm:text-sm font-light" data-view="inventory">Inventario</button>
  `;
}

let navigationService = null;

function createNavigationService() {
  if (navigationService) {
    return navigationService;
  }
  const NavigationService = window.NRDCommon?.NavigationService;
  if (!NavigationService) {
    logger.warn('NavigationService not available in NRDCommon');
    return null;
  }
  navigationService = new NavigationService(['inventory']);
  window.navigationService = navigationService;

  navigationService.registerView('inventory', () => {
    try {
      cleanupInventory();
    } catch (e) {
      logger.debug('cleanupInventory', e);
    }
    initializeInventory();
  });

  logger.info('NavigationService created and views registered');
  return navigationService;
}

function waitForNRDAndInitialize() {
  const maxWait = 10000;
  const startTime = Date.now();
  const checkInterval = 100;
  const checkNRD = setInterval(() => {
    const nrd = window.nrd;
    const NRDCommon = window.NRDCommon;
    if (nrd && nrd.auth && NRDCommon) {
      clearInterval(checkNRD);
      logger.info('NRD, auth, and NRDCommon available, setting up onAuthStateChanged');
      createNavigationService();
      const currentUser = nrd.auth.getCurrentUser();
      if (currentUser) {
        logger.info('Current user found, initializing immediately', { uid: currentUser.uid, email: currentUser.email });
        initializeAppForUser(currentUser);
      }
      nrd.auth.onAuthStateChanged((user) => {
        if (user) {
          initializeAppForUser(user);
        } else {
          appInitialized = false;
        }
      });
    } else if (Date.now() - startTime >= maxWait) {
      clearInterval(checkNRD);
      logger.error('NRD, auth, or NRDCommon not available after timeout');
    }
  }, checkInterval);
}

waitForNRDAndInitialize();

let appInitialized = false;
function initializeAppForUser(_user) {
  if (appInitialized) {
    return;
  }
  appInitialized = true;

  const appScreen = document.getElementById('app-screen');
  const loginScreen = document.getElementById('login-screen');
  const redirectingScreen = document.getElementById('redirecting-screen');

  if (appScreen) appScreen.classList.remove('hidden');
  if (loginScreen) loginScreen.classList.add('hidden');
  if (redirectingScreen) redirectingScreen.classList.add('hidden');

  setTimeout(() => {
    const navService = createNavigationService();
    if (!navService) {
      logger.error('Could not create NavigationService');
      return;
    }
    setupNavigationButtons();
    navService.setupNavButtons();
    navService.switchView('inventory');
  }, 300);
}
