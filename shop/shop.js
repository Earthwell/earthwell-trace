let products   = [];
let cartItems  = [];
let currentUser = null;

const EMOJI = {
  'Pasture-raised Eggs': '🥚',
  'Honey':               '🍯',
  'default':             '🌿',
};

window.addEventListener('DOMContentLoaded', async () => {
  if (!window._sb) return;

  const { data: { session } } = await window._sb.auth.getSession();
  currentUser = session?.user || null;

  await Promise.all([loadProducts(), currentUser ? loadCart() : Promise.resolve()]);
  renderProducts();
  if (currentUser) renderCart();
});

// ── PRODUCTS ──────────────────────────────────────────────────────────────

async function loadProducts() {
  const { data, error } = await window._sb
    .from('inventory')
    .select('*')
    .eq('active', true)
    .order('created_at');
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
    const inCart   = cartItems.find(c => c.inventory_id === p.id);
    const avail    = p.quantity_available;
    const soldOut  = avail <= 0;
    const lowStock = avail > 0 && avail <= 2;

    const availClass = soldOut ? 'avail-none' : lowStock ? 'avail-low' : 'avail-good';
    const availText  = soldOut
      ? 'Sold out'
      : lowStock
        ? `Only ${avail} left!`
        : `${avail} available`;

    const price = p.price_cents > 0
      ? `<div class="product-price">$${(p.price_cents / 100).toFixed(2)}</div>`
      : '';
    const unit = p.unit ? `<div class="product-unit">Per ${p.unit}</div>` : '';

    const emoji = EMOJI[p.product_name] || EMOJI.default;
    const image = p.image_url
      ? `<img class="product-image" src="${escHtml(p.image_url)}" alt="${escHtml(p.product_name)}" loading="lazy" />`
      : `<div class="product-image-placeholder">${emoji}</div>`;

    let btnHtml;
    if (soldOut) {
      btnHtml = `<button class="btn-add btn-add-soldout" disabled>Sold Out</button>`;
    } else if (!currentUser) {
      btnHtml = `<button class="btn-add btn-add-signin" onclick="window.location.href='/login?next=/shop'">Sign in to order</button>`;
    } else if (inCart) {
      btnHtml = `<button class="btn-add btn-add-active in-cart" onclick="removeFromCart('${p.id}')">✓ In order</button>`;
    } else {
      btnHtml = `<button class="btn-add btn-add-active" onclick="addToCart('${p.id}')">+ Add to order</button>`;
    }

    return `
      <div class="product-card" id="product-${p.id}">
        ${image}
        <div class="product-body">
          <div class="product-name">${escHtml(p.product_name)}</div>
          <div class="product-desc">${escHtml(p.description || '')}</div>
          ${unit}
          ${price}
        </div>
        <div class="product-footer">
          <div class="availability ${availClass}">
            <span class="avail-dot"></span>
            ${availText}
          </div>
          ${btnHtml}
        </div>
      </div>`;
  }).join('');
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
          <div class="cart-item-name">${escHtml(item.product_name || product?.product_name || '—')}</div>
          <div class="cart-item-sub">${unit ? `Per ${unit}` : ''}${priceStr ? ` · ${priceStr}` : ''}</div>
        </div>
        <div class="cart-item-qty">
          <button class="qty-btn" onclick="updateCartQty('${item.inventory_id}', -1)">−</button>
          <span class="qty-num">${item.quantity}</span>
          <button class="qty-btn" onclick="updateCartQty('${item.inventory_id}', 1)">+</button>
        </div>
      </div>`;
  }).join('');

  if (totalCents > 0) {
    document.getElementById('cart-total').textContent = `$${(totalCents / 100).toFixed(2)}`;
    totalRow.style.display = 'flex';
  } else {
    totalRow.style.display = 'none';
  }
}

function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
