<!-- src/components/JigChart.vue -->
<template>
  <div class="chart-container">
    <div class="chart-wrapper">
      <canvas ref="chartCanvas"></canvas>
    </div>
    <div class="zoom-controls">
      <button @click="zoomIn">Zoom In</button>
      <button @click="zoomOut">Zoom Out</button>
      <button @click="resetZoom">Reset Zoom</button>
      <input type="range" min="1" max="10" step="0.1" :value="zoomLevel" @input="handleZoomSlider" class="zoom-slider" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
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
          zoom: { // 缩放插件配置
            pan: { enabled: true, mode: 'xy' },
            zoom: {
              wheel: { enabled: true },
              pinch: { enabled: true },
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
</style>