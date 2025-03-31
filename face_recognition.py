import os
import cv2
import requests
import base64
import sys

# Replace with your Face++ API key and secret
API_KEY = "Enter Your Api Key"
API_SECRET = "Enter Your secret Key"

# API URLs
FACE_DETECT_URL = "https://api-us.faceplusplus.com/facepp/v3/detect"
FACE_COMPARE_URL = "https://api-us.faceplusplus.com/facepp/v3/compare"

# Function to detect faces in an image (returns base64-encoded image)
def detect_faces(image):
    _, img_encoded = cv2.imencode('.jpg', image)
    img_base64 = base64.b64encode(img_encoded.tobytes()).decode("utf-8")
    data = {
        "api_key": API_KEY,
        "api_secret": API_SECRET,
        "image_base64": img_base64,
        "return_landmark": "1", 
        "return_attributes": "age,gender,emotion"
    }

    response = requests.post(FACE_DETECT_URL, data=data)
    result = response.json()

    if "faces" in result and len(result["faces"]) > 0:
        print(f"Detected {len(result['faces'])} face(s).")
        return result["faces"]
    else:
        print("No faces detected.")
        return None

def compare_faces(face1_image, face2_image):
    if face2_image is None:
        print("Error: Second image failed to load.")
        return False
    
    _, img_encoded1 = cv2.imencode('.jpg', face1_image)
    img_base64_1 = base64.b64encode(img_encoded1.tobytes()).decode("utf-8")
    
    _, img_encoded2 = cv2.imencode('.jpg', face2_image)
    img_base64_2 = base64.b64encode(img_encoded2.tobytes()).decode("utf-8")

    data = {
        "api_key": API_KEY,
        "api_secret": API_SECRET,
        "image_base64_1": img_base64_1,
        "image_base64_2": img_base64_2
    }

    response = requests.post(FACE_COMPARE_URL, data=data)
    result = response.json()

    if "confidence" in result:
        print(f"Faces comparison confidence: {result['confidence']}")
        if result["confidence"] > 80:
            print("Faces match!")
            return True
        else:
            print("Faces do not match.")
            return False
    else:
        print("Error comparing faces:", result)
        return False

# Main function to capture and compare
if __name__ == "__main__":
    # Get paths from command line arguments
    captured_image_path = sys.argv[1]
    stored_image_path = sys.argv[2]

    # Read the images
    captured_face = cv2.imread(captured_image_path)
    stored_face = cv2.imread(stored_image_path)

    # Compare the faces
    if captured_face is None:
        print(f"Error: Could not load the captured image at {captured_image_path}.")
    elif stored_face is None:
        print(f"Error: Could not load the stored image at {stored_image_path}.")
    else:
        if compare_faces(captured_face, stored_face):
            print("Verification successful!")
        else:
            print("Verification failed.")
