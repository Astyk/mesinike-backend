'use strict'

const request = require('request');
const cheerio = require('cheerio');
const moment = require('moment');
const {
    getReport,
    getDate,
    scraperCanRun,
    canGetLog,
    sleep
} = require('./utils/utils.js');
const {updateScraper} = require('./utils/query/scraper.js');
const {
    getAllLocations,
    createLog,
    reportLocation
} = require('./utils/query/log.js');
const { add } = require('cheerio/lib/api/traversing');

let report = {}
const errors = []
let newLogs = 0 //counter
let j = request.jar();


/**
 * Scraper pull log records for list of locations
 * url do?action=table&id={location}
 * post: 
 *      action: table
 *      dateFrom: 01.11.2021.
 *      dateTo: 01.11.2021.
 *      submit: Select
 * 
 *  possible actions
 *  periodShift=103  - first log
 *  periodShift=104 - last Log
 * 
 */
const scrape = async(allLocations, scraper) => {
    
    const browser = request.defaults({ jar : j }) //it will make the session default for every request
    console.log('Logs scrape function');

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
        
        console.log('Home page ' + response.statusCode); //debug
        
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
                
                // for each Location
                for (const loc of allLocations) {
                    console.log('Get report for '+ JSON.stringify(loc));
                    if(loc.last_report && !canGetLog(loc.last_report))
                    {
                        console.log('Location log already done' + loc.last_report + ' moment utc ' + moment.utc(loc.last_report).format("DD.MM.YYYY."));
                        return;
                    }
                    
                    const reportLoaded = []; // last report date container

                    //List reports
                    await new Promise((resolve) => {
                        console.log('Goto reports ' + loc.remote_id);
                        browser(base_url+"do?action=table&id="+loc.remote_id, async (error, response, html) => {
                            if(error) {
                                console.log(error)
                                errors.push({
                                    context:"Logs",
                                    url: base_url+"do?action=table&id="+loc.remote_id,
                                    // date: await getDate()
                                })
                                return error;
                            }

                            const lastReport = moment.utc(loc.last_report);
                            let dayReportHtml;

                            console.log('Logs for '+ loc.remote_id + " => "+ response.statusCode + ' @ ' + loc.last_report);

                            if (!loc.last_report)
                            {
                                //goto periodShift=103 - to log first day
                                dayReportHtml = await new Promise((resolve, reject) => {
                                    browser(
                                        //Options
                                        {
                                            url:    base_url+"do?action=table&periodShift=103",
                                            method: "GET",
                                            followAllRedirects: true,
                                        }, 
                                        (error, response, html) => {
                                            if(error) {
                                                console.log(error)
                                                reject(error);
                                            }
    
                                            resolve(html);
                                        }
                                    );
                                });

                            } else if(lastReport.isBefore(moment.utc(), 'days')){
                                // goto lastReport day and then shift forward
                                // PS 'post' doesnt return input fields and reference stay unknown
                                
                                dayReportHtml = await new Promise((resolve, reject) => {
                                    const gotoDate = (lastReport.hours() == '0')? lastReport.clone().subtract(1, "days").format("DD.MM.YYYY.") : lastReport.format("DD.MM.YYYY.");
                                    // const gotoDate = lastReport.clone().subtract(1, "days").format("DD.MM.YYYY.");  

                                    browser(
                                        {
                                            url:    base_url+"do?action=table&id="+loc.remote_id,
                                            method: "POST",
                                            followAllRedirects: true,
                                            form:{
                                                action:"table", 
                                                dateFrom: gotoDate,
                                                dateTo: gotoDate,
                                                submit:"Select"
                                            }
                                        }, 
                                        (error) => {
                                            if(error) {
                                                console.log(error)
                                                reject(error);
                                            }
                                            
                                            // skip forward
                                            console.log('Request options ' + gotoDate + " => "+ base_url+"do?action=table&periodShift=102");
                                            browser({
                                                url:    base_url+"do?action=table&periodShift=102",
                                                method: "GET",
                                                followAllRedirects: true,
                                            }, (error, response, html) => {
                                                if(error) {
                                                    console.log(error)
                                                    reject(error);
                                                }

                                                resolve(html);
                                            })        
                                        }
                                    );
                                });
                            } else
                            {
                                // nothing to load
                                console.log('Location ' + loc.remote_id + ' nothing to load');
                                return;
                            }


                            if (!dayReportHtml) {
                                console.log("Something goes wrong - no data ");
                                return;
                            }

                            //load report
                            let $ = cheerio.load(dayReportHtml);
                            const reportDay = moment.utc($('body #dateFrom').attr('value'), "DD.MM.YYYY.");
                            // const reports = [];
                            
                            // parse report rows
                            $("table#listData tbody tr").each( (i, row) => {
                                //test if row valid
                                if(!$(row).find('input').length) {
                                    console.log('Skip! row has no actual log ' + $(row).find('th:eq(0)').text());
                                    return;
                                }

                                try {
                                    const report = {
                                        "location": loc.id
                                    };    
                                    // create report
                                    report.time = $(row).find('th:eq(0)').text();
                                    report.delta = $(row).find('th:eq(1)').text() || '0';
                                    report.comulative = $(row).find('th:eq(2)').text()|| '0';
                                    report.weight = $(row).find('th:eq(3)').text() || '0';
                                    report.temp = $(row).find('th:eq(4)').text() || '0';
                                    report.humidity = $(row).find('th:eq(5)').text() || '0';
                                    report.nest_temp = $(row).find('th:eq(6)').text() || '0';
                                    report.rain = $(row).find('th:eq(7)').text() || '0';
                                    report.wind = $(row).find('th:eq(8)').text() || '0';
                                    report.correction = $(row).find('th:eq(9) input').attr('value') || '0';
                                    report.comment = $(row).find('th:eq(10) input').text() || '';
                                    //input field has id reference
                                    let rowId = $(row).find('input:eq(1)').attr('name');
                                    if (rowId)
                                    {
                                        report.reference = rowId.substr(7)|| '';
                                    }
                                    
                                    //make date
                                    let time = report.time.split(":");

                                    // if 00:00 then offset 24h
                                    if(time[0] == '00')
                                    { 
                                        time[0] = '24'
                                    }

                                    const reportTime = reportDay.clone().set({"hours":time[0], "minutes":time[1]});
                                    report.time = reportTime.toISOString();

                                    // check if past from lastReport
                                    if(reportTime.isSameOrBefore(lastReport, "hours"))
                                    {
                                        console.log('Row is before lastReport, must be already scraped: '+ lastReport.toISOString() + " >= " + reportTime.toISOString());
                                        reportLoaded.push(reportTime.clone());
                                        //skip
                                        return;
                                    }

                                    // console.log(report);

                                    createLog(
                                        report.time, report.location, 
                                        report.delta, report.comulative, report.weight,
                                        report.nest_temp, report.temp, report.humidity,
                                        report.rain, report.wind,
                                        report.correction, report.comment,
                                        report.reference
                                    )
                                    
                                    reportLoaded.push(reportTime.clone());
                                    
                                } catch (error) {
                                    console.log(error);
                                    return;
                                }
                            });
                            
                            resolve(true);
                        })
                    })
                    
                    console.log("Report done "+loc.id + " lastReport@" + moment.max(reportLoaded).toISOString());
                    if (moment.max(reportLoaded).isValid()) {
                       await reportLocation(loc.id, moment.max(reportLoaded).toISOString());
                    } else {
                        console.log("Error getting report " + moment(loc.last_report).add(1, "day").toISOString())
                    }
                    await sleep(3000)
                    console.log('Must run next ')
                }
            }
        )
    })
}

const main = async() => {
    try {
        const slug = "xlog-logs"
        const scraper = await strapi.query('scraper').findOne({
            slug: slug
        });

        console.log('Start scraper ' + scraper.slug);

        if (scraper == null || !scraper.enabled || !scraper.frequency)
        {
            console.log("Scraper not found, is not activated ");
            return
        }
        
        const canRun = await scraperCanRun(scraper);
        if (!canRun) {        
            console.info(scraper.slug + ' not ready to run');
            return
        }

        //get Locations localy stored
        const allLocations = await getAllLocations();

        await scrape(allLocations, scraper);

        report = await getReport(newLogs)

        await updateScraper(scraper, report, errors);
    } catch (error) {
        console.log(error);
    }
    

}

exports.main = main;