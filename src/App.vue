<!-- src/App.vue -->
<template>
  <div id="app-container">
    <div class="sidebar">
      <h1 class="title">Jig Viewer</h1>
      <button @click="loadAndProcessFiles" class="load-button">Load Files</button>
    </div>
    <div class="main-content">
      <div class="main-container">
        <!-- Wrapper for the two charts -->
        <div class="charts-wrapper">
          <div class="chart-container" id="chart-top-container">
            <h3>Up Jig (Side A)</h3>
            <JigChart_svg 
              :jigData="upJigData" 
              :pinList="pinLists.side_a || []" 
              title="Up Jig (Side A)"
            />
          </div>
          <div class="chart-container" id="chart-bottom-container">
            <h3>Down Jig (Side B)</h3>
            <JigChart_svg 
              :jigData="downJigData" 
              :pinList="pinLists.side_b || []" 
              title="Down Jig (Side B)"
            />
          </div>
        </div>
        <!-- Controls on the right -->
        <div class="controls-container">
          <div class="control-panel">
            <ControlPanel @update-settings="updateChartSettings" />
          </div>
          <div class="pin-inspector">
            <!-- <PinInspector @highlight-pin="handleHighlightPin" /> -->
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import JigChart_svg from './components/JigChart_svg.vue';
// import PinInspector from './components/PinInspector.vue';
import ControlPanel from './components/ControlPanel.vue';

const upJigData = ref(null);
const downJigData = ref(null);
const pinLists = ref({ side_a: [], side_b: [] });
// const highlightedPinId = ref('');

const loadAndProcessFiles = async () => {
  try {
    // 确保你的 background.js 中有 'process-jig-files' 的处理器
    const result = await window.electron.invoke('process-files');
    if (result) {
      console.log("App.vue: upJigData", JSON.stringify(result.up_jigs, null, 2));
      console.log("App.vue: downJigData", JSON.stringify(result.down_jigs, null, 2));
      upJigData.value = result.up_jigs;
      downJigData.value = result.down_jigs;
      pinLists.value = result.pin_lists || { side_a: [], side_b: [] };
    }
  } catch (error) {
    console.error("Failed to load and process files:", error);
  }
};

/*
function handleHighlightPin(pinId) {
  highlightedPinId.value = pinId;
}
*/

function updateChartSettings(settings) {
  console.log("Received settings:", settings);
}



</script>

<style>
/* Import the new global stylesheet */
@import './assets/styles.css';

.main-container {
  display: flex;
  flex-direction: row; /* Side-by-side layout */
  height: 100vh;
  background-color: #1e1e1e;
}

.charts-wrapper {
  flex: 4; /* Takes up most of the space */
  display: flex;
  flex-direction: column; /* Stack charts vertically */
  gap: 10px;
  padding: 10px;
}

.chart-container {
  flex: 1; /* Each chart takes half of the wrapper's height */
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  border: 1px solid #444;
  border-radius: 8px;
  background-color: #2a2a2a;
  padding: 10px;
}

.chart-container h3 {
  margin: 0 0 10px 0;
  color: #61dafb;
  text-align: center;
}

.controls-container {
  flex: 1; /* Takes up less space */
  display: flex;
  flex-direction: column;
  padding: 20px;
  background-color: #252526;
  border-left: 1px solid #444;
  gap: 20px;
}

.control-panel {
  padding: 0; 
}

.pin-inspector {
  flex-grow: 1;
  min-height: 0;
}
</style>