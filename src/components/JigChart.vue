<!-- src/components/JigChart.vue -->
<template>
  <div class="chart-container">
    <div class="chart-wrapper">
      <canvas ref="chartCanvas"></canvas>
    </div>
    <div class="zoom-controls">
      <!-- 新的模式切换按钮 -->
      <button @click="setMode('pan')" :class="{ 'active-mode': chartMode === 'pan' }">Pan</button>
      <button @click="setMode('zoom')" :class="{ 'active-mode': chartMode === 'zoom' }">Zoom</button>
      <span class="separator">|</span> <!-- 分隔符 -->
      <!-- 新增：后退和前进按钮 -->
      <button @click="undoZoom" :disabled="historyStack.length <= 1">Undo</button>
      <button @click="redoZoom" :disabled="forwardStack.length === 0">Redo</button>
      <button @click="resetZoom">Reset</button>
      <span class="separator">|</span>
      <!-- 原有的缩放按钮 -->
      <button @click="zoomIn">In</button>
      <button @click="zoomOut">Out</button>
      <input type="range" min="1" max="10" step="0.1" :value="zoomLevel" @input="handleZoomSlider" class="zoom-slider" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, reactive } from 'vue'; // 导入 reactive
import Chart from 'chart.js/auto';
import zoomPlugin from 'chartjs-plugin-zoom';

// 注册插件
Chart.register(zoomPlugin);

const props = defineProps({
  chartData: Object,
  title: String // 添加 title 属性
});

const chartCanvas = ref(null);
let chartInstance = null;
const zoomLevel = ref(1);
const chartMode = ref('pan');

// 新增：历史记录堆栈
const historyStack = ref([]);
const forwardStack = ref([]);
let isUpdating = false; // 防止无限循环的锁
let sliderTimeout = null; // 用于存储防抖的计时器

// 保存当前状态到历史记录
function saveState() {
  if (!chartInstance) return;
  const scales = chartInstance.options.scales;
  historyStack.value.push({
    x: { min: scales.x.min, max: scales.x.max },
    y: { min: scales.y.min, max: scales.y.max },
  });
  forwardStack.value = []; // 新的操作会清空前进栈
}

// 后退
function undoZoom() {
  if (historyStack.value.length > 1) { // 至少保留一个初始状态
    const currentState = historyStack.value.pop();
    forwardStack.value.push(currentState);
    const lastState = historyStack.value[historyStack.value.length - 1];
    applyState(lastState);
  }
}

// 前进
function redoZoom() {
  if (forwardStack.value.length > 0) {
    const nextState = forwardStack.value.pop();
    historyStack.value.push(nextState);
    applyState(nextState);
  }
}

// 应用状态到图表
function applyState(state) {
  if (chartInstance && state) {
    chartInstance.options.scales.x.min = state.x.min;
    chartInstance.options.scales.x.max = state.x.max;
    chartInstance.options.scales.y.min = state.y.min;
    chartInstance.options.scales.y.max = state.y.max;
    chartInstance.update('none'); // 'none' 表示无动画更新
    zoomLevel.value = chartInstance.getZoomLevel(); // 同步滑块
  }
}

function zoomIn() {
  if (chartInstance) {
    chartInstance.zoom(1.1);
    zoomLevel.value = chartInstance.getZoomLevel();
  }
}

function zoomOut() {
  if (chartInstance) {
    chartInstance.zoom(0.9);
    zoomLevel.value = chartInstance.getZoomLevel();
  }
}

function resetZoom() {
  if (chartInstance) {
    chartInstance.resetZoom('none');
    // 不再手动调用 saveState()，完全依赖 onZoomComplete 回调
    // 这可以避免状态竞争问题
  }
}

// 彻底改造 handleZoomSlider，加入防抖
function handleZoomSlider(event) {
  if (!chartInstance) return;

  // 无论用户动多快，都先清除上一个待执行的缩放指令
  if (sliderTimeout) {
    clearTimeout(sliderTimeout);
  }

  const newZoomLevel = parseFloat(event.target.value);

  // 设置一个新的指令，在 50 毫秒后执行
  sliderTimeout = setTimeout(() => {
    const currentZoom = chartInstance.getZoomLevel();
    // 计算缩放因子并执行缩放
    chartInstance.zoom(newZoomLevel / currentZoom, 'none');
  }, 50); // 50毫秒的延迟，可以在不影响体验的情况下极大提升性能
}

function setMode(mode) {
  chartMode.value = mode;
  if (chartInstance) {
    chartInstance.options.plugins.zoom.pan.enabled = mode === 'pan';
    chartInstance.options.plugins.zoom.zoom.drag.enabled = mode === 'zoom';
    chartInstance.update();
  }
}

onMounted(() => {
  if (chartCanvas.value) {
    const ctx = chartCanvas.value.getContext('2d');
    chartInstance = new Chart(ctx, {
      data: { datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: { // 图表标题
            display: true,
            text: props.title,
            font: { size: 16 }
          },
          // 1. 添加内置的数据抽取插件配置
          decimation: {
            enabled: true,
            algorithm: 'lttb', // 使用高效的 LTTB 算法
            samples: 200,      // 抽样点数，可以根据需要调整
            threshold: 500,    // 数据点超过 500 个时开始抽样
          },
          zoom: {
            pan: {
              enabled: true,
              mode: 'xy',
              onPanComplete: ({chart}) => { // 平移完成后保存状态
                saveState();
              }
            },
            zoom: {
              // 核心改动：使用 onZoom 回调来实时同步滑块
              onZoom: ({chart}) => {
                zoomLevel.value = chart.getZoomLevel();
              },
              // 缩放完成后保存状态
              onZoomComplete: ({chart}) => {
                saveState();
              }
            }
          }
        },
        scales: {
          x: { type: 'linear', position: 'bottom' },
          y: { type: 'linear' }
        }
      }
    });
  }
  // 保存初始状态
  setTimeout(() => saveState(), 100);
});

watch(() => props.chartData, (newData) => {
  if (newData && chartInstance) {
    // 设置点的样式
    newData.datasets.forEach(dataset => {
      if (dataset.label.includes('Side A') || dataset.label.includes('Side B')) {
        dataset.pointRadius = 1; // Pin点设置较小的半径
        dataset.pointHoverRadius = 3; // 鼠标悬停时稍大
      } else {
        dataset.pointRadius = 0; // 治具轮廓线上的点可以不显示
        dataset.borderWidth = 2; // 治具轮廓线宽
      }
    });

    chartInstance.data = newData;
    // 更新标题
    if (chartInstance.options.plugins.title) {
        chartInstance.options.plugins.title.text = props.title;
    }
    chartInstance.update();
  }
}, { deep: true });
</script>

<style scoped>
.chart-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chart-wrapper {
  position: relative;
  flex-grow: 1;
  width: 100%;
  height: 100%;
}

.zoom-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  background-color: #f0f0f0;
}

.zoom-controls button {
  margin: 0 5px;
  padding: 5px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
}

.zoom-slider {
  width: 150px;
  margin-left: 15px;
}

/* 新增样式：活动模式的按钮高亮 */
.active-mode {
  background-color: #cce5ff; /* 一个淡蓝色背景来表示激活状态 */
  border-color: #007bff;
}

/* 新增样式：分隔符 */
.separator {
  margin: 0 10px;
  color: #ccc;
}
</style>