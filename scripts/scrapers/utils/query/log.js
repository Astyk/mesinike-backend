'use strict'

const getAllLocations = async () => {
    const existingLocation =  await strapi.query("location").find({
    }, ["id", "name", "remote_id","last_report"]);

    console.log(`Locations in db: ` + existingLocation.length);

    return existingLocation;
}

const createLog = async(
    time, location, 
    delta = '', comulative = '', weight = '', nest_temp = '', 
    external_temp = '', humidity = '', rain = '', wind = '', correction = '', comment = '', reference) => {
    try {
        const entry = await strapi.query('log').create({
            report: time,
            location: location,
            delta: parseFloat(delta),
            comulative: parseFloat(comulative),
            weight: parseFloat(weight),
            nest_temp: parseInt(nest_temp),
            external_temp: parseInt(external_temp),
            humidity: parseInt(humidity),
            rain: parseInt(rain),
            wind: parseInt(wind),
            correction: parseFloat(correction),
            comment: comment,
            reference: reference
        })
    } catch (e) {
        console.log(e);
        return false;
    }

    return true;
}

const reportLocation = async (id, last_report) => {
    try {
        const entry = await strapi.query('location').update(
            {id: id},
            {
                last_report: last_report
            }
        )
    } catch (e) {
        console.log(e);
        return false;
    }
    return true;
}

module.exports = { getAllLocations, createLog, reportLocation }