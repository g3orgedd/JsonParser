class DataProcessor {
    constructor() {
        this.excelData = [];
        this.problemData = [];
    }

    getStandardLength(arr) {
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

    processJSON(data) {
        this.excelData = [];
        this.problemData = [];

        // Валидация структуры
        if (!data || typeof data !== 'object') throw new Error("Содержимое файла не является объектом");
        if (!data.hasOwnProperty('aggregationUnits')) throw new Error("В файле не найден список 'aggregationUnits'");
        if (!Array.isArray(data.aggregationUnits)) throw new Error("'aggregationUnits' должен быть массивом");

        let units = data.aggregationUnits;
        let allUnitSerials = [];
        let allSntins = [];

        // Сбор данных
        units.forEach(unit => {
            if(unit.unitSerialNumber && Array.isArray(unit.sntins)) {
                allUnitSerials.push(unit.unitSerialNumber);
                unit.sntins.forEach(sntin => {
                    allSntins.push(sntin);
                    this.excelData.push({
                        "Unit Serial Number": unit.unitSerialNumber,
                        "SNTIN": sntin
                    });
                });
            }
        });

        if (this.excelData.length === 0) throw new Error("Коды (sntins) внутри aggregationUnits не найдены");

        // Анализ ошибок длины
        const standardUnitLen = this.getStandardLength(allUnitSerials);
        const standardSntinLen = this.getStandardLength(allSntins);

        this.excelData.forEach(row => {
            const uLen = String(row["Unit Serial Number"]).length;
            const sLen = String(row["SNTIN"]).length;
            if (uLen < standardUnitLen || sLen < standardSntinLen) {
                this.problemData.push({
                    ...row,
                    "Issue": `Unit: ${uLen} (ожид. ${standardUnitLen}), SNTIN: ${sLen} (ожид. ${standardSntinLen})`
                });
            }
        });

        return {
            excelData: this.excelData,
            problemData: this.problemData,
            standardUnitLen,
            standardSntinLen
        };
    }
}