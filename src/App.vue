<!-- src/App.vue -->
<template>
  <div id="app-container">
    <div class="sidebar">
      <h1 class="title">Jig Viewer</h1>
      <button @click="loadAndProcessFiles" class="load-button">Load & Process Files</button>
    </div>
    <div class="main-content">
      <div class="chart-container">
        <JigChart :chartData="chartDataTop" title="Top Jig (Side A)" />
      </div>
      <div class="chart-container">
        <JigChart :chartData="chartDataBot" title="Bottom Jig (Side B)" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import JigChart from './components/JigChart.vue';

const chartDataTop = ref({ datasets: [] }); // 初始化为空结构
const chartDataBot = ref({ datasets: [] }); // 初始化为空结构

const loadAndProcessFiles = async () => {
  try {
    // 直接接收 background.js 解析好的对象，不再进行 JSON.parse
    const parsedData = await window.electron.selectFiles();

    // 只有在成功获取到数据时才继续处理
    if (parsedData && parsedData.rut_data) {
      const separatedData = parsedData.rut_data.reduce((acc, item) => {
        const jigType = item.filename.toUpperCase().includes('TOP') ? 'top' : 'bot';
        acc[jigType].push({
          label: `Jig ${item.filename}`,
          data: item.coords,
          borderColor: jigType === 'top' ? 'rgba(255, 99, 132, 1)' : 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(0, 0, 0, 0)',
          fill: false,
          showLine: true,
          type: 'line', // 明确指定图表类型
        });
        return acc;
      }, { top: [], bot: [] });

      // 使用正确的变量名 chartDataTop
      chartDataTop.value = {
        datasets: [
          ...separatedData.top,
          {
            label: 'Side A',
            data: parsedData.adr_data.side_a,
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 1)',
            showLine: false,
            type: 'scatter', // 明确指定图表类型
          }
        ]
      };

      // 使用正确的变量名 chartDataBot
      chartDataBot.value = {
        datasets: [
          ...separatedData.bot,
          {
            label: 'Side B',
            data: parsedData.adr_data.side_b,
            borderColor: 'rgba(153, 102, 255, 1)',
            backgroundColor: 'rgba(153, 102, 255, 1)',
            showLine: false,
            type: 'scatter', // 明确指定图表类型
          }
        ]
      };
    } else if (parsedData === null) {
      // 用户取消了文件选择，不做任何事
    } else {
      // 数据格式不正确，重置图表
      console.error("Received invalid data structure:", parsedData);
      chartDataTop.value = { datasets: [] };
      chartDataBot.value = { datasets: [] };
    }
  } catch (error) {
    console.error('Error processing files:', error);
    // 发生任何错误都重置图表状态，并使用正确的变量名
    chartDataTop.value = { datasets: [] };
    chartDataBot.value = { datasets: [] };
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
  flex-shrink: 0;
}
.main-content {
  flex-grow: 1;
  display: flex;
  flex-direction: row;
  padding: 10px;
  gap: 10px;
}
.chart-container {
  flex-grow: 1;
  display: flex;
  border: 1px solid #ccc;
  border-radius: 8px;
  min-width: 0;
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
</style>