document.addEventListener("DOMContentLoaded", function () {

  // Animasyon uygulanacak bölümler
  const elements = document.querySelectorAll(
    ".section-top, .subject-row, .feature, .price-card, .approach-photo"
  );

  // JavaScript çalışıyorsa reveal sınıfını ekle
  elements.forEach(element => {
    element.classList.add("reveal");
  });

  // Tarayıcıda IntersectionObserver desteği yoksa
  // veya kullanıcı azaltılmış hareket istiyorsa
  // içerikleri doğrudan göster.
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (reducedMotion || !("IntersectionObserver" in window)) {
    elements.forEach(element => {
      element.classList.add("visible");
    });
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.08,
      rootMargin: "0px 0px -20px 0px"
    }
  );

  elements.forEach(element => observer.observe(element));

});
