const moment = require("moment-timezone")


//Obtener la fecha de hoy, 03 AM para no tener errores por la zona horaria
const today = () => {
    let newdate
    newdate = moment.tz(new Date(), 'YYYY-MM-DD', 'America/Argentina/Buenos_Aires').startOf('day').toDate()
    return newdate
}

module.exports = {
    today
}