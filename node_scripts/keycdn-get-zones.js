var KeyCDN = require('keycdn');
var keycdn = new KeyCDN(process.env.KEYCDN_KEY);

// get all zones
keycdn.get('zones.json', (err, results) => {
    if (err) {
        console.trace(err);
        return;
    }
    results.data.zones.forEach((zone) => {
        console.log(zone.id + ',' + zone.name + ',' + zone.originurl);
    });
});
