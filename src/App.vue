<!-- src/App.vue -->
<template>
  <div id="app-container">
    <div id="main-content">
      <JigChart 
        :chart-data="chartDataTop" 
        :highlighted-pins="highlightedPinIds" 
        :zoom-to-pin="topPinToZoom"
        title="Top Jig"
      />
      <JigChart 
        :chart-data="chartDataBot" 
        :highlighted-pins="highlightedPinIds" 
        :zoom-to-pin="botPinToZoom"
        title="Bottom Jig"
      />
    </div>
    <ControlPanel 
      :failed-pins="failedPins"
      @highlight-pins="handleHighlightPins"
      @zoom-to-pin="handleZoomToPin"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import JigChart from './components/JigChart_svg.vue';
import ControlPanel from './components/ControlPanel.vue';
import PinInspector from './components/PinInspector.vue';

const chartDataTop = ref({ datasets: [] });
const chartDataBot = ref({ datasets: [] });
const highlightedPinIds = ref([]);
const topPinToZoom = ref(null); // Separate zoom state for Top Jig
const botPinToZoom = ref(null); // Separate zoom state for Bottom Jig
const failedPins = ref([]); // To store failed pin IDs from the backend

function handleHighlightPins(pinIds) {
  highlightedPinIds.value = pinIds;
}

function handleZoomToPin(pinId) {
  // Determine which chart the pin belongs to and set the zoom state
  // This logic assumes you can distinguish top/bottom pins, e.g., by a prefix or range
  // For now, we'll just try to zoom on both as an example
  console.log(`Zooming to pin: ${pinId}`);
  topPinToZoom.value = pinId;
  botPinToZoom.value = pinId;
}

// Fetch initial chart data when the component mounts
window.electronAPI.onChartData((event, { topData, botData, fails }) => {
  console.log("Received chart data from main process");
  chartDataTop.value = topData;
  chartDataBot.value = botData;
  failedPins.value = fails;
});
</script>

<style>
/* Import the new global stylesheet */
@import './assets/styles.css';

/* Add styles for the new layout */
#app-container {
  display: flex;
  height: 100vh;
}

.main-content {
  flex-grow: 1;
  display: flex;
  gap: 16px;
  padding: 16px;
}

.charts-area {
  flex-grow: 1;
  display: flex;
  flex-direction: column; /* Stack charts vertically */
  gap: 16px;
}

.controls-sidebar {
  width: 320px; /* Adjust width as needed */
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}
</style>