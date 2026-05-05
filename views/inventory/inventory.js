const logger = window.logger || console;

function rowToStockKey(p) {
  const productId = p.productId || p.id;
  if (p.variantId !== undefined && p.variantId !== null && p.variantId !== '') {
    return { productId, variantSku: p.sku || '' };
  }
  return { productId, variantSku: '' };
}

function showSpinnerSafe(msg) {
  if (typeof window.showSpinner === 'function') window.showSpinner(msg);
}

function hideSpinnerSafe() {
  if (typeof window.hideSpinner === 'function') window.hideSpinner();
}

function formatNum(n) {
  if (typeof window.formatNumber === 'function') return window.formatNumber(n);
  return String(n);
}

function formatDt(ts) {
  if (typeof window.formatDate === 'function') return window.formatDate(ts);
  return new Date(ts).toLocaleString('es-UY');
}

/**
 * Carga productos (flat) y puebla el selector
 */
export function initializeInventory() {
  const view = document.getElementById('inventory-view');
  if (!view) return;

  view.innerHTML = `
    <div class="max-w-4xl mx-auto">
      <h2 class="text-xl sm:text-2xl font-light text-gray-800 mb-4 sm:mb-6">Conteo de inventario</h2>
      <p class="text-sm text-gray-600 mb-4">Elegí un producto, registrá la cantidad en existencia y el historial muestra el cambio respecto al conteo anterior.</p>

      <div class="mb-4">
        <label for="inv-product-search" class="block mb-1.5 text-xs uppercase tracking-wider text-gray-600">Producto</label>
        <div class="relative">
          <input type="text" id="inv-product-search" placeholder="Buscar producto..." autocomplete="off"
            class="w-full px-3 py-2.5 border border-gray-300 rounded focus:outline-none focus:border-red-600 bg-white text-sm" />
          <input type="hidden" id="inv-product-select" />
          <div id="inv-product-search-results"
            class="hidden absolute z-50 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
          </div>
        </div>
        <p class="text-xs text-gray-500 mt-1">Incluye variantes cuando existen; el conteo se guarda por producto y variante (SKU) si aplica.</p>
      </div>

      <form id="inv-count-form" class="space-y-4 border border-gray-200 bg-white p-4 sm:p-6 hidden">
        <div class="py-2 bg-green-600 -mx-4 sm:-mx-6 -mt-4 px-4 sm:px-6 mb-4 -mt-4">
          <h3 class="text-sm font-semibold uppercase tracking-wider text-white">Nuevo conteo</h3>
        </div>
        <div>
          <label for="inv-quantity" class="block mb-1.5 text-xs uppercase tracking-wider text-gray-600">Cantidad en existencia</label>
          <input type="number" id="inv-quantity" step="any" min="0" required
            class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-red-600 text-sm" placeholder="0" />
        </div>
        <div>
          <label for="inv-notes" class="block mb-1.5 text-xs uppercase tracking-wider text-gray-600">Notas (opcional)</label>
          <textarea id="inv-notes" rows="2" class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-red-600 text-sm"></textarea>
        </div>
        <div class="flex gap-2 pt-2">
          <button type="submit" class="px-4 py-2 bg-green-600 text-white border border-green-600 hover:bg-green-700 transition-colors uppercase tracking-wider text-xs font-light">Guardar conteo</button>
        </div>
      </form>

      <div id="inv-history-wrap" class="mt-8 hidden">
        <h3 class="text-sm font-semibold uppercase tracking-wider text-gray-700 mb-2">Historial de conteos</h3>
        <div class="border border-gray-200 overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead>
              <tr class="bg-gray-100 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-600">
                <th class="px-3 py-2">Fecha</th>
                <th class="px-3 py-2 text-right">Cantidad</th>
                <th class="px-3 py-2 text-right">Dif. vs anterior</th>
                <th class="px-3 py-2">Notas</th>
              </tr>
            </thead>
            <tbody id="inv-history-body"></tbody>
          </table>
        </div>
        <p id="inv-history-empty" class="text-sm text-gray-500 py-4 hidden">No hay conteos anteriores para esta selección.</p>
      </div>
    </div>
  `;

  loadProductsAndOptions();
  setupForm();
}

let currentKey = { productId: '', variantSku: '' };
let productsForSelector = [];
let productSearchTimeout = null;
let productSearchInputHandler = null;
let productSearchClickOutsideHandler = null;
let productSearchKeyboardHandler = null;
let selectedProductIndex = -1;
let filteredProductsForSelector = [];

function encodeKey(productId, variantSku, displayName) {
  return btoa(unescape(encodeURIComponent(JSON.stringify({ productId, variantSku, displayName }))));
}

function decodeKey(val) {
  if (!val) return null;
  try {
    return JSON.parse(decodeURIComponent(escape(atob(val))));
  } catch (e) {
    return null;
  }
}

async function loadProductsAndOptions() {
  const nrd = window.nrd;
  const searchInput = document.getElementById('inv-product-search');
  const hiddenInput = document.getElementById('inv-product-select');
  if (!nrd || !nrd.products || !searchInput || !hiddenInput) {
    if (searchInput) searchInput.value = 'nrd.products no disponible';
    return;
  }
  if (!nrd.stockCounts) {
    searchInput.value = 'nrd.stockCounts no disponible (actualizá nrd-data-access)';
    return;
  }
  try {
    showSpinnerSafe('Cargando productos...');
    const list = await nrd.products.getAll({ flat: true });
    productsForSelector = (list || []).filter((p) => p && p.active !== false && (p.name || p.productName));
    // limpia estado previo
    hiddenInput.value = '';
    searchInput.value = '';
    const resultsDiv = document.getElementById('inv-product-search-results');
    if (resultsDiv) resultsDiv.classList.add('hidden');
  } catch (e) {
    logger.error('Error loading products', e);
    if (searchInput) searchInput.value = 'Error al cargar productos';
  } finally {
    hideSpinnerSafe();
  }
}

function setupForm() {
  const searchInput = document.getElementById('inv-product-search');
  const hiddenInput = document.getElementById('inv-product-select');
  const resultsDiv = document.getElementById('inv-product-search-results');
  const form = document.getElementById('inv-count-form');
  if (!searchInput || !hiddenInput || !resultsDiv || !form) return;

  setupProductSearch(searchInput, resultsDiv, hiddenInput, form);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nrd = window.nrd;
    if (!nrd || !nrd.stockCounts) {
      if (window.showError) await window.showError('Servicio no disponible');
      return;
    }
    const q = parseFloat(String(document.getElementById('inv-quantity').value).replace(',', '.'), 10);
    if (Number.isNaN(q) || q < 0) {
      if (window.showError) await window.showError('Ingresá una cantidad válida');
      return;
    }
    const notes = (document.getElementById('inv-notes').value || '').trim();
    const meta = decodeKey(hiddenInput.value);
    if (!meta) return;
    const payload = {
      productId: meta.productId,
      variantSku: meta.variantSku || undefined,
      productName: meta.displayName,
      quantity: q,
      notes: notes || undefined,
      createdAt: Date.now()
    };
    if (currentKey.variantSku) {
      const parts = (meta.displayName || '').split(' - ');
      if (parts.length > 1) payload.variantName = parts.slice(1).join(' - ');
    }
    try {
      showSpinnerSafe('Guardando...');
      await nrd.stockCounts.create(payload);
      if (window.showSuccess) await window.showSuccess('Conteo registrado');
      document.getElementById('inv-quantity').value = '';
      document.getElementById('inv-notes').value = '';
      await loadHistory();
    } catch (err) {
      logger.error('Save stock count', err);
      if (window.showError) await window.showError(err.message || 'Error al guardar');
    } finally {
      hideSpinnerSafe();
    }
  });
}

function setupProductSearch(searchInput, resultsDiv, hiddenInput, form) {
  const normalizeSearchText = window.normalizeSearchText || window.NRDCommon?.normalizeSearchText || ((t) => String(t || '').toLowerCase());

  function renderResults(filtered) {
    filteredProductsForSelector = filtered;
    selectedProductIndex = -1;
    if (!filtered.length) {
      resultsDiv.innerHTML = '<div class="px-3 py-2 text-sm text-gray-500">No se encontraron productos</div>';
      resultsDiv.classList.remove('hidden');
      return;
    }
    const esc = window.escapeHtml || ((t) => {
      const d = document.createElement('div');
      d.textContent = t || '';
      return d.innerHTML;
    });
    resultsDiv.innerHTML = filtered.map((p, index) => {
      const { productId, variantSku } = rowToStockKey(p);
      const displayName = p.name || p.productName || 'Sin nombre';
      const encoded = encodeKey(productId, variantSku, displayName);
      return `
        <div class="inv-product-search-item px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
             data-value="${esc(encoded)}"
             data-name="${esc(displayName)}"
             data-index="${index}">
          <div class="font-light text-sm">${esc(displayName)}</div>
          ${p.sku ? `<div class="text-xs text-gray-600">SKU ${esc(String(p.sku))}</div>` : `<div class="text-xs text-gray-500">Producto</div>`}
        </div>
      `;
    }).join('');
    resultsDiv.classList.remove('hidden');
    document.querySelectorAll('.inv-product-search-item').forEach((item) => {
      item.addEventListener('click', () => {
        selectProductItem(item);
      });
    });
  }

  async function onSelected() {
    const meta = decodeKey(hiddenInput.value);
    const histWrap = document.getElementById('inv-history-wrap');
    if (!meta) {
      form.classList.add('hidden');
      if (histWrap) histWrap.classList.add('hidden');
      return;
    }
    currentKey = { productId: meta.productId, variantSku: meta.variantSku || '' };
    form.classList.remove('hidden');
    if (histWrap) histWrap.classList.remove('hidden');
    document.getElementById('inv-quantity').value = '';
    document.getElementById('inv-notes').value = '';
    await loadHistory();
  }

  function selectProductItem(item) {
    const v = item.dataset.value || '';
    const n = item.dataset.name || '';
    hiddenInput.value = v;
    searchInput.value = n;
    resultsDiv.classList.add('hidden');
    onSelected();
  }

  function searchProducts(query) {
    const term = normalizeSearchText(query.trim());
    if (term.length === 0) {
      resultsDiv.classList.add('hidden');
      return;
    }
    const filtered = (productsForSelector || []).filter((p) => {
      const name = p?.name || p?.productName || '';
      return normalizeSearchText(name).includes(term);
    }).slice(0, 50);
    renderResults(filtered);
  }

  if (productSearchInputHandler) {
    searchInput.removeEventListener('input', productSearchInputHandler);
  }
  productSearchInputHandler = (e) => {
    clearTimeout(productSearchTimeout);
    productSearchTimeout = setTimeout(() => {
      // al cambiar texto manualmente, invalida selección previa
      hiddenInput.value = '';
      form.classList.add('hidden');
      const histWrap = document.getElementById('inv-history-wrap');
      if (histWrap) histWrap.classList.add('hidden');
      searchProducts(e.target.value || '');
    }, 120);
  };
  searchInput.addEventListener('input', productSearchInputHandler);

  if (productSearchKeyboardHandler) {
    searchInput.removeEventListener('keydown', productSearchKeyboardHandler);
  }
  productSearchKeyboardHandler = (e) => {
    const items = resultsDiv.querySelectorAll('.inv-product-search-item');
    const total = items.length;
    if (!total) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedProductIndex = selectedProductIndex >= total - 1 ? 0 : selectedProductIndex + 1;
      updateSelection(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedProductIndex = selectedProductIndex <= 0 ? total - 1 : selectedProductIndex - 1;
      updateSelection(items);
    } else if (e.key === 'Enter') {
      if (selectedProductIndex >= 0 && selectedProductIndex < total) {
        e.preventDefault();
        selectProductItem(items[selectedProductIndex]);
      }
    } else if (e.key === 'Escape') {
      resultsDiv.classList.add('hidden');
    }
  };
  searchInput.addEventListener('keydown', productSearchKeyboardHandler);

  function updateSelection(items) {
    items.forEach((it, idx) => {
      if (idx === selectedProductIndex) {
        it.classList.add('bg-red-50');
        it.scrollIntoView({ block: 'nearest' });
      } else {
        it.classList.remove('bg-red-50');
      }
    });
  }

  if (productSearchClickOutsideHandler) {
    document.removeEventListener('click', productSearchClickOutsideHandler);
  }
  productSearchClickOutsideHandler = (e) => {
    if (!resultsDiv.contains(e.target) && !searchInput.contains(e.target)) {
      resultsDiv.classList.add('hidden');
    }
  };
  document.addEventListener('click', productSearchClickOutsideHandler);
}

async function loadHistory() {
  const nrd = window.nrd;
  const body = document.getElementById('inv-history-body');
  const empty = document.getElementById('inv-history-empty');
  if (!nrd || !nrd.stockCounts || !body) return;
  if (!currentKey.productId) return;
  let rows;
  try {
    rows = await nrd.stockCounts.listByProductAndVariant(
      currentKey.productId,
      currentKey.variantSku
    );
  } catch (e) {
    logger.error('loadHistory', e);
    body.innerHTML = '<tr><td colspan="4" class="px-3 py-2 text-red-600">Error al cargar historial</td></tr>';
    return;
  }
  if (!rows.length) {
    body.innerHTML = '';
    if (empty) {
      empty.classList.remove('hidden');
    }
    return;
  }
  if (empty) empty.classList.add('hidden');
  const esc = window.escapeHtml || ((t) => {
    const d = document.createElement('div');
    d.textContent = t || '';
    return d.innerHTML;
  });
  body.innerHTML = rows.map((r, i) => {
    const older = rows[i + 1];
    let diffText = '—';
    if (older) {
      const d = (r.quantity || 0) - (older.quantity || 0);
      diffText = (d > 0 ? '+' : '') + formatNum(d);
    }
    const note = (r.notes && String(r.notes).trim()) ? esc(String(r.notes)) : '—';
    return `
      <tr class="border-b border-gray-100 hover:bg-gray-50">
        <td class="px-3 py-2 whitespace-nowrap">${esc(formatDt(r.createdAt))}</td>
        <td class="px-3 py-2 text-right font-medium">${esc(String(r.quantity))}</td>
        <td class="px-3 py-2 text-right ${(rows[i + 1] && (r.quantity - rows[i + 1].quantity) !== 0) ? 'text-gray-800' : 'text-gray-500'}">${esc(diffText)}</td>
        <td class="px-3 py-2 text-gray-600 max-w-xs truncate">${note}</td>
      </tr>
    `;
  }).join('');
}

/**
 * Limpia listeners al salir (placeholder si se añade suscripción)
 */
export function cleanupInventory() {
  // Form es recreado con innerHTML al reentrar; no listener persistente
}
