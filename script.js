/* ================================================
   SHOPEASE — APPLICATION LOGIC
   ================================================ */

const DOM = {
  productGrid: document.getElementById('productGrid'),
  loader: document.getElementById('loader'),
  emptyState: document.getElementById('emptyState'),
  searchInput: document.getElementById('searchInput'),
  categoryFilters: document.getElementById('categoryFilters'),
  sortSelect: document.getElementById('sortSelect'),
  resultCount: document.getElementById('resultCount'),
  cartCount: document.getElementById('cartCount'),
  cartBtn: document.getElementById('cartBtn'),
  cartDrawer: document.getElementById('cartDrawer'),
  cartOverlay: document.getElementById('cartOverlay'),
  cartClose: document.getElementById('cartClose'),
  cartItems: document.getElementById('cartItems'),
  cartEmpty: document.getElementById('cartEmpty'),
  cartFooter: document.getElementById('cartFooter'),
  cartSubtotal: document.getElementById('cartSubtotal'),
  cartTotalQty: document.getElementById('cartTotalQty'),
  checkoutBtn: document.getElementById('checkoutBtn'),
  clearCartBtn: document.getElementById('clearCartBtn'),
};

const state = {
  products: [],
  activeCategory: 'all',
  searchQuery: '',
  sortOrder: 'default',
  cart: [],
};

const API_URL = 'https://fakestoreapi.com/products';
const LS_KEYS = { category: 'pe-cat', sort: 'pe-sort', cart: 'pe-cart' };

/* --- Pricing --- */
const CATEGORY_MULTIPLIER = {
  "electronics": 80,
  "jewelery": 60,
  "men's clothing": 70,
  "women's clothing": 65,
};

const toINR = (usd, cat = '') => {
  const raw = usd * (CATEGORY_MULTIPLIER[cat] || 75);
  if (raw < 500) return Math.round(raw / 50) * 50 - 1;
  if (raw < 2000) return Math.round(raw / 100) * 100 - 1;
  if (raw < 10000) return Math.round(raw / 500) * 500 - 1;
  return Math.round(raw / 1000) * 1000 - 1;
};

const formatINR = (n) => n.toLocaleString('en-IN');

/* --- API --- */
const fetchProducts = async () => {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    return data.map((p) => ({ ...p, priceINR: toINR(p.price, p.category) }));
  } catch (e) {
    console.error('Fetch failed:', e);
    return [];
  }
};

/* --- Helpers --- */
const stars = (rate) => {
  const f = Math.floor(rate);
  const h = rate % 1 >= 0.5 ? 1 : 0;
  return [...Array(f).fill('★'), ...Array(h).fill('★'), ...Array(5 - f - h).fill('☆')].join('');
};

const deliveryDate = () => {
  const d = new Date(Date.now() + 86400000 * (2 + Math.floor(Math.random() * 5)));
  return d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
};

/* --- Render --- */
const cardHTML = (p) => {
  const inCart = state.cart.find((i) => i.id === p.id);
  return `
  <div class="card" data-id="${p.id}">
    <div class="card__img-wrap">
      <img class="card__img" src="${p.image}" alt="${p.title}" loading="lazy" />
    </div>
    <div class="card__body">
      <span class="card__category">${p.category}</span>
      <h2 class="card__title">${p.title}</h2>
      <div class="card__rating">
        <span class="card__stars">${stars(p.rating.rate)}</span>
        <span>${p.rating.rate} (${p.rating.count})</span>
      </div>
      <div class="card__price">₹${formatINR(p.priceINR)}</div>
      <p class="card__delivery">Free delivery by ${deliveryDate()}</p>
      <div class="card__bottom">
        <button class="card__cta" data-id="${p.id}">${inCart ? `Added (${inCart.quantity})` : 'Add to Cart'}</button>
      </div>
    </div>
  </div>`;
};

const renderProducts = (products) => {
  DOM.productGrid.innerHTML = products.map(cardHTML).join('');
  DOM.productGrid.classList.toggle('hidden', !products.length);
  DOM.emptyState.classList.toggle('hidden', products.length > 0);
  DOM.resultCount.textContent = products.length;
};

const renderCategories = (products) => {
  const cats = ['all', ...new Set(products.map((p) => p.category))];
  DOM.categoryFilters.innerHTML = cats
    .map((c) => `<button class="cat-btn ${c === state.activeCategory ? 'active' : ''}" data-category="${c}">${c === 'all' ? 'All' : c}</button>`)
    .join('');
};

/* --- Cart --- */
const addToCart = (id) => {
  const p = state.products.find((x) => x.id === id);
  if (!p) return;
  const existing = state.cart.find((i) => i.id === id);
  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({ id: p.id, title: p.title, price: p.priceINR, image: p.image, quantity: 1 });
  }
  saveCart();
  updateCartUI();
  applyFilters();
};

const decCart = (id) => {
  const item = state.cart.find((i) => i.id === id);
  if (!item) return;
  item.quantity -= 1;
  if (item.quantity <= 0) state.cart = state.cart.filter((i) => i.id !== id);
  saveCart();
  updateCartUI();
  applyFilters();
};

const removeCart = (id) => {
  state.cart = state.cart.filter((i) => i.id !== id);
  saveCart();
  updateCartUI();
  applyFilters();
};

const clearCart = () => {
  state.cart = [];
  saveCart();
  updateCartUI();
  applyFilters();
};

const cartTotals = () => ({
  qty: state.cart.reduce((s, i) => s + i.quantity, 0),
  price: state.cart.reduce((s, i) => s + i.price * i.quantity, 0),
});

const updateCartUI = () => {
  const { qty, price } = cartTotals();
  DOM.cartCount.textContent = qty;
  DOM.cartTotalQty.textContent = qty;
  DOM.cartSubtotal.textContent = `₹${formatINR(price)}`;

  const hasItems = state.cart.length > 0;
  DOM.cartItems.classList.toggle('hidden', !hasItems);
  DOM.cartFooter.classList.toggle('hidden', !hasItems);
  DOM.cartEmpty.classList.toggle('hidden', hasItems);

  DOM.cartItems.innerHTML = state.cart
    .map((i) => `
      <div class="ci" data-id="${i.id}">
        <img class="ci__img" src="${i.image}" alt="${i.title}" />
        <div class="ci__info">
          <span class="ci__name">${i.title}</span>
          <span class="ci__price">₹${formatINR(i.price * i.quantity)}</span>
          <div class="ci__actions">
            <button class="ci__qty-btn" data-action="dec" data-id="${i.id}">−</button>
            <span class="ci__qty">${i.quantity}</span>
            <button class="ci__qty-btn" data-action="inc" data-id="${i.id}">+</button>
            <button class="ci__remove" data-action="remove" data-id="${i.id}">Remove</button>
          </div>
        </div>
      </div>`)
    .join('');
};

const openCart = () => {
  DOM.cartDrawer.classList.add('open');
  DOM.cartOverlay.classList.remove('hidden');
  DOM.cartOverlay.classList.add('visible');
  document.body.style.overflow = 'hidden';
};

const closeCart = () => {
  DOM.cartDrawer.classList.remove('open');
  DOM.cartOverlay.classList.remove('visible');
  setTimeout(() => {
    DOM.cartOverlay.classList.add('hidden');
    document.body.style.overflow = '';
  }, 250);
};

/* --- Filter & Sort --- */
const applyFilters = () => {
  const q = state.searchQuery.toLowerCase().trim();
  const filtered = state.products
    .filter((p) => state.activeCategory === 'all' || p.category === state.activeCategory)
    .filter((p) => p.title.toLowerCase().includes(q));
  renderProducts(sortProducts(filtered, state.sortOrder));
};

const sortProducts = (arr, order) => {
  const c = [...arr];
  if (order === 'low') return c.sort((a, b) => a.priceINR - b.priceINR);
  if (order === 'high') return c.sort((a, b) => b.priceINR - a.priceINR);
  return c;
};

/* --- Storage --- */
const saveFilters = () => {
  localStorage.setItem(LS_KEYS.category, state.activeCategory);
  localStorage.setItem(LS_KEYS.sort, state.sortOrder);
};
const saveCart = () => localStorage.setItem(LS_KEYS.cart, JSON.stringify(state.cart));

const loadFilters = () => {
  const c = localStorage.getItem(LS_KEYS.category);
  const s = localStorage.getItem(LS_KEYS.sort);
  if (c) state.activeCategory = c;
  if (s) { state.sortOrder = s; DOM.sortSelect.value = s; }
};

const loadCart = () => {
  try { state.cart = JSON.parse(localStorage.getItem(LS_KEYS.cart)) || []; }
  catch { state.cart = []; }
};

/* --- Events --- */
const debounce = (fn, ms = 300) => {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
};

const bindEvents = () => {
  DOM.searchInput.addEventListener('input', debounce((e) => {
    state.searchQuery = e.target.value;
    applyFilters();
  }));

  DOM.categoryFilters.addEventListener('click', (e) => {
    const btn = e.target.closest('.cat-btn');
    if (!btn) return;
    state.activeCategory = btn.dataset.category;
    DOM.categoryFilters.querySelectorAll('.cat-btn')
      .forEach((b) => b.classList.toggle('active', b.dataset.category === state.activeCategory));
    saveFilters();
    applyFilters();
  });

  DOM.sortSelect.addEventListener('change', (e) => {
    state.sortOrder = e.target.value;
    saveFilters();
    applyFilters();
  });

  DOM.productGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.card__cta');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    addToCart(id);
    const item = state.cart.find((i) => i.id === id);
    btn.textContent = `Added (${item ? item.quantity : 1})`;
    btn.style.background = '#16a34a';
  });

  DOM.cartBtn.addEventListener('click', openCart);
  DOM.cartClose.addEventListener('click', closeCart);
  DOM.cartOverlay.addEventListener('click', closeCart);

  DOM.cartItems.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    if (btn.dataset.action === 'inc') addToCart(id);
    if (btn.dataset.action === 'dec') decCart(id);
    if (btn.dataset.action === 'remove') removeCart(id);
  });

  DOM.clearCartBtn.addEventListener('click', clearCart);
  DOM.checkoutBtn.addEventListener('click', () => {
    const { qty, price } = cartTotals();
    alert(`Order placed! ${qty} items — Total: ₹${formatINR(price)}`);
  });

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeCart(); });
};

/* --- Init --- */
const init = async () => {
  loadFilters();
  loadCart();
  bindEvents();
  updateCartUI();

  DOM.loader.classList.remove('hidden');
  DOM.productGrid.classList.add('hidden');

  state.products = await fetchProducts();

  DOM.loader.classList.add('hidden');
  DOM.productGrid.classList.remove('hidden');
  renderCategories(state.products);
  applyFilters();
};

init();
