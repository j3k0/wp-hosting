var KeyCDN = require('keycdn');
var keycdn = new KeyCDN(process.env.KEYCDN_KEY);

var zone = {
    name: process.argv[2],
    originurl: process.argv[3],
    type: 'pull'
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

function createZone(zone, callback) {
    findZone(zone, (err, found) => {
        if (!found) {
            keycdn.post('zones.json', zone, (err, res) => {
                if (err) {
                    callback(err, null);
                    return;
                }
                callback(null, res.data.zone);
            });
        }
        else {
            callback(null, found);
        }
    });
}

function createZonealias(zonealias, callback) {
    keycdn.post('zonealiases.json', zonealias, (err, res) => {
        if (err) {
            callback(err, null);
            return;
        }
        callback(null, res.data.zonealias);
    });
}

function main(callback) {
    createZone(zone, (err, zone) => {
        if (err) {
            callback(err);
            return;
        }
        zonealias.zone_id = zone.id;
        createZonealias(zonealias, callback);
    });
}

main((err) => {
    if (err) {
        console.error(err);
    }
});
