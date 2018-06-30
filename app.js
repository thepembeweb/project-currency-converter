//Initialize constants
const DB_NAME = 'currencies';
const DB_VERSION = 1;
let CURRENCY_STORE_NAME = 'currencyStore';
let CONVERSION_RATE_STORE_NAME = 'conversionRateStore';

//Initialize window load event
window.addEventListener("load", function () {
    initDatabase();
    loadData();
    registerServiceWorker();
});

/**
 * @description Loads Initial Content
 */
function initDatabase() {
    //Initialize database
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = function() { 
        request.result.createObjectStore(CURRENCY_STORE_NAME, { keyPath: "id" });
        request.result.createObjectStore(CONVERSION_RATE_STORE_NAME, { keyPath: "id" });
    };    
}

/**
 * @description Loads Initial Content
 */
function loadData() {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = function() {
        loadDataFromApi();
    };
    request.onsuccess = function () {
        db = request.result;

        const transaction = db.transaction(CURRENCY_STORE_NAME, 'readonly');
        const currencyStore = transaction.objectStore(CURRENCY_STORE_NAME);

        var countRequest = currencyStore.count();
        countRequest.onsuccess = function () {
            if (countRequest.result > 0) {
                loadDataFromDatabase();
            } else {
                loadDataFromApi();
            }
        }
    };
}

/**
 * @description Fetches currencies stored in the local database
 */
function loadDataFromDatabase() {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = function () {
        db = request.result;

        const transaction = db.transaction(CURRENCY_STORE_NAME, 'readonly');
        const currencyStore = transaction.objectStore(CURRENCY_STORE_NAME);

        let currencies = [];

        if ('getAll' in currencyStore) {
            currencyStore.getAll().onsuccess = function (event) {
                currencies = event.target.result;
                if (currencies.length > 0) {
                    loadUIData(currencies);
                }
            };
        } else {
            // Fallback to the traditional cursor approach if getAll isn't supported.
            currencyStore.openCursor().onsuccess = function (event) {
                const cursor = event.target.result;
                if (cursor) {
                    currencies.push(cursor.value);
                    cursor.continue();
                }

                if (currencies.length > 0) {
                    loadUIData(currencies);
                }
            };
        }
    };
}

/**
 * @description Loads currency data from the api
 */
function loadDataFromApi() {
    fetch('https://free.currencyconverterapi.com/api/v5/currencies')
        .then(function (response) {
            return response.json();
        })
        .then(function (json) {

            const currencies = json.results;
            const sortedCurrencies = getSortedCurrencies(currencies);

            if (sortedCurrencies !== null && sortedCurrencies.length > 0) {
                populateDatabaseFromApi(sortedCurrencies);
                loadUIData(sortedCurrencies);
            }
        });
}

/**
 * @description Populates currency data into the local Database from the Api data
 * @param {array} currencies
 */
function populateDatabaseFromApi(currencies) {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = function () {
        db = request.result;

        const transaction = db.transaction(CURRENCY_STORE_NAME, 'readwrite');
        const currencyStore = transaction.objectStore(CURRENCY_STORE_NAME);

        for (const currency of currencies) {
            currencyStore.put({
                id: currency.id,
                currencyName: currency.currencyName
            });
        }
    };
}

/**
 * @description Populates currency data into the local Database from the Api data
 * @param {array} currencies
 */
function populateDatabaseFromApi(currencies) {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = function () {
        db = request.result;

        const transaction = db.transaction(CURRENCY_STORE_NAME, 'readwrite');
        const currencyStore = transaction.objectStore(CURRENCY_STORE_NAME);

        for (const currency of currencies) {
            currencyStore.put({
                id: currency.id,
                currencyName: currency.currencyName
            });
        }
    };
}

/**
 * @description Populates UI with currency data
 * @param {array} currencies
 */
function loadUIData(currencies) {

    let currencyOptions = '';

    const inputCurrency = document.getElementById('inputCurrency');
    const outputCurrency = document.getElementById('outputCurrency');

    for (const currency of currencies) {
        currencyOptions += `<option value='${currency.id}'>${currency.currencyName}</option>`;
    }

    inputCurrency.innerHTML = currencyOptions;
    outputCurrency.innerHTML = currencyOptions;

    inputCurrency.addEventListener("change", inputCurrencyOnChangeHandler);
    outputCurrency.addEventListener("change", outputCurrencyOnChangeHandler);

    inputCurrency.dispatchEvent(new Event('change'));
    outputCurrency.dispatchEvent(new Event('change'));
}

/**
 * @description Saves the supplied conversion rate data
 * @param {string} conversionPair
 * @param {number} rate
 */
function saveConversionRate(conversionPair, rate) {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = function () {
        db = request.result;

        const transaction = db.transaction(CONVERSION_RATE_STORE_NAME, 'readwrite');
        const conversionRateStore = transaction.objectStore(CONVERSION_RATE_STORE_NAME);

        conversionRateStore.put({
            id: conversionPair,
            rate: rate
        });
    };    
}

/**
 * @description Calculates the converted currency
 */
function calculateCurrencyConversion() {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = function() {
        calculateConversionFromApi();
    };
    request.onsuccess = function () {
        db = request.result;
       
       const conversionPair = getConversionPair();
       const transaction = db.transaction(CONVERSION_RATE_STORE_NAME, 'readwrite');
       const conversionRateStore = transaction.objectStore(CONVERSION_RATE_STORE_NAME);
       const query = conversionRateStore.get(conversionPair);
       query.onerror = function() {
           calculateConversionFromApi();
       };
       query.onsuccess = function() {
           var matching = query.result;
           if (matching !== undefined) {
               calculateConversion(query.result.rate);
           } else {
               calculateConversionFromApi();
           }
       };
    };
}

/**
 * @description Calculates the converted currency from the Api  
 */
function calculateConversionFromApi() {
    const conversionPair = getConversionPair();
    document.getElementById('resultCurrency').innerHTML = 'Working...';

    fetch(`https://free.currencyconverterapi.com/api/v5/convert?q=${conversionPair}&compact=y&callback=?`)
        .then(function (response) {
            return response.text();
        })
        .then(function (responseText) {

            let data = responseText.toString();
            data = data.substr(data.lastIndexOf('('));
            data = data.replace('(', '').replace(')', '').replace(';', '');

            const jsonData = JSON.parse(data);
            const rate = jsonData[conversionPair].val;

            saveConversionRate(conversionPair, rate);
            calculateConversion(rate);
        });
}

/**
 * @description Calculates conversion based on the supplied rate data
 * @param {number} rate
 */
function calculateConversion(rate) {
    const inputAmount = document.getElementById('inputAmount').value;
    const result = parseFloat(inputAmount) * rate;
    document.getElementById('resultCurrency').innerHTML = parseFloat(result.toFixed(4));
}

/**
 * @description Gets current conversion pair
 */
function getConversionPair() {
    const inputCurrency = document.getElementById('inputCurrency').value;
    const outputCurrency = document.getElementById('outputCurrency').value;
    return `${inputCurrency}_${outputCurrency}`;
}

/**
 * @description Returns sorted currencies array
 * @param {array} currencies
 */
function getSortedCurrencies(currencies) {
    let currencyList = [];
    for (const currency in currencies) {
        currencyList.push({
            id: currencies[currency].id,
            currencyName: currencies[currency].currencyName
        });
    }

    const sortedCurrencyList = currencyList.sort(function (first, second) {
        const a = first.currencyName;
        const b = second.currencyName;

        if (a > b) {
            return 1;
        } else if (a < b) {
            return -1;
        } else {
            return 0;
        }
    });

    return sortedCurrencyList;
}

/**
 * @description Registers the Service Worker
 */
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').then(function (registration) {
            // Registration was successful
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
        }, function (err) {
            // registration failed :(
            console.log('ServiceWorker registration failed: ', err);
        });
    }
}

/**
 * @description Handles the Input Currency dropdown onchange event to change the Input Currency label
 * @param {event} event
 */
function inputCurrencyOnChangeHandler(event) {
    calculateCurrencyConversion();
    document.getElementById('inputCurrencyLabel').innerHTML = event.target.value;
}

/**
 * @description Handles the Output Currency dropdown onchange event to change the Output Currency label
 * @param {event} event
 */
function outputCurrencyOnChangeHandler(event) {
    calculateCurrencyConversion();
    document.getElementById('resultCurrencyLabel').innerHTML = event.target.value;
}
