class TableManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.sourceData = [];   // Исходные данные
        this.filteredData = []; // Данные после поиска
        this.currentPage = 1;
        this.rowsPerPage = 10;
        
        this.previewContainer = document.getElementById("tablePreview");
        this.paginationContainer = document.getElementById("pagination");
        this.errorContainer = document.getElementById("errorTablePreview");
    }

    setDataSource(data) {
        this.sourceData = [...data];
        this.filteredData = [...data];
        this.currentPage = 1;
    }

    // --- Search ---
    filterData(query) {
        const q = query.toLowerCase().trim();
        if (!q) {
            this.filteredData = [...this.sourceData];
        } else {
            this.filteredData = this.sourceData.filter(row =>
                row["Unit Serial Number"].toLowerCase().includes(q) ||
                row["SNTIN"].toLowerCase().includes(q)
            );
        }
        this.currentPage = 1;
        this.renderMainTable();
    }

    // --- Main Table Render ---
    renderMainTable() {
        const totalRows = this.filteredData.length;
        const totalPages = Math.ceil(totalRows / this.rowsPerPage);

        if (this.currentPage < 1) this.currentPage = 1;
        if (this.currentPage > totalPages && totalPages > 0) this.currentPage = totalPages;

        const start = (this.currentPage - 1) * this.rowsPerPage;
        const end = start + this.rowsPerPage;
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
                    <td>${row["Unit Serial Number"]}</td>
                    <td>${row["SNTIN"]}</td>
                </tr>`;
            });
        }
        tableHtml += "</tbody></table>";
        this.previewContainer.innerHTML = tableHtml;

        this.renderPagination(totalPages);
    }

    // --- Pagination ---
    renderPagination(totalPages) {
        if (totalPages <= 1) {
            this.paginationContainer.innerHTML = '';
            return;
        }

        let btns = '';
        // Btn Prev
        btns += `<button class="page-btn" ${this.currentPage === 1 ? 'disabled' : ''} onclick="tableManager.changePage(${this.currentPage - 1})">
            <span class="material-symbols-outlined">chevron_left</span>
        </button>`;

        // Pages Logic
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
                btns += `<button class="page-btn ${p === this.currentPage ? 'active' : ''}" onclick="tableManager.changePage(${p})">${p}</button>`;
            }
        });

        // Btn Next
        btns += `<button class="page-btn" ${this.currentPage === totalPages ? 'disabled' : ''} onclick="tableManager.changePage(${this.currentPage + 1})">
            <span class="material-symbols-outlined">chevron_right</span>
        </button>`;

        btns += `<span class="page-info">Стр. ${this.currentPage} из ${totalPages}</span>`;
        this.paginationContainer.innerHTML = btns;
    }

    changePage(page) {
        this.currentPage = page;
        this.renderMainTable();
    }

    // --- Error Table (Simple Render) ---
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
                <td>${row["Unit Serial Number"]}</td>
                <td>${row["SNTIN"]}</td>
                <td style="color: var(--md-sys-color-error); font-weight:500;">${row.Issue}</td>
            </tr>`;
        });
        
        if(data.length > limit) {
            tableHtml += `<tr><td colspan="3" style="text-align:center; opacity:0.6;">... и еще ${data.length - limit} ошибок ...</td></tr>`;
        }

        tableHtml += "</tbody></table>";
        this.errorContainer.innerHTML = tableHtml;
    }
}