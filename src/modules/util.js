module.exports.getThirdMondayDay = getThirdMondayDay;
function getThirdMondayDay(year, month) {
    var d = new Date(year, month-1),
        m = d.getMonth(),
        mondays = [];

    d.setDate(1);

    // Get the first Monday in the month
    while (d.getDay() !== 1) {
        d.setDate(d.getDate() + 1);
    }

    return d.getDate() + 14;
}