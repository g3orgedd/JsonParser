/**
 * js/app.js
 * Главный контроллер приложения.
 * Связывает UI, Worker и менеджеры данных.
 */

// --- 1. ИНИЦИАЛИЗАЦИЯ КЛАССОВ ---
const uiManager = new UIManager();
const tableManager = new TableManager(uiManager);
const exportManager = new ExportManager(uiManager);

// Глобальное хранилище данных (заполняется после обработки Worker'ом)
const appState = {
    excelData: [],
    problemData: []
};

// Инициализация Web Worker
// Убедитесь, что файл worker.js лежит в папке js/
const worker = new Worker('scripts/worker.js');

// --- 2. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

/**
 * Debounce - откладывает выполнение функции.
 * Используется для поиска, чтобы не фильтровать таблицу на каждое нажатие клавиши.
 */
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

/**
 * Валидация файла и отображение имени
 */
function validateAndSetFile(file) {
    if (!file) return;
    
    // Проверка расширения
    if (!file.name.toLowerCase().endsWith('.json')) {
        uiManager.showStatus("Ошибка формата: выберите файл .json", "error");
        fileInput.value = ""; 
        fileNameDisplay.textContent = "";
        fileNameDisplay.style.display = 'none';
        return;
    }

    // Успех
    fileNameDisplay.textContent = file.name;
    fileNameDisplay.style.display = 'block';
    uiManager.showStatus("Файл выбран", "info");
}

// --- 3. ОБРАБОТКА СООБЩЕНИЙ ОТ WORKER ---

worker.onmessage = function(e) {
    const { success, data, error } = e.data;

    if (!success) {
        // Если Worker вернул ошибку (парсинг или логика)
        uiManager.showStatus("Ошибка: " + error, "error");
        return;
    }

    // Если всё прошло успешно
    uiManager.showStatus(`Успешно! Найдено строк: ${data.excelData.length}`, "success");

    // Сохраняем данные в глобальное состояние для экспорта
    appState.excelData = data.excelData;
    appState.problemData = data.problemData;

    // Обновляем UI
    uiManager.showResults(
        data.problemData.length > 0,
        data.problemData.length,
        data.standardUnitLen,
        data.standardSntinLen
    );

    // Рендерим таблицу
    tableManager.setDataSource(data.excelData);
    tableManager.renderMainTable();

    // Если есть ошибки, рендерим таблицу ошибок
    if (data.problemData.length > 0) {
        tableManager.renderErrorTable(data.problemData);
        uiManager.showStatus(`Внимание: Найдено ${data.problemData.length} проблемных кодов`, "error");
    }

    // Включаем кнопки экспорта
    uiManager.enableControls(true);
};

// --- 4. DOM ЭЛЕМЕНТЫ И СОБЫТИЯ ---

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('jsonFile');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const searchInput = document.getElementById("searchInput");

// A. Переключение темы
document.getElementById('themeToggle').addEventListener('click', () => uiManager.toggleTheme());

// B. Drag & Drop логика
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

// C. Поиск (с Debounce 300мс)
const handleSearch = debounce(function(e) {
    tableManager.filterData(e.target.value);
}, 300);

searchInput.addEventListener("input", handleSearch);

// D. Кнопка "Обработать"
document.getElementById('processBtn').onclick = function() {
    uiManager.resetView();

    let file = fileInput.files[0];
    if(!file) return uiManager.showStatus("Сначала выберите JSON-файл", "error");
    
    uiManager.showStatus("Обработка в фоне...", "info");
    
    let reader = new FileReader();
    
    reader.onerror = () => uiManager.showStatus("Ошибка: Не удалось прочитать файл", "error");
    
    reader.onload = function(e) {
        // Отправляем "сырой" текст в Worker.
        // Главный поток не блокируется парсингом JSON.
        worker.postMessage({
            action: 'PROCESS_JSON',
            rawContent: e.target.result
        });
    };
    
    reader.readAsText(file);
};

// E. Кнопки Экспорта
document.getElementById('downloadBtn').onclick = () => {
    exportManager.downloadExcel(appState.excelData, "Full_Report.xlsx", "All Data");
};

document.getElementById('downloadErrorsBtn').onclick = () => {
    exportManager.downloadExcel(appState.problemData, "Errors_Report.xlsx", "Errors");
};

document.getElementById('downloadUsnBtn').onclick = () => {
    const data = appState.excelData;
    if (!data.length) return;
    // Оставляем только уникальные Unit Serial Number
    const uniqueUnits = [...new Set(data.map(item => item["Unit Serial Number"]))];
    exportManager.downloadExcel(uniqueUnits.map(unit => ({ "Unit Serial Number": unit })), "Unit_Serials_Only.xlsx", "Unit Serials");
};

document.getElementById('downloadSntinBtn').onclick = () => {
    const data = appState.excelData;
    if (!data.length) return;
    exportManager.downloadExcel(data.map(item => ({ "SNTIN": item["SNTIN"] })), "SNTINS_Only.xlsx", "SNTINS");
};