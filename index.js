const PORT = 9000;
const axios = require('axios');
const cheerio = require('cheerio');
const express = require('express');
const fs = require('fs');
const {load} = require("cheerio");
const nodeSchedule = require('node-schedule');
const {json} = require("express");
const app = express();

const url = 'https://www.lego.com/en-us/themes/';


let categories

app.get('/themes', (req, res) => {
    res.json(categories)
});

app.get('/themes/:themeName/products', (req, res) => {
    var category = categories.filter(obj => {
        return obj.description.name.toLowerCase() === req.params.themeName.toLowerCase()
    })
    res.json(category)
});

app.get('/', (req, res) => {
    fs.readFile("./data/IntroductionText.txt", 'utf8', (err, t) => {
        res.json(t)
    })
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

function loadEverything() {
    categories = []
    axios(url)
        .then((response) => readThemePage(response.data, categories))
        .then(() => loadAllCategories(categories));
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

nodeSchedule.scheduleJob('0 0 00 * * *', function () {
    loadEverything();
    console.log("Trigger")
})

app.listen(PORT, () => console.log('Server running on port ' + PORT));
loadEverything();
