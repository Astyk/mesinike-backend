'use strict'

const getAllDevices = async () => {
    const existingDevices = await strapi.query('device').find({
        _limit: 100,
    }, ["remote_id"]);
    const allDevices = existingDevices.map(x => x.remote_id);
    console.log(`Devies in db: ` + allDevices.length);

    return allDevices;
}

const getDevice = async (id) => {
    return await strapi.query('location').findOne({
        remotr_id: id
    });
}

const createDevice = async(id, url, sim, imei, serial, control, scale, nest_temp, rain, wind, location) => {
    try {
        const entry = await strapi.query('device').create({
            remote_id: id,
            url: url,
            sim: sim,
            imei: imei,
            serial: serial,
            control: control,
            scale: scale,
            nest_temperature: nest_temp,
            rain: rain,
            wind: wind,
            location: location
        })
    } catch (e) {
        console.log(e);
        return false;
    }

    return true;
}

const updateDevice = async(id, url, sim, imei, control, scale, nest_temp, rain, wind) => {
    try {
        const entry = await strapi.query('device').update(
            {remote_id: id},
            {
                url: url,
                sim: sim,
                imei: imei,
                control: control,
            }
        )
    } catch (e) {
        console.log(e);
        return false;
    }

    return true;
}

module.exports = { getAllDevices, getDevice, createDevice, updateDevice }