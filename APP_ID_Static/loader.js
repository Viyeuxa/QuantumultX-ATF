// loader.js
const mainScriptUrl = "https://raw.githubusercontent.com/Viyeuxa/QuantumultX-ATF/main/APP_ID_Static/Auto_join_TF.js";

// Function to fetch the script from GitHub and execute it
function loadAndExecute(url) {
    const http = new XMLHttpRequest();
    http.open("GET", url, false);
    http.send(null);
    if (http.status === 200) {
        eval(http.responseText);
    } else {
        console.log(`Failed to load script: ${http.status}`);
    }
}

// Load and execute the main script
loadAndExecute(mainScriptUrl);