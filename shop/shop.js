let products          = [];
let batches           = [];
let cartItems         = [];
let currentUser       = null;
let activeProductName = null;

const PRODUCT_META = {
  'Pasture-raised Eggs':  { emoji: '🥚', theme: 'pcard-eggs',    variety: 'Mixed flock' },
  'Hen-enriched Compost': { emoji: '🌱', theme: 'pcard-compost', variety: 'Finished, bagged — May to November' },
  'Specialty Mushrooms':  { emoji: '🍄', theme: 'pcard-mush',    variety: 'Phoenix Oyster & Shiitake' },
  'Heirloom Produce':     { emoji: '🌿', theme: 'pcard-prod',    variety: 'Seasonal varieties — April to October' },
  'Mushroom Grow Kits':   { emoji: '📦', theme: 'pcard-kits',    variety: 'Ready-to-fruit inoculated substrate' },
  'Raw Local Honey':      { emoji: '🍯', theme: 'pcard-honey',   variety: 'Shenandoah wildflower — seasonal' },
};

window.addEventListener('DOMContentLoaded', async () => {
  if (!window._sb) return;

  const { data: { session } } = await window._sb.auth.getSession();
  currentUser = session?.user || null;

  await Promise.all([loadProducts(), loadBatches(), currentUser ? loadCart() : Promise.resolve()]);
  renderProducts();
  if (currentUser) {
    renderCart();
    updateNavCartBadge();
  }
});

// ── PRODUCTS & BATCHES ────────────────────────────────────────────────────

async function loadProducts() {
  const { data, error } = await window._sb
    .from('inventory')
    .select('*')
    .eq('active', true)
    .order('sort_order');
  if (error) {
    document.getElementById('status').textContent = 'Could not load products.';
    return;
  }
  products = data || [];
}

function renderProducts() {
  const grid = document.getElementById('product-grid');
  if (!products.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;color:var(--faint);font-style:italic;font-size:0.875rem;">No products available right now.</div>`;
    return;
  }

  grid.innerHTML = products.map(p => {
    const meta     = PRODUCT_META[p.product_name] || { emoji: '🌿', theme: 'pcard-herbs', variety: '' };
    const inCart   = cartItems.find(c => c.inventory_id === p.id);
    const avail    = p.quantity_available;
    const soldOut  = avail <= 0;
    const lowStock = avail > 0 && avail <= 2;

    const availClass = soldOut ? 'avail-none' : lowStock ? 'avail-low' : 'avail-good';
    const availText  = soldOut ? 'Sold out' : lowStock ? `Only ${avail} left!` : `${avail} available`;

    const priceNum = p.price_cents > 0 ? `$${Math.floor(p.price_cents / 100)}` : '';
    const unitStr  = p.unit ? `/ ${p.unit}` : '';

    // Footer: "Coming soon" badge matches home page exactly
    let footerHtml;
    if (p.coming_soon) {
      footerHtml = `<span class="coming-soon">Coming soon</span>`;
    } else {
      let btnHtml;
      if (soldOut) {
        btnHtml = '';
      } else if (!currentUser) {
        btnHtml = `<button class="btn-add btn-add-signin" onclick="openOrderPanel('${p.id}')">Sign in to order</button>`;
      } else {
        btnHtml = `<button class="btn-add btn-add-active" onclick="openOrderPanel('${p.id}')">Order now</button>`;
      }
      footerHtml = `
        ${priceNum ? `<div class="product-price">${priceNum} <span>${unitStr}</span></div>` : ''}
        ${btnHtml}
        <div class="availability ${availClass}">
          <span class="avail-dot"></span>${availText}
        </div>`;
    }

    return `
      <div class="product-card ${escHtml(meta.theme)}" id="product-${p.id}">
        <div class="product-card-img">${meta.emoji}</div>
        <div class="product-card-body">
          <p class="product-card-name">${escHtml(p.product_name)}</p>
          ${meta.variety ? `<p class="product-card-variety">${escHtml(meta.variety)}</p>` : ''}
          <p class="product-card-desc">${escHtml(p.description || '')}</p>
          <div class="product-card-footer">${footerHtml}</div>
        </div>
      </div>`;
  }).join('');
}

async function loadBatches() {
  const { data } = await window._sb
    .from('batches')
    .select('batch_id, product_name, harvest_date, certifications, origin, tx_hash')
    .order('created_at', { ascending: false });
  batches = data || [];
}

// ── ORDER PANEL ───────────────────────────────────────────────────────────

function openOrderPanel(productId) {
  if (!currentUser) { window.location.href = '/login?next=/shop'; return; }

  const product = products.find(p => p.id === productId);
  if (!product) return;

  // Render selected card in the left slot
  const meta = PRODUCT_META[product.product_name] || { emoji: '🌿', theme: 'pcard-herbs', variety: '' };
  const priceNum = product.price_cents > 0 ? `$${Math.floor(product.price_cents / 100)}` : '';
  const unitStr  = product.unit ? `/ ${product.unit}` : '';
  const avail    = product.quantity_available;
  const soldOut  = avail <= 0;
  const lowStock = avail > 0 && avail <= 2;
  const availClass = soldOut ? 'avail-none' : lowStock ? 'avail-low' : 'avail-good';
  const availText  = soldOut ? 'Sold out' : lowStock ? `Only ${avail} left!` : `${avail} available`;

  document.getElementById('order-card-wrap').innerHTML = `
    <div class="product-card ${escHtml(meta.theme)}">
      <div class="product-card-img">${meta.emoji}</div>
      <div class="product-card-body">
        <p class="product-card-name">${escHtml(product.product_name)}</p>
        ${meta.variety ? `<p class="product-card-variety">${escHtml(meta.variety)}</p>` : ''}
        <p class="product-card-desc">${escHtml(product.description || '')}</p>
        <div class="product-card-footer">
          <div class="avail-wrap">
            ${priceNum ? `<div class="product-price">${priceNum} <span>${unitStr}</span></div>` : ''}
            <div class="availability ${availClass}">
              <span class="avail-dot"></span>${availText}
            </div>
          </div>
        </div>
      </div>
    </div>`;

  activeProductName = product.product_name;
  renderOrderList(activeProductName);

  // Swap views
  document.getElementById('product-grid').style.display = 'none';
  document.getElementById('order-panel').classList.add('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeOrderPanel() {
  document.getElementById('order-panel').classList.remove('open');
  document.getElementById('product-grid').style.display = '';
  renderProducts(); // refresh availability + cart state
}

function renderOrderList(productName) {
  const list = document.getElementById('order-list-items');
  const filtered = batches.filter(b => b.product_name === productName);

  if (!filtered.length) {
    list.innerHTML = `<div style="padding:1.5rem 0;color:var(--faint);font-style:italic;font-size:0.875rem;">No batches logged for this product yet.</div>`;
    return;
  }

  list.innerHTML = filtered.map(b => {
    const product  = products.find(p => p.product_name === b.product_name);
    const meta     = PRODUCT_META[b.product_name] || { emoji: '🌿', variety: '' };
    const inCart   = cartItems.find(c => c.batch_id === b.batch_id);
    const avail    = product?.quantity_available ?? 0;
    const soldOut  = avail <= 0;
    const lowStock = avail > 0 && avail <= 2;
    const availClass = soldOut ? 'avail-none' : lowStock ? 'avail-low' : 'avail-good';
    const availText  = soldOut ? 'Sold out' : lowStock ? `Only ${avail} left!` : `${avail} available`;
    const priceNum   = product?.price_cents > 0 ? `$${Math.floor(product.price_cents / 100)}` : '';
    const unitStr    = product?.unit || '';
    const harvestFmt = b.harvest_date
      ? new Date(b.harvest_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '';

    let btnHtml;
    if (soldOut) {
      btnHtml = `<button class="btn-list-add btn-list-soldout" disabled>Sold out</button>`;
    } else if (inCart) {
      btnHtml = `<button class="btn-list-add btn-list-incart" onclick="removeBatchFromCart('${b.batch_id}')">✓ In cart</button>`;
    } else {
      btnHtml = `<button class="btn-list-add btn-list-available" onclick="listAddToCart('${b.batch_id}')">Add to cart</button>`;
    }

    return `
      <div class="order-list-item">
        <a class="order-item-batch-id" href="#" onclick="openBatchPopup('${escHtml(b.batch_id)}');return false;">
          ${escHtml(b.batch_id)}
        </a>
        ${btnHtml}
      </div>`;
  }).join('');
}

async function listAddToCart(batchId) {
  if (!currentUser) { window.location.href = '/login?next=/shop'; return; }
  const batch   = batches.find(b => b.batch_id === batchId);
  const product = products.find(p => p.product_name === batch?.product_name);
  if (!product || product.quantity_available <= 0) return;

  const { data, error } = await window._sb.from('cart_items').insert({
    user_id:      currentUser.id,
    inventory_id: product.id,
    product_name: product.product_name,
    batch_id:     batchId,
    quantity:     1,
  }).select().single();

  if (!error && data) cartItems.push(data);
  renderOrderList(activeProductName);
  renderCart();
  updateNavCartBadge();
}

async function removeBatchFromCart(batchId) {
  const item = cartItems.find(c => c.batch_id === batchId);
  if (!item) return;
  await window._sb.from('cart_items').delete().eq('id', item.id);
  cartItems = cartItems.filter(c => c.batch_id !== batchId);
  renderOrderList(activeProductName);
  renderCart();
  updateNavCartBadge();
}

async function updateNavCartBadge() {
  const badge = document.getElementById('nav-cart-badge');
  const btn   = document.getElementById('nav-cart-btn');
  if (!badge || !btn) return;

  // Query Supabase directly so we always reflect the true cart state
  const { count } = await window._sb
    .from('cart_items')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', currentUser.id);

  const n = count || 0;
  badge.textContent   = n;
  badge.style.display = n > 0 ? 'inline' : 'none';
  btn.style.display   = n > 0 ? 'inline-flex' : 'none';
}

// ── CART ──────────────────────────────────────────────────────────────────

async function loadCart() {
  const { data } = await window._sb
    .from('cart_items')
    .select('*')
    .eq('user_id', currentUser.id);
  cartItems = data || [];
}

async function addToCart(inventoryId) {
  if (!currentUser) { window.location.href = '/login?next=/shop'; return; }

  const product = products.find(p => p.id === inventoryId);
  if (!product || product.quantity_available <= 0) return;

  // Upsert: increment quantity if already in cart
  const existing = cartItems.find(c => c.inventory_id === inventoryId);
  if (existing) {
    const { error } = await window._sb
      .from('cart_items')
      .update({ quantity: existing.quantity + 1 })
      .eq('id', existing.id);
    if (!error) existing.quantity++;
  } else {
    const { data, error } = await window._sb
      .from('cart_items')
      .insert({ user_id: currentUser.id, inventory_id: inventoryId, product_name: product.product_name, quantity: 1 })
      .select().single();
    if (!error) cartItems.push(data);
  }

  renderProducts();
  renderCart();
}

async function removeFromCart(inventoryId) {
  const item = cartItems.find(c => c.inventory_id === inventoryId);
  if (!item) return;
  await window._sb.from('cart_items').delete().eq('id', item.id);
  cartItems = cartItems.filter(c => c.inventory_id !== inventoryId);
  renderProducts();
  renderCart();
}

async function updateCartQty(inventoryId, delta) {
  const item = cartItems.find(c => c.inventory_id === inventoryId);
  if (!item) return;
  const newQty = item.quantity + delta;
  if (newQty <= 0) { await removeFromCart(inventoryId); return; }

  const product = products.find(p => p.id === inventoryId);
  if (newQty > (product?.quantity_available || 0)) return;

  await window._sb.from('cart_items').update({ quantity: newQty }).eq('id', item.id);
  item.quantity = newQty;
  renderCart();
}

function renderCart() {
  const section = document.getElementById('cart-section');
  const list    = document.getElementById('cart-items-list');
  const totalRow = document.getElementById('cart-total-row');

  if (!cartItems.length) {
    section.style.display = 'none';
    return;
  }

  section.style.display = '';

  let totalCents = 0;
  list.innerHTML = cartItems.map(item => {
    const product = products.find(p => p.id === item.inventory_id);
    const unit    = product?.unit || '';
    const price   = product?.price_cents || 0;
    const lineTotal = price * item.quantity;
    totalCents += lineTotal;

    const priceStr = price > 0
      ? `$${(lineTotal / 100).toFixed(2)}`
      : '';

    return `
      <div class="cart-item">
        <div>
          <div class="cart-item-name">${escHtml(item.batch_id || item.product_name || product?.product_name || '—')}</div>
          <div class="cart-item-sub">${escHtml(item.product_name || '')}${unit ? ` · Per ${unit}` : ''}${priceStr ? ` · ${priceStr}` : ''}</div>
        </div>
        <button class="cart-remove-btn" onclick="removeBatchFromCart('${item.batch_id || item.inventory_id}')" title="Remove from cart">🗑</button>
      </div>`;
  }).join('');

  if (totalCents > 0) {
    document.getElementById('cart-total').textContent = `$${(totalCents / 100).toFixed(2)}`;
    totalRow.style.display = 'flex';
  } else {
    totalRow.style.display = 'none';
  }
}

// ── RESERVE ───────────────────────────────────────────────────────────────

function reserveOrder() {
  if (!cartItems.length) return;

  if (!currentUser) {
    showAccountPrompt();
    return;
  }

  // Show confirmation popup
  document.getElementById('reserve-confirm-overlay').classList.add('open');
}

function closeReserveConfirm(e) {
  if (e && e.target !== document.getElementById('reserve-confirm-overlay')) return;
  document.getElementById('reserve-confirm-overlay').classList.remove('open');
}

async function confirmReserve() {
  closeReserveConfirm();

  const btn = document.getElementById('reserve-btn');
  btn.disabled = true;
  btn.textContent = 'Reserving…';

  const { error } = await window._sb.from('reservations').insert({
    user_id:       currentUser.id,
    cart_snapshot: cartItems.map(c => ({
      batch_id:     c.batch_id,
      product_name: c.product_name,
      quantity:     c.quantity,
    })),
    status: 'pending',
  });

  if (error) {
    btn.disabled = false;
    btn.textContent = 'Reserve';
    alert('Could not place reservation — please try again.');
    return;
  }

  btn.textContent = '✓ Reserved!';
  btn.style.background = 'var(--earth-pale)';
  btn.style.color = 'var(--earth-dark)';
  document.querySelector('.cart-msg').textContent = "Your items are reserved. We'll email you shortly to arrange pickup or delivery.";
}

// ── ACCOUNT PROMPT ────────────────────────────────────────────────────────

function showAccountPrompt() {
  document.getElementById('account-prompt-overlay').classList.add('open');
}

function closeAccountPrompt(e) {
  if (e && e.target !== document.getElementById('account-prompt-overlay')) return;
  document.getElementById('account-prompt-overlay').classList.remove('open');
}

// ── BATCH POPUP ───────────────────────────────────────────────────────────

function openBatchPopup(batchId) {
  const b = batches.find(b => b.batch_id === batchId);
  if (!b) return;

  document.getElementById('popup-batch-id').textContent = batchId;
  document.getElementById('popup-trace-link').href = `/trace?batch=${encodeURIComponent(batchId)}`;

  const txValue = b.tx_hash
    ? `<a href="https://polygonscan.com/tx/${b.tx_hash}" target="_blank" style="color:var(--earth-mid);text-decoration:none;">${b.tx_hash.slice(0, 10)}…${b.tx_hash.slice(-6)} ↗</a>`
    : `<span style="color:var(--faint);">—</span>`;

  const fields = [
    ['Product',        b.product_name],
    ['Harvest Date',   b.harvest_date
        ? new Date(b.harvest_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : null],
    ['Origin',         b.origin],
    ['Certifications', b.certifications],
  ].filter(([, v]) => v);

  // Transaction always appears as the last row
  fields.push(['Transaction', txValue]);

  document.getElementById('popup-fields').innerHTML = fields.map(([label, value]) => `
    <div class="batch-popup-field">
      <span class="batch-popup-label">${label}</span>
      <span class="batch-popup-value">${value}</span>
    </div>`).join('');

  document.getElementById('batch-popup-overlay').classList.add('open');
}

function closeBatchPopup(e) {
  if (e && e.target !== document.getElementById('batch-popup-overlay')) return;
  document.getElementById('batch-popup-overlay').classList.remove('open');
}

function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
