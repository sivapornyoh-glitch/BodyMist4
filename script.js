/* ==========================================================
   Body Scent — script.js (ใช้ร่วมกันทุกหน้า)
   - product.html : แสดงสินค้า + กรองตาม mood
   - order.html   : เติมข้อมูลจาก URL + ส่งคำสั่งซื้อไป Apps Script
   - admin.html   : ดึงคำสั่งซื้อจาก Google Sheet (CSV) มาแสดงเป็นตาราง
   สคริปต์จะทำงานเฉพาะหน้าที่มี element ที่เกี่ยวข้องอยู่
   ========================================================== */

(function () {
  'use strict';

  /* ---------- ค่าคงที่ ---------- */
  var ORDER_ENDPOINT =
    'https://script.google.com/macros/s/AKfycbygSXXs0B_p7KU5vJY49IPFcHRR7PBtZTD-izA9SCrkLhuUZEIAgQmuA3rpDGGe6qkp/exec';

  var ORDERS_CSV_URL =
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vSPTEq6h7wmkBH6GKpiGTTN-GQrqvgAs8vb4cG2Fn3TrUE60xU06I7Y-hKipxz5jWDaktHFYIewMkXL/pub?gid=0&single=true&output=csv';

  var MOODS = [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'fresh', label: 'Fresh' },
    { key: 'sweet', label: 'Sweet' },
    { key: 'confident', label: 'Confident' },
    { key: 'romance', label: 'Romance' }
  ];

  /* ---------- ตัวช่วยทั่วไป ---------- */
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function formatPrice(n) {
    return Number(n).toLocaleString('th-TH') + ' บาท';
  }

  function moodLabel(key) {
    for (var i = 0; i < MOODS.length; i++) {
      if (MOODS[i].key === key) return MOODS[i].label;
    }
    return key;
  }

  /* ==========================================================
     1) หน้า product.html
     ========================================================== */
  function initProductPage() {
    var filterBar = document.getElementById('filter-bar');
    var list = document.getElementById('product-list');
    if (!filterBar || !list) return;

    var products = [];
    var currentMood = 'all';

    // อ่าน ?mood=xxx (ใช้เฉพาะค่าที่รู้จัก)
    var moodParam = (new URLSearchParams(window.location.search).get('mood') || '').toLowerCase();
    var valid = MOODS.some(function (m) { return m.key === moodParam; });
    if (valid) currentMood = moodParam;

    // สร้างปุ่มกรอง
    filterBar.textContent = '';
    MOODS.forEach(function (m) {
      var btn = el('button', 'filter-btn', m.label);
      btn.type = 'button';
      btn.dataset.mood = m.key;
      btn.addEventListener('click', function () {
        currentMood = m.key;
        syncUrl();
        render();
      });
      filterBar.appendChild(btn);
    });

    function syncUrl() {
      if (!window.history || !window.history.replaceState) return;
      var url = new URL(window.location.href);
      if (currentMood === 'all') url.searchParams.delete('mood');
      else url.searchParams.set('mood', currentMood);
      window.history.replaceState(null, '', url);
    }

    function buildOrderLink(p) {
      var itemLabel = p.name + (p.size ? ' ' + p.size : '');
      var params = new URLSearchParams();
      params.set('item', itemLabel);
      params.set('price', p.price);
      return 'order.html?' + params.toString();
    }

    function buildCard(p) {
      var card = el('article', 'product-card mood-' + p.mood);

      var media = el('div', 'product-card__media');
      var img = document.createElement('img');
      img.src = p.image;
      img.alt = p.name;
      img.loading = 'lazy';
      media.appendChild(img);

      var body = el('div', 'product-card__body');

      var mood = el('p', 'product-card__mood');
      mood.appendChild(el('span', 'mood-dot'));
      mood.appendChild(document.createTextNode(moodLabel(p.mood)));

      var title = el('h3', 'product-card__title', p.name);
      var meta = el('p', 'product-card__meta', p.size ? p.size : 'โรลออน');

      var foot = el('div', 'product-card__foot');
      foot.appendChild(el('span', 'price', formatPrice(p.price)));
      var buy = el('a', 'btn btn--accent', 'สั่งซื้อ');
      buy.href = buildOrderLink(p);
      foot.appendChild(buy);

      body.appendChild(mood);
      body.appendChild(title);
      body.appendChild(meta);
      body.appendChild(foot);

      card.appendChild(media);
      card.appendChild(body);
      return card;
    }

    function render() {
      // อัปเดตสถานะปุ่ม
      Array.prototype.forEach.call(filterBar.querySelectorAll('.filter-btn'), function (btn) {
        var active = btn.dataset.mood === currentMood;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });

      // อัปเดตรายการสินค้า
      var shown = products.filter(function (p) {
        return currentMood === 'all' || p.mood === currentMood;
      });

      list.textContent = '';
      if (!shown.length) {
        list.appendChild(el('p', 'muted', 'ไม่พบสินค้าในหมวดนี้'));
        return;
      }
      var frag = document.createDocumentFragment();
      shown.forEach(function (p) { frag.appendChild(buildCard(p)); });
      list.appendChild(frag);
    }

    // โหลดสินค้า
    list.appendChild(el('p', 'muted', 'กำลังโหลดสินค้า...'));
    fetch('products.json')
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        products = data;
        render();
      })
      .catch(function (error) {
        console.error(error);
        list.textContent = '';
        list.appendChild(el('p', 'muted', 'ไม่สามารถโหลดรายการสินค้าได้ กรุณาลองใหม่อีกครั้ง'));
      });
  }

  /* ==========================================================
     2) หน้า order.html
     ========================================================== */
  function initOrderPage() {
    var form = document.getElementById('orderForm');
    if (!form) return;

    // เติม item และ price จาก URL ลงช่อง #items และ #total
    var params = new URLSearchParams(window.location.search);
    var item = params.get('item');
    var price = params.get('price');

    var itemsInput = document.getElementById('items');
    var totalInput = document.getElementById('total');

    if (itemsInput && item) itemsInput.value = item;
    if (totalInput && price) totalInput.value = price;

    // ส่งคำสั่งซื้อ
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      function val(id) {
        var node = document.getElementById(id);
        return node ? node.value.trim() : '';
      }

      var payload = {
        customerName: val('customerName'),
        contact: val('contact'),
        items: val('items'),
        total: val('total'),
        note: val('note')
      };

      fetch(ORDER_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      .then(() => { window.location.href = 'thankyou.html'; })
      .catch(error => {
        console.error(error);
        alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        if (submitBtn) submitBtn.disabled = false;
      });
    });
  }

  /* ==========================================================
     3) หน้า admin.html
     ========================================================== */

  // แปลงข้อความ CSV เป็น array ของแถว (รองรับ "...", "" และขึ้นบรรทัดใหม่ในช่อง)
  function parseCSV(text) {
    var rows = [];
    var row = [];
    var field = '';
    var inQuotes = false;

    text = text.replace(/^\uFEFF/, ''); // ตัด BOM

    for (var i = 0; i < text.length; i++) {
      var c = text[i];

      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else {
          field += c;
        }
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(field);
        field = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += c;
      }
    }

    // แถวสุดท้ายที่ไม่มีขึ้นบรรทัดใหม่ปิดท้าย
    if (field !== '' || row.length) {
      row.push(field);
      rows.push(row);
    }

    // ตัดแถวว่าง
    return rows.filter(function (r) {
      return r.some(function (cell) { return cell.trim() !== ''; });
    });
  }

  function initAdminPage() {
    var tbody = document.querySelector('#ordersTable tbody');
    if (!tbody) return;

    var COLS = 6;

    function showMessage(message) {
      tbody.textContent = '';
      var tr = document.createElement('tr');
      var td = el('td', 'muted', message);
      td.colSpan = COLS;
      td.style.textAlign = 'center';
      tr.appendChild(td);
      tbody.appendChild(tr);
    }

    showMessage('กำลังโหลดข้อมูล...');

    // เติม timestamp กัน browser cache
    var url = ORDERS_CSV_URL + '&_=' + Date.now();

    fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (text) {
        var rows = parseCSV(text);

        // ถ้าแถวแรกเป็นหัวตาราง (คอลัมน์ A ไม่มีตัวเลข = ไม่ใช่วันเวลา) ให้ข้าม
        if (rows.length && !/\d/.test(rows[0][0] || '')) rows.shift();

        if (!rows.length) {
          showMessage('ยังไม่มีคำสั่งซื้อ');
          return;
        }

        // ล่าสุดขึ้นก่อน (Apps Script เพิ่มแถวต่อท้ายเสมอ จึงกลับลำดับ)
        rows.reverse();

        tbody.textContent = '';
        var frag = document.createDocumentFragment();
        rows.forEach(function (r) {
          var tr = document.createElement('tr');
          for (var i = 0; i < COLS; i++) {
            tr.appendChild(el('td', '', r[i] !== undefined ? r[i] : ''));
          }
          frag.appendChild(tr);
        });
        tbody.appendChild(frag);
      })
      .catch(function (error) {
        console.error(error);
        showMessage('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
      });
  }

  /* ---------- เริ่มทำงาน ---------- */
  function init() {
    initProductPage();
    initOrderPage();
    initAdminPage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
