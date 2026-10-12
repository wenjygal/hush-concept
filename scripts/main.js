// scripts/main.js
import { initHeroScene } from "./hero-scene.js";

document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.querySelector("#hero-canvas");
  if (canvas) initHeroScene(canvas);
});
