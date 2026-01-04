class TableManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.sourceData = [];
        this.filteredData = [];
        this.currentPage = 1;
        
        // Дефолтное значение, будет пересчитано мгновенно
        this.rowsPerPage = 15; 
        // Высота строки в CSS (должна совпадать с tr { height: 48px; })
        this.rowHeight = 50; 
        
        this.previewContainer = document.getElementById("tablePreview");
        this.paginationContainer = document.getElementById("pagination");
        this.errorContainer = document.getElementById("errorTablePreview");

        // --- EVENT DELEGATION (Слушаем пагинацию) ---
        this.paginationContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.page-btn');
            if (!btn || btn.disabled) return;
            const page = Number(btn.dataset.page);
            if (page) this.changePage(page);
        });

        // --- АВТОМАТИЧЕСКИЙ РАСЧЕТ КОЛИЧЕСТВА СТРОК (Ваш старый код) ---
        const handleResize = this.debounce(() => {
            this.calculateRowsPerPage();
        }, 200);

        window.addEventListener('resize', handleResize);
        
        // Первичный расчет через небольшую задержку
        setTimeout(() => this.calculateRowsPerPage(), 100);

        // === НОВЫЙ КОД: Обработка клика по КНОПКЕ копирования ===
        // Создаем общую функцию-обработчик
        const handleCopyClick = (e) => {
            // Ищем ближайшую кнопку копирования
            const btn = e.target.closest('.btn-copy');
            if (!btn) return; // Если кликнули не по кнопке - выходим

            // Находим текст в соседнем элементе .code-text внутри обертки .cell-wrapper
            const wrapper = btn.closest('.cell-wrapper');
            const textSpan = wrapper.querySelector('.code-text');
            
            if (textSpan && textSpan.textContent) {
                this.copyToClipboard(textSpan.textContent, btn);
            }
        };

        // Вешаем слушатель на обе таблицы
        this.previewContainer.addEventListener('click', handleCopyClick);
        this.errorContainer.addEventListener('click', handleCopyClick);
    }

    // Утилита debounce
    debounce(func, wait) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    // === ЛОГИКА КОПИРОВАНИЯ С ВИЗУАЛЬНЫМ ЭФФЕКТОМ ===
    copyToClipboard(text, btnElement) {
        navigator.clipboard.writeText(text).then(() => {
            // 1. Меняем иконку на галочку
            const iconSpan = btnElement.querySelector('.material-symbols-outlined');
            
            // Сохраняем класс, если нужно, но здесь просто меняем текст иконки
            iconSpan.textContent = 'check'; 
            btnElement.classList.add('success'); // Добавляем класс для зеленого цвета (см. CSS)

            // 2. Через 1.5 секунды возвращаем иконку копирования
            setTimeout(() => {
                iconSpan.textContent = 'content_copy';
                btnElement.classList.remove('success');
            }, 1500);

        }).catch(err => {
            console.error('Ошибка копирования:', err);
            this.uiManager.showStatus("Не удалось скопировать", "error");
        });
    }

    calculateRowsPerPage() {
        const wrapper = document.querySelector('.main-table-wrapper');
        if (!wrapper) return;

        // Высота контейнера минус высота заголовка (примерно 50px)
        const availableHeight = wrapper.clientHeight - 50; 
        
        let newRowsCount = Math.floor(availableHeight / this.rowHeight);
        if (newRowsCount < 5) newRowsCount = 5;

        if (this.rowsPerPage !== newRowsCount) {
            this.rowsPerPage = newRowsCount;
            
            const totalRows = this.filteredData.length;
            const totalPages = Math.ceil(totalRows / this.rowsPerPage);
            
            if (this.currentPage > totalPages && totalPages > 0) {
                this.currentPage = totalPages;
            }
            
            if (this.filteredData.length > 0) {
                this.renderMainTable();
            }
        }
    }

    setDataSource(data) {
        this.sourceData = [...data];
        this.filteredData = [...data];
        this.currentPage = 1;
        this.calculateRowsPerPage(); 
        this.renderMainTable();
    }

    escapeHtml(text) {
        if (text === null || text === undefined) return "";
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    filterData(query) {
        const q = query.toLowerCase().trim();
        if (!q) {
            this.filteredData = [...this.sourceData];
        } else {
            this.filteredData = this.sourceData.filter(row =>
                String(row["Unit Serial Number"]).toLowerCase().includes(q) ||
                String(row["SNTIN"]).toLowerCase().includes(q)
            );
        }
        this.currentPage = 1;
        this.renderMainTable();
    }

    // === НОВЫЙ МЕТОД: Генерация HTML ячейки с кнопкой ===
    createCellHtml(content) {
        const safeContent = this.escapeHtml(content);
        // Если контента нет, кнопку не показываем
        if(!safeContent) return '';
        
        return `
            <div class="cell-wrapper">
                <span class="code-text" title="${safeContent}">${safeContent}</span>
                <button class="btn-copy" aria-label="Скопировать">
                    <span class="material-symbols-outlined">content_copy</span>
                </button>
            </div>
        `;
    }

    renderMainTable() {
        const totalRows = this.filteredData.length;
        const rpp = this.rowsPerPage || 10; 
        const totalPages = Math.ceil(totalRows / rpp);

        if (this.currentPage < 1) this.currentPage = 1;
        if (this.currentPage > totalPages && totalPages > 0) this.currentPage = totalPages;

        const start = (this.currentPage - 1) * rpp;
        const end = start + rpp;
        const pageData = this.filteredData.slice(start, end);

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
                    <!-- Используем createCellHtml вместо простого текста -->
                    <td>${this.createCellHtml(row["Unit Serial Number"])}</td>
                    <td>${this.createCellHtml(row["SNTIN"])}</td>
                </tr>`;
            });
            
            // Заполнение пустоты (Ваш старый код)
            const emptyRowsNeeded = rpp - pageData.length;
            if (emptyRowsNeeded > 0 && totalRows > 0) {
                for(let i=0; i < emptyRowsNeeded; i++) {
                    tableHtml += `<tr><td style="border-bottom:none;">&nbsp;</td><td style="border-bottom:none;">&nbsp;</td></tr>`;
                }
            }
        }
        tableHtml += "</tbody></table>";
        this.previewContainer.innerHTML = tableHtml;

        this.renderPagination(totalPages);
    }

    renderPagination(totalPages) {
        if (totalPages <= 1) {
            this.paginationContainer.innerHTML = '';
            return;
        }

        let btns = '';
        
        btns += `<button class="page-btn" ${this.currentPage === 1 ? 'disabled' : ''} data-page="${this.currentPage - 1}">
            <span class="material-symbols-outlined">chevron_left</span>
        </button>`;

        let pagesToShow = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pagesToShow.push(i);
        } else {
            pagesToShow.push(1);
            if (this.currentPage > 3) pagesToShow.push('...');
            let start = Math.max(2, this.currentPage - 1);
            let end = Math.min(totalPages - 1, this.currentPage + 1);
            for (let i = start; i <= end; i++) pagesToShow.push(i);
            if (this.currentPage < totalPages - 2) pagesToShow.push('...');
            pagesToShow.push(totalPages);
        }

        pagesToShow.forEach(p => {
            if (p === '...') {
                btns += `<span class="page-dots">...</span>`;
            } else {
                btns += `<button class="page-btn ${p === this.currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
            }
        });

        btns += `<button class="page-btn" ${this.currentPage === totalPages ? 'disabled' : ''} data-page="${this.currentPage + 1}">
            <span class="material-symbols-outlined">chevron_right</span>
        </button>`;

        btns += `<span class="page-info">Стр. ${this.currentPage} из ${totalPages}</span>`;
        this.paginationContainer.innerHTML = btns;
    }

    changePage(page) {
        this.currentPage = page;
        this.renderMainTable();
    }

    renderErrorTable(data) {
        let tableHtml = `<table>
            <thead><tr>
            <th>Unit Serial Number</th>
            <th>SNTIN</th>
            <th>Проблема</th>
        </tr></thead><tbody>`;
        
        const limit = 500;
        const displayData = data.slice(0, limit);
        
        displayData.forEach(row => {
            tableHtml += `<tr>
                <!-- Используем createCellHtml -->
                <td>${this.createCellHtml(row["Unit Serial Number"])}</td>
                <td>${this.createCellHtml(row["SNTIN"])}</td>
                <td style="color: var(--md-sys-color-error); font-weight:500;">${this.escapeHtml(row.Issue)}</td>
            </tr>`;
        });
        
        if(data.length > limit) {
            tableHtml += `<tr><td colspan="3" style="text-align:center; opacity:0.6;">... и еще ${data.length - limit} ошибок ...</td></tr>`;
        }

        tableHtml += "</tbody></table>";
        this.errorContainer.innerHTML = tableHtml;
    }
}