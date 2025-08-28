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

    <!-- Toolbar with Icons using Element Plus -->
    <div class="zoom-controls">
      <el-button-group>
        <el-button 
          @click="setMode('pan')" 
          :type="mode === 'pan' ? 'primary' : 'default'" 
          :title="t('pan_mode')"
          size="small">
          <el-icon><Aim /></el-icon>
        </el-button>
        <el-button 
          @click="setMode('zoom')" 
          :type="mode === 'zoom' ? 'primary' : 'default'" 
          :title="t('zoom_mode')"
          size="small">
          <el-icon><ZoomIn /></el-icon>
        </el-button>
      </el-button-group>
      
      <el-divider direction="vertical" />
      
      <el-button-group>
        <el-button 
          @click="undo" 
          :disabled="history.length <= 1" 
          :title="t('undo')"
          size="small">
          <el-icon><Back /></el-icon>
        </el-button>
        <el-button 
          @click="redo" 
          :disabled="forward.length === 0" 
          :title="t('redo')"
          size="small">
          <el-icon><Right /></el-icon>
        </el-button>
        <el-button 
          @click="reset" 
          :title="t('reset_view')"
          size="small">
          <el-icon><RefreshRight /></el-icon>
        </el-button>
        <el-button 
          @click="exportSvg" 
          :title="t('export_svg') || '导出SVG'"
          size="small">
          <el-icon><Download /></el-icon>
        </el-button>
      </el-button-group>
      
      <el-divider direction="vertical" />
      
      <div class="zoom-slider-container">
        <el-button 
          @click="zoomBy(-1)" 
          :title="t('zoom_out')"
          size="small">
          <el-icon><Minus /></el-icon>
        </el-button>
        <el-slider
          v-model="zoomLevel"
          :min="1"
          :max="20"
          :step="0.1"
          @input="handleSlider"
          class="zoom-slider"
          :title="t('zoom_level')"
          size="small"
        />
        <el-button 
          @click="zoomBy(1)" 
          :title="t('zoom_in')"
          size="small">
          <el-icon><Plus /></el-icon>
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElButton, ElButtonGroup, ElDivider, ElSlider } from 'element-plus';
import { Aim, ZoomIn, Back, Right, RefreshRight, Download, Plus, Minus } from '@element-plus/icons-vue';

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

// SVG Export functionality
function exportSvg() {
  if (!svgRef.value) return;
  
  // Create a new SVG element with proper namespace
  const ns = 'http://www.w3.org/2000/svg';
  const newSvg = document.createElementNS(ns, 'svg');
  
  // Set essential attributes
  newSvg.setAttribute('xmlns', ns);
  newSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  newSvg.setAttribute('version', '1.1');
  newSvg.setAttribute('width', '800');
  newSvg.setAttribute('height', '600');
  
  // Copy viewBox from original SVG
  newSvg.setAttribute('viewBox', svgRef.value.getAttribute('viewBox'));
  
  // Add black background rectangle
  const backgroundRect = document.createElementNS(ns, 'rect');
  backgroundRect.setAttribute('width', '100%');
  backgroundRect.setAttribute('height', '100%');
  backgroundRect.setAttribute('fill', '#000000');
  newSvg.appendChild(backgroundRect);
  
  // Create a style element for the SVG
  const styleElement = document.createElementNS(ns, 'style');
  styleElement.setAttribute('type', 'text/css');
  
  // Add essential styles
  styleElement.textContent = `
    .drag-rect {
      fill: rgba(52, 152, 219, 0.1);
      stroke: rgba(52, 152, 219, 0.7);
      stroke-width: 0.5;
      stroke-dasharray: 2 2;
    }
    path {
      fill: none;
    }
    svg {
      background-color: #000000;
    }
  `;
  
  newSvg.appendChild(styleElement);
  
  // Copy the transformed group with all content
  const mainGroup = svgRef.value.querySelector('g');
  if (mainGroup) {
    const clonedGroup = mainGroup.cloneNode(true);
    newSvg.appendChild(clonedGroup);
  }
  
  // Get the SVG as a string
  const serializer = new XMLSerializer();
  let svgString = serializer.serializeToString(newSvg);
  
  // Clean up any non-standard attributes that might cause issues
  svgString = svgString.replace(/\sclass="[^"]*"/g, '');
  
  // Add XML declaration
  const svgData = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' + svgString;
  
  // Send to main process for saving
  if (window.electronAPI) {
    window.electronAPI.exportSvg(svgData);
  }
}

// Handle export result notifications
let exportResultHandler = null;

onMounted(() => {
  if (window.electronAPI) {
    exportResultHandler = (result) => {
      if (result.success) {
        ElMessage.success(result.message || t('export_success') || '导出成功');
      } else {
        ElMessage.error(result.message || t('export_error') || '导出失败');
      }
    };
    window.electronAPI.onExportSvgResult(exportResultHandler);
  }
});

onUnmounted(() => {
  // Clean up event listeners
  if (window.electronAPI && exportResultHandler) {
    // Note: Electron doesn't provide a direct way to remove listeners from preload
    // In a production app, you might want to implement a more robust solution
  }
});
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
  display: flex !important;
  align-items: center;
  justify-content: center;
  padding: 8px;
  background-color: #333; /* Dark mode */
  border-top: 1px solid #555; /* Dark mode */
  flex-shrink: 0;
  visibility: visible !important;
  opacity: 1 !important;
  z-index: 100;
  gap: 10px; /* Add spacing between elements */
}

/* Element Plus component styling overrides */
:deep(.el-button) {
  background-color: #444;
  border-color: #666;
  color: #fff;
}

:deep(.el-button:hover) {
  background-color: #555;
  border-color: #777;
}

:deep(.el-button.is-disabled) {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: #3a3a3a;
  border-color: #555;
}

:deep(.el-button--primary) {
  background-color: #409eff;
  border-color: #409eff;
}

:deep(.el-divider--vertical) {
  height: 1.5em;
  background-color: #666;
}

.zoom-slider {
  width: 150px;
  margin: 0 5px;
}

:deep(.el-slider) {
  --el-slider-main-bg-color: #409eff;
  --el-slider-runway-bg-color: #555;
}

:deep(.el-slider__runway) {
  background-color: #555;
}

:deep(.el-slider__bar) {
  background-color: #409eff;
}

:deep(.el-slider__button) {
  border-color: #409eff;
  background-color: #fff;
}

.zoom-slider-container {
  display: flex;
  align-items: center;
}
</style>
