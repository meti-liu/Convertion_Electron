<!-- src/App.vue -->
<template>
  <div id="app-container">
    <!-- Main Content Area -->
    <div class="main-content">
      <!-- Jig Charts -->
      <div class="charts-area">
        <h1 class="title">Jig & Log Viewer</h1>
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
        <ControlPanel>
          <PinInspector 
            @highlight-pins="handleHighlightPins"
            @select-pin="handleSelectPin"
            :failedPins="failedPins"
            :failData="fail_data" 
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
const failedPins = ref([]); // To store failed pin IDs from the backend
const fail_data = ref([]); // To store data from fail-data-loaded event

// Function to process the data and update charts
function updateChartData(result) {
  console.log('[App.vue] updateChartData called with:', result);
  if (result && result.rut_data) {
    const { rut_data, adr_data } = result;

    // --- Data Processing ---
    const topRutData = rut_data.filter(data =>
        data.filename.toUpperCase().includes('TOP')
    );
    const botRutData = rut_data.filter(data =>
        data.filename.toUpperCase().includes('BOT')
    );

    // --- Top Jig Chart Data (Side A) ---
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
  } else {
    console.error('[App.vue] updateChartData received invalid or empty data.');
  }
}

// Listen for the auto-loaded data when the component mounts
onMounted(() => {
  console.log('[App.vue] Component is mounted. Setting up listeners.');

  // Listen for the auto-loaded jig data
  window.electronAPI.onJigDataLoaded((data) => {
    console.log('[App.vue] Received jig-data-loaded event. Data:', data);
    updateChartData(data);
  });

  // Listen for the auto-loaded failure log data
  window.electronAPI.onFailDataLoaded((data) => {
    console.log('[App.vue] Received fail-data-loaded event. Data:', data);
    fail_data.value = data;
    // Extract all failed pin IDs from all logs
    const allFailedPins = data.flatMap(log => log.failedPins);
    failedPins.value = [...new Set(allFailedPins)]; // Store unique pin IDs
  });
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

// The loadAndProcessFiles function is no longer needed and is removed.

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

.title {
    font-size: 1.5em;
    color: #333;
    padding: 10px;
    text-align: center;
    background-color: #f0f0f0;
    border-bottom: 1px solid #ddd;
}

</style>