// scripts/rotation-controller.js
// Pure rotation math for the mouse-reactive hero. No DOM or Three.js references.

export function targetRotation(normX, normY, { maxYDeg = 35, maxXDeg = 8 } = {}) {
  return { targetYDeg: normX * maxYDeg, targetXDeg: normY * maxXDeg };
}

export function dampStep(current, target, dampingFactor, dt) {
  return current + (target - current) * (1 - Math.exp(-dampingFactor * dt));
}

export function createRotationState({ maxYDeg = 35, maxXDeg = 8, dampingFactor = 5 } = {}) {
  let currentY = 0;
  let currentX = 0;

  return {
    update(normX, normY, dt) {
      const { targetYDeg, targetXDeg } = targetRotation(normX, normY, { maxYDeg, maxXDeg });
      currentY = dampStep(currentY, targetYDeg, dampingFactor, dt);
      currentX = dampStep(currentX, targetXDeg, dampingFactor, dt);
      return { y: currentY, x: currentX };
    },
    idleOffset(timeSec, amplitudeDeg = 2, periodSec = 4) {
      return amplitudeDeg * Math.sin((2 * Math.PI * timeSec) / periodSec);
    },
  };
}
