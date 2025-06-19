let video;
let bodyPose;
let connections;
let poses = [];
let lerpPoints;
let angle = 0;
let feetHeight = 0;
let hip_x = 0;
let hip_y = 0;
let groundY = 1;
let pixel2world = 0.005;
let poseHistory = [];
let font;
let numSeconds = 4.9484536082;
let recording = false;
let clearPoses = false;
let poseIndex = 0;
let avgPoseError = 0;
let poseErrors = [];

function preload() {
  bodyPose = ml5.bodyPose("BlazePose", {flipped: true});
  font = loadFont('Inconsolata.otf');
}

function mousePressed() {
  console.log(poses);
  let feetY = (poses[0].left_heel.keypoint3D.y + poses[0].right_heel.keypoint3D.y) / 2 + hip_y;
  feetHeight = (feetY - groundY) * -1;
  console.log(feetHeight);
}

function gotPoses(results) {
  poses = results;
}

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  video = createCapture(VIDEO, {flipped: true});
  video.hide();
  bodyPose.detectStart(video, gotPoses);
  connections = bodyPose.getSkeleton();
}

function draw() {
  
  // Draw video
  let newWidth = video.elt.videoWidth / 3;
  let newHeight = video.elt.videoHeight / 3;
  background(0);
  textFont(font);
  fill('yellow');
  recording = floor(frameCount / (numSeconds * 60)) % 2 == 0;
  clearPoses = frameCount % (numSeconds * 60 * 2) == 0;
  poseIndex = frameCount % (numSeconds * 60);
  let str = recording ? "RECORDING YOUR MOVES!" : "NOW MATCH THOSE MOVES";
  textSize(48);
  text(`${str}, ERROR: ${avgPoseError}`, -width/2, height/2.2);
  if (clearPoses) {
    console.log("clearing poses");
    poseHistory = [];
    avgPoseError = 0;
    poseErrors = [];
  }
  image(video, width/2 - newWidth, height/2 - newHeight, newWidth, newHeight)
  rotateY(PI);
  scale(height/2);
  translate(0, -0.5);
  
  if (poses.length > 0) {
    let pose = poses[0]; // first skeleton's pose
    
    // Add displacement for hip
    hip_x = ((poses[0].left_hip.x + poses[0].right_hip.x)/2 - video.elt.videoWidth/2) * -pixel2world;
    hip_y = ((poses[0].left_hip.y + poses[0].right_hip.y)/2 - video.elt.videoHeight/2 + feetHeight) * pixel2world;
    
    // Initialize interpolation points on first detection
    if (!lerpPoints) {
      lerpPoints = [];
      for (let i = 0; i < pose.keypoints.length; i++) {
        lerpPoints[i] = createVector();
      }
    }
    let newLerpPoints = [];
    let curFrameError = 0;
    // Smoothly interpolate keypoints
    for (let i = 0; i < pose.keypoints.length; i++) {
      let keypoint = pose.keypoints3D[i];
      let lerpPoint = lerpPoints[i];
      let amt = 0.1;
      let newLerpPoint = createVector();
      newLerpPoint.x = lerp(lerpPoint.x, keypoint.x, amt);
      newLerpPoint.y = lerp(lerpPoint.y, keypoint.y, amt);
      newLerpPoint.z = lerp(lerpPoint.z, keypoint.z, amt);
      newLerpPoints[i] = newLerpPoint;

      if (!recording) {
        let error = dist(newLerpPoint.x, newLerpPoint.y, newLerpPoint.z, lerpPoint.x, lerpPoint.y, lerpPoint.z);
        curFrameError += error;
      }
      
      // Draw interpolated keypoints
      stroke(255, 0, 255);
      strokeWeight(16);
      if (keypoint.confidence > 0.1) {
        push();
        translate(lerpPoint.x + hip_x, lerpPoint.y + hip_y + feetHeight, lerpPoint.z);
        point(0, 0);
        pop();
      }
    }

    if (!recording) {
      poseErrors.push(curFrameError);
      let sum = 0;
      for (let e of poseErrors) {
        sum += e;
      }
      avgPoseError = sum / poseErrors.length;
      console.log(avgPoseError);
    }

    if (recording) {
      poseHistory.push(newLerpPoints);
    }
    lerpPoints = newLerpPoints;
    
    // Draw interpolated skeleton connections
    for (let i = 0; i < connections.length; i++) {
      let connection = connections[i];
      let a = connection[0];
      let b = connection[1];
      let keyPointA = pose.keypoints3D[a];
      let keyPointB = pose.keypoints3D[b];
      let lerpPointA = lerpPoints[a];
      let lerpPointB = lerpPoints[b];
      
      if (keyPointA.confidence > 0.1 && keyPointB.confidence > 0.1) {
        stroke(0, 255, 255);
        strokeWeight(10);
        beginShape();
        vertex(lerpPointA.x + hip_x, lerpPointA.y + hip_y + feetHeight, lerpPointA.z);
        vertex(lerpPointB.x + hip_x, lerpPointB.y + hip_y + feetHeight, lerpPointB.z);
        endShape();
      }
    }
    
    // Draw ground plane
    stroke(255);
    rectMode(CENTER);
    strokeWeight(1);
    fill(255, 100);
    translate(0,groundY);
    rotateX(PI/2);
    square(0, 0, 2)
  }
}