/**
 * أطياب للعطور - منطق المتجر الإلكتروني وإدارة الحالة
 * متجر العطور الفاخر باللغة العربية (على طراز أحمد المغربي KSA)
 */

// حالة التطبيق (Application State)
const state = {
  cart: JSON.parse(localStorage.getItem("aytyab_cart") || "[]"),
  wishlist: JSON.parse(localStorage.getItem("aytyab_wishlist") || "[]"),
  currency: "SAR",
  filter: "all",
  searchQuery: "",
  sortBy: "featured",
  appliedCoupon: null,
  giftWrap: false,
  rates: {
    SAR: { symbol: "ر.س", rate: 1, freeShipThreshold: 150, name: "ريال سعودي" },
    AED: { symbol: "د.إ", rate: 0.98, freeShipThreshold: 150, name: "درهم إماراتي" },
    USD: { symbol: "$", rate: 0.27, freeShipThreshold: 40, name: "دولار أمريكي" }
  },
  quiz: {
    step: 1,
    answers: {
      vibe: null,
      occasion: null,
      notes: null
    }
  }
};

// ===================================================================
// دوال تنسيق الأسعار والعملة (CURRENCY HELPERS)
// ===================================================================
function formatPrice(amountSAR) {
  const currentRate = state.rates[state.currency] || state.rates.SAR;
  const converted = Math.round(amountSAR * currentRate.rate);
  return `${converted} ${currentRate.symbol}`;
}

function setCurrency(curr) {
  if (state.rates[curr]) {
    state.currency = curr;
    renderProducts();
    updateCartUI();
    showToast("تحديث العملة", `تم تحويل العملة إلى ${state.rates[curr].name}`);
  }
}

// ===================================================================
// تهيئة المتجر عند تحميل الصفحة (DOM INITIALIZATION)
// ===================================================================
document.addEventListener("DOMContentLoaded", () => {
  initHeader();
  initHeroSlider();
  renderProducts();
  renderShowcase();
  updateCartUI();
  updateWishlistBadge();
  setupEventListeners();
});

function initHeader() {
  const header = document.querySelector(".main-header");
  window.addEventListener("scroll", () => {
    if (window.scrollY > 40) {
      header?.classList.add("scrolled");
    } else {
      header?.classList.remove("scrolled");
    }
  });

  const currSelect = document.getElementById("currency-select");
  if (currSelect) {
    currSelect.value = state.currency;
    currSelect.addEventListener("change", (e) => setCurrency(e.target.value));
  }
}

// ===================================================================
// التحريك والتنقل في السلايدر العريض الرئيسي (CINEMATIC HERO SLIDER)
// ===================================================================
let currentSlide = 0;
let slideInterval = null;

function initHeroSlider() {
  const slides = document.querySelectorAll(".hero-slide");
  const dots = document.querySelectorAll(".hero-dot");
  if (!slides.length) return;

  function showSlide(index) {
    if (index >= slides.length) currentSlide = 0;
    else if (index < 0) currentSlide = slides.length - 1;
    else currentSlide = index;

    slides.forEach((s, idx) => {
      s.classList.toggle("active", idx === currentSlide);
    });

    dots.forEach((d, idx) => {
      d.classList.toggle("active", idx === currentSlide);
    });
  }

  window.changeHeroSlide = function (delta) {
    showSlide(currentSlide + delta);
    resetSlideTimer();
  };

  window.goToHeroSlide = function (index) {
    showSlide(index);
    resetSlideTimer();
  };

  function startSlideTimer() {
    slideInterval = setInterval(() => {
      showSlide(currentSlide + 1);
    }, 5500);
  }

  function resetSlideTimer() {
    if (slideInterval) clearInterval(slideInterval);
    startSlideTimer();
  }

  startSlideTimer();

  const sliderContainer = document.querySelector(".hero-slider-container");
  if (sliderContainer) {
    sliderContainer.addEventListener("mouseenter", () => clearInterval(slideInterval));
    sliderContainer.addEventListener("mouseleave", () => startSlideTimer());
  }
}

// التصفية السريعة عبر دوائر التصنيفات
function filterByCategory(category) {
  state.filter = category;
  document.querySelectorAll(".filter-tab").forEach((t) => {
    t.classList.toggle("active", t.dataset.filter === category);
  });
  renderProducts();
  const catalogEl = document.getElementById("catalog");
  if (catalogEl) {
    catalogEl.scrollIntoView({ behavior: "smooth" });
  }
}


// ===================================================================
// عرض قسم "مقدَّر من الجميع" (SHOWCASE GRID - AHMED AL MAGHRIBI STYLE)
// ===================================================================
function renderShowcase() {
  const container = document.getElementById("showcase-grid-items");
  if (!container) return;

  container.innerHTML = AYTYAB_PRODUCTS.map((p) => `
    <div class="showcase-item">
      <div class="showcase-media">
        <img src="${p.image}" alt="${p.name}" loading="lazy" />
      </div>
      <h4 class="showcase-title">${p.name}</h4>
      <div class="showcase-price">${formatPrice(p.priceSAR)}</div>
      <a href="#products" class="btn-classic" style="display: inline-block; padding: 6px 14px; font-size: 0.78rem;" onclick="openQuickView('${p.id}')">
        تسوق الآن
      </a>
    </div>
  `).join("");
}

// ===================================================================
// عرض كتالوج المنتجات الرئيسي (MAIN PRODUCT CATALOG RENDERING)
// ===================================================================
function renderProducts() {
  const grid = document.getElementById("products-grid");
  if (!grid) return;

  let filtered = AYTYAB_PRODUCTS.filter((p) => {
    const matchesCategory = state.filter === "all" || p.category === state.filter;
    const matchesSearch =
      state.searchQuery === "" ||
      p.name.includes(state.searchQuery) ||
      p.englishName.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      p.subtitle.includes(state.searchQuery) ||
      p.family.includes(state.searchQuery) ||
      p.notes.top.concat(p.notes.heart, p.notes.base).some((n) => n.includes(state.searchQuery));
    return matchesCategory && matchesSearch;
  });

  // الترتيب
  if (state.sortBy === "price-low") {
    filtered.sort((a, b) => a.priceSAR - b.priceSAR);
  } else if (state.sortBy === "price-high") {
    filtered.sort((a, b) => b.priceSAR - a.priceSAR);
  } else if (state.sortBy === "rating") {
    filtered.sort((a, b) => b.rating - a.rating);
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
        <span style="font-size: 2.5rem; color: var(--gold-primary); display: block; margin-bottom: 12px;">⚜️</span>
        <h3 style="font-family: var(--font-arabic-title); font-size: 1.4rem;">لا توجد عطور مطابقة للبحث</h3>
        <p style="color: var(--text-muted); margin-top: 6px;">يرجى تجربة كلمات بحث أخرى أو إعادة ضبط الفلتر.</p>
        <button class="btn btn-secondary" onclick="resetFilters()" style="margin-top: 16px;">عرض جميع العطور</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered
    .map((product) => {
      const isWishlisted = state.wishlist.includes(product.id);
      return `
      <div class="product-card" data-id="${product.id}">
        <div class="product-media">
          <span class="badge-tag ${product.badgeType}">${product.badge}</span>
          <button class="wishlist-toggle ${isWishlisted ? "active" : ""}" 
                  onclick="toggleWishlist('${product.id}')" 
                  title="${isWishlisted ? "إزالة من المفضلة" : "إضافة للمفضلة"}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="${isWishlisted ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </button>
          <img src="${product.image}" alt="${product.name}" loading="lazy" />
          <div class="quick-view-overlay">
            <button class="btn-quick-view" onclick="openQuickView('${product.id}')">
              نظرة سريعة والمكونات
            </button>
          </div>
        </div>
        
        <div class="product-details">
          <div class="product-arabic-title">${product.family}</div>
          <h3 class="product-title">${product.name}</h3>
          <p class="product-subtitle">${product.subtitle}</p>

          <div class="note-pills">
            <span class="note-pill">${product.notes.top[0]}</span>
            <span class="note-pill">${product.notes.heart[0]}</span>
            <span class="note-pill">${product.notes.base[0]}</span>
          </div>

          <div class="product-rating">
            <span class="stars">★★★★★</span>
            <span style="font-weight: 700; color: #000;">${product.rating}</span>
            <span class="rating-count">(${product.reviewsCount} تقييم)</span>
          </div>

          <div class="product-footer">
            <div class="price-box">
              <div class="min-price-indicator">
                <span class="from-label">ابتداءً من</span>
                <span class="current-price">${formatPrice(product.priceSAR)}</span>
              </div>
              <span class="original-price">${formatPrice(product.originalPriceSAR)}</span>
            </div>
            <button class="btn-add-cart" onclick="addToCart('${product.id}', '${product.defaultSize}', 1)" title="أضف إلى السلة">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
    })
    .join("");
}

function resetFilters() {
  state.filter = "all";
  state.searchQuery = "";
  document.querySelectorAll(".filter-tab").forEach((t) => t.classList.remove("active"));
  document.querySelector('.filter-tab[data-filter="all"]')?.classList.add("active");
  renderProducts();
}

// ===================================================================
// إدارة سلة المشتريات (CART MANAGEMENT)
// ===================================================================
function addToCart(productId, size, quantity = 1) {
  const product = AYTYAB_PRODUCTS.find((p) => p.id === productId);
  if (!product) return;

  const existingIndex = state.cart.findIndex((item) => item.id === productId && item.size === size);

  if (existingIndex > -1) {
    state.cart[existingIndex].quantity += quantity;
  } else {
    state.cart.push({
      id: product.id,
      name: product.name,
      englishName: product.englishName,
      image: product.image,
      priceSAR: product.priceSAR,
      size: size || product.defaultSize,
      quantity: quantity
    });
  }

  saveCart();
  updateCartUI();
  openCartDrawer();
  showToast("تمت الإضافة للسلة", `تمت إضافة ${product.name} إلى سلة مشترياتك.`);
}

function removeFromCart(productId, size) {
  state.cart = state.cart.filter((item) => !(item.id === productId && item.size === size));
  saveCart();
  updateCartUI();
}

function updateCartQty(productId, size, delta) {
  const item = state.cart.find((i) => i.id === productId && i.size === size);
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) {
    removeFromCart(productId, size);
  } else {
    saveCart();
    updateCartUI();
  }
}

function saveCart() {
  localStorage.setItem("aytyab_cart", JSON.stringify(state.cart));
}

function updateCartUI() {
  const countBadges = document.querySelectorAll(".cart-count-badge");
  const cartBody = document.getElementById("cart-drawer-items");
  const subtotalEl = document.getElementById("cart-subtotal");
  const discountEl = document.getElementById("cart-discount");
  const totalEl = document.getElementById("cart-total");
  const meterProgress = document.getElementById("shipping-meter-progress");
  const meterText = document.getElementById("shipping-meter-text");

  // عدد المنتجات
  const totalItems = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  countBadges.forEach((b) => (b.textContent = totalItems));

  // المجموع الفرعي بالريال السعودي
  const subtotalSAR = state.cart.reduce((sum, item) => sum + (item.priceSAR || item.priceINR || 0) * item.quantity, 0);

  // الخصم
  let discountSAR = 0;
  if (state.appliedCoupon === "AYTYAB10") {
    discountSAR = Math.round(subtotalSAR * 0.1);
  }

  const finalTotalSAR = Math.max(0, subtotalSAR - discountSAR);

  // شريط الشحن المجاني (150 ر.س)
  const freeThreshold = 150;
  const progressPercent = Math.min(100, (subtotalSAR / freeThreshold) * 100);

  if (meterProgress) {
    meterProgress.style.width = `${progressPercent}%`;
  }

  if (meterText) {
    if (subtotalSAR >= freeThreshold) {
      meterText.innerHTML = `✨ <strong>مبروك! تم تفعيل الشحن الملكي المجاني لطلبك</strong>`;
    } else {
      const remainingSAR = freeThreshold - subtotalSAR;
      meterText.innerHTML = `أضف بقيمة <strong class="gold">${formatPrice(remainingSAR)}</strong> للحصول على <strong>شحن مجاني</strong> 🚚`;
    }
  }

  // تحديث نصوص الفاتورة
  if (subtotalEl) subtotalEl.textContent = formatPrice(subtotalSAR);
  if (discountEl) discountEl.textContent = discountSAR > 0 ? `-${formatPrice(discountSAR)} (خصم 10%)` : formatPrice(0);
  if (totalEl) totalEl.textContent = formatPrice(finalTotalSAR);

  // عرض العناصر بالسلة
  if (!cartBody) return;

  if (state.cart.length === 0) {
    cartBody.innerHTML = `
      <div style="text-align: center; padding: 50px 20px;">
        <span style="font-size: 3rem; color: var(--gold-primary); display: block; margin-bottom: 12px;">⚜️</span>
        <h4 style="font-family: var(--font-arabic-title); font-size: 1.25rem;">سلة مشترياتك فارغة</h4>
        <p style="font-size: 0.88rem; color: var(--text-secondary); margin: 8px 0 24px;">استكشف تشكيلتنا الملكية من العطور الشرقية والبخور الفاخر.</p>
        <button class="btn btn-primary" onclick="closeCartDrawer(); window.location.href='#products';">
          استكشف العطور الآن
        </button>
      </div>
    `;
    return;
  }

  cartBody.innerHTML = state.cart
    .map(
      (item) => `
    <div class="cart-item">
      <div class="cart-item-img">
        <img src="${item.image}" alt="${item.name}" />
      </div>
      <div class="cart-item-info">
        <h4 class="cart-item-title">${item.name}</h4>
        <div class="cart-item-size">${item.size}</div>
        <div class="cart-item-price">${formatPrice(item.priceSAR || item.priceINR || 0)}</div>
        <div class="cart-item-actions">
          <div class="qty-control">
            <button class="qty-btn" onclick="updateCartQty('${item.id}', '${item.size}', -1)">-</button>
            <span class="qty-value">${item.quantity}</span>
            <button class="qty-btn" onclick="updateCartQty('${item.id}', '${item.size}', 1)">+</button>
          </div>
          <button class="cart-item-remove" onclick="removeFromCart('${item.id}', '${item.size}')">حذف</button>
        </div>
      </div>
    </div>
  `
    )
    .join("");
}

function openCartDrawer() {
  document.getElementById("cart-drawer")?.classList.add("active");
  document.getElementById("drawer-backdrop")?.classList.add("active");
}

function closeCartDrawer() {
  document.getElementById("cart-drawer")?.classList.remove("active");
  document.getElementById("drawer-backdrop")?.classList.remove("active");
}

function applyCoupon() {
  const input = document.getElementById("coupon-input");
  if (!input) return;
  const code = input.value.trim().toUpperCase();

  if (code === "AYTYAB10") {
    state.appliedCoupon = "AYTYAB10";
    updateCartUI();
    showToast("تم تطبيق الخصم!", "تم خصم 10% من قيمة طلبك بنجاح.");
  } else if (code === "") {
    showToast("أدخل كود الخصم", "يرجى كتابة AYTYAB10 للاستفادة من خصم 10%.");
  } else {
    showToast("كود غير صالح", "الكود الترويجي غير صالح. استخدم AYTYAB10");
  }
}

// ===================================================================
// إدارة قائمة المفضلة (WISHLIST)
// ===================================================================
function toggleWishlist(productId) {
  const index = state.wishlist.indexOf(productId);
  const product = AYTYAB_PRODUCTS.find((p) => p.id === productId);

  if (index > -1) {
    state.wishlist.splice(index, 1);
    showToast("تمت الإزالة من المفضلة", product ? product.name : "");
  } else {
    state.wishlist.push(productId);
    showToast("أُضيف إلى مفضلتك", product ? product.name : "", "❤️");
  }

  localStorage.setItem("aytyab_wishlist", JSON.stringify(state.wishlist));
  updateWishlistBadge();
  renderProducts();
}

function updateWishlistBadge() {
  const badges = document.querySelectorAll(".wishlist-count-badge");
  badges.forEach((b) => (b.textContent = state.wishlist.length));
}

function openWishlistModal() {
  const modal = document.getElementById("wishlist-modal");
  const content = document.getElementById("wishlist-items-container");
  if (!modal || !content) return;

  const wishlistedProducts = AYTYAB_PRODUCTS.filter((p) => state.wishlist.includes(p.id));

  if (wishlistedProducts.length === 0) {
    content.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <span style="font-size: 2.5rem; display: block; margin-bottom: 10px;">🤍</span>
        <h4 style="font-family: var(--font-arabic-title); font-size: 1.25rem;">قائمة المفضلة فارغة</h4>
        <p style="color: var(--text-muted); font-size: 0.88rem; margin-top: 6px;">اضغط على علامة القلب على أي عطر لحفظه في مفضلتك.</p>
      </div>
    `;
  } else {
    content.innerHTML = wishlistedProducts
      .map(
        (p) => `
      <div style="display: flex; gap: 16px; align-items: center; padding: 14px 0; border-bottom: 1px solid var(--border-light);">
        <img src="${p.image}" alt="${p.name}" style="width: 65px; height: 65px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border-light);" />
        <div style="flex: 1;">
          <h4 style="font-family: var(--font-arabic-title); font-size: 1rem; font-weight: 700;">${p.name}</h4>
          <span style="color: var(--gold-primary); font-weight: 800; font-size: 0.95rem;">ابتداءً من ${formatPrice(p.priceSAR)}</span>
        </div>
        <button class="btn btn-secondary" style="padding: 8px 16px; font-size: 0.8rem;" onclick="addToCart('${p.id}', '${p.defaultSize}', 1); toggleWishlist('${p.id}');">
          إلى السلة
        </button>
      </div>
    `
      )
      .join("");
  }

  modal.classList.add("active");
}

function closeWishlistModal() {
  document.getElementById("wishlist-modal")?.classList.remove("active");
}

// ===================================================================
// نافذة النظرة السريعة (QUICK VIEW MODAL)
// ===================================================================
function openQuickView(productId) {
  const product = AYTYAB_PRODUCTS.find((p) => p.id === productId);
  if (!product) return;

  const modal = document.getElementById("quickview-modal");
  const body = document.getElementById("quickview-body");
  if (!modal || !body) return;

  body.innerHTML = `
    <div class="quickview-grid">
      <div class="quickview-img-box">
        <img src="${product.image}" alt="${product.name}" />
      </div>
      <div>
        <span class="badge-tag ${product.badgeType}" style="position: static; display: inline-block; margin-bottom: 8px;">${product.badge}</span>
        <div style="font-size: 0.85rem; color: var(--gold-deep); font-weight: 700;">${product.family}</div>
        <h2 style="font-family: var(--font-arabic-title); font-size: 1.65rem; color: #000; margin-bottom: 6px;">${product.name}</h2>
        <p style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 14px;">${product.subtitle}</p>

        <div style="display: flex; align-items: baseline; gap: 14px; margin-bottom: 18px;">
          <div>
            <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">ابتداءً من</span>
            <span style="font-family: var(--font-arabic-title); font-size: 1.6rem; font-weight: 900; color: var(--gold-primary);">${formatPrice(product.priceSAR)}</span>
          </div>
          <span style="font-size: 0.95rem; color: var(--text-muted); text-decoration: line-through;">${formatPrice(product.originalPriceSAR)}</span>
          <span style="font-size: 0.78rem; background: var(--bg-ivory); color: #000; border: 1px solid var(--border-light); padding: 4px 12px; border-radius: 99px; font-weight: 700;">${product.concentration}</span>
        </div>

        <p style="font-size: 0.92rem; color: var(--text-secondary); line-height: 1.7; margin-bottom: 20px;">
          ${product.description}
        </p>

        <!-- الهرم العطري -->
        <div style="background: var(--bg-ivory); border: 1px solid var(--border-light); border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <h4 style="font-family: var(--font-arabic-title); font-size: 0.9rem; font-weight: 800; color: var(--gold-deep); margin-bottom: 10px;">
            الهرم العطري والمكونات النبيلة
          </h4>
          <div style="font-size: 0.85rem; margin-bottom: 6px;">
            <strong>القمة العطرية:</strong> ${product.notes.top.join(" • ")}
          </div>
          <div style="font-size: 0.85rem; margin-bottom: 6px;">
            <strong>القلب العطري:</strong> ${product.notes.heart.join(" • ")}
          </div>
          <div style="font-size: 0.85rem;">
            <strong>القاعدة العطرية:</strong> ${product.notes.base.join(" • ")}
          </div>
        </div>

        <!-- القياسات -->
        <div style="display: flex; gap: 24px; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 24px;">
          <div>⏱️ <strong>الثبات:</strong> ${product.longevity}</div>
          <div>👑 <strong>الفوحان:</strong> ${product.sillage}</div>
        </div>

        <!-- المقاس والإضافة إلى السلة -->
        <div style="display: flex; gap: 12px; align-items: center;">
          <select id="qv-size-select" style="padding: 12px 16px; border-radius: 4px; border: 1px solid var(--border-light); font-size: 0.9rem; background: #FFF; outline: none; cursor: pointer; font-family: inherit;">
            ${product.sizes.map((s) => `<option value="${s}">${s}</option>`).join("")}
          </select>
          <button class="btn btn-primary" style="flex: 1;" onclick="
            const size = document.getElementById('qv-size-select').value;
            addToCart('${product.id}', size, 1);
            closeQuickView();
          ">
            أضف إلى السلة الملكية
          </button>
        </div>
      </div>
    </div>
  `;

  modal.classList.add("active");
}

function closeQuickView() {
  document.getElementById("quickview-modal")?.classList.remove("active");
}

// ===================================================================
// مستشار العطور التفاعلي (SCENT FINDER QUIZ)
// ===================================================================
function openScentQuiz() {
  state.quiz.step = 1;
  state.quiz.answers = { vibe: null, occasion: null, notes: null };
  renderQuizStep();
  document.getElementById("scent-quiz-modal")?.classList.add("active");
}

function closeScentQuiz() {
  document.getElementById("scent-quiz-modal")?.classList.remove("active");
}

function selectQuizOption(key, value) {
  state.quiz.answers[key] = value;
  state.quiz.step += 1;
  renderQuizStep();
}

function renderQuizStep() {
  const container = document.getElementById("quiz-step-container");
  if (!container) return;

  // الخطوة 1
  if (state.quiz.step === 1) {
    container.innerHTML = `
      <div class="quiz-steps-indicator">
        <span class="step-dot active"></span>
        <span class="step-dot"></span>
        <span class="step-dot"></span>
      </div>
      <span style="font-size: 0.8rem; text-transform: uppercase; color: var(--gold-primary); font-weight: 800;">الخطوة الأولى من ٣</span>
      <h3 style="font-family: var(--font-arabic-title); font-size: 1.55rem; margin: 8px 0 16px;">ما هو الطابع العطري الذي ترغب في أن يمثلك؟</h3>
      
      <div class="quiz-options-grid">
        <button class="quiz-option-btn" onclick="selectQuizOption('vibe', 'aquatic')">
          <span class="emoji">🌊</span>
          <span>منعش، بحري، وحيوي (أطياب أ. 555)</span>
        </button>
        <button class="quiz-option-btn" onclick="selectQuizOption('vibe', 'rose')">
          <span class="emoji">🌹</span>
          <span>ورد دمشقي مخملي وفانيليا (أطياب مشاعر)</span>
        </button>
        <button class="quiz-option-btn" onclick="selectQuizOption('vibe', 'oud')">
          <span class="emoji">🐅</span>
          <span>عود كمبودي حار وفوحان أسطوري (تايقر عود)</span>
        </button>
        <button class="quiz-option-btn" onclick="selectQuizOption('vibe', 'woody')">
          <span class="emoji">🌲</span>
          <span>أخشاب الغابات النبيلة وهيل مدخن (أطياب نادر)</span>
        </button>
        <button class="quiz-option-btn" onclick="selectQuizOption('vibe', 'moon')">
          <span class="emoji">🌙</span>
          <span>زهور ليلية بيضاء ونيرولي مضيء (مون فلاور)</span>
        </button>
        <button class="quiz-option-btn" onclick="selectQuizOption('vibe', 'bakhoor')">
          <span class="emoji">💨</span>
          <span>دخون عربي أصيل وكرم الضيافة (بخور أطياب)</span>
        </button>
      </div>
    `;
  } else if (state.quiz.step === 2) {
    container.innerHTML = `
      <div class="quiz-steps-indicator">
        <span class="step-dot"></span>
        <span class="step-dot active"></span>
        <span class="step-dot"></span>
      </div>
      <span style="font-size: 0.8rem; text-transform: uppercase; color: var(--gold-primary); font-weight: 800;">الخطوة الثانية من ٣</span>
      <h3 style="font-family: var(--font-arabic-title); font-size: 1.55rem; margin: 8px 0 16px;">متى تفضل ارتداء عطرك المفضل؟</h3>
      
      <div class="quiz-options-grid">
        <button class="quiz-option-btn" onclick="selectQuizOption('occasion', 'daily')">
          <span class="emoji">☀️</span>
          <span>للاستخدام اليومي، العمل والصباح</span>
        </button>
        <button class="quiz-option-btn" onclick="selectQuizOption('occasion', 'evening')">
          <span class="emoji">🌙</span>
          <span>للسهرات والمناسبات الكبرى</span>
        </button>
        <button class="quiz-option-btn" onclick="selectQuizOption('occasion', 'wedding')">
          <span class="emoji">💍</span>
          <span>للأعراس والمناسبات الخاصة الرومانسية</span>
        </button>
        <button class="quiz-option-btn" onclick="selectQuizOption('occasion', 'home')">
          <span class="emoji">🕌</span>
          <span>للمنزل والمجلس واستقبال الضيوف</span>
        </button>
      </div>
    `;
  } else if (state.quiz.step === 3) {
    container.innerHTML = `
      <div class="quiz-steps-indicator">
        <span class="step-dot"></span>
        <span class="step-dot"></span>
        <span class="step-dot active"></span>
      </div>
      <span style="font-size: 0.8rem; text-transform: uppercase; color: var(--gold-primary); font-weight: 800;">الخطوة الثالثة من ٣</span>
      <h3 style="font-family: var(--font-arabic-title); font-size: 1.55rem; margin: 8px 0 16px;">أي المكونات العطرية تلامس حواسك أكثر؟</h3>
      
      <div class="quiz-options-grid">
        <button class="quiz-option-btn" onclick="selectQuizOption('notes', 'oud')">
          <span class="emoji">🪵</span>
          <span>العود الكمبودي الصافي والزعفران</span>
        </button>
        <button class="quiz-option-btn" onclick="selectQuizOption('notes', 'rose')">
          <span class="emoji">🌹</span>
          <span>الورد الطائفي وفانيليا البوربون</span>
        </button>
        <button class="quiz-option-btn" onclick="selectQuizOption('notes', 'marine')">
          <span class="emoji">🌊</span>
          <span>نسيم البحر والبرغموت المنعش</span>
        </button>
        <button class="quiz-option-btn" onclick="selectQuizOption('notes', 'white-floral')">
          <span class="emoji">🌸</span>
          <span>زهر القمر والنيرولي والعنبر الأبيض</span>
        </button>
      </div>
    `;
  } else {
    // نتيجة التوفيق
    let matchedProduct = AYTYAB_PRODUCTS[0];
    const { vibe, occasion, notes } = state.quiz.answers;

    if (vibe === "aquatic" || notes === "marine") {
      matchedProduct = AYTYAB_PRODUCTS.find((p) => p.id === "atyab-a555") || AYTYAB_PRODUCTS[0];
    } else if (vibe === "rose" || notes === "rose" || occasion === "wedding") {
      matchedProduct = AYTYAB_PRODUCTS.find((p) => p.id === "atyab-mashair") || AYTYAB_PRODUCTS[3];
    } else if (vibe === "oud" || notes === "oud" || occasion === "evening") {
      matchedProduct = AYTYAB_PRODUCTS.find((p) => p.id === "atyab-tiger-oud") || AYTYAB_PRODUCTS[5];
    } else if (vibe === "moon" || notes === "white-floral") {
      matchedProduct = AYTYAB_PRODUCTS.find((p) => p.id === "atyab-moon-flower") || AYTYAB_PRODUCTS[4];
    } else if (occasion === "home" || vibe === "bakhoor") {
      matchedProduct = AYTYAB_PRODUCTS.find((p) => p.id === "atyab-backhoor") || AYTYAB_PRODUCTS[2];
    } else {
      matchedProduct = AYTYAB_PRODUCTS.find((p) => p.id === "atyab-nader") || AYTYAB_PRODUCTS[1];
    }

    container.innerHTML = `
      <div style="text-align: center; padding: 10px 0;">
        <span style="font-size: 2.5rem; display: block; margin-bottom: 6px;">⚜️</span>
        <span style="font-size: 0.85rem; color: var(--gold-primary); font-weight: 800;">عطرك الملكي المطابق لاختياراتك</span>
        <h3 style="font-family: var(--font-arabic-title); font-size: 1.8rem; color: #000; margin: 4px 0 16px;">
          ${matchedProduct.name}
        </h3>
        
        <div style="max-width: 220px; margin: 0 auto 16px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border-light); box-shadow: var(--shadow-card);">
          <img src="${matchedProduct.image}" alt="${matchedProduct.name}" style="width: 100%; display: block;" />
        </div>

        <p style="font-size: 0.92rem; color: var(--text-secondary); max-width: 440px; margin: 0 auto 18px; line-height: 1.7;">
          ${matchedProduct.description}
        </p>

        <div style="margin-bottom: 24px;">
          <span style="font-size: 0.8rem; color: var(--text-muted); display: block;">ابتداءً من</span>
          <span style="font-size: 1.7rem; font-weight: 900; color: var(--gold-primary); font-family: var(--font-arabic-title);">
            ${formatPrice(matchedProduct.priceSAR)}
          </span>
        </div>

        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <button class="btn btn-primary" onclick="addToCart('${matchedProduct.id}', '${matchedProduct.defaultSize}', 1); closeScentQuiz();">
            أضف العطر إلى السلة
          </button>
          <button class="btn btn-secondary" onclick="openQuickView('${matchedProduct.id}'); closeScentQuiz();">
            عرض التفاصيل والمكونات
          </button>
        </div>
      </div>
    `;
  }
}

// ===================================================================
// نافذة إتمام الطلب (CHECKOUT SIMULATION & CONFIRMATION)
// ===================================================================
function openCheckoutModal() {
  if (state.cart.length === 0) {
    showToast("السلة فارغة", "يرجى إضافة عطور إلى سلتك قبل المتابعة.");
    return;
  }

  closeCartDrawer();
  const modal = document.getElementById("checkout-modal");
  const subtotalSAR = state.cart.reduce((sum, item) => sum + (item.priceSAR || item.priceINR || 0) * item.quantity, 0);
  const discountSAR = state.appliedCoupon === "AYTYAB10" ? Math.round(subtotalSAR * 0.1) : 0;
  const totalSAR = Math.max(0, subtotalSAR - discountSAR);

  const summaryEl = document.getElementById("checkout-summary-box");
  if (summaryEl) {
    summaryEl.innerHTML = `
      <div style="background: var(--bg-ivory); border: 1px solid var(--border-light); border-radius: 8px; padding: 20px;">
        <h4 style="font-family: var(--font-arabic-title); font-size: 1rem; margin-bottom: 14px; color: #000; font-weight: 800;">
          ملخص الطلب (${state.cart.length} منتجات)
        </h4>
        ${state.cart
          .map(
            (i) => `
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 8px;">
            <span>${i.name} (${i.size}) × ${i.quantity}</span>
            <span style="font-weight: 700;">${formatPrice((i.priceSAR || i.priceINR || 0) * i.quantity)}</span>
          </div>
        `
          )
          .join("")}
        <div style="border-top: 1px solid var(--border-light); margin-top: 12px; padding-top: 12px; display: flex; justify-content: space-between; font-weight: 900; font-size: 1.15rem; color: #000;">
          <span>المبلغ الإجمالي المستحق:</span>
          <span style="color: var(--gold-primary);">${formatPrice(totalSAR)}</span>
        </div>
      </div>
    `;
  }

  modal?.classList.add("active");
}

function closeCheckoutModal() {
  document.getElementById("checkout-modal")?.classList.remove("active");
}

function handleCheckoutSubmit(e) {
  e.preventDefault();
  const name = document.getElementById("co-name").value;
  const email = document.getElementById("co-email").value;
  const orderId = "AYT-KSA-" + Math.floor(100000 + Math.random() * 900000);

  closeCheckoutModal();

  // تأكيد الطلب
  const confModal = document.getElementById("confirmation-modal");
  const confBody = document.getElementById("confirmation-body");
  if (confModal && confBody) {
    confBody.innerHTML = `
      <div style="text-align: center; padding: 24px 12px;">
        <span style="font-size: 3rem; color: var(--gold-primary); display: block; margin-bottom: 12px;">👑</span>
        <span style="font-size: 0.85rem; color: var(--gold-deep); font-weight: 800;">تم تأكيد طلبك الملكي بنجاح</span>
        <h2 style="font-family: var(--font-arabic-title); font-size: 1.85rem; margin: 8px 0 14px; color: #000;">شكراً لك يا ${name}!</h2>
        <p style="font-size: 0.95rem; color: var(--text-secondary); max-width: 480px; margin: 0 auto 20px; line-height: 1.7;">
          يجري الآن تجهيز وتغليف قوارير العطور الفاخرة بعناية فائقة في صناديقنا الملكية للإرسال السريع إلى عنوانك.
        </p>

        <div style="background: var(--bg-ivory); border: 1px dashed var(--gold-primary); border-radius: 8px; padding: 16px 24px; display: inline-block; margin-bottom: 24px;">
          <div style="font-size: 0.8rem; color: var(--text-muted);">رقم مرجع الطلب الملكي</div>
          <div style="font-family: var(--font-arabic-title); font-size: 1.5rem; font-weight: 900; color: var(--gold-primary); letter-spacing: 0.05em;">${orderId}</div>
          <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">تم إرسال إشعار التأكيد إلى ${email}</div>
        </div>

        <div>
          <button class="btn btn-primary" onclick="document.getElementById('confirmation-modal').classList.remove('active');">
            متابعة تصفح المتجر
          </button>
        </div>
      </div>
    `;
    confModal.classList.add("active");
  }

  // تفريغ السلة
  state.cart = [];
  saveCart();
  updateCartUI();
}

// ===================================================================
// نافذة البحث السريع (LIVE SEARCH MODAL)
// ===================================================================
function openSearchModal() {
  const modal = document.getElementById("search-modal");
  modal?.classList.add("active");
  setTimeout(() => document.getElementById("search-input-box")?.focus(), 150);
}

function closeSearchModal() {
  document.getElementById("search-modal")?.classList.remove("active");
}

function handleSearchInput(e) {
  const query = e.target.value.trim();
  const resultsContainer = document.getElementById("live-search-results");
  if (!resultsContainer) return;

  if (query.length === 0) {
    resultsContainer.innerHTML = `
      <div style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 0.88rem;">
        اكتب اسم العطر أو المكونات (مثال: تايقر عود، نادر، مشاعر، مون فلاور، بخور، عود)...
      </div>
    `;
    return;
  }

  const matches = AYTYAB_PRODUCTS.filter(
    (p) =>
      p.name.includes(query) ||
      p.englishName.toLowerCase().includes(query.toLowerCase()) ||
      p.subtitle.includes(query) ||
      p.family.includes(query) ||
      p.notes.top.concat(p.notes.heart, p.notes.base).some((n) => n.includes(query))
  );

  if (matches.length === 0) {
    resultsContainer.innerHTML = `
      <div style="text-align: center; padding: 24px; color: var(--text-muted);">
        لا توجد عطور مطابقة لـ "<strong>${query}</strong>"
      </div>
    `;
    return;
  }

  resultsContainer.innerHTML = matches
    .map(
      (p) => `
    <div style="display: flex; gap: 14px; align-items: center; padding: 12px; border-radius: 6px; cursor: pointer; transition: background 0.2s;"
         onmouseover="this.style.background='var(--bg-ivory)'"
         onmouseout="this.style.background='transparent'"
         onclick="openQuickView('${p.id}'); closeSearchModal();">
      <img src="${p.image}" alt="${p.name}" style="width: 54px; height: 54px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border-light);" />
      <div style="flex: 1;">
        <h4 style="font-family: var(--font-arabic-title); font-size: 0.98rem; font-weight: 700; color: #000;">${p.name}</h4>
        <span style="font-size: 0.78rem; color: var(--text-secondary);">${p.family}</span>
      </div>
      <div style="font-weight: 800; color: var(--gold-primary); font-size: 0.98rem;">
        ${formatPrice(p.priceSAR)}
      </div>
    </div>
  `
    )
    .join("");
}

// ===================================================================
// التنبيهات المنبثقة (TOAST NOTIFICATIONS)
// ===================================================================
function showToast(title, message, icon = "⚜️") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `
    <span class="icon" style="font-size: 1.2rem;">${icon}</span>
    <div>
      <strong style="display: block; font-family: var(--font-arabic-title); font-size: 0.9rem; color: #F8E2A7;">${title}</strong>
      <span style="font-size: 0.8rem; color: #DDD;">${message}</span>
    </div>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// ===================================================================
// إعداد مستمعي الأحداث (EVENT LISTENERS)
// ===================================================================
function setupEventListeners() {
  // أزرار فلتر الكتالوج
  document.querySelectorAll(".filter-tab").forEach((tab) => {
    tab.addEventListener("click", (e) => {
      document.querySelectorAll(".filter-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      state.filter = tab.dataset.filter;
      renderProducts();
    });
  });

  // قائمة الترتيب
  const sortSelect = document.getElementById("catalog-sort-select");
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      state.sortBy = e.target.value;
      renderProducts();
    });
  }

  // إدخال البحث
  const searchInput = document.getElementById("search-input-box");
  if (searchInput) {
    searchInput.addEventListener("input", handleSearchInput);
  }

  // إغلاق الأدراج عند النقر على الخلفية
  document.getElementById("drawer-backdrop")?.addEventListener("click", () => {
    closeCartDrawer();
  });
}
