// js/worker.js

self.onmessage = function(e) {
    const { action, rawContent } = e.data;

    if (action === 'PROCESS_JSON') {
        try {
            // 1. Парсинг (Тяжелая операция)
            if (!rawContent.trim()) throw new Error("Файл пуст");
            const data = JSON.parse(rawContent);

            // 2. Валидация
            if (!data || typeof data !== 'object') throw new Error("Не объект");
            if (!data.aggregationUnits || !Array.isArray(data.aggregationUnits)) {
                throw new Error("Нет aggregationUnits");
            }

            // 3. Обработка данных
            let excelData = [];
            let units = data.aggregationUnits;
            
            // Используем for вместо forEach для микро-оптимизации скорости на миллионах строк
            for (let i = 0; i < units.length; i++) {
                const unit = units[i];
                if (unit.unitSerialNumber && Array.isArray(unit.sntins)) {
                    for (let j = 0; j < unit.sntins.length; j++) {
                        // Создаем объект один раз
                        excelData.push({
                            "Unit Serial Number": unit.unitSerialNumber,
                            "SNTIN": unit.sntins[j]
                        });
                    }
                }
            }

            if (excelData.length === 0) throw new Error("Данные не найдены");

            // 4. Расчет эталонной длины
            const standardUnitLen = getModeLength(excelData, "Unit Serial Number");
            const standardSntinLen = getModeLength(excelData, "SNTIN");

            // 5. Поиск ошибок
            const problemData = [];
            for (let i = 0; i < excelData.length; i++) {
                const row = excelData[i];
                const uLen = row["Unit Serial Number"].length;
                const sLen = row["SNTIN"].length;

                if (uLen < standardUnitLen || sLen < standardSntinLen) {
                    // Копируем объект только если это ошибка (экономия памяти)
                    problemData.push({
                        ...row,
                        "Issue": `Unit: ${uLen} (ожид. ${standardUnitLen}), SNTIN: ${sLen} (ожид. ${standardSntinLen})`
                    });
                }
            }

            // Отправляем результат обратно в Main Thread
            self.postMessage({
                success: true,
                data: {
                    excelData,
                    problemData,
                    standardUnitLen,
                    standardSntinLen
                }
            });

        } catch (err) {
            self.postMessage({ success: false, error: err.message });
        }
    }
};

// Вспомогательная функция для worker
function getModeLength(arr, key) {
    if (arr.length === 0) return 0;
    const frequency = {};
    let maxFreq = 0;
    let mode = arr[0][key].length;
    
    // Проход по массиву объектов
    for (let i = 0; i < arr.length; i++) {
        const len = arr[i][key].length;
        // Оптимизация: не преобразуем в String лишний раз, если там уже строка
        frequency[len] = (frequency[len] || 0) + 1;
        if (frequency[len] > maxFreq) {
            maxFreq = frequency[len];
            mode = len;
        }
    }
    return mode;
}