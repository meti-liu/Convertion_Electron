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
      <!-- 原有的缩放按钮 -->
      <button @click="zoomIn">Zoom In</button>
      <button @click="zoomOut">Zoom Out</button>
      <button @click="resetZoom">Reset Zoom</button>
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
const chartMode = ref('pan'); // 'pan' or 'zoom'

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
    chartInstance.resetZoom();
    zoomLevel.value = 1;
  }
}

function handleZoomSlider(event) {
  if (chartInstance) {
    const newZoomLevel = parseFloat(event.target.value);
    // Since chart.js zoom() is relative, we need to calculate the factor
    const currentZoom = chartInstance.getZoomLevel();
    chartInstance.zoom(newZoomLevel / currentZoom);
    zoomLevel.value = newZoomLevel;
  }
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
              enabled: true, // 默认启用平移
              mode: 'xy',
            },
            zoom: {
              // 核心改动在这里
              drag: {
                enabled: false, // 默认禁用拖拽缩放
                borderColor: 'rgba(0, 123, 255, 0.5)',
                borderWidth: 2,
                backgroundColor: 'rgba(0, 123, 255, 0.1)'
              },
              wheel: {
                enabled: false, // 禁用滚轮实时缩放，避免冲突和卡顿
              },
              pinch: {
                enabled: true // 保留触摸板的双指缩放
              },
              mode: 'xy',
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