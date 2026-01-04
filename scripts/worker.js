// js/worker.js

self.onmessage = function(e) {
    const { action, rawContent } = e.data;

    if (action === 'PROCESS_JSON') {
        try {
            // 1. Проверка на пустоту
            if (!rawContent || !rawContent.trim()) {
                throw new Error("Файл пуст");
            }

            // 2. Парсинг JSON
            let data;
            try {
                data = JSON.parse(rawContent);
            } catch (jsonErr) {
                throw new Error("Некорректный JSON (ошибка синтаксиса)");
            }

            // 3. Валидация структуры
            if (!data || typeof data !== 'object') {
                throw new Error("Содержимое файла не является объектом");
            }
            if (!data.hasOwnProperty('aggregationUnits')) {
                throw new Error("В файле не найден список 'aggregationUnits'");
            }
            if (!Array.isArray(data.aggregationUnits)) {
                throw new Error("'aggregationUnits' должен быть массивом");
            }

            // 4. Обработка данных
            let excelData = [];
            let units = data.aggregationUnits;
            
            for (let i = 0; i < units.length; i++) {
                const unit = units[i];
                
                // Пропускаем юниты без серийного номера
                if (!unit.unitSerialNumber) continue;

                // Удаляем пробелы по краям
                const cleanUnitSerial = String(unit.unitSerialNumber).trim();

                // Проверяем вложения
                if (Array.isArray(unit.sntins) && unit.sntins.length > 0) {
                    for (let j = 0; j < unit.sntins.length; j++) {
                        // Очищаем SNTIN от пробелов
                        const rawSntin = String(unit.sntins[j]);
                        const cleanSntin = rawSntin.trim();

                        excelData.push({
                            "Unit Serial Number": cleanUnitSerial,
                            "SNTIN": cleanSntin
                        });
                    }
                } else {
                    // Если вложений нет, добавляем строку с пустым SNTIN
                    excelData.push({
                        "Unit Serial Number": cleanUnitSerial,
                        "SNTIN": ""
                    });
                }
            }

            if (excelData.length === 0) {
                throw new Error("Файл валиден, но данные не найдены");
            }

            // 5. Расчет эталонной длины (Mode)
            const standardUnitLen = getModeLength(excelData, "Unit Serial Number");
            const standardSntinLen = getModeLength(excelData, "SNTIN", true); 

            // Лог в консоль для контроля (F12 -> Console)
            console.log(`[Worker] Unit Len: ${standardUnitLen}, SNTIN Len: ${standardSntinLen}`);

            // 6. Поиск ошибок
            const problemData = [];
            for (let i = 0; i < excelData.length; i++) {
                const row = excelData[i];
                const uLen = row["Unit Serial Number"].length;
                const sLen = row["SNTIN"].length;

                let hasError = false;
                let issueText = [];

                // Проверка Unit Serial Number
                if (uLen < standardUnitLen) {
                    hasError = true;
                    issueText.push(`Unit: ${uLen} (ожид. ${standardUnitLen})`);
                }

                // Проверка SNTIN
                // Считаем ошибкой, если код короче эталона.
                // Если эталон > 0 (значит коды вообще есть в файле), а текущая длина меньше - ошибка.
                if (standardSntinLen > 0 && sLen < standardSntinLen) {
                    hasError = true;
                    issueText.push(`SNTIN: ${sLen} (ожид. ${standardSntinLen})`);
                }

                if (hasError) {
                    problemData.push({
                        ...row,
                        "Issue": issueText.join(", ")
                    });
                }
            }

            // 7. Отправка результата
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
            self.postMessage({ 
                success: false, 
                error: err.message 
            });
        }
    }
};

/**
 * Вычисляет самую частую длину строки.
 * При равенстве выбирает бОльшую длину.
 */
function getModeLength(arr, key, ignoreEmpty = false) {
    if (arr.length === 0) return 0;
    const frequency = {};
    let maxFreq = 0;
    let mode = 0;
    
    // Предварительная установка моды
    for(let k=0; k < arr.length; k++) {
        const val = String(arr[k][key]);
        if(ignoreEmpty && val.length === 0) continue;
        mode = val.length;
        break;
    }

    // Подсчет частот
    for (let i = 0; i < arr.length; i++) {
        const val = String(arr[i][key]);
        const len = val.length;
        
        if (ignoreEmpty && len === 0) continue; 
        
        frequency[len] = (frequency[len] || 0) + 1;
    }

    // Поиск победителя
    for (const lenStr in frequency) {
        const len = Number(lenStr);
        const count = frequency[len];

        if (count > maxFreq) {
            maxFreq = count;
            mode = len;
        } else if (count === maxFreq) {
            // Если частота одинаковая, выбираем более длинный код как эталон
            if (len > mode) {
                mode = len;
            }
        }
    }
    
    return mode;
}