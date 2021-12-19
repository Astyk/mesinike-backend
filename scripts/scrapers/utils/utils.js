'use strict'

const moment = require('moment');
const parser = require('cron-parser');

// detect scraper can run
const scraperCanRun = async (scraper) => {
    const frequency = parser.parseExpression(scraper.frequency);
    const current_date = parseInt((new Date().getTime() / 1000));
    let next_execution_at = "" 

    if (scraper.next_execution_at) {
        next_execution_at = scraper.next_execution_at
    } 
    else {
        next_execution_at = (frequency.next().getTime()/ 1000);
        await strapi.query('scraper').update({
            id: scraper.id
        }, {
            next_execution_at: next_execution_at
        });
    }

    if (next_execution_at <= current_date) {
        await strapi.query('scraper').update({
            id: scraper.id
        }, {
            next_execution_at: (frequency.next().getTime() / 1000)
        });
        return true;
    }
    return false;
}

const getDate = async () => {
    const today = new Date();
    const date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    const time = today.getHours()+":"+today.getMinutes()+":"+today.getSeconds();
    
    return date+ ' '+time;
}

/** Can load reports only by previous day */
const canGetLog = async(datetime) => {
    return moment.utc(datetime).isBefore(moment.utc(), "day");
}

const getReport = async (newLoc) => {
    return { newLoc: newLoc, data: await getDate()}
}

const sleep = (ms) => {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
}

module.exports = { scraperCanRun, canGetLog, getDate, getReport, sleep }