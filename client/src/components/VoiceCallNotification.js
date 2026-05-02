import React, { useState, useEffect, useRef } from 'react';

const VoiceCallNotification = ({ socket }) => {
  const [incomingCall, setIncomingCall] = useState(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const audioRef = useRef(null);
  const callTimerRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    console.log('🔌 Setting up voice call listeners');

    socket.on('incomingVoiceCall', (data) => {
      console.log('📞 Incoming voice call from Table', data.tableId);
      setIncomingCall(data);
      playRingtone();
    });

    socket.on('callEnded', () => {
      console.log('📞 Call ended');
      endCall();
    });

    return () => {
      socket.off('incomingVoiceCall');
      socket.off('callEnded');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  // Timer for call duration
  useEffect(() => {
    if (isCallActive) {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
      setCallDuration(0);
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [isCallActive]);

  const playRingtone = () => {
    // Create a simple ringtone using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);

    // Repeat ringtone
    setTimeout(() => {
      if (incomingCall) playRingtone();
    }, 1000);
  };

  const acceptCall = async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      // Setup peer connection
      const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }]
      });

      peerConnectionRef.current = peerConnection;

      // Add local stream
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        if (audioRef.current) {
          audioRef.current.srcObject = event.streams[0];
        }
      };

      // Create and send offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      socket.emit('acceptVoiceCall', {
        callId: incomingCall.callId,
        tableId: incomingCall.tableId,
        offer: offer
      });

      setIsCallActive(true);
      setIncomingCall(null);
    } catch (error) {
      console.error('Error accepting call:', error);
      alert('Failed to access microphone. Please check permissions.');
    }
  };

  const rejectCall = () => {
    socket.emit('rejectVoiceCall', {
      callId: incomingCall.callId,
      tableId: incomingCall.tableId
    });
    setIncomingCall(null);
  };

  const endCall = () => {
    // Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    setIsCallActive(false);
    setIncomingCall(null);
    setCallDuration(0);

    socket.emit('endVoiceCall');
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Incoming call notification
  if (incomingCall && !isCallActive) {
    return (
      <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
        <div className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg shadow-2xl p-4 min-w-[300px]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                <span className="text-xl">📞</span>
              </div>
              <div>
                <p className="font-bold text-lg">Incoming Call</p>
                <p className="text-sm text-red-100">Table {incomingCall.tableId}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={acceptCall}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition"
            >
              ✓ Accept
            </button>
            <button
              onClick={rejectCall}
              className="flex-1 bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-4 rounded-lg transition"
            >
              ✕ Reject
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active call display
  if (isCallActive) {
    return (
      <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg shadow-2xl p-4 min-w-[300px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-lg">📞</span>
              </div>
              <div>
                <p className="font-bold">Call Active</p>
                <p className="text-sm text-green-100">{formatDuration(callDuration)}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={toggleMute}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition ${
                  isMuted
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                {isMuted ? '🔇' : '🔊'}
              </button>
              <button
                onClick={endCall}
                className="w-10 h-10 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <audio ref={audioRef} autoPlay />
    </>
  );
};

export default VoiceCallNotification;
