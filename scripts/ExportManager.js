class ExportManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
    }

    downloadExcel(data, filename, sheetName) {
        if (!data || data.length === 0) return;
        try {
            let ws = XLSX.utils.json_to_sheet(data);
            let wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, sheetName || "Sheet1");
            XLSX.writeFile(wb, filename);
            this.uiManager.showStatus(`${filename} сохранен`, "success");
        } catch (e) {
            this.uiManager.showStatus("Ошибка при сохранении: " + e.message, "error");
        }
    }
}