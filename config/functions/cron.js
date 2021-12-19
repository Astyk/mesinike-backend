/**
 * Cron config that gives you an opportunity
 * to run scheduled jobs.
 *
 * The cron format consists of:
 * [SECOND (optional)] [MINUTE] [HOUR] [DAY OF MONTH] [MONTH OF YEAR] [DAY OF WEEK]
 *
 * See more details here: https://strapi.io/documentation/developer-docs/latest/setup-deployment-guides/configurations.html#cron-tasks
 */

const locations = require('../../scripts/scrapers/locations.js')
const devices = require('../../scripts/scrapers/devices.js')
const log_scraper = require('../../scripts/scrapers/logs.js')

module.exports = {
    /**
   * Simple example.
   * Every monday at 1am.
   */
  // '0 1 * * 1': () => {
  //
  // }
  '* * * * *': () => {
    locations.main();
    devices.main();
    log_scraper.main();
  }
};
