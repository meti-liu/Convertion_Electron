<!-- app/renderer/src/App.vue -->
<template>
  <div id="app-container">
    <LanguageSwitcher />
    <h1 class="title">{{ t('app_title') }}</h1>
    <!-- Main Content Area -->
    <div class="main-content">
      <!-- Controls are now the first column -->
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

      <!-- Jig Charts are now direct children of main-content, forming the next columns -->
      <JigChart
        :chartData="chartDataTop"
        :highlightedPinIds="highlightedPinIds"
        :selectedPinId="selectedPinId"
        :pinToZoom="topPinToZoom" 
        :title="t('top_jig_side_a')"
      />
      <JigChart
        :chartData="chartDataBot"
        :highlightedPinIds="highlightedPinIds"
        :selectedPinId="selectedPinId"
        :pinToZoom="botPinToZoom"
        :title="t('bottom_jig_side_b')"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import JigChart from '../components/JigChart_svg.vue';
import ControlPanel from '../components/ControlPanel.vue';
import PinInspector from '../components/PinInspector.vue';
import LanguageSwitcher from '../components/LanguageSwitcher.vue';

const { t } = useI18n();
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

  if (window.electronAPI) {
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
  } else {
    console.error('[App.vue] electronAPI is not available on mount.');
  }
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
/* Import the global stylesheet */
@import '../assets/styles.css';

/* Scoped styles for App.vue layout can go here if needed in the future */
</style>