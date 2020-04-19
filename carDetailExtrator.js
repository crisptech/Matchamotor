// const baseUrl = 'https://www.autotrader.co.uk/car-search?sort=price-asc&postcode=b261lt&radius=1500';
// const baseUrl = 'https://www.autotrader.co.uk/car-search?advertClassification=standard&make=BMW&model=1%20SERIES&postcode=B261LT&onesearchad=Used&onesearchad=Nearly%20New&onesearchad=New&advertising-location=at_cars&is-quick-search=TRUE&page=1&year-from=2008&year-to=2008';
const osmosis = require('osmosis');
var baseUrl = 'https://www.autotrader.co.uk/car-search'

/*
year-from=2008
year-to=2008
maximum-mileage=90000
aggregatedTrim=CLK320%20CDI    <- model variant name
make=MERCEDES-BENZ
model=CLK
*/

var categoryKeys = [];
var categoryExclusions = ['Make', 'Model', 'Model Variant', 'CAT S/C/D/N', undefined, 'Year'];
var carOptions = {};

/**
 * Make, Model, Model Variant, Gearbox, Private & trade, Doors, Acceleration, Annual Tax, Drivetrain, Fuel consumption, Insurance group, CO2 emissions
 *  (also year?)
 */

// body > main > section.search-page__left > div.search-form > form > ul > li > div 
// body > main > section.search-page__left > div.search-form > form > ul > li > div > div > div.sf-flyout__scrollable-options > div > button
let setFlyoutOptions = () => {
    return new Promise((res, rej) => {
        osmosis
            .get(baseUrl)
            .select('body > main > section.search-page__left > div.search-form > form > ul > li > div')
            .set({
                category: 'button > span > span.options-button__name'
            })
            .data(d => {
                categoryKeys.push(d.category);
                if (!categoryExclusions.includes(d.category)) {
                    carOptions = {
                        ...carOptions,
                        [d.category]: [],
                    }
                }
            })
            .select('div > div.sf-flyout__scrollable-options > div > button')
            .set({
                buttonTerm: 'span.term'
            })
            .data(d => {
                if (!categoryExclusions.includes(d.category)) {
                    carOptions = {
                        ...carOptions,
                        [d.category]: [...carOptions[d.category], d.buttonTerm],
                    }
                }
            })
            .done((d) => {
                res(carOptions);

            });
    })
};

/**
 * Fuel-type, Body-type, Colour
 *
 */
let setFuelBodyColour = () => {
    return new Promise((res, rej) => {
        osmosis
            .get(baseUrl)
            .select('body > main > section.search-page__left > div.search-form > form > ul > li > div')
            .set({
                category: 'button > span > span.options-button__name'
            })
            .data(d => {
                categoryKeys.push(d.category);
                if (!categoryExclusions.includes(d.category) && !carOptions.hasOwnProperty(d.category)) {
                    carOptions = {
                        ...carOptions,
                        [d.category]: [],
                    }
                }
            })
            .select('div > div > div > div.at-field')
            .set({
                buttonTerm: 'label > span > span.term'
            })
            .data(d => {
                carOptions = {
                    ...carOptions,
                    [d.category]: [...carOptions[d.category], d.buttonTerm],
                }
            })
            .done((d) => {
                res(carOptions);

            });
    })
}

let setAccordianOptions = () => {
    return new Promise((res, rej) => {
        osmosis
            .get(baseUrl)
            .select('body > main > section.search-page__left > div.search-form > form > ul > li > div')
            .set({
                category: 'button > span > span.options-button__name'
            })
            .data(d => {
                categoryKeys.push(d.category);
                if (!categoryExclusions.includes(d.category) && !carOptions.hasOwnProperty(d.category)) {
                    carOptions = {
                        ...carOptions,
                        [d.category]: [],
                    }
                }
            })
            .select('div.sf-accordion > div > div > select.js-max-select > option')
            .set('buttonTerm')
            .data(d => {
                if (!categoryExclusions.includes(d.category) && d.buttonTerm != '(any)') {
                    switch (d.category) {
                        case 'Price':
                            let priceString = d.buttonTerm.replace(/[\£\,\(\)]/g, "").split(" ");
                            console.log(`price string: ${priceString}`);
                            if (!("priceCategories" in carOptions[d.category])) {
                                carOptions = {
                                    ...carOptions,
                                    [d.category]: {
                                        priceCategories: [priceString]
                                    }
                                }
                            } else {
                                carOptions = {
                                    ...carOptions,
                                    [d.category]: {
                                        priceCategories: [...carOptions[d.category].priceCategories, priceString]
                                    }
                                }
                            }

                            break;
                        case 'Engine size':
                            let engineSizeString = d.buttonTerm.replace(/[\,\(\)]/g, "").split(" ")[0];
                            carOptions = {
                                ...carOptions,
                                [d.category]: [...carOptions[d.category], engineSizeString],
                            }
                            break;
                        case 'Mileage':
                            let mileageString = d.buttonTerm.replace(/[\£\,\)a-zA-z\s]/g, "").split("(");
                            if (!("mileageCategories" in carOptions[d.category])) {
                                carOptions = {
                                    ...carOptions,
                                    [d.category]: {
                                        mileageCategories: [mileageString]
                                    }
                                }
                            } else {
                                carOptions = {
                                    ...carOptions,
                                    [d.category]: {
                                        mileageCategories: [...carOptions[d.category].mileageCategories, mileageString]
                                    }
                                }
                            }
                            break;
                        case 'Seats':
                            let seatNumber = d.buttonTerm.match(/[\d]+/, "")[0];
                            carOptions = {
                                ...carOptions,
                                [d.category]: [...carOptions[d.category], seatNumber]
                            }
                            break;

                        default: {
                            carOptions = {
                                ...carOptions,
                                [d.category]: [...carOptions[d.category], d.buttonTerm],
                            }
                        }
                    }

                }
            })
            .done((d) => {
                // processing average cost
                console.log('prices within detail extractor', carOptions.Price, );
                let pricesLength = carOptions.Price.priceCategories.length;
                let totalQuantity = 0;
                let totalCost = 0;
                let averageCost;
                for (let i = pricesLength - 1; i > 0; i--) {
                    let alteredQuantity = carOptions.Price.priceCategories[i][1] - carOptions.Price.priceCategories[i - 1][1];
                    carOptions.Price.priceCategories[i][1] = alteredQuantity;
                    totalQuantity += alteredQuantity;
                    totalCost += alteredQuantity * carOptions.Price.priceCategories[i][0];
                }
                carOptions.Price.averagePrice = totalCost / totalQuantity;

                let mileageLength = carOptions.Mileage.mileageCategories.length;
                let totalMileageQuantity = 0;
                let totalMileageSum = 0;
                let averageMileage;

                for (let i = mileageLength - 1; i > 0; i--) {
                    let alteredQuantity = carOptions.Mileage.mileageCategories[i][1] - carOptions.Mileage.mileageCategories[i - 1][1];
                    carOptions.Mileage.mileageCategories[i][1] = alteredQuantity;
                    totalMileageQuantity += alteredQuantity;
                    totalMileageSum += alteredQuantity * carOptions.Mileage.mileageCategories[i][0];
                }
                carOptions.Mileage.averageMileage = totalMileageSum / totalMileageQuantity;

                res(carOptions);

            })
            .error(e => console.log('errored in accordian for'))

    })
}



let runExtractor = async (carMake, carModel, year, carVariant) => {

    let url;
    if (carVariant !== '') {
        url = `https://www.autotrader.co.uk/car-search?sort=price-asc&postcode=b261lt&radius=1500&make=${carMake.replace(/\s+/g, "%20").toUpperCase()}&model=${carModel.replace(/\s+/g, "%20").toUpperCase()}&aggregatedTrim=${carVariant.replace(/\s+/g, "%20")}&year-from=${year}&year-to=${year}`;
    } else {
        url = `https://www.autotrader.co.uk/car-search?sort=price-asc&postcode=b261lt&radius=1500&make=${carMake.replace(/\s+/g, "%20").toUpperCase()}&model=${carModel.replace(/\s+/g, "%20").toUpperCase()}&year-from=${year}&year-to=${year}`;
    }

    baseUrl = url;
    carOptions = await setFlyoutOptions();
    carOptions = await setFuelBodyColour();
    carOptions = await setAccordianOptions();

    console.log('final options', carOptions);

    return carOptions;

    // let fs = require('fs').promises;
    // await fs.writeFile("cars.json", JSON.stringify(carWithVariants));
};



// ACCORDIAN

// > div.sf-accordion > div > div > select > option



/*
non accordian:
document.querySelectorAll('body > main > section.search-page__left > div.search-form > form > ul > li > div > div > div.sf-flyout__scrollable-options > div > button')



'body > main > section.search-page__left > div.search-form > form > ul > li > div > div.sf-accordion > div > div > select > option'

*/

module.exports.runExtractor = runExtractor;