import express from "express";
import cors from "cors";
import { createJwtRouter } from "jwt-email-issuer/express";

const app = express();
app.use(express.json());

app.use(cors({ origin: "http://localhost:5173", credentials: true }));

app.use(createJwtRouter({
  issuer: "com.example.issuer",
  audience: "com.example.web",
  expiresIn: "10m",
}));

app.listen(3000, () => console.log("Server on http://localhost:3000"));
