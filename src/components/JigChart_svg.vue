<!-- src/components/JigChart_svg.vue -->
<template>
  <div class="chart-container-svg">
    <div class="chart-title">{{ title }}</div>
    <!-- SVG Viewport -->
    <svg
      ref="svgRef"
      class="chart-svg"
      :class="{ 'cursor-pan': mode === 'pan', 'cursor-zoom': mode === 'zoom' }"
      :viewBox="viewBox"
      @wheel.prevent="handleWheel"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseUp"
    >
      <!-- The single <g> container for all transformations -->
      <g :transform="transform">
        <!-- Render Jig Outlines -->
        <path
          v-for="(dataset, index) in rutDatasets"
          :key="`rut-${index}`"
          :d="dataset.path"
          :stroke="dataset.borderColor"
          :stroke-width="strokeWidth"
          fill="none"
        />
        <!-- Render ADR Pin Points -->
        <circle
          v-for="(pin, index) in adrPins"
          :key="`pin-${index}`"
          :cx="pin.x"
          :cy="pin.y"
          :r="pin.radius"
          :fill="pin.color"
          :stroke="pin.stroke"
          :stroke-width="pin.strokeWidth"
        />
      </g>
      <!-- Drag-to-zoom rectangle -->
      <rect
        v-if="isDragging"
        :x="dragRect.x"
        :y="dragRect.y"
        :width="dragRect.width"
        :height="dragRect.height"
        class="drag-rect"
      />
    </svg>

    <!-- Toolbar with Icons -->
    <div class="zoom-controls">
      <button @click="setMode('pan')" :class="{ 'active-mode': mode === 'pan' }" :title="t('pan_mode')">
        <!-- New Pan Icon (Move) -->
        <svg class="icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="5 9 2 12 5 15"></polyline>
            <polyline points="9 5 12 2 15 5"></polyline>
            <polyline points="15 19 12 22 9 19"></polyline>
            <polyline points="19 9 22 12 19 15"></polyline>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <line x1="12" y1="2" x2="12" y2="22"></line>
        </svg>
      </button>
      <button @click="setMode('zoom')" :class="{ 'active-mode': mode === 'zoom' }" :title="t('zoom_mode')">
        <!-- New Zoom Icon -->
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="feather feather-zoom-in"><circle cx="11" cy="11" r="8"></circle><line x1="23" y1="23" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
      </button>
      <span class="separator">|</span>
      <button @click="undo" :disabled="history.length <= 1" :title="t('undo')">
        <!-- Undo Icon -->
        <svg class="icon" viewBox="0 0 24 24"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C20.36 11.23 16.72 8 12.5 8z"/></svg>
      </button>
      <button @click="redo" :disabled="forward.length === 0" :title="t('redo')">
        <!-- Redo Icon -->
        <svg class="icon" viewBox="0 0 24 24"><path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.22 0-7.86 3.23-9.13 7.28l-2.37.78C1.45 10.31 5.94 6 11.5 6c2.65 0 5.05.99 6.9 2.6L22 5v9h-9l3.4-3.4z"/></svg>
      </button>
      <button @click="reset" :title="t('reset_view')">
        <!-- New Reset Icon -->
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="feather feather-refresh-ccw"><polyline points="1 4 1 10 7 10"></polyline><polyline points="23 20 23 14 17 14"></polyline><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path></svg>
      </button>
      <span class="separator">|</span>
      <div class="zoom-slider-container">
        <button @click="zoomBy(-1)" :title="t('zoom_out')" class="zoom-button">-</button>
        <input
          type="range"
          min="1"
          max="20"
          step="0.1"
          :value="zoomLevel"
          @input="handleSlider"
          class="zoom-slider"
          :title="t('zoom_level')"
        />
        <button @click="zoomBy(1)" :title="t('zoom_in')" class="zoom-button">+</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps({
  chartData: {
    type: Object,
    required: true,
  },
  title: {
    type: String,
    default: 'Jig Chart',
  },
  highlightedPinIds: {
    type: Array,
    default: () => [],
  },
  selectedPinId: {
    type: [String, Number],
    default: null,
  },
  pinToZoom: {
    type: Object,
    default: null,
  },
});

const pan = ref({ x: 0, y: 0 });
const svgRef = ref(null);
const dataBounds = ref({ minX: 0, minY: 0, width: 1, height: 1 });

// Transformation state
const scale = ref(1);
const translateX = ref(0);
const translateY = ref(0);

// Interaction state
const mode = ref('pan');
const isPanning = ref(false);
const isDragging = ref(false);
const startPoint = ref({ x: 0, y: 0 });
const dragRect = ref({ x: 0, y: 0, width: 0, height: 0 });

// History state
const history = ref([]);
const forward = ref([]);

// Zoom slider state
const zoomLevel = ref(1);
let sliderTimeout = null;

// --- Computed Properties ---
const viewBox = computed(() => `${dataBounds.value.minX} ${dataBounds.value.minY} ${dataBounds.value.width} ${dataBounds.value.height}`);
const transform = computed(() => `translate(${translateX.value}, ${translateY.value}) scale(${scale.value})`);

const rutDatasets = computed(() => {
  return props.chartData?.datasets?.filter(d => d.type === 'line').map(d => ({
    ...d,
    path: d.data.map((p, i) => (i === 0 ? 'M' : 'L') + `${p.x} ${p.y}`).join(' '),
  })) || [];
});

const adrPins = computed(() => {
    const pins = [];
    props.chartData?.datasets?.filter(d => d.type === 'scatter').forEach(dataset => {
        dataset.data.forEach(pin => {
            const isHighlighted = props.highlightedPinIds.includes(pin.id);
            const isSelected = props.selectedPinId === pin.id;
            pins.push({
                ...pin,
                color: isSelected ? 'white' : (isHighlighted ? 'red' : dataset.backgroundColor),
                radius: isHighlighted || isSelected ? pinRadius.value * 4 : pinRadius.value,
                stroke: isHighlighted || isSelected ? 'darkred' : 'none',
                strokeWidth: isHighlighted || isSelected ? pinRadius.value / 2 : 0,
            });
        });
    });
    return pins;
});

const pinRadius = computed(() => 0.25 / Math.sqrt(scale.value));
const strokeWidth = computed(() => 0.5 / Math.sqrt(scale.value));

// --- Watchers ---

watch(() => props.pinToZoom, (pin) => {
  if (pin) {
    zoomToPin(pin);
  } else {
    if (history.value.length > 1 || scale.value !== 1 || translateX.value !== 0 || translateY.value !== 0) {
      reset();
    }
  }
});

watch(() => props.chartData, (newData) => {
  if (!newData || !newData.datasets || newData.datasets.length === 0) return;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  newData.datasets.forEach(d => {
    d.data.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    });
  });

  if (isFinite(minX)) {
    const padding = (maxX - minX) * 0.1 || 10;
    dataBounds.value = {
      minX: minX - padding,
      minY: minY - padding,
      width: (maxX - minX) + padding * 2,
      height: (maxY - minY) + padding * 2,
    };
    reset();
  }
}, { deep: true, immediate: true });

function getSVGPoint(event) {
  const svg = svgRef.value;
  if (!svg) return { x: 0, y: 0 };
  const pt = svg.createSVGPoint();
  pt.x = event.clientX;
  pt.y = event.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}

// --- Event Handlers ---
function handleWheel(event) {
  const zoomFactor = 1.1;
  const newScale = event.deltaY < 0 ? scale.value * zoomFactor : scale.value / zoomFactor;
  const p = getSVGPoint(event);
  
  translateX.value = p.x - (p.x - translateX.value) * (newScale / scale.value);
  translateY.value = p.y - (p.y - translateY.value) * (newScale / scale.value);
  scale.value = newScale;
  zoomLevel.value = newScale; // Sync slider
  saveState();
}

function handleMouseDown(event) {
  if (mode.value === 'pan') {
    isPanning.value = true;
    startPoint.value = { x: event.clientX, y: event.clientY };
  } else if (mode.value === 'zoom') {
    isDragging.value = true;
    const p = getSVGPoint(event);
    startPoint.value = p;
    dragRect.value = { x: p.x, y: p.y, width: 0, height: 0 };
  }
}

function handleMouseMove(event) {
  if (isPanning.value) {
    const svg = svgRef.value;
    if (!svg) return;
    const CTM = svg.getScreenCTM();
    const dx = (event.clientX - startPoint.value.x) / CTM.a;
    const dy = (event.clientY - startPoint.value.y) / CTM.d;
    translateX.value += dx;
    translateY.value += dy;
    startPoint.value = { x: event.clientX, y: event.clientY };
  } else if (isDragging.value) {
    const p = getSVGPoint(event);
    const x = Math.min(p.x, startPoint.value.x);
    const y = Math.min(p.y, startPoint.value.y);
    const width = Math.abs(p.x - startPoint.value.x);
    const height = Math.abs(p.y - startPoint.value.y);
    dragRect.value = { x, y, width, height };
  }
}

function handleMouseUp() {
  if (isDragging.value) {
    const rect = dragRect.value;
    // 只有当框足够大时才响应，防止误触
    if (rect.width > 5 && rect.height > 5) {
      const zoomFactor = 2; // 固定的放大倍数
      const newScale = scale.value * zoomFactor;

      // 计算框选区域的中心点 (在SVG坐标系中)
      const boxCenterX = rect.x + rect.width / 2;
      const boxCenterY = rect.y + rect.height / 2;

      // 将视图的中心移动到框选区域的中心，并应用新的缩放比例
      translateX.value = translateX.value - (boxCenterX - translateX.value) * (zoomFactor - 1);
      translateY.value = translateY.value - (boxCenterY - translateY.value) * (zoomFactor - 1);
      scale.value = newScale;
      
      zoomLevel.value = newScale; // 同步滑块
      saveState();
    }
  } else if (isPanning.value) {
    saveState();
  }

  isPanning.value = false;
  isDragging.value = false;
  dragRect.value = { width: 0, height: 0 };
}

function handleSlider(event) {
  if (sliderTimeout) clearTimeout(sliderTimeout);
  const newZoomLevel = parseFloat(event.target.value);
  zoomLevel.value = newZoomLevel;

  sliderTimeout = setTimeout(() => {
    const currentScale = scale.value;
    const newScale = newZoomLevel;
    
    // Zoom towards the center of the view
    const viewCenterX = dataBounds.value.minX + dataBounds.value.width / 2;
    const viewCenterY = dataBounds.value.minY + dataBounds.value.height / 2;

    translateX.value = viewCenterX - (viewCenterX - translateX.value) * (newScale / currentScale);
    translateY.value = viewCenterY - (viewCenterY - translateY.value) * (newScale / currentScale);
    scale.value = newScale;
    saveState();
  }, 50);
}

// --- Toolbar Methods ---
function setMode(newMode) {
  mode.value = newMode;
}

function zoomBy(amount) {
  const newZoomLevel = zoomLevel.value + amount;
  const clampedZoomLevel = Math.max(1, Math.min(20, newZoomLevel));
  
  if (Math.abs(clampedZoomLevel - zoomLevel.value) < 1e-6) return;

  zoomLevel.value = clampedZoomLevel;

  // Logic from handleSlider
  const currentScale = scale.value;
  const newScale = clampedZoomLevel;
  
  const viewCenterX = dataBounds.value.minX + dataBounds.value.width / 2;
  const viewCenterY = dataBounds.value.minY + dataBounds.value.height / 2;

  translateX.value = viewCenterX - (viewCenterX - translateX.value) * (newScale / currentScale);
  translateY.value = viewCenterY - (viewCenterY - translateY.value) * (newScale / currentScale);
  scale.value = newScale;
  saveState();
}

function reset() {
  scale.value = 1;
  translateX.value = 0;
  translateY.value = 0;
  zoomLevel.value = 1;
  saveState(true);
}

// --- History Management ---
function saveState(isReset = false) {
  const state = {
    scale: scale.value,
    translateX: translateX.value,
    translateY: translateY.value,
  };
  if (isReset) {
    history.value = [state];
    forward.value = [];
  } else {
    // Avoid saving duplicate states
    const lastState = history.value[history.value.length - 1];
    if (JSON.stringify(lastState) !== JSON.stringify(state)) {
      history.value.push(state);
      forward.value = [];
    }
  }
}

function applyState(state) {
    scale.value = state.scale;
    translateX.value = state.translateX;
    translateY.value = state.translateY;
    updateZoomSlider();
}

function undo() {
  if (history.value.length > 1) {
    const lastState = history.value.pop();
    forward.value.push(lastState);
    applyState(history.value[history.value.length - 1]);
  }
}

function redo() {
  if (forward.value.length > 0) {
    const nextState = forward.value.pop();
    history.value.push(nextState);
    applyState(nextState);
  }
}

function zoomToPin(pin) {
  const targetScale = 8; 
  const point = { x: pin.x, y: pin.y };

  const centerX = dataBounds.value.minX + dataBounds.value.width / 2;
  const centerY = dataBounds.value.minY + dataBounds.value.height / 2;

  scale.value = targetScale;
  translateX.value = centerX - point.x * targetScale;
  translateY.value = centerY - point.y * targetScale;

  saveState();
  updateZoomSlider();
}

function updateZoomSlider() {
  const level = Math.log(scale.value) / Math.log(1.4) + 1;
  zoomLevel.value = Math.max(1, Math.min(20, level));
}
</script>

<style scoped>
.chart-container-svg {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #2c2c2c; /* Changed to dark mode */
  border: 1px solid #444; /* Changed to dark mode */
}

.chart-svg {
  flex-grow: 1;
}
.cursor-pan { cursor: grab; }
.cursor-pan:active { cursor: grabbing; }
.cursor-zoom { cursor: crosshair; }

.drag-rect {
  fill: rgba(52, 152, 219, 0.1);
  stroke: rgba(52, 152, 219, 0.7);
  stroke-width: 0.5;
  stroke-dasharray: 2 2;
}

.zoom-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  background-color: #333; /* Changed to dark mode */
  border-top: 1px solid #555; /* Changed to dark mode */
  flex-shrink: 0;
}

.zoom-controls .title {
    font-weight: bold;
    margin-right: 10px;
    color: #fff; /* Changed to dark mode */
}

.zoom-controls button {
  margin: 0 5px;
  padding: 5px 10px;
  border: 1px solid #666; /* Changed to dark mode */
  border-radius: 4px;
  cursor: pointer;
  background-color: #444; /* Changed to dark mode */
  color: #fff; /* Changed to dark mode */
}

.zoom-controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.zoom-controls .active-mode {
  background-color: #555; /* Changed to dark mode */
  border-color: #00aaff; /* Changed to dark mode */
}

.zoom-controls .separator {
  margin: 0 10px;
  color: #666; /* Changed to dark mode */
}

.zoom-slider {
  width: 150px;
  margin: 0 5px;
}

.zoom-slider-container {
  display: flex;
  align-items: center;
}

.zoom-button {
  width: 30px;
  height: 30px;
  padding: 0;
  font-size: 18px;
  font-weight: bold;
  line-height: 30px;
  text-align: center;
  flex-shrink: 0;
}

.icon {
  width: 24px;
  height: 24px;
  fill: currentColor;
}
</style>
