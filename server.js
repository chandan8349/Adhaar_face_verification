const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const fs = require("fs");
const { execFile } = require("child_process");

const app = express();
const port = 3000;

// Middleware for parsing JSON and handling uploads
app.use(express.json());
app.use(express.static("public")); // Serve static files like images

app.use("/images", express.static("public/image")); // Serve images from 'public/image'

const upload = multer({ storage: multer.memoryStorage() });

// MongoDB connection
mongoose.connect("mongodb://localhost:27017/demo", { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => console.error("MongoDB connection error:", err));

// Schema and Model for Aadhaar data
const aadhaarSchema = new mongoose.Schema({
    full_name: String,
    gender: String,
    aadhaar_number: String,
    address: String,
    image_path: String,
    dob: Date  // Add the date of birth field here
});

const Aadhaar = mongoose.model("Aadhaar", aadhaarSchema);

// Fetch Aadhaar details by Aadhaar number
app.post("/getDetails", async (req, res) => {
    const { aadhaar_number } = req.body;

    try {
        const user = await Aadhaar.findOne({ aadhaar_number });
        if (!user) {
            return res.status(404).json({ error: "Aadhaar number not found" });
        }

        // Calculate age if dob exists in the database
        const currentDate = new Date();
        const dob = new Date(user.dob);
        const age = currentDate.getFullYear() - dob.getFullYear();
        const monthDifference = currentDate.getMonth() - dob.getMonth();

        // Adjust age if birthday hasn't occurred yet this year
        if (monthDifference < 0 || (monthDifference === 0 && currentDate.getDate() < dob.getDate())) {
            age--;
        }

        res.json({
            full_name: user.full_name,
            age,
            gender: user.gender,
            address: user.address,
            image_path: user.image_path, // Send the image path for face comparison
            _id: user._id, // Send the _id for further use
            dob: user.dob // Send the dob for reference
        });
    } catch (error) {
        console.error("Error fetching details:", error);
        res.status(500).json({ error: "Server error" });
    }
});

//face verification
app.post("/verifyFace", async (req, res) => {
    const tempDir = "./temp";
    const imagePath = `${tempDir}/captured_face.jpg`;

    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
    }

    try {
        const { image, image_id } = req.body;

        // Decode and save the captured image
        const base64Data = image.replace(/^data:image\/jpeg;base64,/, "");
        fs.writeFileSync(imagePath, base64Data, "base64");

        // Fetch the stored image path from MongoDB
        const document = await Aadhaar.findById(image_id);
        if (!document) {
            return res.status(404).json({ error: "Document not found" });
        }

        const storedImagePath = document.image_path;

        // Call the Python script for face recognition
        execFile("python", ["face_recognition.py", imagePath, storedImagePath], (error, stdout, stderr) => {
            if (error) {
                console.error("Face recognition error:", stderr);
                return res.status(500).json({ error: "Face recognition failed" });
            }

            const output = stdout.trim();
            res.json({ message: output });
        });
    } catch (error) {
        console.error("Error processing face verification:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});