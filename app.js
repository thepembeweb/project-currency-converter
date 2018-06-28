/**
 * @description Loads Initial Content
 */
function loadData() {

    fetch('https://free.currencyconverterapi.com/api/v5/currencies')
        .then(function (response) {
            return response.json();
        })
        .then(function (json) {

            const currencies = json.results;
            const sortedCurrencies = getSortedCurrencies(currencies);

            const inputCurrency = document.getElementById('inputCurrency');
            const outputCurrency = document.getElementById('outputCurrency');

            let currencyOptions = '';

            for (const currency of sortedCurrencies) {
                currencyOptions += `<option value='${currency.id}'>${currency.currencyName}</option>`;
            }

            inputCurrency.innerHTML = currencyOptions;
            outputCurrency.innerHTML = currencyOptions;

            inputCurrency.addEventListener("change", inputCurrencyOnChangeHandler);
            outputCurrency.addEventListener("change", outputCurrencyOnChangeHandler);

            inputCurrency.dispatchEvent(new Event('change'));
            outputCurrency.dispatchEvent(new Event('change'));

        });

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
 * @description Calculates the converted currency from the given inputs  
 */
function calculateCurrency() {
    const inputAmount = document.getElementById('inputAmount').value;
    const inputCurrency = document.getElementById('inputCurrency').value;
    const outputCurrency = document.getElementById('outputCurrency').value;
    const currencyQuery = `${inputCurrency}_${outputCurrency}`;

    document.getElementById('resultCurrency').innerHTML = 'Working...';

    fetch(`https://free.currencyconverterapi.com/api/v5/convert?q=${currencyQuery}&compact=y&callback=?`)
        .then(function (response) {
            return response.text();
        })
        .then(function (responseText) {

            let data = responseText.toString();
            data = data.substr(data.lastIndexOf('('));
            data = data.replace('(', '').replace(')', '').replace(';', '');

            const jsonData = JSON.parse(data);

            try {
                const result = parseFloat(inputAmount) * jsonData[currencyQuery].val;
                document.getElementById('resultCurrency').innerHTML = parseFloat(result.toFixed(4));

            } catch (e) {
                alert("Please enter a number in the Amount field.");
            }
        });

}

/**
 * @description Handles the Input Currency dropdown onchange event to change the Input Currency label
 * @param {event} event
 */
function inputCurrencyOnChangeHandler(event) {
    calculateCurrency();
    document.getElementById('inputCurrencyLabel').innerHTML = event.target.value;
}

/**
 * @description Handles the Output Currency dropdown onchange event to change the Output Currency label
 * @param {event} event
 */
function outputCurrencyOnChangeHandler(event) {
    calculateCurrency();
    document.getElementById('resultCurrencyLabel').innerHTML = event.target.value;
}

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

window.addEventListener("load", function () {
    loadData();
    registerServiceWorker();
});
