export default async function decorate(block) {
  const targets = block.querySelectorAll('.gallery div:has(>picture)');

  const buildThresholdArray = (steps) => Array(steps + 1)
    .fill(0)
    .map((_, index) => index / steps || 0);

  const intersectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const isIntersectingAtTop = entry.boundingClientRect.top < 0;
      if (isIntersectingAtTop) {
        // only update when intersecting in or out at the bottom of screen
        return;
      }

      const intersectionRatio = Math.ceil(entry.intersectionRatio * 100);
      entry.target.style.setProperty('--gallery-intersection-ratio', intersectionRatio);
    });
  }, {
    threshold: buildThresholdArray(20),
  });

  const observeTargets = () => targets.forEach((target) => intersectionObserver.observe(target));

  // only observe on large screens
  const isSmallUp = window.matchMedia('(min-width: 768px)');

  if (isSmallUp.matches) observeTargets();

  isSmallUp.addEventListener('change', (evt) => {
    if (evt.matches) {
      observeTargets();
    } else {
      intersectionObserver.disconnect();
    }
  });
}
