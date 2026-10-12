// tests/rotation-controller.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { targetRotation, dampStep, createRotationState } from "../scripts/rotation-controller.js";

test("targetRotation maps full-right mouse to +35deg Y, no X tilt", () => {
  const { targetYDeg, targetXDeg } = targetRotation(1, 0);
  assert.equal(targetYDeg, 35);
  assert.equal(targetXDeg, 0);
});

test("targetRotation maps full-down mouse to +8deg X, no Y turn", () => {
  const { targetYDeg, targetXDeg } = targetRotation(0, 1);
  assert.equal(targetYDeg, 0);
  assert.equal(targetXDeg, 8);
});

test("dampStep with dt=0 returns current unchanged", () => {
  assert.equal(dampStep(10, 50, 5, 0), 10);
});

test("dampStep converges toward target as dt grows", () => {
  const result = dampStep(0, 100, 5, 10);
  assert.ok(result > 95, `expected convergence near 100, got ${result}`);
});

test("createRotationState.update moves current rotation toward target over repeated calls", () => {
  const state = createRotationState({ dampingFactor: 5 });
  let last = state.update(1, 0, 0.1);
  for (let i = 0; i < 50; i++) last = state.update(1, 0, 0.1);
  assert.ok(last.y > 30, `expected y near 35 after settling, got ${last.y}`);
});

test("idleOffset is sinusoidal: zero at t=0, positive at quarter period", () => {
  const state = createRotationState({});
  assert.equal(state.idleOffset(0, 2, 4), 0);
  assert.ok(Math.abs(state.idleOffset(1, 2, 4) - 2) < 1e-9);
});
