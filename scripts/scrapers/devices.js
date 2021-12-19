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
    getAllDevices,
    getDevice,
    createDevice,
    updateDevice,
} = require('./utils/query/device.js');
const { getLocation } = require('./utils/query/location.js');

let report = {}
const errors = []
let newDevices = 0 //counter
let j = request.jar();

const scrape = async(allDevices, scraper) => {
    
    const browser = request.defaults({ jar : j }) //it will make the session default for every request
    console.log('Devices scrape function');

    const base_url = scraper.site.url
    const site = scraper.site
    console.log(base_url);

    // Start
    browser(base_url, async (error, response, html) => {
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
            async (error, response) => {
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
                browser(base_url+'do?action=listDevices', async (error, response, html) => {
                    if(error) {
                        console.log(error)
                        errors.push({
                            context:"Devices",
                            url: base_url+"do?action=listDevices",
                            // date: await getDate()
                        })
                        return error;
                    }

                    console.log('listDevices '+response.statusCode);
                    // console.log(html);
                    const $ = cheerio.load(html);

                    // for each link load page

                    $("#listData tbody tr").each( async (i, deviceRow) => {
                        const device = {};

                        try {
                            let editUrl = $(deviceRow).find("th a[href^='do?action=editDevice']").attr('href');
                            device.url = base_url + editUrl;
                            // const id = new URL( url ).searchParams.get('id');

                            device.id = $(deviceRow).find('th:eq(0)').text().trim()
                            device.sim = $(deviceRow).find('th:eq(2)').text().trim()
                            device.scale = parseInt($(deviceRow).find('th:eq(5)').text().trim())
                            device.nest_temp = parseInt($(deviceRow).find('th:eq(6)').text().trim())
                            device.rain = parseInt($(deviceRow).find('th:eq(7)').text().trim())
                            device.wind = parseInt($(deviceRow).find('th:eq(8)').text().trim())
                            device.serial = $(deviceRow).find('th:eq(9)').text().trim()
                            device.imei = $(deviceRow).find('th:eq(10)').text().trim()
                            device.control = '';
                            device.location = '';

                            if (allDevices.includes(device.id)) {
                                // Already exist
                                //console.log("Device exist " + device.id);
                                return;
                            } 
        
                            //load Device edit form for 'control', 'location.id'
                            browser(device.url, async (error, response, html) => {
                                if(error) {
                                    console.log(error)
                                    errors.push({
                                        context:"Device Edit Page",
                                        url: device.url,
                                         
                                    })
                                    return error;
                                }
        
                                let $ = cheerio.load(html);
                                
                                device.control = $("form.forma input:eq(3)").attr('value').trim() || null;

                                let location_id = $("form.forma select option:selected").attr('value').trim() || null;
                                const location = await getLocation(location_id);
                                if (location) {
                                    device.location = location.id;
                                } else {
                                    console.log('Device sync - Location not imported yet');
                                    return;
                                }

                                await createDevice(
                                    device.id,
                                    device.url,
                                    device.sim,
                                    device.imei,
                                    device.serial,
                                    device.control,
                                    device.scale,
                                    device.nest_temp,
                                    device.rain,
                                    device.wind,
                                    device.location
                                );  
                            })
                        } catch (error) {
                            console.log(error);
                            return;
                        }
                        
                        await sleep(300);
                    });

                })
            }
        )
    })
}

const main = async() => {
    try {
        const slug = "xlog-devices"
        const scraper = await strapi.query('scraper').findOne({
            slug: slug
        });

        if (scraper == null || !scraper.enabled || !scraper.frequency)
        {
            console.log("Scraper not found, is not activated ");
            return
        }
        
        const canRun = await scraperCanRun(scraper);
        if (canRun) {
            //get localy stored
            const allDevices = await getAllDevices(scraper)
            
            await scrape(allDevices, scraper);

            report = await getReport(newDevices)

            await updateScraper(scraper, report, errors);
        } else {
            console.log('scraper ' + scraper.slug + ' cant run');
        }
    } catch (error) {
        console.log(error);
    }

}

exports.main = main;