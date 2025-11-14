from flask import Flask, request, jsonify
import numpy as np
import os
import base64
import cv2
import mediapipe as mp
from flask_cors import CORS
import pickle
import torch
import pandas as pd
import time
import random

from ultralytics import YOLO  # <-- Import YOLOv8

app = Flask(__name__)
CORS(app)

# Global variables
mp_pose = mp.solutions.pose
pose = mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.7, model_complexity=2)

user_states = {}

# Load YOLOv8 model
model = YOLO('yolov8n.pt')  # <-- Load YOLOv8 nano model
model.fuse()
# Load YOLO model for person detection
def detect_person(frame):
    try:
        results = model.predict(source=frame, imgsz=640, conf=0.5, classes=[0], verbose=False)
        if not results or not results[0].boxes: 
            return False, None
        boxes = results[0].boxes.xyxy.cpu().numpy()
        return True, boxes
    except Exception as e:
        print(f"Error in YOLO detection: {e}")
        return False, None

# Load classification models
models = {}

def load_models():
    try:
        models['benchpress'] = pickle.load(open('models3/benchpress.pkl', 'rb'))
        models['squat'] = pickle.load(open('models3/squat.pkl', 'rb'))
        models['deadlift'] = pickle.load(open('models3/deadlift.pkl', 'rb'))
        print("All models loaded successfully")
        return True
    except Exception as e:
        print(f"Error loading models: {e}")
        return False

def most_frequent(data):
    if not data:
        return None
    return max(data, key=data.count)

def calculate_angle(a, b, c):
    a, b, c = np.array(a), np.array(b), np.array(c)
    radians = np.arctan2(c[1]-b[1], c[0]-b[0]) - np.arctan2(a[1]-b[1], a[0]-b[0])
    angle = np.abs(radians * 180.0 / np.pi)
    return angle if angle <= 180.0 else 360 - angle

@app.route('/status', methods=['GET'])
def status():
    return jsonify({"status": "online"})

@app.route('/analyze', methods=['POST'])
def analyze_pose():
    data = request.json
    if not data or 'keypoints' not in data or 'exercise' not in data:
        return jsonify({"error": "Invalid data format"}), 400
    
    session_id = request.remote_addr
    exercise = data['exercise'].lower()
    row = data['keypoints']
    
    return process_pose_data(row, exercise, session_id)

@app.route('/analyze-frame', methods=['POST'])
@app.route('/analyze-frame', methods=['POST'])
def analyze_frame():
    data = request.json
    if not data or 'image' not in data or 'exercise' not in data:
        return jsonify({"error": "Invalid data format - need image and exercise"}), 400
    
    try:
        exercise = data['exercise'].lower()
        image_data = data['image']
        if ',' in image_data:
            image_data = image_data.split(',', 1)[1]
        
        image_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # Detect person
        person_detected, boxes = detect_person(frame)
        if not person_detected:
            return jsonify({"feedback": "No person detected, please adjust your camera."}), 200
        
        for box in boxes:
            x1, y1, x2, y2 = map(int, box)
            object_frame = frame[y1:y2, x1:x2]
            if object_frame.size == 0:
                continue

            object_frame_rgb = cv2.cvtColor(object_frame, cv2.COLOR_BGR2RGB)
            results_pose = pose.process(object_frame_rgb)
            
            if results_pose.pose_landmarks:
                row = [coord for res in results_pose.pose_landmarks.landmark 
                       for coord in [res.x, res.y, res.z, res.visibility]]
                session_id = request.remote_addr
                return process_pose_data(row, exercise, session_id)

        return jsonify({"error": "Could not detect pose landmarks."}), 400

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Error processing image: {str(e)}"}), 500

def process_pose_data(row, exercise, session_id):
    if exercise not in models:
        return jsonify({"error": f"Model for {exercise} not loaded"}), 400
    
    try:
        X = pd.DataFrame([row])
        exercise_class = models[exercise].predict(X)[0]
        exercise_class_prob = models[exercise].predict_proba(X)[0]
        max_prob = exercise_class_prob[exercise_class_prob.argmax()]
        
        if session_id not in user_states:
            user_states[session_id] = {
                "current_stage": "",
                "exercise": exercise,
                "counter": 0,
                "posture_status": [],
                "previous_alert_time": 0
            }
        
        current_state = user_states[session_id]
        
        if current_state["exercise"] != exercise:
            current_state.update({
                "exercise": exercise,
                "current_stage": "",
                "counter": 0,
                "posture_status": []
            })
        
        form_feedback = ""
        feedback_type = "info"
        count_rep = False
        new_stage = current_state["current_stage"]
        
        if "down" in exercise_class:
            new_stage = "down"
            current_state["posture_status"].append(exercise_class)
        elif current_state["current_stage"] == "down" and "up" in exercise_class:
            new_stage = "up"
            current_state["counter"] += 1
            current_state["posture_status"].append(exercise_class)
            count_rep = True
            
            posture = most_frequent(current_state["posture_status"])
            current_time = time.time()
            
            if "correct" not in posture:
                if current_time - current_state["previous_alert_time"] >= 3:
                    current_state["previous_alert_time"] = current_time
                    feedback_type = "error"
                    
                    if "excessive_arch" in posture:
                        form_feedback = random.choice([
                            "Avoid arching your lower back too much; try to keep it natural.",
                            "Lift your pelvis a bit and tighten your abs to keep your back flat."
                        ])
                    elif "arms_spread" in posture:
                        form_feedback = random.choice([
                            "Your grip is too wide. Hold the bar a bit narrower.",
                            "When gripping the bar, hold it slightly wider than shoulder width."
                        ])
                    elif "spine_neutral" in posture:
                        form_feedback = random.choice([
                            "Avoid excessive curvature of the spine.",
                            "Lift your chest and push your shoulders back."
                        ])
                    elif "caved_in_knees" in posture:
                        form_feedback = random.choice([
                            "Be cautious not to let your knees cave in during the squat.",
                            "Push your hips back to keep your knees and toes in a straight line."
                        ])
                    elif "feet_spread" in posture:
                        form_feedback = "Narrow your stance to about shoulder width."
                    elif "arms_narrow" in posture:
                        form_feedback = "Your grip is too narrow. Hold the bar a bit wider."
                    
                    current_state["posture_status"] = []
            else:
                form_feedback = "You are performing the exercise with the correct posture."
                current_state["posture_status"] = []
        
        user_states[session_id]["current_stage"] = new_stage
        
        result = {
            "class_name": exercise_class,
            "stage": new_stage,
            "count_rep": count_rep,
            "counter": current_state["counter"],
            "form_feedback": form_feedback,
            "feedback_type": feedback_type,
            "confidence": float(max_prob)
        }
        
        return jsonify(result)
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Error processing pose data: {str(e)}"}), 500

if __name__ == '__main__':
    if load_models():
        app.run(host='0.0.0.0', port=5050, debug=True)
    else:
        print("Failed to load models. Server not started.")
