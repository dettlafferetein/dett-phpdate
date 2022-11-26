const PHPDate = function (rawdate, format, timezone = "America/New_York", locale = "en-US") {
    let date = new Date(rawdate);

    if (date.getTime() === NaN) {
        return false;
    }

    function IntlFormatParts (date, locale, options) {
        let y = new Intl.DateTimeFormat(locale, options).formatToParts(date);
        
        let ret = {};
        for (const k in y) {
            if (y[k].type !== 'literal') {
                if ((y[k].type === 'hour') && (y[k].value === '24')) {
                    y[k].value = '00';
                }
                ret[y[k].type] = y[k].value;
            }
        }

        return ret;
    }

    function TZasUTC (date, timezone) {
        let x = new Date(date);
        
        let parts = IntlFormatParts(x, 'en-US', {timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: false});

        y = parts.year+'-'+parts.month+'-'+parts.day+'T'+parts.hour+':'+parts.minute+':'+parts.second+'+00:00';
    
        return new Date(y);
    }

    let dateUTC = TZasUTC(rawdate, timezone);

    const masks = {
        "d":"",
        "D":"",
        "j":"",
        "l":"",
        "N":"",
        "S":"",
        "w":"",
        "z":"",
        "W":"",
        "F":"",
        "m":"",
        "M":"",
        "n":"",
        "t":"",
        "L":"",
        "o":"",
        "Y":"",
        "y":"",
        "a":"",
        "A":"",
        "g":"",
        "G":"",
        "h":"",
        "H":"",
        "i":"",
        "s":"",
        "u":"000000",
        "v":"000",
        "e":timezone,
        "I":"",
        "O":"",
        "P":"",
        "p":"",
        "T":"",
        "Z":"",
        "c":"",
        "r":"",
        "U":"",
        "\\": "Escape"
    };

    const IntlDF = {
        "D":{weekday: "short"},
        "l":{weekday: "long"},
        "F":{month: "long"},
        "M":{month: "short"},
        "T":{timeZoneName: 'short'}
    };

    function addLeadingZeros (x, size = 2) {
        x = String(x);
        if (x.length < size) {
            return '0'.repeat(size - x.length) + x;
        }
        return x;
    }

    function parseMask (mask) {
        if (masks[mask] !== "") {
            return masks[mask];
        }

        if (mask in IntlDF) {
            if (Object.keys(IntlDF[mask]).length > 0) {
            return masks[mask] = new Intl.DateTimeFormat(locale, {timeZone: timezone, ...IntlDF[mask]}).format(date);
            }
        }

        let x;
        
        switch (mask) {
            case 'Y':
            case 'y':
                masks['Y'] = dateUTC.getUTCFullYear();
                masks['y'] = String(masks['Y']).slice(-2);
                return masks[mask];

            case 'n':
            case 'm':
                masks['n'] = dateUTC.getUTCMonth();
                masks['m'] = addLeadingZeros(masks['n']);
                return masks[mask];

            case 'd':
            case 'j':
                masks['d'] = dateUTC.getUTCDate();
                masks['j'] = addLeadingZeros(masks['d']);
                return masks[mask];
                
            case 'G':
            case 'H':
                masks['G'] = dateUTC.getUTCHours();
                masks['H'] = addLeadingZeros(masks['G']);
                return masks[mask];
                
            case 'i':
                masks['i'] = addLeadingZeros(dateUTC.getUTCMinutes());
                return masks[mask];

            case 's':
                masks['s'] = addLeadingZeros(dateUTC.getUTCSeconds());
                return masks[mask];
                
            case "N":
                //ISO 8601 numeric representation of the day of the week 1 (for Monday) through 7 (for Sunday)
            case "w":
                //Numeric representation of the day of the week 0 (for Sunday) through 6 (for Saturday)
                masks['w'] = dateUTC.getUTCDay();
                masks['N'] = masks['w'] === 0 ? 7 : masks['w'];
                
                return masks[mask];
            case "S":
                //English ordinal suffix for the day of the month, 2 characters st, nd, rd or th. Works well with j
                x = parseMask('j');
                if (x > 3 && x < 21) {
                    masks['S'] = "th";
                    return masks[mask];
                }
                switch (masks['j'].slice(-1)) {
                    case "1": masks['S'] = "st"; break;
                    case "2": masks['S'] = "nd"; break;
                    case "3": masks['S'] = "rd"; break;
                    default: masks['S'] = "th";
                }
                return masks[mask];
            case "z":
                //The day of the year (starting from 0) 0 through 365
            case "L":
                //Whether it's a leap year 1 if it is a leap year, 0 otherwise.
            case "W":
                //ISO 8601 week number of year, weeks starting on Monday Example: 42 (the 42nd week in the year)
            case "o":
                //ISO 8601 week-numbering year. This has the same value as Y, except that if the ISO week number (W) belongs to the previous or next year, that year is used instead. Examples: 1999 or 2003
                x = [new Date(parseMask('Y')+"-01-01T00:00:00+00:00")];
                x[1] = x[0].getUTCDay() === 0 ? 7 : x[0].getUTCDay();
                
                masks['z'] = (dateUTC.getTime() - x[0].getTime()) / (24 * 60 * 60 * 1000);
                masks['L'] = ((new Date((parseInt(masks['Y']) + 1)+"-01-01T00:00:00+00:00")).getTime() - x[0].getTime()) / (24 * 60 * 60 * 1000) - 365;
                masks['W'] = Math.ceil((masks['z'] + x[1]) / 7) - (x[1] < 5 ? 0 : 1);
                masks['o'] = masks['Y'];

                if (masks['W'] === 0) {
                    masks['o'] = parseInt(masks['Y']) - 1;

                    if (parseMask('N') == 5) {
                        masks['W'] = 53;
                    } else if (parseMask('N') == 7) {
                        masks['W'] = 52;
                    } else {
                        masks['W'] = 52 + ((x[0].getTime() - (new Date((parseInt(masks['Y']) - 1)+"-01-01T00:00:00+00:00")).getTime()) / (24 * 60 * 60 * 1000) - 365);
                    }
                }

                masks['W'] = addLeadingZeros(masks['W']);

                return masks[mask];
            case "t":
                //Number of days in the given month 28 through 31
                x = (parseInt(parseMask('m')) % 12) + 1;
                masks['t'] = (new Date((parseInt(parseMask('Y')) + (x === 1 ? 1 : 0))+"-"+addLeadingZeros(x)+"-01T00:00:00+01:00")).getUTCDate();
            
                return masks[mask];
            case "a":
                //Lowercase Ante meridiem and Post meridiem am or pm
            case "A":
                //Uppercase Ante meridiem and Post meridiem AM or PM
            case "g":
                //12-hour format of an hour without leading zeros 1 through 12
            case "h":
                //12-hour format of an hour with leading zeros 01 through 12
                x = IntlFormatParts(date, locale, {timeZone: timezone, hour:'numeric', hour12:true});
                masks['a'] = x.dayPeriod.toLowerCase();
                masks['A'] = masks['a'].toUpperCase();
                masks['g'] = x.hour;
                masks['h'] = addLeadingZeros(masks['g']);

                return masks[mask];
            case "I":
                //Whether or not the date is in daylight saving time 1 if Daylight Saving Time, 0 otherwise.
                x = [
                    IntlFormatParts(new Date(date.getTime() - 10368000000), 'en-US', {timeZone: timezone, hour: 'numeric', minute: 'numeric', hour12: false}),
                    IntlFormatParts(date, 'en-US', {timeZone: timezone, hour: 'numeric', minute: 'numeric', hour12: false}),
                    IntlFormatParts(new Date(date.getTime() + 10368000000), 'en-US', {timeZone: timezone, hour: 'numeric', minute: 'numeric', hour12: false}),
                ];

                x[3] = [
                    parseInt(x[0].hour) * 60 + parseInt(x[0].minute),
                    parseInt(x[1].hour) * 60 + parseInt(x[1].minute),
                    parseInt(x[2].hour) * 60 + parseInt(x[2].minute)
                ];

                x[4] = parseInt((x[3][0] + x[3][1] + x[3][2]) / 3);

                masks['I'] = 0;

                console.log(x[4], x[3][1]);
                if (x[4] !== x[3][1]) {
                    if (x[4] < x[3][1]) {
                        masks['I'] = 1;
                    }
                }
            
                return masks[mask];
            case "O":
                //Difference to Greenwich time (GMT) without colon between hours and minutes Example: +0200
            case "P":
                //Difference to Greenwich time (GMT) with colon between hours and minutes Example: +02:00
            case "p":
                //The same as P, but returns Z instead of +00:00 (available as of PHP 8.0.0) Examples: Z or +02:00
            case "Z":
                //Timezone offset in seconds. The offset for timezones west of UTC is always negative, and for those east of UTC is always positive. -43200 through 50400
                masks['Z'] = (dateUTC.getTime() - date.getTime())/1000;
                x = [(masks['Z'] < 0 ? '-' : '+'), addLeadingZeros(Math.floor(Math.abs(masks['Z']) / 3600)), addLeadingZeros(Math.floor(Math.floor(Math.abs(masks['Z']) / 60) % 60))];
                masks['O'] = x[0]+x[1]+x[2];
                masks['P'] = x[0]+x[1]+":"+x[2];
                masks['p'] = masks['Z'] === 0 ? 'Z' : masks['P'];

                return masks[mask];
            case "c":
                //ISO 8601 date 2004-02-12T15:19:21+00:00
                return masks['c'] = processFormat(String.raw`Y-m-d\TH:i:sP`);
            case "r":
                //» RFC 2822/» RFC 5322 formatted date Example: Thu, 21 Dec 2000 16:01:07 +0200
                return masks['r'] = processFormat(String.raw`D, j M Y H:i:s O`);
            case "U":
                //Seconds since the Unix Epoch (January 1 1970 00:00:00 GMT)
                return masks['U'] = date.getTime() / 1000;
        }

        return false;
    }
    
    function processFormat (format) {
        let res = [];
        let skipNext = false;

        format = format.split('');

        for (const k in format) {
            if (skipNext || !(format[k] in masks)) {
                res.push(format[k]);
                skipNext = false;
                continue;
            }

            if (format[k] === '\\') {
                skipNext = true;
                continue;
            }

            if ((x = parseMask(format[k])) !== false) {
                res.push(x);
            } else {
                res.push('#'+format[k]+'#');
            }
        }

        return res.join('');
    }

    return processFormat(format);
}

module.exports = PHPDate;