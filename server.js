require("dotenv").config();

const app = require("./app");
const { testConnection } = require("./src/config/db");

const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        await testConnection();

        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Không thể khởi động server:");
        console.error(error.message);

        process.exit(1);
    }
}

startServer();