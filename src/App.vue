<!-- src/App.vue -->
<template>
  <div id="app-container">
    <div class="sidebar">
      <h1 class="title">Jig Viewer</h1>
      <button @click="loadAndProcessFiles" class="load-button">Load Files</button>
    </div>
    <div class="main-content">
      <JigChart :chartData="chartDataTop" title="Top Jig (Side A)" />
      <JigChart :chartData="chartDataBot" title="Bottom Jig (Side B)" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import JigChart from './components/JigChart_svg.vue';

const chartDataTop = ref({ datasets: [] }); // 初始化为空结构
const chartDataBot = ref({ datasets: [] }); // 初始化为空结构

const loadAndProcessFiles = async () => {
  const result = await window.electronAPI.processFiles();
  if (result && result.rut_data) {
    // 根据文件名精确分离 TOP 和 BOT 数据
    const topRutData = result.rut_data.filter(data => 
        data.filename.toUpperCase().includes('TOP')
    );
    const botRutData = result.rut_data.filter(data => 
        data.filename.toUpperCase().includes('BOT')
    );

    // --- Top Jig Chart Data (Side A) ---
    const topDatasets = topRutData.map((data, index) => ({
      label: data.filename, // 使用文件名作为标签
      data: data.coords.map(c => ({ x: c[0], y: c[1] })),
      borderColor: ['red', 'blue', 'green'][index % 3],
      borderWidth: 2,
      showLine: true,
      fill: false,
      type: 'line',
      pointRadius: 0,
    }));

    if (result.adr_data?.side_a) {
      topDatasets.push({
        label: 'ADR Pins - Side A',
        data: result.adr_data.side_a,
        backgroundColor: 'black',
        pointRadius: 1,
        type: 'scatter',
      });
    }
    chartDataTop.value = { datasets: topDatasets };

    // --- Bottom Jig Chart Data (Side B) ---
    const botDatasets = botRutData.map((data, index) => ({
      label: data.filename, // 使用文件名作为标签
      data: data.coords.map(c => ({ x: c[0], y: c[1] })),
      borderColor: ['red', 'blue', 'green'][index % 3],
      borderWidth: 2,
      showLine: true,
      fill: false,
      type: 'line',
      pointRadius: 0,
    }));

    if (result.adr_data?.side_b) {
      botDatasets.push({
        label: 'ADR Pins - Side B',
        data: result.adr_data.side_b,
        backgroundColor: 'grey',
        pointRadius: 1,
        type: 'scatter',
      });
    }
    chartDataBot.value = { datasets: botDatasets };
  }
};
</script>

<style>
/* Import the new global stylesheet */
@import './assets/styles.css';
</style>