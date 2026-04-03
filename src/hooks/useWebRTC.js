import { useEffect, useRef, useState } from 'react';
import { ref, set, onValue, push, onChildAdded } from 'firebase/database';
import { rtdb } from '../firebase/config';

const servers = {
  iceServers: [
    { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }
  ]
};

export function useWebRTC(roomId) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [role, setRole] = useState(null); // 'caller' | 'callee'

  const pcRef = useRef(null);

  // 1. Setup local camera
  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.warn('Microphone/Camera access denied or not available.', err);
      return null;
    }
  };

  // 2. Core RTC Setup
  const createPeerConnection = (stream) => {
    const pc = new RTCPeerConnection(servers);

    // Push local tracks to PC
    if (stream) {
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    }

    // Listen for remote tracks
    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach(track => {
        setRemoteStream(prev => {
          const newStream = prev || new MediaStream();
          if (!newStream.getTracks().find(t => t.id === track.id)) {
             newStream.addTrack(track);
          }
          return newStream;
        });
      });
    };

    pcRef.current = pc;
    return pc;
  };

  // 3. Become Tutor (Caller)
  const startCall = async () => {
    setRole('caller');
    const stream = localStream || await initializeMedia();
    const pc = createPeerConnection(stream);
    
    // Create Offer
    const offerDescription = await pc.createOffer();
    await pc.setLocalDescription(offerDescription);
    
    // Save Offer to Firebase
    const offer = { type: offerDescription.type, sdp: offerDescription.sdp };
    await set(ref(rtdb, `sessions/${roomId}/offer`), offer);

    // Listen for Callee Answer
    onValue(ref(rtdb, `sessions/${roomId}/answer`), (snapshot) => {
      const data = snapshot.val();
      if (data && !pc.currentRemoteDescription) {
        const answerDescription = new RTCSessionDescription(data);
        pc.setRemoteDescription(answerDescription);
      }
    });

    // Listen for Callee ICE candidates
    onChildAdded(ref(rtdb, `sessions/${roomId}/calleeCandidates`), (snapshot) => {
      const data = snapshot.val();
      if (data) pc.addIceCandidate(new RTCIceCandidate(data));
    });

    // Save Caller ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        push(ref(rtdb, `sessions/${roomId}/callerCandidates`), event.candidate.toJSON());
      }
    };
  };

  // 4. Become Student (Callee)
  const joinCall = async () => {
    setRole('callee');
    const stream = localStream || await initializeMedia();
    const pc = createPeerConnection(stream);

    // Read Offer from Firebase
    onValue(ref(rtdb, `sessions/${roomId}/offer`), async (snapshot) => {
      const offerData = snapshot.val();
      if (offerData && !pc.currentRemoteDescription) {
        const offerDescription = new RTCSessionDescription(offerData);
        await pc.setRemoteDescription(offerDescription);

        // Create Answer
        const answerDescription = await pc.createAnswer();
        await pc.setLocalDescription(answerDescription);

        // Save Answer
        const answer = { type: answerDescription.type, sdp: answerDescription.sdp };
        await set(ref(rtdb, `sessions/${roomId}/answer`), answer);
      }
    });

    // Listen for Caller ICE candidates
    onChildAdded(ref(rtdb, `sessions/${roomId}/callerCandidates`), (snapshot) => {
      const data = snapshot.val();
      if (data) pc.addIceCandidate(new RTCIceCandidate(data));
    });

     // Save Callee ICE candidates
     pc.onicecandidate = (event) => {
      if (event.candidate) {
        push(ref(rtdb, `sessions/${roomId}/calleeCandidates`), event.candidate.toJSON());
      }
    };
  };

  // Prevent memory leaks
  useEffect(() => {
    return () => {
      if (pcRef.current) pcRef.current.close();
      if (localStream) localStream.getTracks().forEach(track => track.stop());
    };
  }, []);

  return { localStream, remoteStream, role, startCall, joinCall };
}
