const express = require("express");
const app = express();
app.use(express.json());
app.get("/health", (req, res) => res.json({ status: "OK" }));
app.post("/events", (req, res) => res.json({ received: true }));
app.listen(process.env.PORT || 8080, "0.0.0.0", () => console.log("Mock Sink on 8080"));
