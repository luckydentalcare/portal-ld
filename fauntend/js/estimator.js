/**
 * Lucky Dental Care — Native Treatment Price Estimator & Before/After Comparison Engine
 * Integrated natively without iframes, featuring:
 * - Dynamic 3-level calculation (Category -> Option -> Units/Teeth)
 * - Real-time animated price updates (Bengali BDT currency formatting)
 * - Before / After interactive split comparison slider with touch support
 * - Sync with Backend API (/api/price-estimator) & CMS edit hooks
 * - Direct Appointment booking link with pre-selected service state
 */

(function () {
  'use strict';

  // Comprehensive treatment dataset with verified Lucky Dental Care pricing
  const ESTIMATOR_DATA = {
    "দাঁত পরিষ্কার ও স্কেলিং (Preventive & Hygiene)": {
      "আল্ট্রাসনিক স্কেলিং ও পলিশিং (সম্পূর্ণ মুখ)": [1990, 1990],
      "অ্যাডভান্সড ডিপ স্কেলিং ও পলিশিং": [3500, 3500],
      "দাঁতের এনামেল পলিশিং": [1000, 1000],
      "ডিপ রুট প্ল্যানিং (প্রতি কোয়াড্র্যান্ট)": [2500, 2500],
      "ফ্লুরাইড ট্রিটমেন্ট (সম্পূর্ণ মুখ)": [3000, 5000]
    },
    "রুট ক্যানাল চিকিৎসা (Root Canal Treatment - RCT)": {
      "সামনের দাঁতের রুট ক্যানাল (Single Canal)": [3500, 5000],
      "পেছনের দাঁতের রুট ক্যানাল (Multi-Canal)": [5000, 8000],
      "সিঙ্গেল ভিজিট রুট ক্যানাল": [6000, 10000],
      "রি-রুট ক্যানাল (পূর্বের ব্যর্থ কেস সংশোধন)": [8000, 12000],
      "আক্কেল দাঁতের রুট ক্যানাল চিকিৎসা": [7000, 10000]
    },
    "দাঁতের ক্যাপ ও ক্রাউন (Dental Crowns)": {
      "টেম্পোরারি / অন্তর্বর্তীকালীন ক্যাপ": [1500, 3000],
      "ফুল মেটাল ক্রাউন": [4000, 6000],
      "পিএফএম স্ট্যান্ডার্ড ক্রাউন (ধাতব-পোরসেলিন)": [6000, 8000],
      "পিএফএম প্রিমিয়াম ক্রাউন": [8000, 10000],
      "ডিরেক্ট কম্পোজিট ক্রাউন": [5000, 8000],
      "জিরকোনিয়া স্ট্যান্ডার্ড ক্রাউন (মেটাল-ফ্রি সিরামিক)": [15000, 20000],
      "জিরকোনিয়া প্লাস প্রিমিয়াম ক্রাউন": [20000, 25000],
      "ই-ম্যাক্স (E-Max) নান্দনিক ক্রাউন": [25000, 30000],
      "মেটাল পোস্ট ও কোর বিল্ড-আপ": [2000, 2000],
      "ফাইবার পোস্ট ও কোর বিল্ড-আপ": [3000, 3000]
    },
    "দাঁতের ফিলিং ও রেস্টোরেশন (Dental Fillings)": {
      "সাময়িক ফিলিং (Temporary Filling)": [500, 1000],
      "স্ট্যান্ডার্ড বায়ো জিআই ফিলিং (GIC)": [1200, 2000],
      "টেকসই ডিউরেবল জিআই ফিলিং": [2000, 3000],
      "স্ট্যান্ডার্ড লাইট-কিউর কম্পোজিট ফিলিং": [1500, 2500],
      "অ্যাডভান্সড ন্যানো-কম্পোজিট ফিলিং": [2500, 3500],
      "বায়োমিমেটিক ফাইবার কম্পোজিট ফিলিং": [4000, 6000]
    },
    "কসমেটিক দাঁতের ফাঁকা পূরণ ও ভেনিয়ার (Aesthetic & Veneers)": {
      "সামনের দাঁতের ফাঁকা পূরণ (Diastema Closure - Minor)": [5000, 10000],
      "সামনের দাঁতের বড় ফাঁকা পূরণ (Large Gap)": [10000, 15000],
      "ডিরেক্ট কম্পোজিট ভেনিয়ার (প্রতি দাঁত)": [5000, 6000],
      "ইউ-ভেনিয়ার (U-Veneer)": [6000, 8000],
      "জিরকোনিয়া ভেনিয়ার": [18000, 20000],
      "ই-ম্যাক্স (E-Max) প্রিমিয়াম ভেনিয়ার": [22000, 25000],
      "লেজার দাঁত সাদা ও উজ্জ্বলকরণ (Teeth Whitening)": [12000, 15000]
    },
    "দাঁতের ব্রেসেস ও সোজা করা (Orthodontics & Aligners)": {
      "ট্রেডিশনাল মেটাল ব্রেসেস": [40000, 70000],
      "সিরামিক ব্রেসেস (দাঁতের রঙের সাথে মেলানো)": [50000, 90000],
      "ক্লিয়ার এলাইনার্স (ইনভিজিবল ব্রেসেস)": [150000, 250000],
      "ফিক্সড রিটেইনার (প্রতি চোয়াল)": [5000, 5000],
      "রিমুভেবল রিটেইনার (প্রতি চোয়াল)": [5000, 6000]
    },
    "স্থায়ী দাঁত প্রতিস্থাপন ও ইমপ্ল্যান্ট (Dental Implants & Bridges)": {
      "ডেন্টাল ব্রিজ (পিএফএম - ৩ ইউনিট)": [20000, 30000],
      "ডেন্টাল ব্রিজ (জিরকোনিয়া - ৩ ইউনিট)": [50000, 70000],
      "সিঙ্গেল ডেন্টাল ইমপ্ল্যান্ট (কোরিয়ান ব্র্যান্ড)": [50000, 75000],
      "প্রিমিয়াম ডেন্টাল ইমপ্ল্যান্ট (ইউএসএ/জার্মান)": [90000, 130000],
      "কমপ্লিট ডেঞ্চার (প্রতি চোয়াল)": [20000, 35000]
    },
    "দাঁত তোলা ও সার্জারি (Extraction & Oral Surgery)": {
      "সহজ দাঁত তোলা (Simple Extraction)": [800, 1500],
      "শিশুদের দুধদাঁত তোলা": [500, 1000],
      "আক্কেল দাঁত তোলা (সম্পূর্ণ ওঠা)": [2000, 4000],
      "আক্কেল দাঁতের সার্জিক্যাল অপারেশন (Impacted Wisdom Tooth)": [5000, 10000],
      "ভাঙা গোড়া অপসারণের সার্জারি": [3000, 6000],
      "মাড়ির ফোড়া বা ইনফেকশন নিষ্কাশন": [1200, 2500]
    },
    "পরামর্শ ও ডিজিটাল ডায়াগনস্টিক (Consultation & Diagnostics)": {
      "সাধারণ ডেন্টাল কনসালটেশন ও চেকআপ": [300, 500],
      "বিশেষজ্ঞ কনসালট্যান্ট ফি": [800, 1000],
      "ডিজিটাল এক্স-রে (RVG - সিঙ্গেল টুথ)": [200, 300]
    }
  };

  // Convert English numbers to Bengali numerals
  function toBnNumber(num) {
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num).replace(/\d/g, d => bnDigits[d]);
  }

  // Format currency in BDT with Bengali numerals
  function formatBDTPrice(amount) {
    const formatted = Math.round(amount).toLocaleString('en-BD');
    return `৳ ${toBnNumber(formatted)}`;
  }

  // Active state data
  let activeData = ESTIMATOR_DATA;

  // DOM Elements
  const serviceSelect = document.getElementById('tdc-service-select');
  const optionSelect = document.getElementById('tdc-option-select');
  const optionWrapper = document.getElementById('tdc-option-wrapper');
  const qtySelect = document.getElementById('tdc-qty-select');
  const priceDisplay = document.getElementById('tdc-price-display');
  const proceedBtn = document.getElementById('estimatorProceedBtn');
  const sliderContainer = document.getElementById('tdcSliderContainer');
  const resizeDiv = document.getElementById('tdcResizeDiv');
  const handleBtn = document.getElementById('tdcHandleBtn');
  const rangeInput = document.getElementById('tdcRangeInput');
  const topImg = document.getElementById('tdcTopImg');

  // Populate Categories
  function populateServices() {
    if (!serviceSelect) return;
    serviceSelect.innerHTML = '';
    Object.keys(activeData).forEach((service, index) => {
      const opt = document.createElement('option');
      opt.value = service;
      opt.textContent = service;
      if (index === 0) opt.selected = true;
      serviceSelect.appendChild(opt);
    });
  }

  // Populate Options based on chosen Category
  function loadOptions() {
    if (!serviceSelect || !optionSelect) return;
    const selectedService = serviceSelect.value;
    if (!selectedService || !activeData[selectedService]) return;

    const options = Object.keys(activeData[selectedService]);
    optionSelect.innerHTML = '';
    if (qtySelect) qtySelect.value = '1';

    if (options.length <= 1) {
      if (optionWrapper) optionWrapper.style.display = 'none';
      if (options.length === 1) {
        const opt = document.createElement('option');
        opt.value = options[0];
        opt.textContent = options[0];
        optionSelect.appendChild(opt);
      }
    } else {
      if (optionWrapper) optionWrapper.style.display = 'block';
      options.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option;
        opt.textContent = option;
        optionSelect.appendChild(opt);
      });
    }

    calculatePrice();
  }

  // Multi-item basket state
  let basketItems = [];

  const addBtn = document.getElementById('tdcAddServiceBtn');
  const basketSection = document.getElementById('tdcBasketSection');
  const basketList = document.getElementById('tdcBasketList');
  const basketCount = document.getElementById('tdcBasketCount');
  const clearBasketBtn = document.getElementById('tdcClearBasketBtn');
  const priceTitle = document.getElementById('tdcPriceTitle');

  // Render multi-item basket
  function renderBasket() {
    if (!basketSection || !basketList) return;

    if (basketItems.length === 0) {
      basketSection.style.display = 'none';
      if (priceTitle) priceTitle.textContent = 'আনুমানিক সম্ভাব্য খরচ';
      calculatePrice();
      return;
    }

    basketSection.style.display = 'block';
    if (basketCount) basketCount.textContent = toBnNumber(basketItems.length);
    if (priceTitle) priceTitle.textContent = 'নির্বাচিত সেবাসমূহের মোট আনুমানিক খরচ';

    basketList.innerHTML = '';
    let totalMin = 0;
    let totalMax = 0;

    basketItems.forEach((item, index) => {
      totalMin += item.totalMin;
      totalMax += item.totalMax;

      const itemEl = document.createElement('div');
      itemEl.className = 'tdc-basket-item';
      itemEl.innerHTML = `
        <div class="tdc-basket-item-info">
          <span class="tdc-basket-item-name">${item.name}</span>
          <span class="tdc-basket-item-meta">${toBnNumber(item.quantity)}টি দাঁত / ইউনিট • ${item.category}</span>
        </div>
        <div class="tdc-basket-item-price">
          ${item.totalMin === item.totalMax ? formatBDTPrice(item.totalMin) : `${formatBDTPrice(item.totalMin)} – ${formatBDTPrice(item.totalMax)}`}
        </div>
        <button type="button" class="tdc-basket-item-remove" data-index="${index}" title="তালিকা থেকে বাদ দিন">
          <i class="fas fa-times"></i>
        </button>
      `;

      const removeBtn = itemEl.querySelector('.tdc-basket-item-remove');
      if (removeBtn) {
        removeBtn.addEventListener('click', () => {
          basketItems.splice(index, 1);
          renderBasket();
        });
      }

      basketList.appendChild(itemEl);
    });

    let totalText = '';
    if (totalMin === totalMax) {
      totalText = formatBDTPrice(totalMin);
    } else {
      totalText = `${formatBDTPrice(totalMin)} – ${formatBDTPrice(totalMax)}`;
    }

    if (priceDisplay) {
      priceDisplay.textContent = totalText;
      priceDisplay.classList.remove('tdc-animate-pulse');
      void priceDisplay.offsetWidth;
      priceDisplay.classList.add('tdc-animate-pulse');
    }

    if (proceedBtn) {
      proceedBtn.style.display = 'inline-flex';
      proceedBtn.title = `নির্বাচিত ${basketItems.length}টি সেবার জন্য অ্যাপয়েন্টমেন্ট শিডিউল করুন`;
    }
  }

  // Add current selection to basket
  function addToBasket() {
    if (!serviceSelect || !optionSelect) return;
    const selectedService = serviceSelect.value;
    const selectedOption = optionSelect.value;
    const quantity = qtySelect ? parseInt(qtySelect.value, 10) || 1 : 1;

    const serviceData = activeData[selectedService];
    if (!serviceData) return;

    const priceArray = serviceData[selectedOption];
    if (!priceArray || priceArray.length !== 2) return;

    const [minPrice, maxPrice] = priceArray;

    const existingIdx = basketItems.findIndex(i => i.name === selectedOption && i.category === selectedService);
    if (existingIdx > -1) {
      basketItems[existingIdx].quantity += quantity;
      basketItems[existingIdx].totalMin = basketItems[existingIdx].quantity * minPrice;
      basketItems[existingIdx].totalMax = basketItems[existingIdx].quantity * maxPrice;
    } else {
      basketItems.push({
        category: selectedService,
        name: selectedOption,
        quantity: quantity,
        unitMin: minPrice,
        unitMax: maxPrice,
        totalMin: minPrice * quantity,
        totalMax: maxPrice * quantity
      });
    }

    renderBasket();
  }

  // Clear all items in basket
  function clearBasket() {
    basketItems = [];
    renderBasket();
  }

  // Calculate & Animate Price (Single Item mode when basket is empty)
  function calculatePrice() {
    if (basketItems.length > 0) return; // Basket controls cumulative total
    if (!serviceSelect || !optionSelect || !priceDisplay) return;
    const selectedService = serviceSelect.value;
    const selectedOption = optionSelect.value;
    const quantity = qtySelect ? parseInt(qtySelect.value, 10) || 1 : 1;

    const serviceData = activeData[selectedService];
    if (!serviceData) return;

    const priceArray = serviceData[selectedOption];
    if (!priceArray || priceArray.length !== 2) {
      priceDisplay.textContent = 'পরামর্শ সাপেক্ষ';
      return;
    }

    const [minPrice, maxPrice] = priceArray;
    let finalPriceText = '';

    if (minPrice === maxPrice) {
      finalPriceText = formatBDTPrice(minPrice * quantity);
    } else {
      finalPriceText = `${formatBDTPrice(minPrice * quantity)} – ${formatBDTPrice(maxPrice * quantity)}`;
    }

    priceDisplay.textContent = finalPriceText;

    // Smooth pulse micro-animation
    priceDisplay.classList.remove('tdc-animate-pulse');
    void priceDisplay.offsetWidth; // Trigger reflow
    priceDisplay.classList.add('tdc-animate-pulse');

    // Update appointment CTA button state
    if (proceedBtn) {
      proceedBtn.style.display = 'inline-flex';
      proceedBtn.title = `${selectedOption} এর জন্য অ্যাপয়েন্টমেন্ট শিডিউল করুন`;
    }
  }

  // Before/After comparison slider sync
  function updateSlider(val) {
    const numVal = Math.max(0, Math.min(100, parseFloat(val) || 50));
    if (resizeDiv) resizeDiv.style.width = `${numVal}%`;
    if (handleBtn) handleBtn.style.left = `${numVal}%`;
  }

  function fixImageWidth() {
    if (sliderContainer && topImg) {
      const cWidth = sliderContainer.offsetWidth;
      if (cWidth > 0) {
        topImg.style.width = `${cWidth}px`;
        topImg.style.maxWidth = 'none';
      }
    }
  }

  // Connect to API if available
  async function syncWithApi() {
    try {
      const baseUrl = window.LUCKY_API_BASE_URL || '';
      const res = await fetch(`${baseUrl}/api/price-estimator`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (data && Array.isArray(data.items) && data.items.length > 0) {
        data.items.forEach(item => {
          if (!item.name || !item.active) return;
          const cat = item.category || 'সাধারণ ডেন্টাল সেবা';
          if (!activeData[cat]) activeData[cat] = {};
          activeData[cat][item.name] = [item.price, item.price];
        });
        populateServices();
        loadOptions();
      }
    } catch (err) {
      // Graceful fallback to bundled high-fidelity dataset
    }
  }

  // Handle proceed to appointment booking
  function handleProceed() {
    let preferredName = '';
    if (basketItems.length > 0) {
      preferredName = basketItems.map(item => `${item.name} (${toBnNumber(item.quantity)}টি)`).join(', ');
    } else if (serviceSelect && optionSelect) {
      preferredName = optionSelect.value || serviceSelect.value;
    }

    if (!preferredName) return;

    // Save to sessionStorage for appointment.html to auto-fill
    try {
      sessionStorage.setItem('lucky_selected_service', preferredName);
    } catch (e) {}

    // Navigate to appointment page
    window.location.href = `appointment.html?service=${encodeURIComponent(preferredName)}`;
  }

  // Initialize
  function init() {
    if (!serviceSelect) return;

    // Event listeners for dropdowns
    serviceSelect.addEventListener('change', loadOptions);
    if (optionSelect) optionSelect.addEventListener('change', calculatePrice);
    if (qtySelect) qtySelect.addEventListener('change', calculatePrice);

    // Multi-item basket buttons
    if (addBtn) {
      addBtn.addEventListener('click', addToBasket);
    }
    if (clearBasketBtn) {
      clearBasketBtn.addEventListener('click', clearBasket);
    }

    // Proceed button
    if (proceedBtn) {
      proceedBtn.addEventListener('click', handleProceed);
    }

    // Comparison slider events
    if (rangeInput) {
      rangeInput.addEventListener('input', function () {
        updateSlider(this.value);
      });
      rangeInput.addEventListener('change', function () {
        updateSlider(this.value);
      });
    }

    // Window resize & image load for slider
    window.addEventListener('resize', fixImageWidth);
    if (topImg) {
      topImg.addEventListener('load', fixImageWidth);
    }
    setTimeout(fixImageWidth, 300);

    // Initial render
    populateServices();
    loadOptions();
    syncWithApi();
  }

  // Expose slider update helper globally if needed
  window.tdcUpdateSlider = updateSlider;

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
