function healthCheck(req, res) {
    return res.json({
        status: "success",
        message: "Healthcare Prediction API is running"
    });
}

module.exports = {
    healthCheck
};