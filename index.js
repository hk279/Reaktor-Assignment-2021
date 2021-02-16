const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.static("build"));

let manufacturers;

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

const initialize = async () => {
    let productData = await getProductData("gloves");
    manufacturers = getManufacturers(productData);
    console.log("Initialized");
};

initialize();

// Call functions in order to get the manufacturer list.

// Get availability data for the given manufacturer
const getOneManufacturerData = (manufacturer) => {
    return new Promise((resolve, reject) => {
        axios.get("https://bad-api-assignment.reaktor.com/v2/availability/" + manufacturer).then((res) => {
            if (res.headers["x-error-modes-active"] === "availability-empty") {
                console.log("Sneaky error detected in query: " + manufacturer);
                reject("Sneaky error");
            } else {
                resolve(res.data.response);
            }
        });
    });
};

// Compile all API-calls for different manufacturers into one
const getAllManufacturersData = async () => {
    let allRequests = [];

    manufacturers.forEach((element) => {
        allRequests.push(getOneManufacturerData(element));
    });

    const promiseAll = Promise.all(allRequests);

    return promiseAll;
};

app.get("/api/products/:category", async (req, res) => {
    const category = req.params.category;
    console.log("Product data request: " + category);
    const data = await getProductData(category);

    res.send(data);
});

app.get("/api/availability/", async (req, res) => {
    console.log("Availability data request");
    console.log(manufacturers);

    getAllManufacturersData()
        .then((data) => res.send(data))
        .catch((err) => {
            console.log(err);
            if (err === "Sneaky error") {
                res.send("Sneaky error");
            } else {
                res.send("Random error");
            }
        });
});

/* const port = process.env.PORT; */
const port = 3001;
app.listen(port, () => {
    console.log(`App listening in localhost:${port}`);
});
