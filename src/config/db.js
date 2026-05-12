const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "healthcare_prediction",

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,

    charset: "utf8mb4"
});

async function testConnection() {
    try {
        const connection = await pool.getConnection();

        console.log("MySQL Connected");

        connection.release();
    } catch (error) {
        console.error("MySQL Connection Failed:");
        console.error(error.message);

        process.exit(1);
    }
}

module.exports = {
    pool,
    testConnection
};