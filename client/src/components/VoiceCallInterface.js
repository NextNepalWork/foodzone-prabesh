import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { getSocketUrl } from '../config/api';
import settingsService from '../services/settingsService';

const VoiceCallInterface = ({ tableId, onCallEnd }) => {
  const [callState, setCallState] = useState('calling'); // calling, connected, ended, busy, rejected
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [isOnSpeaker, setIsOnSpeaker] = useState(true); // Always on by default
  const [statusMessage, setStatusMessage] = useState('');
  const socketRef = useRef(null);
  const callTimerRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const audioRef = useRef(null);
  const callIdRef = useRef(null);
  const ringingToneRef = useRef(null);
  const audioContextRef = useRef(null);
  const onCallEndRef = useRef(onCallEnd);
  useEffect(() => { onCallEndRef.current = onCallEnd; }, [onCallEnd]);

  // Force speaker on for all devices
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = false;
      audioRef.current.volume = 1.0;
      // Try to enable speaker on mobile devices
      if (audioRef.current.setSinkId) {
        audioRef.current.setSinkId('').catch(err => console.log('Speaker output:', err));
      }
    }
  }, []);

  // Initialize WebRTC and Socket connection
  useEffect(() => {
    // StrictMode-safe cancellation: cleanup may run during an await on the
    // first mount, so we must short-circuit the rest of initializeCall and
    // tear down anything that was created before the cancel.
    let cancelled = false;
    let localStream = null;
    let localPC = null;
    let localSocket = null;

    const initializeCall = async () => {
      try {
        // 1) Get user's audio stream FIRST (so PC is ready before signaling)
        console.log('🎤 VoiceCallInterface: Requesting microphone access...');
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: false
        });
        if (cancelled) {
          console.log('🚫 VoiceCallInterface: cancelled after getUserMedia');
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        localStream = stream;
        localStreamRef.current = stream;
        console.log('✅ VoiceCallInterface: Microphone access granted');

        // 2) Create peer connection
        const peerConnection = new RTCPeerConnection({
          iceServers: [
            { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }
          ]
        });
        localPC = peerConnection;
        peerConnectionRef.current = peerConnection;
        console.log('📡 VoiceCallInterface: Peer connection created');

        // Add local stream tracks
        stream.getTracks().forEach(track => {
          peerConnection.addTrack(track, stream);
          console.log('📤 VoiceCallInterface: Added track:', track.kind);
        });

        // Remote stream
        peerConnection.ontrack = (event) => {
          console.log('📥 VoiceCallInterface: Received remote track:', event.track.kind);
          if (audioRef.current && event.streams[0]) {
            audioRef.current.srcObject = event.streams[0];
            audioRef.current.play?.().catch(e => console.log('audio play:', e));
            console.log('🔊 VoiceCallInterface: Remote audio stream set');
          }
        };

        peerConnection.oniceconnectionstatechange = () => {
          console.log('🧊 VoiceCallInterface: ICE state:', peerConnection.iceConnectionState);
          if (['connected', 'completed'].includes(peerConnection.iceConnectionState)) {
            setCallState('connected');
          }
        };

        peerConnection.onconnectionstatechange = () => {
          console.log('📡 VoiceCallInterface: PC state:', peerConnection.connectionState);
        };

        if (cancelled) {
          console.log('🚫 VoiceCallInterface: cancelled before socket create');
          return;
        }

        // 3) Initialize socket AFTER PC is ready, but register listeners BEFORE connect
        const sock = io(getSocketUrl());
        localSocket = sock;
        socketRef.current = sock;
        console.log('📱 VoiceCallInterface: Socket initialized');

        // ICE candidates: queued until callId known (sent inside callback using ref)
        peerConnection.onicecandidate = (event) => {
          if (event.candidate && sock && callIdRef.current) {
            console.log('🧊 VoiceCallInterface: Sending ICE candidate');
            sock.emit('iceCandidate', {
              candidate: event.candidate,
              callId: callIdRef.current
            });
          }
        };

        // Register ALL listeners BEFORE emitting initiateVoiceCall to avoid races
        sock.on('callAccepted', async (data) => {
          console.log('✅ Call accepted by reception, callId:', data.callId);
          try {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            console.log('📤 VoiceCallInterface: Sending offer, callId=', data.callId);
            sock.emit('offer', {
              offer,
              callId: data.callId,
              tableId
            });
          } catch (err) {
            console.error('❌ VoiceCallInterface: Error creating offer:', err);
          }
        });

        sock.on('answer', async (data) => {
          console.log('📥 VoiceCallInterface: Received answer, callId=', data.callId);
          try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
            setCallState('connected');
            console.log('✅ VoiceCallInterface: Remote description set, call connected');
          } catch (err) {
            console.error('❌ VoiceCallInterface: Error setting remote description:', err);
          }
        });

        sock.on('iceCandidate', async (data) => {
          console.log('🧊 VoiceCallInterface: Received ICE candidate');
          try {
            if (data.candidate) {
              await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
          } catch (err) {
            console.error('❌ VoiceCallInterface: Error adding ICE candidate:', err);
          }
        });

        sock.on('callRejected', () => {
          console.log('❌ Call rejected');
          const timeouts = settingsService.getTimeoutSettings();
          setStatusMessage('Reception is unable to take your call right now.');
          setCallState('rejected');
          setTimeout(() => onCallEndRef.current(), timeouts.callRejectionDelayMs);
        });

        sock.on('callTimedOut', (data) => {
          console.log('⏰ Call timed out, reception busy');
          const timeouts = settingsService.getTimeoutSettings();
          setStatusMessage((data && data.message) || 'Reception is busy. Please try again in a moment.');
          setCallState('busy');
          setTimeout(() => onCallEndRef.current(), timeouts.callBusyDelayMs);
        });

        sock.on('callEnded', () => {
          const timeouts = settingsService.getTimeoutSettings();
          console.log('📞 Call ended by reception');
          setCallState('ended');
          setTimeout(() => onCallEndRef.current(), timeouts.callEndedDelayMs);
        });

        // Emit initiateVoiceCall at most once for this component instance.
        // Also guard against cancellation that happens between socket create and connect.
        let didInitiate = false;
        const doInitiate = () => {
          if (didInitiate) return;
          if (cancelled) {
            console.log('🚫 VoiceCallInterface: cancelled, skipping initiate emit');
            return;
          }
          didInitiate = true;
          callIdRef.current = sock.id;
          console.log('📞 VoiceCallInterface: Emitting initiateVoiceCall, callId=', callIdRef.current);
          sock.emit('initiateVoiceCall', {
            tableId,
            reason: 'Order'
          });
        };

        sock.on('connect', () => {
          console.log('📱 VoiceCallInterface: Socket connected, ID:', sock.id);
          doInitiate();
        });

        if (sock.connected) {
          console.log('📞 VoiceCallInterface: Socket was pre-connected, initiating');
          doInitiate();
        }

      } catch (error) {
        console.error('❌ VoiceCallInterface: Error initializing call:', error);
        if (!cancelled) {
          const timeouts = settingsService.getTimeoutSettings();
          setCallState('ended');
          setTimeout(() => onCallEndRef.current(), timeouts.callEndedDelayMs);
        }
      }
    };

    initializeCall();

    return () => {
      cancelled = true;
      stopRingingTone();
      // Tear down whatever was created in this effect instance, using the
      // local variables (not refs) so StrictMode's first cleanup doesn't
      // wipe the second mount's state.
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (localPC) {
        try { localPC.close(); } catch (_) {}
      }
      if (localSocket) {
        try { localSocket.removeAllListeners(); } catch (_) {}
        try { localSocket.disconnect(); } catch (_) {}
      }
    };
    // Initialize once per mount; onCallEnd accessed via ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Play ringing tone while calling
  useEffect(() => {
    if (callState === 'calling') {
      console.log('📞 VoiceCallInterface: Starting ringing tone');
      playRingingTone();
    } else {
      stopRingingTone();
    }

    return () => {
      stopRingingTone();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callState]);

  // Timer for call duration
  useEffect(() => {
    if (callState === 'connected') {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [callState]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Play ringing tone while calling
  const playRingingTone = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      const audioContext = audioContextRef.current;
      
      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          playRingingTone();
        });
        return;
      }

      // Create ringing tone (different from ringtone - more like a phone ringing)
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Ringing pattern: 440Hz (A note) for phone ringing
      oscillator.frequency.value = 440;
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.6);
      
      // Repeat every dynamic interval
      const timeouts = settingsService.getTimeoutSettings();
      ringingToneRef.current = setTimeout(() => {
        if (callState === 'calling') {
          playRingingTone();
        }
      }, timeouts.ringingToneIntervalMs);
    } catch (error) {
      console.error('❌ VoiceCallInterface: Error playing ringing tone:', error);
    }
  };

  const stopRingingTone = () => {
    if (ringingToneRef.current) {
      clearTimeout(ringingToneRef.current);
      ringingToneRef.current = null;
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const toggleSpeaker = () => {
    // Speaker is always on - this button is disabled
    console.log('🔊 Speaker is always ON');
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

    if (socketRef.current) {
      // If not yet connected, this is a caller-side cancel; otherwise end
      if (callState === 'calling') {
        socketRef.current.emit('cancelVoiceCall', { callId: callIdRef.current, tableId });
      } else {
        socketRef.current.emit('endVoiceCall', { callId: callIdRef.current, tableId });
      }
    }
    const timeouts = settingsService.getTimeoutSettings();
    setCallState('ended');
    setTimeout(() => onCallEndRef.current(), timeouts.callEndedDelayMs);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-600 to-blue-900 z-50 flex flex-col items-center justify-center">
      <audio ref={audioRef} autoPlay />

      {/* Call Status */}
      <div className="text-center mb-8 px-4">
        <div className="text-white/80 text-sm font-medium mb-2">
          {callState === 'calling' && 'Calling...'}
          {callState === 'connected' && 'Connected'}
          {callState === 'ended' && 'Call Ended'}
          {callState === 'busy' && 'Reception Unavailable'}
          {callState === 'rejected' && 'Call Declined'}
        </div>
        <h1 className="text-5xl font-bold text-white mb-2">Table {tableId}</h1>
        <p className="text-2xl text-white/90 font-semibold">
          {callState === 'calling' && 'Waiting for response...'}
          {callState === 'connected' && formatDuration(callDuration)}
          {callState === 'ended' && 'Call ended'}
          {(callState === 'busy' || callState === 'rejected') && 'Please try again'}
        </p>
        {statusMessage && (callState === 'busy' || callState === 'rejected') && (
          <p className="mt-4 text-white/90 text-base max-w-md mx-auto bg-white/10 backdrop-blur rounded-xl px-4 py-3">
            {statusMessage}
          </p>
        )}
      </div>

      {/* Animated Pulse (when calling) */}
      {callState === 'calling' && (
        <div className="mb-12">
          <div className="relative w-32 h-32">
            <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse"></div>
            <div className="absolute inset-2 bg-white/10 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center">
                <span className="text-5xl">📞</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connected State */}
      {callState === 'connected' && (
        <div className="mb-12">
          <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-2xl">
            <span className="text-6xl">🎤</span>
          </div>
        </div>
      )}

      {/* Ended / Busy / Rejected State */}
      {(callState === 'ended' || callState === 'busy' || callState === 'rejected') && (
        <div className="mb-12">
          <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-6xl">
              {callState === 'ended' ? '✓' : callState === 'busy' ? '⏱️' : '✕'}
            </span>
          </div>
        </div>
      )}

      {/* Control Buttons */}
      {callState === 'calling' || callState === 'connected' ? (
        <div className="flex gap-6 mt-12">
          {/* Mute Button */}
          <button
            onClick={toggleMute}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all transform hover:scale-110 ${
              isMuted
                ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/50'
                : 'bg-white/20 hover:bg-white/30 backdrop-blur'
            }`}
          >
            <span className="text-2xl">{isMuted ? '🔇' : '🔊'}</span>
          </button>

          {/* Speaker Button - Always On */}
          <button
            disabled
            className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center cursor-not-allowed shadow-lg shadow-green-500/50"
            title="Speaker is always ON"
          >
            <span className="text-2xl">📢</span>
          </button>

          {/* End Call Button */}
          <button
            onClick={endCall}
            className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-all transform hover:scale-110 shadow-lg shadow-red-500/50"
          >
            <span className="text-2xl">✕</span>
          </button>
        </div>
      ) : null}

      {/* End / Busy / Rejected Message */}
      {(callState === 'ended' || callState === 'busy' || callState === 'rejected') && (
        <div className="mt-12 text-center">
          <p className="text-white/80 text-lg">
            {callState === 'ended' ? 'Thank you for calling' : 'Closing...'}
          </p>
          <p className="text-white/60 text-sm mt-2">Redirecting...</p>
        </div>
      )}
    </div>
  );
};

export default VoiceCallInterface;
