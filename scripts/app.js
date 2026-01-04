// --- 1. ИНИЦИАЛИЗАЦИЯ ---
const uiManager = new UIManager();
const tableManager = new TableManager(uiManager); // Передаем uiManager для доступа к тостам если нужно
const exportManager = new ExportManager(uiManager);

const appState = {
    excelData: [],
    problemData: []
};

// Инициализация Web Worker
// const worker = new Worker('scripts/worker.js');
const worker = new Worker(`scripts/worker.js?v=${Date.now()}`); 

// --- 2. HELPERS ---
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

const fileNameDisplay = document.getElementById('fileNameDisplay');
const fileInput = document.getElementById('jsonFile');

function validateAndSetFile(file) {
    if (!file) return;
    
    if (!file.name.toLowerCase().endsWith('.json')) {
        uiManager.showStatus("Ошибка формата: выберите файл .json", "error");
        fileInput.value = ""; 
        fileNameDisplay.style.display = 'none';
        return;
    }

    const textSpan = fileNameDisplay.querySelector('.text-content');
    if (textSpan) {
        textSpan.textContent = file.name;
    } else {
        fileNameDisplay.textContent = file.name;
    }
    
    fileNameDisplay.style.display = 'flex';
    uiManager.showStatus("Файл выбран", "info");
}

// --- 3. WORKER LISTENER ---
worker.onmessage = function(e) {
    const { success, data, error } = e.data;

    if (!success) {
        uiManager.showStatus("Ошибка: " + error, "error");
        return;
    }

    uiManager.showStatus(`Успешно! Найдено строк: ${data.excelData.length}`, "success");

    appState.excelData = data.excelData;
    appState.problemData = data.problemData;

    uiManager.showResults(
        data.problemData.length > 0,
        data.problemData.length,
        data.standardUnitLen,
        data.standardSntinLen
    );

    tableManager.setDataSource(data.excelData);
    tableManager.renderMainTable();

    if (data.problemData.length > 0) {
        tableManager.renderErrorTable(data.problemData);
        uiManager.showStatus(`Внимание: Найдено ${data.problemData.length} проблемных кодов`, "error");
    }

    uiManager.enableControls(true);
};

// --- 4. DOM EVENTS (addEventListener вместо onclick) ---

const dropZone = document.getElementById('dropZone');
const searchInput = document.getElementById("searchInput");

// Theme
document.getElementById('themeToggle').addEventListener('click', () => uiManager.toggleTheme());

// Drag & Drop
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => { e.preventDefault(); e.stopPropagation(); }, false);
});
['dragenter', 'dragover'].forEach(() => dropZone.classList.add('dragover'));
['dragleave', 'drop'].forEach(() => dropZone.classList.remove('dragover'));

dropZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
        fileInput.files = files;
        validateAndSetFile(files[0]);
    }
});

fileInput.addEventListener('change', function() {
    if (this.files && this.files[0]) validateAndSetFile(this.files[0]);
});

// Search
const handleSearch = debounce(function(e) {
    tableManager.filterData(e.target.value);
}, 300);
searchInput.addEventListener("input", handleSearch);

// Process Button
document.getElementById('processBtn').addEventListener('click', function() {
    uiManager.resetView();

    let file = fileInput.files[0];
    if(!file) return uiManager.showStatus("Сначала выберите JSON-файл", "error");
    
    uiManager.showStatus("Обработка в фоне...", "info");
    
    let reader = new FileReader();
    reader.onerror = () => uiManager.showStatus("Ошибка: Не удалось прочитать файл", "error");
    
    reader.onload = function(e) {
        worker.postMessage({
            action: 'PROCESS_JSON',
            rawContent: e.target.result
        });
    };
    reader.readAsText(file);
});

// Export Buttons
document.getElementById('downloadBtn').addEventListener('click', () => {
    exportManager.downloadExcel(appState.excelData, "Full_Report.xlsx", "All Data");
});

document.getElementById('downloadErrorsBtn').addEventListener('click', () => {
    exportManager.downloadExcel(appState.problemData, "Errors_Report.xlsx", "Errors");
});

document.getElementById('downloadUsnBtn').addEventListener('click', () => {
    const data = appState.excelData;
    if (!data.length) return;
    const uniqueUnits = [...new Set(data.map(item => item["Unit Serial Number"]))];
    exportManager.downloadExcel(uniqueUnits.map(unit => ({ "Unit Serial Number": unit })), "Unit_Serials_Only.xlsx", "Unit Serials");
});

document.getElementById('downloadSntinBtn').addEventListener('click', () => {
    const data = appState.excelData;
    if (!data.length) return;
    exportManager.downloadExcel(data.map(item => ({ "SNTIN": item["SNTIN"] })), "SNTINS_Only.xlsx", "SNTINS");
});