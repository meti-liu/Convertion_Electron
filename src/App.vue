<template>
  <div id="app-container">
    <div class="sidebar">
      <h1 class="title">Jig Viewer</h1>
      <button @click="loadAndProcessFiles" class="load-button">Load & Process Files</button>
    </div>
    <div class="chart-container">
      <JigChart :chartData="chartData" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import JigChart from './components/JigChart.vue';

const chartData = ref(null);

const loadAndProcessFiles = async () => {
  const result = await window.electronAPI.processFiles();
  if (result) {
    const datasets = [];

    // RUT数据
    result.rut_data.forEach((coords, index) => {
      datasets.push({
        label: `RUT ${index + 1}`,
        data: coords.map(c => ({ x: c[0], y: c[1] })),
        borderColor: ['red', 'blue', 'green', 'purple', 'orange'][index % 5],
        borderWidth: 2,
        showLine: true,
        fill: false,
        type: 'line',
        pointRadius: 0,
      });
    });

    // ADR数据
    if (result.adr_data) {
      datasets.push({
        label: 'ADR Pins - Side A',
        data: result.adr_data.side_a,
        backgroundColor: 'black',
        pointRadius: 2,
        type: 'scatter',
      });
      datasets.push({
        label: 'ADR Pins - Side B',
        data: result.adr_data.side_b,
        backgroundColor: 'grey',
        pointRadius: 2,
        type: 'scatter',
      });
    }
    chartData.value = { datasets };
  }
};
</script>

<style>
#app-container {
  display: flex;
  height: 100vh;
  font-family: sans-serif;
}
.sidebar {
  width: 250px;
  background-color: #f4f4f8;
  padding: 20px;
  display: flex;
  flex-direction: column;
}
.title {
  font-size: 24px;
  color: #333;
  margin-bottom: 20px;
}
.load-button {
  padding: 10px 15px;
  font-size: 16px;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s;
}
.load-button:hover {
  background-color: #36a374;
}
.chart-container {
  flex-grow: 1;
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>