var KeyCDN = require('keycdn');
var keycdn = new KeyCDN(process.env.KEYCDN_KEY);

var zone = {
    name: process.argv[2],
    originurl: process.argv[3],
    sslcert: 'letsencrypt',
    type: 'pull',
    cors: 'enabled',
    cachecanonical: 'enabled',
};

var zonealias = {
    zone_id: null,
    name: process.argv[4]
};

if (!zone.name || !zone.originurl || !zonealias.name) {
    console.error('usage: keycdn-create-zone.js <name> <origin_url> <zone_alias>');
    process.exit(1);
}

function findZone(zone, callback) {
    var found = null;

    // get all zones
    keycdn.get('zones.json', (err, results) => {
        if (err) {
            callback(err, null);
            return;
        }
        results.data.zones.forEach((rZone) => {
            if (rZone.name == zone.name) {
                found = rZone;
            }
        });
        callback(null, found);
    });
}

function deleteZone(zone, callback) {
    findZone(zone, (err, found) => {
        if (found) {
            console.log(`Zone found: ${JSON.stringify(found)}`);
            console.log(`Delete zone ${found.name} (${found.id})`);
            keycdn.del(`zones/${found.id}.json`, (err, res) => {
                if (err) {
                    console.error(`Failed: ${JSON.stringify(res)}`);
                    callback(err);
                    return;
                }
                console.log(`Result: ` + JSON.stringify(res));
                callback(null);
            });
        }
        else {
            console.log(`Zone does not already exists.`);
            callback(null);
        }
    });
}

function createZone(zone, callback) {
    deleteZone(zone, (err) => {
        console.log(`Create zone ${zone.name}`);
        keycdn.post('zones.json', zone, (err, res) => {
            if (err) {
                console.error(`Failed: ${JSON.stringify(res)}`);
                callback(err, null);
                return;
            }
            console.log(`Result: ` + JSON.stringify(res));
            callback(null, res.data.zone);
        });
    });
}

function createZonealias(zonealias, callback) {
    console.log(`Create Zone Alias ${JSON.stringify(zonealias)}`);
    keycdn.post('zonealiases.json', zonealias, (err, res) => {
        if (err) {
            console.error(`Failed: ${JSON.stringify(res)}`);
            callback(err, null);
            return;
        }
        console.log(`Result: ${res}`);
        callback(null, res.data.zonealias);
    });
}

function main(callback) {
    createZone(zone, (err, zone) => {
        if (err) {
            callback(err);
            return;
        }
        zonealias.zone_id = zone.id | 0;
        createZonealias(zonealias, callback);
    });
}

main((err) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
});
