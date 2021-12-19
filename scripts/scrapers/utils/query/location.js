'use strict'
const getAllLocation = async () => {
    const existingLocation = await strapi.query('location').find({
        _limit: 100,
    }, ["remote_id"]);
    const allLocation = existingLocation.map(x => x.remote_id);
    console.log(`Locations in db: ` + allLocation.length);

    return allLocation;
}

const getLocation = async (id) => {
    return await strapi.query('location').findOne({
        remote_id: id
    });
}

const createLocations = async(id, name, url, address, city, region, postcode, country, note) => {
    try {
        const entry = await strapi.query('location').create({
            name: name,
            remote_id: id,
            url: url,
            address: {
                address: address,
                city: city,
                region: region,
                postocde: postcode,
                country: country
            },
            note: note
        })
    } catch (e) {
        console.log(e);
        return false;
    }

    return true;
}

const updateLocations = async(id, name, url, address, city, region, postcode, country, note) => {
    try {
        const entry = await strapi.query('location').update(
            {remote_id: id},
            {
                name: name,
                url: url,
                address: {
                    address: address,
                    city: city,
                    region: region,
                    postcode: postcode,
                    country: country,
                },
                note: note,
            }
        )
    } catch (e) {
        console.log(e);
        return false;
    }

    return true;
}

module.exports = { getAllLocation, getLocation, createLocations, updateLocations }