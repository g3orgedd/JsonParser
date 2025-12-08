let excelData = [];
let problemData = [];
let filteredData = []; // Данные после поиска, которые сейчас отображаются

// Параметры пагинации
let currentPage = 1;
const rowsPerPage = 10;

// --- THEME LOGIC ---
const themeToggleBtn = document.getElementById('themeToggle');
const themeIcon = themeToggleBtn.querySelector('span');

function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
    document.documentElement.setAttribute('data-theme', 'dark');
    themeIcon.textContent = 'light_mode';
  } else {
    document.documentElement.removeAttribute('data-theme');
    themeIcon.textContent = 'dark_mode';
  }
}

themeToggleBtn.addEventListener('click', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  if (newTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    themeIcon.textContent = 'light_mode';
  } else {
    document.documentElement.removeAttribute('data-theme');
    themeIcon.textContent = 'dark_mode';
  }
  
  localStorage.setItem('theme', newTheme);
});

initTheme();

// --- NOTIFICATIONS ---
function showStatus(msg, type="info") {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let iconName = 'info';
  if (type === 'success') iconName = 'check_circle';
  if (type === 'error') iconName = 'error';

  toast.innerHTML = `
    <span class="material-symbols-outlined">${iconName}</span>
    <span>${msg}</span>
    <button class="toast-btn-close" onclick="closeToast(this)">
      <span class="material-symbols-outlined" style="font-size: 18px;">close</span>
    </button>
  `;

  container.appendChild(toast);

  if (type !== 'error') {
    setTimeout(() => {
      if(toast && toast.parentElement) closeToast(toast.querySelector('.toast-btn-close'));
    }, 5000);
  }
}

window.closeToast = function(btn) {
  const toast = btn.closest('.toast');
  toast.classList.add('hide');
  setTimeout(() => { if(toast.parentElement) toast.remove(); }, 300);
};

// --- HELPERS ---
function getStandardLength(arr) {
  if (arr.length === 0) return 0;
  const frequency = {};
  let maxFreq = 0;
  let mode = arr[0].length;
  arr.forEach(str => {
    const len = String(str).length;
    frequency[len] = (frequency[len] || 0) + 1;
    if (frequency[len] > maxFreq) { maxFreq = frequency[len]; mode = len; }
  });
  return mode;
}

function enableControls(enable) {
  const container = document.getElementById('actionsContainer');
  const buttons = container.querySelectorAll('button');
  
  if (enable) {
    container.classList.remove('disabled');
    buttons.forEach(btn => btn.disabled = false);
  } else {
    container.classList.add('disabled');
    buttons.forEach(btn => btn.disabled = true);
  }
}

// --- DRAG & DROP & VALIDATION ---
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('jsonFile');
const fileNameDisplay = document.getElementById('fileNameDisplay');

// Функция проверки расширения
function validateAndSetFile(file) {
  if (!file) return;

  // Проверка: заканчивается ли имя на .json
  if (!file.name.toLowerCase().endsWith('.json')) {
    showStatus("Ошибка формата: выберите файл .json", "error");
    // Сброс инпута
    fileInput.value = ""; 
    fileNameDisplay.textContent = "";
    fileNameDisplay.style.display = 'none';
    return;
  }

  // Если всё ок
  fileNameDisplay.textContent = file.name;
  fileNameDisplay.style.display = 'block';
  showStatus("Файл выбран", "info");
}

// 1. Сброс стандартного поведения
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  dropZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
  }, false);
});

// 2. Визуальные эффекты
['dragenter', 'dragover'].forEach(() => dropZone.classList.add('dragover'));
['dragleave', 'drop'].forEach(() => dropZone.classList.remove('dragover'));

// 3. Обработка DROP
dropZone.addEventListener('drop', (e) => {
  const dt = e.dataTransfer;
  const files = dt.files;

  if (files && files.length > 0) {
    fileInput.files = files; // Присваиваем файл инпуту
    validateAndSetFile(files[0]); // Проверяем
  }
});

// 4. Обработка клика по инпуту
fileInput.addEventListener('change', function() {
  if (this.files && this.files[0]) {
    validateAndSetFile(this.files[0]);
  }
});

// --- PROCESS ---
document.getElementById('processBtn').onclick = function() {
  // 1. Сброс интерфейса перед новой обработкой
  excelData = [];
  problemData = [];
  filteredData = [];
  currentPage = 1;
  
  document.getElementById("tablePreview").innerHTML = "";
  document.getElementById("errorTablePreview").innerHTML = "";
  document.getElementById("resultsContainer").style.display = "none";
  document.getElementById("emptyState").style.display = "flex";
  document.getElementById("errorContainer").style.display = "none";
  enableControls(false);

  // 2. Получение файла
  let file = fileInput.files[0];
  if(!file) return showStatus("Сначала выберите JSON-файл", "error");

  // 3. Запуск чтения
  showStatus("Чтение файла...", "info");
  
  let reader = new FileReader();

  // Обработка системных ошибок чтения (например, файл заблокирован)
  reader.onerror = function() {
    showStatus("Ошибка: Не удалось прочитать файл", "error");
  };

  reader.onload = function(e) {
    let rawContent = e.target.result;
    let data;

    // --- ЭТАП 1: Проверка валидности JSON (Синтаксис) ---
    try {
      if (!rawContent.trim()) {
        throw new Error("Файл пуст");
      }
      data = JSON.parse(rawContent);
    } catch(err) {
      console.error("JSON Error:", err);
      // Если файл обрывается или содержит ошибки синтаксиса
      showStatus("Ошибка: Файл поврежден или содержит некорректный JSON (проверьте скобки/запятые)", "error");
      return;
    }

    // --- ЭТАП 2: Проверка структуры (Наличие нужных полей) ---
    // В вашем примере файл начинается с participant_inn, а нам нужны aggregationUnits
    if (!data || typeof data !== 'object') {
       showStatus("Ошибка: Содержимое файла не является объектом", "error");
       return;
    }

    // Если нет ключа aggregationUnits
    if (!data.hasOwnProperty('aggregationUnits')) {
       showStatus("Ошибка структуры: В файле не найден список 'aggregationUnits'", "error");
       // Можно добавить вывод в консоль для отладки, какие ключи есть
       console.log("Найденные ключи:", Object.keys(data));
       return;
    }

    // Если ключ есть, но это не массив
    if (!Array.isArray(data.aggregationUnits)) {
       showStatus("Ошибка структуры: 'aggregationUnits' должен быть массивом", "error");
       return;
    }
      
    // --- ЭТАП 3: Парсинг данных ---
    try {
      let units = data.aggregationUnits;
      
      let allUnitSerials = [];
      let allSntins = [];

      units.forEach(unit => {
        // Проверяем наличие вложенных данных
        if(unit.unitSerialNumber && Array.isArray(unit.sntins)) {
          allUnitSerials.push(unit.unitSerialNumber);
          unit.sntins.forEach(sntin => {
            allSntins.push(sntin);
            excelData.push({
              "Unit Serial Number": unit.unitSerialNumber,
              "SNTIN": sntin
            });
          });
        }
      });

      if (excelData.length === 0) {
        showStatus("Структура верна, но коды (sntins) внутри не найдены", "error");
        return;
      }

      // --- ЭТАП 4: Поиск ошибок длины ---
      const standardUnitLen = getStandardLength(allUnitSerials);
      const standardSntinLen = getStandardLength(allSntins);

      excelData.forEach(row => {
        const uLen = String(row["Unit Serial Number"]).length;
        const sLen = String(row["SNTIN"]).length;
        if (uLen < standardUnitLen || sLen < standardSntinLen) {
          problemData.push({
            ...row,
            "Issue": `Unit: ${uLen} (ожид. ${standardUnitLen}), SNTIN: ${sLen} (ожид. ${standardSntinLen})`
          });
        }
      });

      // --- ЭТАП 5: Отрисовка ---
      filteredData = [...excelData]; // Сохраняем копию для поиска

      showStatus(`Успешно! Найдено строк: ${excelData.length}`, "success");
      
      document.getElementById("emptyState").style.display = "none";
      document.getElementById("resultsContainer").style.display = "block";
      
      renderTable(); // Вызов функции отрисовки с пагинацией
      enableControls(true);

      if (problemData.length > 0) {
        showStatus(`Внимание: Найдено ${problemData.length} проблемных кодов`, "error");
        document.getElementById("errorContainer").style.display = "block";
        document.getElementById("errorCount").textContent = problemData.length;
        document.getElementById("expectedSntinLen").textContent = standardSntinLen;
        document.getElementById("expectedUnitLen").textContent = standardUnitLen;
        displaySimpleTable(problemData, "errorTablePreview");
      }

    } catch(err) {
      showStatus("Критическая ошибка при обработке данных: " + err.message, "error");
      console.error(err);
    }
  };
  
  // Запуск чтения файла
  reader.readAsText(file);
};

// --- PAGINATION & TABLE RENDER LOGIC ---

// Функция для отрисовки основной таблицы с учетом текущей страницы
function renderTable() {
  const container = document.getElementById("tablePreview");
  const totalRows = filteredData.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);

  // Валидация текущей страницы
  if (currentPage < 1) currentPage = 1;
  if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;

  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const pageData = filteredData.slice(start, end);

  let tableHtml = `<table>
    <thead><tr>
      <th>Unit Serial Number</th>
      <th>SNTIN</th>
    </tr></thead><tbody>`;

  if (pageData.length === 0) {
    tableHtml += `<tr><td colspan="2" style="text-align:center; padding: 20px;">Ничего не найдено</td></tr>`;
  } else {
    pageData.forEach(row => {
      tableHtml += `<tr>
        <td>${row["Unit Serial Number"]}</td>
        <td>${row["SNTIN"]}</td>
      </tr>`;
    });
  }

  tableHtml += "</tbody></table>";
  container.innerHTML = tableHtml;

  renderPagination(totalPages);
}

// Простая таблица для ошибок (без пагинации, скролл)
function displaySimpleTable(data, elementId) {
  let tableHtml = `<table>
    <thead><tr>
    <th>Unit Serial Number</th>
    <th>SNTIN</th>
    <th>Проблема</th>
  </tr></thead><tbody>`;
  
  // Ограничим рендер ошибок, чтобы не зависал браузер, если их тысячи
  const limit = 500;
  const displayData = data.slice(0, limit);
  
  displayData.forEach(row => {
    tableHtml += `<tr>
      <td>${row["Unit Serial Number"]}</td>
      <td>${row["SNTIN"]}</td>
      <td style="color: var(--md-sys-color-error); font-weight:500;">${row.Issue}</td>
    </tr>`;
  });
  
  if(data.length > limit) {
    tableHtml += `<tr><td colspan="3" style="text-align:center; opacity:0.6;">... и еще ${data.length - limit} ошибок ...</td></tr>`;
  }

  tableHtml += "</tbody></table>";
  document.getElementById(elementId).innerHTML = tableHtml;
}

// Генерация кнопок пагинации
function renderPagination(totalPages) {
  const paginationContainer = document.getElementById("pagination");
  if (totalPages <= 1) {
    paginationContainer.innerHTML = '';
    return;
  }

  let btns = '';

  // Кнопка Назад
  btns += `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">
    <span class="material-symbols-outlined">chevron_left</span>
  </button>`;

  // Логика отображения номеров страниц (сокращенная)
  // Показываем: 1, ... , cur-1, cur, cur+1, ... , last
  let pagesToShow = [];
  
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pagesToShow.push(i);
  } else {
    pagesToShow.push(1);
    if (currentPage > 3) pagesToShow.push('...');
    
    let start = Math.max(2, currentPage - 1);
    let end = Math.min(totalPages - 1, currentPage + 1);
    
    for (let i = start; i <= end; i++) pagesToShow.push(i);
    
    if (currentPage < totalPages - 2) pagesToShow.push('...');
    pagesToShow.push(totalPages);
  }

  pagesToShow.forEach(p => {
    if (p === '...') {
      btns += `<span class="page-dots">...</span>`;
    } else {
      btns += `<button class="page-btn ${p === currentPage ? 'active' : ''}" onclick="changePage(${p})">${p}</button>`;
    }
  });

  // Кнопка Вперед
  btns += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">
    <span class="material-symbols-outlined">chevron_right</span>
  </button>`;

  // Инфо о страницах
  btns += `<span class="page-info">Стр. ${currentPage} из ${totalPages}</span>`;

  paginationContainer.innerHTML = btns;
}

// Глобальная функция смены страницы
window.changePage = function(newPage) {
  currentPage = newPage;
  renderTable();
};

// --- SEARCH ---
document.getElementById("searchInput").addEventListener("input", function() {
  let q = this.value.trim().toLowerCase();
  
  if (!q) {
    filteredData = [...excelData];
  } else {
    filteredData = excelData.filter(row =>
      row["Unit Serial Number"].toLowerCase().includes(q) ||
      row["SNTIN"].toLowerCase().includes(q)
    );
  }
  
  // При поиске сбрасываем на 1 страницу
  currentPage = 1;
  renderTable();
});

// --- EXPORT ---
function downloadExcel(data, filename, sheetName) {
  let ws = XLSX.utils.json_to_sheet(data);
  let wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName || "Sheet1");
  XLSX.writeFile(wb, filename);
  showStatus(`${filename} сохранен`, "success");
}

document.getElementById('downloadBtn').onclick = () => excelData.length && downloadExcel(excelData, "Full_Report.xlsx", "All Data");
document.getElementById('downloadErrorsBtn').onclick = () => problemData.length && downloadExcel(problemData, "Errors_Report.xlsx", "Errors");
document.getElementById('downloadUsnBtn').onclick = () => {
  if (!excelData.length) return;
  const uniqueUnits = [...new Set(excelData.map(item => item["Unit Serial Number"]))];
  downloadExcel(uniqueUnits.map(unit => ({ "Unit Serial Number": unit })), "Unit_Serials_Only.xlsx", "Unit Serials");
};
document.getElementById('downloadSntinBtn').onclick = () => {
  if (!excelData.length) return;
  downloadExcel(excelData.map(item => ({ "SNTIN": item["SNTIN"] })), "SNTINS_Only.xlsx", "SNTINS");
};