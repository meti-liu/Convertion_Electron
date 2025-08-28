<!-- app/renderer/components/FpsMonitor.vue -->
<template>
  <div class="fps-monitor" :class="{ 'warning': fps < 30, 'critical': fps < 15 }">
    FPS: {{ fps }}
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const fps = ref(0);
let frameCount = 0;
let lastTime = performance.now();
let animationFrameId = null;

function updateFPS() {
  frameCount++;
  const now = performance.now();
  const elapsed = now - lastTime;

  // 每秒更新一次FPS值
  if (elapsed >= 1000) {
    fps.value = Math.round((frameCount * 1000) / elapsed);
    frameCount = 0;
    lastTime = now;
  }

  animationFrameId = requestAnimationFrame(updateFPS);
}

onMounted(() => {
  animationFrameId = requestAnimationFrame(updateFPS);
});

onUnmounted(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
});
</script>

<style scoped>
.fps-monitor {
  position: fixed;
  top: 10px;
  right: 10px;
  background-color: rgba(0, 0, 0, 0.7);
  color: #4caf50;
  padding: 5px 10px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 14px;
  z-index: 9999;
  user-select: none;
}

.warning {
  color: #ff9800;
}

.critical {
  color: #f44336;
}
</style>