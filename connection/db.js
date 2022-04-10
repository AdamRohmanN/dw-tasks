const {Pool} = require('pg')

const dbPool = new Pool({
    database: 'dw_tasks',
    port: 3210,
    user: 'postgres',
    password: 'justopen'
})

module.exports = dbPool