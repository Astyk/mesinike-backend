'use.strict'

const updateScraper = async (scraper, report, errors) => {
    await strapi.query('scraper').update(
        { id: scraper.id },
        {
            report: report,
            errors: errors,
        }
    )

    console.log('Job done for: ' + scraper.name);

    return true;
}

module.exports = { updateScraper }