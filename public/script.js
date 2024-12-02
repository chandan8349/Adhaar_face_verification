document.addEventListener("DOMContentLoaded", () => {
    const fetchDetailsButton = document.getElementById("fetch-details");
    const verifyButton = document.getElementById("verify-button");
    const captureButton = document.getElementById("capture-button");
    const recaptureButton = document.getElementById("recapture-button");
    const webcamSection = document.getElementById("webcam-section");
    const video = document.getElementById("webcam");
    const canvas = document.getElementById("preview");

    let stream = null;
    let imageId = null; // Variable to hold the image ID for verification

    // Fetch Aadhaar details when "Fetch Details" is clicked
    fetchDetailsButton.addEventListener("click", async () => {
        const aadhaarNumber = document.getElementById("aadhaar-number").value;

        try {
            const response = await fetch("http://localhost:3000/getDetails", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ aadhaar_number: aadhaarNumber }),
            });

            if (!response.ok) {
                throw new Error("Aadhaar number is invallid.");
            }

            const data = await response.json();

            // Store the image ID from the response
            imageId = data._id;

            // Populate user details
            document.getElementById("user-name").innerText = `Name: ${data.full_name}`;
            document.getElementById("user-age").innerText = `Age: ${data.age}`; // Display age
            document.getElementById("user-gender").innerText = `Gender: ${data.gender}`;
            document.getElementById("user-address").innerText = `Address: ${data.address}`;
            document.getElementById("user-dob").innerText = `Date of Birth: ${new Date(data.dob).toLocaleDateString()}`; // Optional: Display DOB

            // Display the user image
            const userImage = document.getElementById("user-image");
            userImage.src = `http://localhost:3000/${data.image_path}`;
            userImage.alt = data.full_name;

            // Show user details and enable the webcam section
            document.getElementById("user-details").style.display = "block";
            webcamSection.style.display = "block";

            // Enable the capture button
            captureButton.disabled = false;

            // Initialize the webcam
            initWebcam();
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    });

    // Initialize the webcam feed
    function initWebcam() {
        navigator.mediaDevices.getUserMedia({ video: true }).then((newStream) => {
            stream = newStream; // Store the stream to stop later
            video.srcObject = stream;
            video.onloadedmetadata = () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
            };
            video.play();
        }).catch((error) => {
            console.error("Error accessing webcam:", error);
            alert("Unable to access webcam.");
        });
    }

    // Capture photo when the "Capture" button is clicked
    captureButton.addEventListener("click", captureImage);

    // Capture the image and stop the webcam
    function captureImage() {
        const context = canvas.getContext("2d");

        // Set canvas size to match video dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw the current video frame to the canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Stop the webcam stream after capturing the image
        const tracks = stream.getTracks();
        tracks.forEach((track) => track.stop());

        // Show the captured image
        const capturedImage = new Image();
        capturedImage.src = canvas.toDataURL("image/jpeg");
        capturedImage.onload = function() {
            document.getElementById("user-image").src = capturedImage.src;
            document.getElementById("user-image").style.display = "block";
        };

        // Hide the webcam feed
        video.style.display = "none";
        canvas.style.display = "none";

        // Show recapture and verify buttons
        recaptureButton.style.display = "inline-block";
        verifyButton.style.display = "inline-block";

        // Disable the capture button after capturing
        captureButton.disabled = true;
    }

    // Recapture the image when the "Recapture" button is clicked
    recaptureButton.addEventListener("click", () => {
        // Show the webcam feed again and reset the canvas
        video.style.display = "block";
        canvas.style.display = "block";
        captureButton.disabled = false;
        captureButton.style.display = "inline-block";
        
        // Hide the captured image
        document.getElementById("user-image").style.display = "none";

        // Restart the webcam feed for recapture
        initWebcam();

        // Hide the recapture and verify buttons
        recaptureButton.style.display = "none";
        verifyButton.style.display = "none";
    });

    // Verify the captured image when the "Verify" button is clicked
    verifyButton.addEventListener("click", async () => {
        if (!imageId) {
            alert("No Aadhaar record found for verification.");
            return;
        }

        const imageBase64 = canvas.toDataURL("image/jpeg");

        try {
            const response = await fetch("http://localhost:3000/verifyFace", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    image: imageBase64,
                    image_id: imageId  // Send the image ID for verification
                }),
            });

            const result = await response.json();
            if (response.ok) {
                document.getElementById("result-message").innerText = `Face verification result: ${result.message}`;
            } else {
                throw new Error(result.error || "Face verification failed.");
            }
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    });
});