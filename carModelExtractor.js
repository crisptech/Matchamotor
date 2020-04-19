const baseUrl = 'https://www.autotrader.co.uk/car-search?sort=price-asc&postcode=b261lt&radius=1500';
const osmosis = require('osmosis');
var log = require('single-line-log').stdout;
const { runExtractor } = require('./carDetailExtrator');

var cars = {};

const setCarMakes = () => {
    return new Promise((res, rej) => {
        osmosis
            .get(baseUrl)
            .find('body > main > section.search-page__left > div.search-form > form > ul > li:nth-child(3) > div > div > div > div > button')
            .set({
                carName: 'span'
            })
            .data(data => {
                cars = {
                    ...cars,
                    [data.carName]: {}
                };
            })
            .done(d => {
                res(cars);
            });
    });
}

const setCarModels = (carMake) => {
    let url = baseUrl + `&make=${carMake}`;
    return new Promise((res, rej) => {
        osmosis
            .get(url)
            .find('body > main > section.search-page__left > div.search-form > form > ul > li:nth-child(4) > div > div > div > div > button')
            .set({
                modelName: 'span'
            })
            .data(data => {
                cars = {
                    ...cars,
                    [carMake]: {
                        ...cars[carMake],
                        [data.modelName]: {

                        }
                    }
                };
            })
            .done(d => {
                res(cars);
            });
    });
};

const setCarVariants = (carMake, carModel) => {
    let url = baseUrl + `&make=${carMake.replace(/\s+/g, "%20").toUpperCase()}&model=${carModel.replace(/\s+/g, "%20").toUpperCase()}`;
    return new Promise((res, rej) => {
        osmosis
            .get(url)
            .find('body > main > section.search-page__left > div.search-form > form > ul > li:nth-child(5) > div > div > div > div > button')
            .set({
                variantName: 'span'
            })
            .data(data => {
                cars = {
                    ...cars,
                    [carMake]: {
                        ...cars[carMake],
                        [carModel]: {
                            ...cars[carMake][carModel],
                            [data.variantName]: {
                                make: carMake,
                                model: carModel,
                                variant: data.variantName,
                            }
                        }
                    }
                }
            })
            .done(d => {
                res(cars);
            })
            .error((e) => {
                cars = {
                    ...cars,
                    [carMake]: {
                        ...cars[carMake],
                        [carModel]: {
                            ...cars[carMake][carModel],
                            make: carMake,
                            model: carModel,
                            variant: 'N/A'
                        }
                    }
                }
            });
    });
};

let categoryInclusions = ['Year'];
let carOptions = {};

const setCarAvailableYears = (carMake, carModel, carVariant) => {
    let baseUrl = '';
    if (carVariant != 'N/A') {
        baseUrl = `https://www.autotrader.co.uk/car-search?sort=price-asc&postcode=b261lt&radius=1500&make=${carMake.replace(/\s+/g, "%20").toUpperCase()}&model=${carModel.replace(/\s+/g, "%20").toUpperCase()}&aggregatedTrim=${carVariant.replace(/\s+/g, "%20")}`;
    } else {
        baseUrl = `https://www.autotrader.co.uk/car-search?sort=price-asc&postcode=b261lt&radius=1500&make=${carMake.replace(/\s+/g, "%20").toUpperCase()}&model=${carModel.replace(/\s+/g, "%20").toUpperCase()}`;
    }

    return new Promise((res, rej) => {
        osmosis
            .get(baseUrl)
            .select('body > main > section.search-page__left > div.search-form > form > ul > li > div')
            .set({
                category: 'button > span > span.options-button__name'
            })
            .data(d => {
                if (categoryInclusions.includes(d.category)) {
                    carOptions = {
                        ...carOptions,
                        [d.category]: [],
                    }
                }
            })
            .select('div.sf-accordion > div > div > select.js-max-select > option')
            .set('buttonTerm')
            .data(d => {
                if (categoryInclusions.includes(d.category) && d.buttonTerm != '(any)') {
                    switch (d.category) {
                        case 'Year':
                            let yearString = d.buttonTerm.replace(/[\,\(\)]/g, "").split(" ")[0];
                            if (yearString != 'Brand') {
                                carOptions = {
                                    ...carOptions,
                                    [d.category]: [...carOptions[d.category], yearString],
                                }
                            } else {
                                carOptions = {
                                    ...carOptions,
                                    [d.category]: [...carOptions[d.category], 'new'],
                                }
                            }
                            break;
                        default: {
                        }
                    }

                }
            })
            .done((d) => {
                if (carOptions.Year.length == 1) {
                    let newYearArr;
                    if (carOptions.Year[0] == 'new') {
                        newYearArr = [carOptions.Year[0], (new Date().getFullYear()).toString(), ((new Date().getFullYear()) - 10).toString()];
                    } else {
                        newYearArr = [carOptions.Year[0], (carOptions.Year[0] - 10).toString()];
                    }
                    carOptions.Year = newYearArr;
                }
                res(carOptions);
            })
    })
};

let run = async () => {
    let modelCars = await setCarMakes();
    let modelCars2 = {};
    let carWithVariants = {};
    let carMakes = Object.keys(modelCars);
    // for (let i = 0; i < carMakes.length; i++) {
    // for (let i = 7; i < 8; i++) {
    for (let i = carMakes.length - 7; i > carMakes.length - 8; i--) {
        console.log(`Current Car: ${carMakes[i]} \n Processed: %${(i * 100) / carMakes.length} of car makes`);
        modelCars2 = await setCarModels(carMakes[i]);
        let modelKeys = Object.keys(modelCars2[carMakes[i]]);
        for (let j = 0; j < modelKeys.length; j++) {
            console.log(`Processed: ${(j * 100) / modelKeys.length}% of ${carMakes[i]} models`);
            carWithVariants = await setCarVariants(carMakes[i], modelKeys[j]);
            variantKeys = Object.keys(carWithVariants[carMakes[i]][modelKeys[j]]);
            if (variantKeys[0] == 'make' && variantKeys[1] == 'model') {
                let theYears = await setCarAvailableYears(carMakes[i], modelKeys[j], 'N/A');
                carWithVariants[carMakes[i]][modelKeys[j]].years = await getValidYears(theYears.Year, carMakes[i], modelKeys[j], 'N/A');
                let yearsennit = carWithVariants[carMakes[i]][modelKeys[j]].years;
                console.log('no variant years array:', yearsennit);
                for (let l = 0; l < yearsennit.length; l++) {
                    let currentYear = carWithVariants[carMakes[i]][modelKeys[j]].years[l];
                    console.log('no variant current year:', currentYear);
                    carWithVariants[carMakes[i]][modelKeys[j]][currentYear] = { details: {} };
                    console.log('no variant, current obj:', carWithVariants[carMakes[i]][modelKeys[j]]);
                    let theDetails = await runExtractor(carMakes[i], modelKeys[j], currentYear, 'N/A');
                    console.log('no variant The details read: ', details);
                    carWithVariants[carMakes[i]][modelKeys[j]][currentYear].details = theDetails;
                }
            } else {
                for (let k = 0; k < variantKeys.length; k++) {
                    console.log(`Processed: ${(k * 100) / variantKeys.length}% variants of the model: ${modelKeys[j]}`);
                    let theYears = await setCarAvailableYears(carMakes[i], modelKeys[j], variantKeys[k]);
                    carWithVariants[carMakes[i]][modelKeys[j]][variantKeys[k]].years = await getValidYears(theYears.Year, carMakes[i], modelKeys[j], variantKeys[k]);
                    let yearsennit = carWithVariants[carMakes[i]][modelKeys[j]][variantKeys[k]].years;
                    for (let l = 0; l < yearsennit.length; l++) {
                        let currentYear = carWithVariants[carMakes[i]][modelKeys[j]][variantKeys[k]].years[l];
                        carWithVariants[carMakes[i]][modelKeys[j]][variantKeys[k]][currentYear] = { details: {} };
                        let theDetails = await runExtractor(carMakes[i], modelKeys[j], currentYear, variantKeys[k]);
                        console.log('multiple variants, details read', theDetails);
                        carWithVariants[carMakes[i]][modelKeys[j]][variantKeys[k]][currentYear].details = theDetails;
                        // console.log(carWithVariants[carMakes[i]][modelKeys[j]][variantKeys[k]].currentYear.details);
                    }
                }
            }

        }
    }
    console.log(carWithVariants);
    let fs = require('fs').promises;
    await fs.writeFile("cars.json", JSON.stringify(carWithVariants));
};

const getValidYears = async (years, carMake, carModel, carVariant) => {
    let baseUrl = '';
    let hasBrandNew = false;
    if (years.indexOf('new') !== -1) {
        hasBrandNew = true;
    }
    years = years.filter(year => year !== 'new');

    let maxYear = Math.max.apply(null, years);
    let minYear = Math.min.apply(null, years);
    let compatibleYears = [];
    for (let i = minYear; i <= maxYear; i++) {
        if (carVariant != 'N/A') {
            baseUrl = `https://www.autotrader.co.uk/car-search?sort=price-asc&postcode=b261lt&radius=1500&make=${carMake.replace(/\s+/g, "%20").toUpperCase()}&model=${carModel.replace(/\s+/g, "%20").toUpperCase()}&aggregatedTrim=${carVariant.replace(/\s+/g, "%20")}&year-from=${i}&year-to=${i}`;
        } else {
            baseUrl = `https://www.autotrader.co.uk/car-search?sort=price-asc&postcode=b261lt&radius=1500&make=${carMake.replace(/\s+/g, "%20").toUpperCase()}&model=${carModel.replace(/\s+/g, "%20").toUpperCase()}&year-from=${i}&year-to=${i}`;
        }
        compatibleYear = await new Promise((res, rej) => {
            osmosis
                .get(baseUrl)
                .select('#content > div > ul > li.search-page__result')
                .done(() => {
                    res(true);
                })
                .error((e) => {
                    res(false);
                })
        });
        if (compatibleYear) {
            compatibleYears.push(i);
        }
    }
    if (hasBrandNew) {
        if (carVariant != 'N/A') {
            baseUrl = `https://www.autotrader.co.uk/car-search?sort=price-asc&postcode=b261lt&radius=1500&make=${carMake.replace(/\s+/g, "%20").toUpperCase()}&model=${carModel.replace(/\s+/g, "%20").toUpperCase()}&aggregatedTrim=${carVariant.replace(/\s+/g, "%20")}&year-from=${'new'}&year-to=${'new'}`;
        } else {
            baseUrl = `https://www.autotrader.co.uk/car-search?sort=price-asc&postcode=b261lt&radius=1500&make=${carMake.replace(/\s+/g, "%20").toUpperCase()}&model=${carModel.replace(/\s+/g, "%20").toUpperCase()}&year-from=${'new'}&year-to=${'new'}`;
        }

        compatibleYear = await new Promise((res, rej) => {
            osmosis
                .get(baseUrl)
                .select('#content > div > ul > li.search-page__result')
                .done(() => {
                    res(true);
                })
                .error((e) => {
                    res(false);
                })
        });

        if (compatibleYear) {
            compatibleYears.push('new');
        }
    }
    return compatibleYears;
}


run();

/**
need to run another script to get the years - could get the min and the max year
then loop through each of these and see if they get any results - return true or false
If they do not then it is not a viable search so details are not obtained
Otherwise details are obtained and they are looped through

To gain advert specific details - one could utilise the categories found through each of the models to generate the URLS for each respective search.
Then a random advert can be followed onto. Then the details and the reviews obtained from there.

The detail for the advert could be stored in the database, then this could be used to further do another script to obtain the insurance quotes for each of the respective car model and model variants.


 */