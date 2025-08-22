<!-- src/App.vue -->
<template>
  <div id="app-container">
    <!-- Original Sidebar for Loading Files -->
    <div class="sidebar">
      <h1 class="title">Jig Viewer</h1>
      <button @click="loadAndProcessFiles" class="load-button">Load Files</button>
    </div>

    <!-- Main Content Area -->
    <div class="main-content">
      <!-- Jig Charts -->
      <div class="charts-area">
        <JigChart
          :chartData="chartDataTop"
          :highlightedPinIds="highlightedPinIds"
          :selectedPinGroup="selectedPinGroup"
          :pinToZoom="topPinToZoom" 
          title="Top Jig (Side A)"
        />
        <JigChart
          :chartData="chartDataBot"
          :highlightedPinIds="highlightedPinIds"
          :selectedPinGroup="selectedPinGroup"
          :pinToZoom="botPinToZoom"
          title="Bottom Jig (Side B)"
        />
      </div>

      <!-- New Controls Sidebar -->
      <div class="controls-sidebar">
        <ControlPanel>
          <PinInspector 
            @highlight-pins="handleHighlightPins"
            @select-pin="handleSelectPin"
            :failures="failures"
          />
        </ControlPanel>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import JigChart_svg from './components/JigChart_svg.vue';
import ControlPanel from './components/ControlPanel.vue';
import PinInspector from './components/PinInspector.vue';

const chartDataTop = ref({ datasets: [] });
const chartDataBot = ref({ datasets: [] });
const highlightedPinIds = ref([]);
const selectedPinGroup = ref([]); // To hold the selected pin or pair
const topPinToZoom = ref(null); // Separate zoom state for Top Jig
const botPinToZoom = ref(null); // Separate zoom state for Bottom Jig
const failures = ref([]); // To store failure data (pins and type) from the backend

function handleHighlightPins(pins) {
  if (Array.isArray(pins) && pins.every(p => Array.isArray(p))) {
    // It's an array of arrays (pin pairs or single pins in arrays)
    highlightedPinIds.value = pins.flat();
  } else {
    // It's a flat array of pin IDs (backward compatibility)
    highlightedPinIds.value = pins;
  }
}

function handleSelectPin(pin) { // pin can be a single ID or an array for a pair
  let pinToZoomId = null;

  if (Array.isArray(pin) && pin.length > 0) {
    selectedPinGroup.value = pin;
    pinToZoomId = pin[0];
  } else if (pin && !Array.isArray(pin)) {
    selectedPinGroup.value = [pin];
    pinToZoomId = pin;
  } else {
    selectedPinGroup.value = [];
    pinToZoomId = null;
  }
  
  // Reset both zoom states
  topPinToZoom.value = null;
  botPinToZoom.value = null;

  if (pinToZoomId) {
    let foundPin = null;
    let foundIn = null; // 'top' or 'bot'

    // Check Top Jig datasets
    for (const dataset of chartDataTop.value.datasets) {
      if (dataset.type === 'scatter') {
        foundPin = dataset.data.find(p => p.id === pinToZoomId);
        if (foundPin) {
          foundIn = 'top';
          break;
        }
      }
    }

    // If not found, check Bottom Jig datasets
    if (!foundPin) {
      for (const dataset of chartDataBot.value.datasets) {
        if (dataset.type === 'scatter') {
          foundPin = dataset.data.find(p => p.id === pinToZoomId);
          if (foundPin) {
            foundIn = 'bot';
            break;
          }
        }
      }
    }

    // Set the zoom state for the correct chart
    if (foundIn === 'top') {
      topPinToZoom.value = foundPin;
    } else if (foundIn === 'bot') {
      botPinToZoom.value = foundPin;
    }
  }
}

async function loadAndProcessFiles() {
  const result = await window.electronAPI.processFiles();
  if (result && result.rut_data) {
    const { rut_data, adr_data, failures: backendFailures } = result;

    // Store the failures data
    failures.value = backendFailures || [];

    // --- Data Processing (remains largely the same) ---
    const topRutData = result.rut_data.filter(data =>
        data.filename.toUpperCase().includes('TOP')
    );
    const botRutData = result.rut_data.filter(data =>
        data.filename.toUpperCase().includes('BOT')
    );

    // --- Top Jig Chart Data (Side A) ---
    const topDatasets = topRutData.map((data, index) => ({
      label: data.filename,
      data: data.coords.map(c => ({ x: c[0], y: c[1] })),
      borderColor: ['#FF5733', '#FFD700', '#00FFFF'][index % 3], // Brighter colors
      borderWidth: 2,
      showLine: true,
      fill: false,
      type: 'line',
      pointRadius: 0,
    }));

    if (result.adr_data?.side_a) {
      topDatasets.push({
        label: 'ADR Pins - Side A',
        data: result.adr_data.side_a.map(pin => ({ ...pin, id: pin.no })),
        backgroundColor: '#00FF00', // Changed to bright green
        pointRadius: 1,
        type: 'scatter',
      });
    }
    chartDataTop.value = { datasets: topDatasets };

    // --- Bottom Jig Chart Data (Side B) ---
    const botDatasets = botRutData.map((data, index) => ({
      label: data.filename,
      data: data.coords.map(c => ({ x: c[0], y: c[1] })),
      borderColor: ['#FF5733', '#FFD700', '#00FFFF'][index % 3], // Brighter colors
      borderWidth: 2,
      showLine: true,
      fill: false,
      type: 'line',
      pointRadius: 0,
    }));

    if (result.adr_data?.side_b) {
      botDatasets.push({
        label: 'ADR Pins - Side B',
        data: result.adr_data.side_b.map(pin => ({ ...pin, id: pin.no })),
        backgroundColor: '#00FF00', // Changed to bright green
        pointRadius: 1,
        type: 'scatter',
      });
    }
    chartDataBot.value = { datasets: botDatasets };

    // Automatically highlight all failed pins on load
    const allFailedPins = failures.value.map(failure => failure.pins).flat();
    handleHighlightPins(allFailedPins);
  }
}

const updateSelectedPins = (newSelection) => {
  selectedPins.value = newSelection;
};


onMounted(() => {
  window.electronAPI.onPing((event, message) => {
    console.log(message); // "pong"
  });
  loadAndProcessFiles();
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