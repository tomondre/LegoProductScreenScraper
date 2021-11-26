const PORT = 9000;
const axios = require('axios');
const cheerio = require('cheerio');
const express = require('express');
const fs = require('fs');
const {load} = require("cheerio");

const app = express();
const url = 'https://www.lego.com/en-us/themes/';

app.get('/themes', (req, res) => {
    let categories = [];
    axios(url)
        .then((response) => readThemePage(response.data, categories))
        .then(() => loadAllCategories(categories))
        .then(() => {
            res.statusCode = 200;
            res.json(categories);
        });
});

app.get('/themes/:themeName/products', (req, res) => {
    let products = [];
    loadProducts(url + req.params.themeName, products)
        .then(() => {
            res.json(products);
        })
        .catch((error) => {
            res.status(400);
            res.send("Bad request");
            console.log(error)
        });
});

function readThemePage(data, categories) {
    let C = cheerio.load(data);

    C('article').each(fetchThemeData);

    function fetchThemeData() {
        const logo = C(this).find('img').attr('src');
        const name = C(this).find('h2 > span').text();
        const description = C(this).find('span > span').text()
        const link = "https://www.lego.com" + C(this).find('div > a').attr('href');
        categories.push({
            description: {name, logo, description, link},
            products: []
        });
    }
}

function loadAllCategories(categories, callback) {
    const promises = [];
    for (let i = 0; i < categories.length; i++) {
        promises.push(loadProducts(categories[i].description.link, categories[i].products));
    }
    return Promise.all(promises).then(callback);
}

function loadProducts(url, products) {
    return axios(url).then((inp) => {
        loadItems(inp.data, products)
    });
}

function loadItems(html, products) {
    let C = cheerio.load(html);
    C('div[data-test="product-leaf"]').each(function () {
        const name = C(this).find('h2[data-test="product-leaf-title"] > span').text();
        const price = C(this).find('span[data-test="product-price"]').contents().get(1).data
        const rating = C(this).find('div[data-test="product-leaf-rating"] > div > div').attr("title");
        const link = "https://www.lego.com" + C(this).find('a').attr('href');
        products.push({name, price, rating, link});
    });
}

app.listen(PORT, () => console.log('Server running on port ' + PORT));