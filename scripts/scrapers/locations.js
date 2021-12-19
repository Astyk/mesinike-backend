'use strict'

const request = require('request');
const cheerio = require('cheerio');
const {
    getReport,
    getDate,
    scraperCanRun,
    sleep
} = require('./utils/utils.js');
const {updateScraper} = require('./utils/query/scraper.js');
const {
    getAllLocation,
    createLocations,
    updateLocations
} = require('./utils/query/location.js');

let report = {}
const errors = []
let newLocations = 0 //counter
let j = request.jar();

const scrape = async(allLocation, scraper) => {
    
    const browser = request.defaults({ jar : j }) //it will make the session default for every request
    console.log('Locations scrape function');

    const base_url = scraper.site.url
    const site = scraper.site
    console.log(base_url);

    // Start
    browser(base_url, (error, response, html) => {
        //Do your logic here or even another request like
        if(error) {
            console.log(error)
            errors.push({
                context:"Home page",
                url: base_url,
                // date: await getDate()
            })
            return error;
        }
        //Login
        browser(
            //Options
            {
                url:    base_url+"do?action=login",
                method: "POST",
                followAllRedirects: true,
                form:{
                    username:site.username, 
                    password:site.password, 
                    form_submited:"true"
                }
            }
            ,
            //callback
            (error, response) => {
                //Do your logic here or even another request like
                if(error) {
                    console.log(error)
                    errors.push({
                        context:"Login page",
                        url: base_url+"do?action=login",
                        // date: await getDate()
                    })
                    return error;
                }
                console.log(response.statusCode);
                console.log('Loged in!  Server responded with:', response.headers);

                //List locations
                browser(base_url+'do?action=listLocations', (error, response, html) => {
                    if(error) {
                        console.log(error)
                        errors.push({
                            context:"Locations",
                            url: base_url+"do?action=listLocations",
                            // date: await getDate()
                        })
                        return error;
                    }

                    console.log('listLocations '+response.statusCode);
                    // console.log(html);
                    const $ = cheerio.load(html);

                    // for each link load page

                    $("#listData tbody tr th a[href^='do?action=editLocation']").each( async (i, link) => {

                        try {
                            const url = base_url + $(link).attr('href');
                            const id = new URL( url ).searchParams.get('id');
        
                            //load Locatioon url
                            browser(url, (error, response, html) => {
                                if(error) {
                                    console.log(error)
                                    errors.push({
                                        context:"Location Page",
                                        url: url,
                                        // date: await getDate()
                                    })
                                    return error;
                                }
                                
                                console.log(response.statusCode);
        
                                let $ = cheerio.load(html);
        
                                let form = $("form.forma");
                                
                                
                                //
                                const name = form.find('#name').attr('value') || null;
                                const address = form.find('#adresa').attr('value') || null;
                                const postcode = form.find('#postanskiBroj').attr('value') || null;
                                const region = form.find('#regija').attr('value') || null;
                                const city = form.find('#mjasto').attr('value') || null;
                                const country = form.find('#country option:selected').text() || null;
                                const note = form.find('#napomea').attr('value') || null;
                                console.debug({id, url, name, address, postcode, region, city, country, note});
                                if (allLocation.includes(id)) {
                                    // Update Location
                                    updateLocations(
                                        id,
                                        name,
                                        url,
                                        address,
                                        city,
                                        region,
                                        postcode,
                                        country,
                                        note
                                    )
                                } else {
                                    createLocations(
                                        id,
                                        name,
                                        url,
                                        address,
                                        city,
                                        region,
                                        postcode,
                                        country,
                                        note
                                    )
        
                                    newLocations +=1;
                                }   
                            })
                        } catch (error) {
                            console.log(error);
                            return
                        }
                        
                        await sleep(300);
                    });

                })
            }
        )
    })
}

const main = async() => {
    const slug = "xlog-locations"
    const scraper = await strapi.query('scraper').findOne({
        slug: slug
    });

    console.log(scraper);

    if (scraper == null || !scraper.enabled || !scraper.frequency)
    {
        console.log("Scraper not found, is not activated ");
        return
    }
    
    const canRun = await scraperCanRun(scraper);
    if (canRun) {
        //get localy stored
        const allLocation = await getAllLocation(scraper)
        
        await scrape(allLocation, scraper);

        report = await getReport(newLocations)

        await updateScraper(scraper, report, errors);
    }

}

exports.main = main;