<!-- src/App.vue -->
<template>
  <div id="app-container">
    <!-- Original Sidebar for Loading Files -->
    <div class="sidebar">
      <h1 class="title">Jig Viewer</h1>
      <button @click="loadAndProcessFiles" class="load-button">Load Jig Files</button>
      <button @click="loadAndProcessFailLogs" class="load-button">Load Fail Logs</button>
    </div>

    <!-- Main Content Area -->
    <div class="main-content">
      <!-- Jig Charts -->
      <div class="charts-area">
        <JigChart
          :chartData="chartDataTop"
          :highlightedPinIds="highlightedPinIds"
          :selectedPinId="selectedPinId"
          :pinToZoom="topPinToZoom" 
          title="Top Jig (Side A)"
        />
        <JigChart
          :chartData="chartDataBot"
          :highlightedPinIds="highlightedPinIds"
          :selectedPinId="selectedPinId"
          :pinToZoom="botPinToZoom"
          title="Bottom Jig (Side B)"
        />
      </div>

      <!-- New Controls Sidebar -->
      <div class="controls-sidebar">
        <ControlPanel v-if="failedLogs.length > 0">
          <PinInspector 
            @highlight-pins="handleHighlightPins"
            @select-pin="handleSelectPin"
            :logs="failedLogs"
          />
        </ControlPanel>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import JigChart from './components/JigChart_svg.vue';
import ControlPanel from './components/ControlPanel.vue';
import PinInspector from './components/PinInspector.vue';

const chartDataTop = ref({ datasets: [] });
const chartDataBot = ref({ datasets: [] });
const highlightedPinIds = ref([]);
const selectedPinId = ref(null);
const topPinToZoom = ref(null); // Separate zoom state for Top Jig
const botPinToZoom = ref(null); // Separate zoom state for Bottom Jig
const failedLogs = ref([]); // To store structured fail log data
const highlightedPinIds = ref([]);
const selectedPinId = ref(null);

// --- Data Processing Functions ---
function processJigData(result) {
  if (!result || !result.rut_data) return;

  const { rut_data, adr_data } = result;

  // --- Top Jig Chart Data (Side A) ---
  const topRutData = rut_data.filter(data => data.filename.toUpperCase().includes('TOP'));
  const topDatasets = topRutData.map((data, index) => ({
    label: data.filename,
    data: data.coords.map(c => ({ x: c[0], y: c[1] })),
    borderColor: ['#FF5733', '#FFD700', '#00FFFF'][index % 3],
    borderWidth: 2,
    showLine: true,
    fill: false,
    type: 'line',
    pointRadius: 0,
  }));

  if (adr_data?.side_a) {
    topDatasets.push({
      label: 'ADR Pins - Side A',
      data: adr_data.side_a.map(pin => ({ ...pin, id: pin.no })),
      backgroundColor: '#00FF00',
      pointRadius: 1,
      type: 'scatter',
    });
  }
  chartDataTop.value = { datasets: topDatasets };

  // --- Bottom Jig Chart Data (Side B) ---
  const botRutData = rut_data.filter(data => data.filename.toUpperCase().includes('BOT'));
  const botDatasets = botRutData.map((data, index) => ({
    label: data.filename,
    data: data.coords.map(c => ({ x: c[0], y: c[1] })),
    borderColor: ['#FF5733', '#FFD700', '#00FFFF'][index % 3],
    borderWidth: 2,
    showLine: true,
    fill: false,
    type: 'line',
    pointRadius: 0,
  }));

  if (adr_data?.side_b) {
    botDatasets.push({
      label: 'ADR Pins - Side B',
      data: adr_data.side_b.map(pin => ({ ...pin, id: pin.no })),
      backgroundColor: '#00FF00',
      pointRadius: 1,
      type: 'scatter',
    });
  }
  chartDataBot.value = { datasets: botDatasets };
}

function processFailLogs(logs) {
  if (!logs || !logs.length) {
    failedLogs.value = [];
    handleHighlightPins([]); // Clear highlights if no logs
    return;
  }
  failedLogs.value = logs;
  // Initially highlight all failed pins from all logs
  const allFailedPins = logs.reduce((acc, log) => acc.concat(log.failedPins || []), []);
  handleHighlightPins([...new Set(allFailedPins)]);
}

// --- Lifecycle Hooks ---
onMounted(() => {
  // Listen for automatically loaded data from the main process
  window.electronAPI.onJigDataLoaded(processJigData);
  window.electronAPI.onFailLogsLoaded(processFailLogs);
});

function handleHighlightPins(pinIds) {
  highlightedPinIds.value = pinIds;
}

function handleSelectPin(pinId) {
  selectedPinId.value = pinId;
  
  // Reset both zoom states
  topPinToZoom.value = null;
  botPinToZoom.value = null;

  if (pinId) {
    let foundPin = null;
    let foundIn = null; // 'top' or 'bot'

    // Check Top Jig datasets
    for (const dataset of chartDataTop.value.datasets) {
      if (dataset.type === 'scatter') {
        foundPin = dataset.data.find(p => p.id === pinId);
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
          foundPin = dataset.data.find(p => p.id === pinId);
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
  processJigData(result); // Use the refactored function
}

// Manual load for fail logs
async function loadAndProcessFailLogs() {
  const logs = await window.electronAPI.processFailLogs();
  processFailLogs(logs); // Use the refactored function
}

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