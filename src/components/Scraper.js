const cheerio = require('cheerio')
const $logger = require('./Logger')
const $httpClient = require('./HttpClient.js')
const scraperRepository = require('../repositories/scrapperRepository.js')

const Ad = require('./Ad.js');

let page = 1
let maxPrice = 0
let minPrice = 99999999
let sumPrices = 0
let validAds = 0
let adsFound = 0
let nextPage = true

const scraper = async (url) => {
    page = 1
    maxPrice = 0
    minPrice = 99999999
    sumPrices = 0
    adsFound = 0
    validAds = 0
    nextPage = true

    const parsedUrl = new URL(url)
    const searchTerm = parsedUrl.searchParams.get('q') || ''
    const notify = false ; // await urlAlreadySearched(url)
    $logger.info(`Will notify: ${notify}`)

    do {
        currentUrl = setUrlParam(url, 'o', page)
        let response
        try {
            response        = await $httpClient(currentUrl)
            const $         = cheerio.load(response)
            nextPage        = await scrapePage($, searchTerm, notify, url)
        } catch (error) {
            $logger.error(error)
            return
        }
        page++

    } while (nextPage);

    $logger.info('Valid ads: ' + validAds)

    if (validAds) {
        const averagePrice = sumPrices / validAds;

        $logger.info('Maximum price: ' + maxPrice)
        $logger.info('Minimum price: ' + minPrice)
        $logger.info('Average price: ' + sumPrices / validAds)

        const scrapperLog = {
            url,
            adsFound: validAds,
            averagePrice,
            minPrice,
            maxPrice,
        }
        process.exit(0)
        // TODO: reactivate this
        // await scraperRepository.saveLog(scrapperLog)
    }
}

const scrapePage = async ($, searchTerm, notify) => {
    try {
        const script = $('script[id="__NEXT_DATA__"]').text()

        if (!script) {
            return false
        }

        const adList = JSON.parse(script).props.pageProps.ads

        if (!Array.isArray(adList) || !adList.length ) {
            return false
        }

        adsFound += adList.length

        $logger.info(`Checking new ads for: ${searchTerm}`)
        $logger.info('Ads found: ' + adsFound)

        for (let i = 0; i < adList.length; i++) {

            $logger.debug('Checking ad: ' + (i + 1))


            const advert = adList[i]
            const title = advert.subject
            const id = advert.listId
            const url = advert.url
            const location_city = advert.locationDetails?.municipality
            const location_neighbourhood = advert.locationDetails?.neighbourhood
            const size = getSizeValue(advert)
            const price = parseInt(advert.price?.replace('R$ ', '')?.replace('.', '') || '0')

            const result = {
                id,
                url,
                title,
                searchTerm,
                price,
                notify,
                size,
                location_city,
                location_neighbourhood
            }

            const ad = new Ad(result)
            ad.process()

            if (ad.valid) {
                validAds++
                minPrice = checkMinPrice(ad.price, minPrice)
                maxPrice = checkMaxPrice(ad.price, maxPrice)
                sumPrices += ad.price
            }
        }

        return true
    } catch (error) {
        $logger.error(error);
        throw new Error('Scraping failed');
    }
}

const getSizeValue = (item) => {
    // Try to find size in properties array
    const sizeProperty = item.properties?.find(prop => prop.name === 'size')?.value;
    if (sizeProperty) {
      // Extract just the number from strings like "420m²"
      const matches = sizeProperty.match(/(\d+)/);
      return matches ? parseInt(matches[0]) : 0;
    }
    return 0;
  };

const urlAlreadySearched = async (url) => {
    try {
        const ad = await scraperRepository.getLogsByUrl(url, 1)
        if (ad.length) {
            return true
        }
        $logger.info('First run, no notifications')
        return false
    } catch (error) {
        $logger.error(error)
        return false
    }
}

const setUrlParam = (url, param, value) => {
    const newUrl = new URL(url)
    let searchParams = newUrl.searchParams;
    searchParams.set(param, value);
    newUrl.search = searchParams.toString();
    return newUrl.toString();
}

const checkMinPrice = (price, minPrice) => {
    if (price < minPrice) return price
    else return minPrice
}

const checkMaxPrice = (price, maxPrice) => {
    if (price > maxPrice) return price
    else return maxPrice
}

module.exports = {
    scraper
}
