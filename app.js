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

function initializeAppForUser(user) {
  logger.info('Initializing app for user', { uid: user.uid, email: user.email });

  const navService = createNavigationService();
  if (!navService) {
    logger.error('Could not create NavigationService');
    return;
  }

  setupNavigationButtons();
  navService.setupNavButtons();
  navService.switchView('inventory');
}

(window.NRDCommon?.startApp || function(fn, opts) {
  window.__nrdStartQueue = window.__nrdStartQueue || [];
  window.__nrdStartQueue.push({ onReady: fn, options: opts || {} });
})(initializeAppForUser, { initDelay: 300 });
