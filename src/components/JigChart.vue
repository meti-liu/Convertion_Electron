<!-- src/components/JigChart.vue -->
<template>
  <div class="chart-wrapper">
    <canvas ref="chartCanvas"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import Chart from 'chart.js/auto';
import zoomPlugin from 'chartjs-plugin-zoom';

// 注册缩放插件
Chart.register(zoomPlugin);

const props = defineProps({
  chartData: Object,
  title: String // 添加 title 属性
});

const chartCanvas = ref(null);
let chartInstance = null;

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
.chart-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}
</style>