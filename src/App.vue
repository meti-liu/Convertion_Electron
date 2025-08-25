<!-- src/App.vue -->
<template>
  <div id="app-container">
    <!-- Sidebar is removed as loading is now automatic -->
    <div class="sidebar">
      <h1 class="title">Jig Viewer</h1>
      <!-- The "Load Files" button is removed -->
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
        <ControlPanel>
          <PinInspector 
            @highlight-pins="handleHighlightPins"
            @select-pin="handleSelectPin"
            :failedPins="failedPins"
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
  console.log('[App.vue] Component is mounted. Setting up listener for jig-data-loaded.');
  window.electronAPI.onJigDataLoaded((data) => { // Removed unused 'event' parameter
    console.log('[App.vue] Received jig-data-loaded event. Data:', data);
    updateChartData(data);
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
</style>