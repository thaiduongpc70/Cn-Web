const express = require("express");
const path = require("path");
const routes = require("./src/routes");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "src/views"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

app.use("/api", routes);

app.get("/", (req, res) => {
    res.render("index");
});

app.get("/auth", (req, res) => {
    res.render("auth");
});

app.get("/admin", (req, res) => {
    res.render("admin");
});

app.get("/basic", (req, res) => {
    res.render("basic");
});

app.get("/advanced", (req, res) => {
    res.render("advanced");
});

app.get("/select-method", (req, res) => {
    res.render("select_method");
});

app.use((req, res) => {
    res.status(404).render("index");
});

app.use((err, req, res, next) => {
    console.error("Lỗi hệ thống:", err);

    res.status(500).json({
        message: "Đã có lỗi xảy ra trên server!"
    });
});

module.exports = app;