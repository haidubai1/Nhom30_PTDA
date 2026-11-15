// CSP chỉ cho phép script cùng nguồn nên mọi script đều nằm trong file này.

// 1) Xác nhận trước khi xóa / gỡ bài
document.addEventListener('submit', function (e) {
  var msg = e.target && e.target.getAttribute && e.target.getAttribute('data-confirm');
  if (msg && !window.confirm(msg)) e.preventDefault();
});

// 2) Hiệu ứng hiện dần khi cuộn tới. Phần tử đã nằm trong màn hình lúc mở trang thì giữ nguyên;
//    phần tử bên dưới được ẩn nhẹ rồi hiện lên khi lướt tới. Không hỗ trợ/đã tắt hiệu ứng → hiện bình thường.
(function () {
  var items = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!items.length || reduce || !('IntersectionObserver' in window)) return;
  var vh = window.innerHeight || document.documentElement.clientHeight;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  items.forEach(function (el) {
    if (el.getBoundingClientRect().top < vh) return; // đã thấy được ngay từ đầu
    el.classList.add('hide');
    io.observe(el);
  });
})();
