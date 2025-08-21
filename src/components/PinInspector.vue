<template>
  <div class="pin-inspector-container">
    <h4>Pin 点数据查看器</h4>
    <div class="controls">
      <button @click="prevFile" :disabled="fileList.length <= 1"> &lt; 上一个</button>
      <span class="file-info">{{ currentFileIndex + 1 }} / {{ fileList.length }}</span>
      <button @click="nextFile" :disabled="fileList.length <= 1">下一个 &gt;</button>
    </div>
    <div class="file-display">
      <pre>{{ currentFileContent }}</pre>
    </div>
    <div class="search-box">
      <input type="text" v-model="searchPinId" placeholder="输入Pin点编号高亮..." @input="onSearchInput">
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';

const fileList = ref([]);
const currentFileIndex = ref(0);
const currentFileContent = ref('');
const searchPinId = ref('');

const emit = defineEmits(['highlight-pin']);

// IPC通信，从主进程获取数据
async function fetchPinDataFiles() {
  try {
    const result = await window.electron.invoke('get-pin-data');
    if (result && result.length > 0) {
      fileList.value = result;
      await loadCurrentFileContent();
    } else {
      currentFileContent.value = '在 "doc" 文件夹中未找到 .adr 或 .csv 文件。';
    }
  } catch (error) {
    console.error('获取Pin数据失败:', error);
    currentFileContent.value = '错误: 无法加载Pin点数据。';
  }
}

async function loadCurrentFileContent() {
  if (fileList.value.length === 0) return;
  const file = fileList.value[currentFileIndex.value];
  // 假设返回的对象包含fileName和content
  currentFileContent.value = `文件名: ${file.fileName}\n\n${file.content}`;
}

function prevFile() {
  if (currentFileIndex.value > 0) {
    currentFileIndex.value--;
  }
}

function nextFile() {
  if (currentFileIndex.value < fileList.value.length - 1) {
    currentFileIndex.value++;
  }
}

function onSearchInput() {
  emit('highlight-pin', searchPinId.value.trim());
}

// 监听文件索引变化，加载新文件内容
watch(currentFileIndex, loadCurrentFileContent);

// 组件挂载后，获取数据
onMounted(() => {
  fetchPinDataFiles();
});

</script>

<style scoped>
.pin-inspector-container {
  display: flex;
  flex-direction: column;
  padding: 15px;
  border: 1px solid #444;
  border-radius: 8px;
  background-color: #2a2a2a;
  color: #e0e0e0;
  height: 100%;
}

h4 {
  margin-top: 0;
  margin-bottom: 15px;
  text-align: center;
  color: #61dafb;
}

.controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.controls button {
  padding: 5px 10px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.controls button:disabled {
  background-color: #555;
  cursor: not-allowed;
}

.controls button:hover:not(:disabled) {
  background-color: #45a049;
}

.file-info {
  font-weight: bold;
}

.file-display {
  flex-grow: 1;
  background-color: #1e1e1e;
  border: 1px solid #3c3c3c;
  border-radius: 4px;
  padding: 10px;
  overflow-y: auto;
  height: 300px; /* Or adjust as needed */
}

pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
  font-family: 'Courier New', Courier, monospace;
  font-size: 12px;
}

.search-box {
  margin-top: 15px;
}

.search-box input {
  width: 100%;
  padding: 8px;
  background-color: #3c3c3c;
  border: 1px solid #555;
  border-radius: 4px;
  color: #e0e0e0;
  box-sizing: border-box;
}
</style>
