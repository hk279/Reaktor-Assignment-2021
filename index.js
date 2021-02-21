const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.static("build"));

let manufacturers;
let availabilityData = [];

// Get product data for a given category
const getProductData = (category) => {
    return axios
        .get("https://bad-api-assignment.reaktor.com/v2/products/" + category)
        .then((res) => res.data)
        .catch((err) => console.log(err));
};

// Extract manufacturer names from a dataset
const getManufacturers = (data) => {
    let arr = [];
    data.forEach((element) => {
        if (!arr.includes(element.manufacturer)) {
            arr.push(element.manufacturer);
        }
    });
    return arr;
};

// Initializes the manufacturer list and availability data.
const initialize = async () => {
    /* console.log("Starting initialization\n"); */
    let productData = await getProductData("gloves");
    manufacturers = getManufacturers(productData);
    availabilityData = await getAllManufacturersData();
    console.log(availabilityData.length);
    console.log("\nInitialized\n");
};

initialize();

// Refreshes the availability data from the API every 5 minutes
setInterval(async () => {
    console.log("\nRefreshing availability data");
    availabilityData = await getAllManufacturersData();
    console.log(availabilityData.length);
}, 300000);

// Gets availability data for the given manufacturer
const getOneManufacturerData = (manufacturer) => {
    return axios
        .get("https://bad-api-assignment.reaktor.com/v2/availability/" + manufacturer)
        .then((res) => res.data.response)
        .catch((err) => console.log(err));
};

// Combines all individual manufacturer data requests into a single promise. Handles failed requests.
const getAllManufacturersData = async () => {
    let allRequests = [];
    let data = [];
    let failedRequests = [];

    manufacturers.forEach((element) => {
        allRequests.push(getOneManufacturerData(element));
    });

    const values = await Promise.all(allRequests);
    console.log("\nHandling initial requests:");
    values.forEach((value, index) => {
        value !== "[]" ? console.log("Success") : console.log("Failed");
        if (value !== "[]") {
            data = data.concat(value);
        } else {
            failedRequests.push(getOneManufacturerData(manufacturers[index]));
        }
    });

    // Handles failed requests
    if (failedRequests.length > 0) {
        while (failedRequests.length > 0) {
            console.log("\nHandling failed requests: ");
            const newRequests = await Promise.all(failedRequests);
            failedRequests = [];
            newRequests.forEach((value, index) => {
                value !== "[]" ? console.log("Success") : console.log("Failed");
                if (value !== "[]") {
                    data = data.concat(value);
                    failedRequests.splice(index, 1);
                } else {
                    failedRequests.push(getOneManufacturerData(manufacturers[index]));
                }
            });
        }
    }

    console.log("\nAll requests successful");

    return data;
};

app.get("/api/products/:category", async (req, res) => {
    const category = req.params.category;
    const data = await getProductData(category);
    res.send(data);
});

app.get("/api/availability/", async (req, res) => {
    res.send(availabilityData);
});

const port = process.env.PORT;
app.listen(port, () => {
    console.log(`App listening in port ${port}`);
});
