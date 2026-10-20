import { PLACEHOLDER_IMAGE } from '@/constants/placeholders';
import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { 
  Search, Send, Paperclip, MoreVertical, Phone, Video, Mic,
  ShieldCheck, Check, CheckCheck, Clock, FileText, Image as ImageIcon, 
  Smile, Edit, CircleDashed, Info, MapPin, Briefcase, Calendar, Star, X, PhoneOff, Languages, Reply, Share, Copy, Trash2, CheckCircle2, Plus, ArrowLeft, MessageCircle, ShoppingBag
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { apiClient as axios } from '@/utils/apiClient';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import EmojiPicker from 'emoji-picker-react';
import VoiceCallVisualizer from '../components/chat/VoiceCallVisualizer';

export const getAvatarFallback = (name) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=random`;

const Messages = () => {
  const location = useLocation();
  const isMessagesRoute = location.pathname.toLowerCase().includes('/messages');

  // Auth and User
  const { user } = useAuthStore();
  const userId = user?.id || user?._id;

  // Basic States
  const [activeChat, setActiveChat] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');

  const playMessageSound = () => {
    try {
      const audio = new Audio('/notification.wav');
      audio.play().catch(e => console.warn('Audio play failed:', e));
    } catch (e) {
      console.warn('Audio initialization failed:', e);
    }
  };
  const [filter, setFilter] = useState('all');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [contextMenu, setContextMenu] = useState(null);

  // UI States
  const [showStatus, setShowStatus] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [showSidebarMenu, setShowSidebarMenu] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [activeCall, setActiveCall] = useState(null); // 'voice' | 'video' | null
  const [callDuration, setCallDuration] = useState(0);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isCallMinimized, setIsCallMinimized] = useState(false);
  const [isCallMuted, setIsCallMuted] = useState(false);
  const [activeStream, setActiveStream] = useState(null);
  const [onlineUsersMap, setOnlineUsersMap] = useState({});
  const [incomingCall, setIncomingCall] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [statusFile, setStatusFile] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [forwardMsgId, setForwardMsgId] = useState(null);
  const [chatProfile, setChatProfile] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newChatSearchQuery, setNewChatSearchQuery] = useState('');
  const [customAlert, setCustomAlert] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [activeStatusUser, setActiveStatusUser] = useState(null);
  const [activeStatusIndex, setActiveStatusIndex] = useState(0);

  // Refs
  const socketRef = useRef(null);
  const statusFileInputRef = useRef(null);
  const activeChatRef = useRef(activeChat);
  const activeCallRef = useRef(activeCall);
  const incomingCallRef = useRef(incomingCall);
  const remoteStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Functions
  const acceptCall = () => {
    if (socketRef.current && incomingCallRef.current) {
      socketRef.current.emit('acceptCall', { callerId: incomingCallRef.current.callerId });
      setActiveCall(incomingCallRef.current.type || 'voice');
    }
  };
  
  const formatRecTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const showAlert = (message) => setCustomAlert(message);

  // Effects
  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);
  useEffect(() => { activeCallRef.current = activeCall; }, [activeCall]);
  useEffect(() => { incomingCallRef.current = incomingCall; }, [incomingCall]);

  useEffect(() => {
    if (activeCall) {
      if (localVideoRef.current && localStreamRef.current && localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      if (remoteVideoRef.current && remoteStreamRef.current && remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }
    }
  }, [activeCall, activeStream]);

  useEffect(() => {
    if (!isMessagesRoute && activeCall) {
      setIsCallMinimized(true);
    }
  }, [isMessagesRoute, activeCall]);

  // Handle ?user= query param for auto-opening chat
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const targetUserId = searchParams.get('user');
    if (targetUserId && user) {
      const existingConv = conversations.find(c => String(c.id) === String(targetUserId));
      if (existingConv) {
        setActiveChat(existingConv);
      } else {
        axios.get(`/api/v1/user/profile/${targetUserId}`)
          .then(res => {
            if (res.data.success) {
              const u = res.data.data;
              setActiveChat({
                id: u.id,
                name: u.fullName || 'User',
                avatar: u.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.fullName || 'User')}&background=random`,
                role: u.role
              });
            }
          })
          .catch(err => console.error("Error fetching target user", err));
      }
      window.history.replaceState({}, '', '/messages');
    }
  }, [location.search, user, conversations.length]);

  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    let timer;
    if (activeCall) {
      timer = setInterval(() => setCallDuration(d => d + 1), 1000);
    } else {
      setCallDuration(0);
      setIsCallMinimized(false);
    }
    return () => clearInterval(timer);
  }, [activeCall]);

  
  // Status states

  const fetchStatuses = async () => {
    try {
      const res = await axios.get('/api/v1/statuses');
      if (res.data.success) {
        setStatuses(res.data.statuses || []);
      }
    } catch (err) {
      // console.error('Failed to fetch statuses', err);
    }
  };

  useEffect(() => {
    if (showStatus) {
      fetchStatuses();
    } else {
      setActiveStatusUser(null);
      setActiveStatusIndex(0);
    }
  }, [showStatus]);

  useEffect(() => {
    if (activeStatusUser && activeStatusUser.statuses) {
      const timer = setTimeout(() => {
        if (activeStatusIndex < activeStatusUser.statuses.length - 1) {
          setActiveStatusIndex(prev => prev + 1);
        } else {
          setActiveStatusUser(null);
        }
      }, 5000); // 5 seconds per status
      return () => clearTimeout(timer);
    }
  }, [activeStatusUser, activeStatusIndex]);



  const reactionEmojis = ['👍', '❤️', '😂', '😮', '😢', '👏'];

  useEffect(() => {
    if (!user) return;
    fetchConversations();
    fetchStatuses();
    
    // Initialize Socket Connection
    if (user) {
      const userId = user?.id || user?._id;
      socketRef.current = io('/', { 
         path: '/socket.io',
         withCredentials: true 
      });
      
      const sendIdentify = () => {
        socketRef.current.emit('identify', { user: userId, status: 'online' });
      };

      if (socketRef.current.connected) {
        sendIdentify();
      }
      
      socketRef.current.on('connect', sendIdentify);

      socketRef.current.on('user_status_change', ({ user: changedUserId, status }) => {
        setOnlineUsersMap(prev => ({ ...prev, [String(changedUserId)]: status }));
      });

      socketRef.current.on('receiveMessage', (savedMsg) => {
        playMessageSound();
        setMessages(prev => {
          if (prev.length > 0 && prev[0].conversationId !== savedMsg.conversationId) {
             return prev;
          }

          const exists = prev.find(m => m.id === savedMsg.id || m.id === savedMsg._id);
          if (exists) return prev;
          
          const currentUserId = user?.id || user?._id;
          const isMine = String(savedMsg.senderId) === String(currentUserId);
          const mappedMsg = {
            ...savedMsg,
            id: savedMsg._id || savedMsg.id,
            isMine
          };

          if (!isMine) {
              try {
                  const audio = new Audio('/notification.wav');
                  audio.play().catch(e => console.warn('Audio play failed', e));
              } catch (err) { toast.error('Failed to load messages'); }
          }
          
          return [...prev, mappedMsg];
        });
        fetchConversations();
      });

      socketRef.current.on('messageDeleted', ({ messageId, conversationId }) => {
        setMessages(prev => prev.filter(m => m.id !== messageId));
        fetchConversations();
      });

      socketRef.current.on('reactionAdded', ({ messageId, userId, emoji }) => {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reaction: emoji } : m));
      });

      // Call Signaling Listeners
      socketRef.current.on('incomingCall', (data) => {
        setIncomingCall(data);
      });

      socketRef.current.on('callRejected', () => {
        setActiveCall(null);
        showAlert("Call was declined.");
      });

      socketRef.current.on('callEnded', () => {
        cleanupWebRTC();
        setActiveCall(null);
        setIncomingCall(null);
      });

      // WebRTC Handlers
      socketRef.current.on('callAccepted', async (data) => {
         // Receiver accepted, caller initiates WebRTC
         try {
            await startWebRTC(activeChatRef.current?.id, activeCallRef.current, true);
         } catch(e) {
            // console.error('Failed to start WebRTC on accept', e);
         }
      });

      socketRef.current.on('webrtc_offer', async (data) => {
         try {
            if (!peerConnectionRef.current) {
               await startWebRTC(data.callerId, incomingCallRef.current?.type || activeCallRef.current || 'voice', false);
            }
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
            const answer = await peerConnectionRef.current.createAnswer();
            await peerConnectionRef.current.setLocalDescription(answer);
            socketRef.current.emit('webrtc_answer', { targetId: data.callerId, sdp: answer });
         } catch(e) {
            // console.error('WebRTC Offer Error', e);
         }
      });

      socketRef.current.on('webrtc_answer', async (data) => {
         try {
            if (peerConnectionRef.current) {
               await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
            }
         } catch(e) {
            // console.error('WebRTC Answer Error', e);
         }
      });

      socketRef.current.on('webrtc_ice_candidate', async (data) => {
         try {
            if (peerConnectionRef.current && data.candidate) {
               await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
         } catch(e) {
            // console.error('WebRTC ICE Error', e);
         }
      });

    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user]);

  useEffect(() => {
    if (activeChat) {
      fetchHistory(activeChat.id);
      setChatProfile(null);
    }
  }, [activeChat]);

  useEffect(() => {
    const fetchChatProfile = async () => {
      if (activeChat && showInfoPanel && !chatProfile) {
         try {
            const res = await axios.get(`/api/v1/user/profile/${activeChat.id}`);
            if (res.data.success) {
               setChatProfile(res.data);
            }
         } catch(e) { /* console.error('Failed to fetch chat profile', e); */ }
      }
    };
    fetchChatProfile();
  }, [activeChat, showInfoPanel, chatProfile]);


  function scrollToBottom() {
    const parent = messagesEndRef.current?.parentElement;
    if (parent) {
      const { scrollTop, scrollHeight, clientHeight } = parent;
      // If we are within 300px of the bottom, auto-scroll. Otherwise, user is reading history.
      if (scrollHeight - scrollTop - clientHeight < 300) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  useEffect(() => {
    scrollToBottom();
  }, [messages]);


  async function fetchConversations() {
    try {
      const res = await axios.get('/api/v1/messages/conversations');
      if (res.data.success) {
        const mapped = (res.data.conversations || []).map(conv => ({
           id: conv.withId || conv.otherUser?.id,
           conversationId: conv.conversationId,
           name: conv.with || conv.otherUser?.fullName,
           avatar: conv.otherUser?.avatarUrl || PLACEHOLDER_IMAGE,
           lastMessage: conv.lastMessageText || '',
           time: conv.timestamp ? new Date(conv.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
           unread: conv.unreadCount || 0,
           role: conv.otherUser?.role || 'User'
        }));
        setConversations(mapped);

        // Fetch initial status for each mapped conversation
        mapped.forEach(conv => {
           if (socketRef.current && conv.id) {
              socketRef.current.emit('check_user_status', conv.id, (response) => {
                 setOnlineUsersMap(prev => ({ ...prev, [String(conv.id)]: response.status }));
              });
           }
        });
      }
    } catch (err) {
      // console.error('Failed to fetch conversations', err);
    }
  };

  async function fetchHistory (userId) {
    try {
      const res = await axios.get(`/api/v1/messages/history?otherUserId=${userId}`);
      if (res.data.success) {
        const currentUserId = user?.id || user?._id;
        const mappedMsgs = (res.data.messages || []).map(msg => ({
          ...msg,
          id: msg._id || msg.id,
          isMine: String(msg.senderId) === String(currentUserId)
        }));
        setMessages(mappedMsgs);
      }
    } catch (err) {
      // console.error('Failed to fetch history', err);
    }
  };

  const fetchContacts = async () => {
    try {
      const res = await axios.get('/api/v1/user/users-for-chat');
      if (res.data.success) {
        const mappedUsers = (res.data.users || []).map(u => ({
          id: u.id,
          name: u.fullName || 'Unknown User',
          avatar: u.avatarUrl || PLACEHOLDER_IMAGE,
          role: u.role || 'Member'
        }));
        setContacts(mappedUsers);
        mappedUsers.forEach(u => {
           if (socketRef.current && u.id) {
              socketRef.current.emit('check_user_status', u.id, (response) => {
                 if (response && response.status) {
                    setOnlineUsersMap(prev => ({ ...prev, [String(u.id)]: response.status }));
                 }
              });
           }
        });
      }
    } catch (err) {
      // console.error('Failed to fetch contacts', err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !activeChat) return;

    const content = messageText;
    setMessageText('');
    playMessageSound();
    setShowEmojiPicker(false);

    try {
      if (socketRef.current && socketRef.current.connected) {
         socketRef.current.emit('sendMessage', {
            receiverId: activeChat.id,
            content: content,
            senderId: user?.id || user?._id
         }, (res) => {
            if (res.success) {
               fetchHistory(activeChat.id);
               fetchConversations();
               setReplyingTo(null);
            }
         });
      } else {
        const payload = {
            receiverId: activeChat.id,
            content: content
        };
        if (replyingTo) {
           payload.quotedMsg = JSON.stringify({
              id: replyingTo.id,
              content: replyingTo.content,
              isMine: replyingTo.isMine,
              senderName: replyingTo.isMine ? 'You' : (activeChat?.name || 'User')
           });
        }
        await axios.post('/api/v1/messages/send', payload);
        fetchHistory(activeChat.id);
        fetchConversations();
        setReplyingTo(null);
      }
    } catch (err) {
      // console.error('Failed to send message', err);
    }
  };

  const handleDeleteEveryone = async (msgId) => {
    try {
      await axios.delete(`/api/v1/messages/${msgId}/delete-everyone`);
      setContextMenu(null);
      fetchHistory(activeChat.id);
    } catch (err) {
      // console.error('Failed to delete message', err);
    }
  };

  const handleDeleteForMe = async (msgId) => {
    try {
      await axios.delete(`/api/v1/messages/${msgId}/delete-me`);
      setContextMenu(null);
      fetchHistory(activeChat.id);
    } catch (err) {
      // console.error('Failed to delete message for me', err);
    }
  };

  const handleStarMessage = async (msgId) => {
    try {
      await axios.post(`/api/v1/messages/${msgId}/star`);
      setContextMenu(null);
      fetchHistory(activeChat.id);
    } catch (err) {
      // console.error('Failed to star message', err);
    }
  };

  const handleUpdateStatus = async () => {
    if (!statusText.trim() && !statusFile) {
       setCustomAlert('Please enter a status message or upload a file.');
       return;
    }
    
    try {
       let mediaUrl = null;
       
       if (statusFile) {
          const formData = new FormData();
          formData.append('image', statusFile);
          const uploadRes = await axios.post('/api/v1/upload', formData);
          if (uploadRes.data.success) {
             mediaUrl = uploadRes.data.imageUrl || uploadRes.data.url;
          }
       }

       await axios.post('/api/v1/statuses', {
          content: statusText,
          mediaUrl: mediaUrl,
          expiresInHours: 24
       });

       setStatusText('');
       setStatusFile(null);
       setShowStatusModal(false);
       setCustomAlert('WhatsApp Status updated successfully!');
    } catch (err) {
       // console.error('Failed to update status', err);
       setCustomAlert('Failed to update status');
    }
  };

  const handleForwardMessage = async (receiverId) => {
    if (!forwardMsgId) return;
    try {
      await axios.post(`/api/v1/messages/${forwardMsgId}/forward`, { receiverId });
      setForwardMsgId(null);
    } catch (err) {
      // console.error('Failed to forward message', err);
    }
  };

  // Compute starred messages in current active chat
  const starredMessagesCount = messages.filter(m => {
     try {
       const meta = JSON.parse(m.metadata || '{}');
       return meta.starredBy && meta.starredBy.includes(user?.id);
     } catch(e) { return false; }
  }).length;

    const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsCallMuted(!isCallMuted);
    }
  };

  const toggleSpeaker = () => {
    // In a real web app, setting sinkId requires specific permissions and HTTPS.
    // For now we just mock the UI toggle.
    setIsSpeaker(!isSpeaker);
  };

  function cleanupWebRTC() {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

  async function startWebRTC (targetId, callType, isCaller) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: callType === 'video' });
      localStreamRef.current = stream;
      setActiveStream(stream);

      // Wait up to 500ms for the video element to be mounted before assigning stream
      const assignLocalStream = async () => {
        for (let attempt = 0; attempt < 10; attempt++) {
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
            break;
          }
          await new Promise(r => setTimeout(r, 50));
        }
      };
      assignLocalStream();

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });
      peerConnectionRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (event.streams[0]) {
          remoteStreamRef.current = event.streams[0];
          setActiveStream(event.streams[0]);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit('webrtc_ice_candidate', { targetId, candidate: event.candidate });
        }
      };

      if (isCaller) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketRef.current.emit('webrtc_offer', { targetId, sdp: offer });
      }
    } catch (err) {
      // console.error("Error accessing media devices.", err);
      showAlert("Could not access camera/microphone.");
      handleEndCall();
      throw err;
    }
  };

  const initiateCall = async (type) => {
    setActiveCall(type);
    setIsCallMinimized(false);
    if (socketRef.current && activeChat) {
      socketRef.current.emit('callUser', { 
         receiverId: activeChat.id, 
         callerName: user?.name || user?.firstName, 
         callerAvatar: user?.avatarUrl || user?.avatar,
         type 
      });
    }
    // Start local media immediately so caller's camera/mic is live
    try {
      await startWebRTC(activeChat?.id, type, true);
    } catch (err) {
      // Error already handled inside startWebRTC (shows alert and ends call)
    }
  };

  const handleEndCall = () => {
    if (socketRef.current) {
      socketRef.current.emit('endCall', { targetId: activeChat?.id || incomingCall?.callerId });
    }
    cleanupWebRTC();
    setActiveCall(null);
    setIncomingCall(null);
    setIsCallMinimized(false);
  };

  const handleTranslate = async (msgId, content) => {
    try {
      const res = await axios.post('/api/v1/messages/translate', { messageId: msgId, targetLang: 'en', text: content });
      if (res.data.success) {
        showAlert(`Translated: ${res.data.translatedText}`);
      }
      setContextMenu(null);
    } catch (err) {
      // console.error('Failed to translate', err);
      showAlert('Failed to translate message.');
      setContextMenu(null);
    }
  };

  const handleReaction = async (msgId, emoji) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, reaction: emoji } : m));
    setContextMenu(null);
    try {
      await axios.post(`/api/v1/messages/${msgId}/react`, { emoji });
    } catch (err) {
      // console.error('Failed to save reaction', err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file && activeChat) {
      showAlert(`Uploading file: ${file.name}...`);
      const formData = new FormData();
      formData.append('image', file);
      
      try {
        const res = await axios.post('/api/v1/upload', formData);
        
        if (res.data.success) {
          const content = `[Image: ${res.data.imageUrl}]`;
          
          if (socketRef.current && socketRef.current.connected) {
             socketRef.current.emit('sendMessage', {
                receiverId: activeChat.id,
                content: content,
                senderId: user?.id || user?._id
             }, () => {
                fetchHistory(activeChat.id);
             });
          } else {
             await axios.post('/api/v1/messages/send', {
                receiverId: activeChat.id,
                content: content
              });
              fetchHistory(activeChat.id);
          }
          showAlert('Image sent successfully!');
        }
      } catch (err) {
        // console.error('Failed to upload file', err);
        showAlert('Failed to upload file.');
      }
    }
  };

  const handleStartRecording = async () => {
    if (isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        if (audioChunksRef.current.length === 0) return;
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], `voice-message-${Date.now()}.webm`, { type: 'audio/webm' });
        
        if (file && activeChat) {
          const formData = new FormData();
          formData.append('image', file);
          
          try {
            const res = await axios.post('/api/v1/upload', formData);
            
            if (res.data.success) {
              const content = `[Audio: ${res.data.imageUrl}]`;
              if (socketRef.current && socketRef.current.connected) {
                 socketRef.current.emit('sendMessage', {
                    receiverId: activeChat.id,
                    content: content,
                    senderId: user?.id || user?._id
                 }, () => {
                    fetchHistory(activeChat.id);
                 });
              } else {
                 await axios.post('/api/v1/messages/send', {
                    receiverId: activeChat.id,
                    content: content
                 });
                 fetchHistory(activeChat.id);
              }
            }
          } catch (err) {
            // console.error('Upload Error:', err);
            showAlert('Failed to upload voice message');
          }
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      // console.error('Error accessing microphone:', err);
      showAlert('Could not access microphone for recording. Please ensure permissions are granted.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      } catch (err) { toast.error('Failed to send message'); }
      setIsRecording(false);
    }
  };

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatLastMessage = (msg) => {
    if (!msg) return 'Started a conversation';
    if (msg.includes('[Audio:')) return '🎵 Audio Message';
    if (msg.includes('[Image:')) return '🖼️ Image Message';
    return msg;
  };


  const filteredConversations = conversations.filter(c => {
    const matchesSearch = (c.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === 'unread') return c.unreadCount > 0;
    if (filter === 'groups') return c.isGroup === true;
    return true;
  });

  const filteredContacts = contacts.filter(contact => 
    (contact.name || '').toLowerCase().includes(newChatSearchQuery.toLowerCase())
  );

  if (!isMessagesRoute && !activeCall && !incomingCall && !showStatusModal) {
    // We are not on the messages route and no global modal is open.
    // If it's mounted inside a specific Route, this shouldn't happen unless the route changed.
    return null;
  }

  return (
    <>
      {isMessagesRoute && (
        <div className="fixed inset-0 z-40 bg-white text-[var(--text-primary)] font-sans flex flex-col pt-24 pb-6 px-4 md:px-8" onClick={() => { setContextMenu(null); setShowEmojiPicker(false); }}>
      
      <div className="max-w-7xl mx-auto w-full flex-1 flex gap-0 relative z-10 overflow-hidden rounded-[2.5rem] neu-card">
        
        {/* Inbox Sidebar */}
        <div className={`w-full md:w-[340px] border-r border-[var(--border-color)] flex flex-col overflow-hidden shrink-0 absolute md:static top-0 left-0 h-full z-20 transition-all duration-300 ${activeChat ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}`}>
          {/* Removed glow */}
          <div className="p-4 md:p-6 border-b border-[var(--border-color)] bg-transparent relative z-10">
            <div className="flex justify-between items-center mb-6">
               <h2 className="text-xl md:text-2xl font-extrabold flex items-center gap-2">
                 <button onClick={() => window.history.back()} className="md:hidden text-gray-400 hover:text-white transition-colors mr-1">
                    <ArrowLeft size={24} />
                 </button>
                 <div className="w-8 h-8 rounded-lg bg-[var(--accent-gray)] text-black font-bold flex items-center justify-center text-sm shadow-[0_0_10px_var(--accent-gray-dim)]">W</div>
                 <span className="tracking-wide">w-commerce</span>
               </h2>
               <div className="flex items-center gap-2 md:gap-3 text-gray-400">
                  <button onClick={() => setShowStatusModal(true)} className="hover:text-[var(--accent-gray)] transition-colors" title="Status">
                     <CircleDashed size={20} />
                  </button>
                  <button onClick={() => { fetchContacts(); setShowNewChat(true); }} className="hover:text-[var(--accent-gray)] transition-colors" title="New Chat">
                     <Edit size={20} />
                  </button>
                  <div className="relative">
                    <button onClick={() => setShowSidebarMenu(!showSidebarMenu)} className="w-10 h-10 rounded-full flex items-center justify-center border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--accent-gray)] hover:shadow-[0_0_10px_var(--accent-gray-dim)] transition-all">
                       <MoreVertical size={20} />
                    </button>
                    {showSidebarMenu && (
                      <div className="absolute right-0 mt-2 w-48 neu-panel rounded-2xl z-50 overflow-hidden text-[var(--text-main)]">
                        <div className="px-4 py-3 cursor-pointer hover:bg-[var(--border-color)] hover:text-[var(--accent-gray)] transition-colors text-sm font-medium" onClick={() => setShowSidebarMenu(false)}>Mark all as read</div>
                        <div className="px-4 py-3 cursor-pointer hover:bg-[var(--border-color)] hover:text-[var(--accent-gray)] transition-colors text-sm font-medium" onClick={() => setShowSidebarMenu(false)}>Archived Chats</div>
                        <div className="px-4 py-3 cursor-pointer hover:bg-[var(--border-color)] hover:text-[var(--accent-gray)] transition-colors text-sm font-medium" onClick={() => setShowSidebarMenu(false)}>Message Settings</div>
                      </div>
                    )}
                  </div>
               </div>
            </div>
            
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full neu-input py-3 pl-12 pr-4"
                placeholder="Search messages..." 
              />
            </div>

            {/* Stories Row */}
            <div className="mb-2">
               <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Stories</h3>
               <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
                  <div className="inline-flex flex-col items-center gap-1 cursor-pointer shrink-0" onClick={() => setShowStatusModal(true)}>
                     <div className="w-14 h-14 rounded-full neu-button text-gray-400 flex items-center justify-center hover:text-[var(--text-main)] transition-all">
                        <Plus size={24} />
                     </div>
                     <span className="text-xs font-bold mt-1 text-[var(--text-main)]">Add Story</span>
                  </div>
                  {statuses.map(statusUser => (
                     <div key={statusUser.user?.id} className="inline-flex flex-col items-center gap-1 cursor-pointer shrink-0" onClick={() => { setActiveStatusUser(statusUser); setActiveStatusIndex(0); }}>
                        <div className="w-14 h-14 rounded-full neu-card p-0.5">
                           <div className="w-full h-full rounded-full bg-[var(--bg-secondary)] flex items-center justify-center overflow-hidden">
                              {statusUser.user.avatarUrl && !(statusUser.user.avatarUrl || '').includes('undefined') ? <img src={statusUser.user.avatarUrl} className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.src = getAvatarFallback(statusUser.user.fullName); }} /> : <img src={getAvatarFallback(statusUser.user.fullName)} className="w-full h-full object-cover" />}
                           </div>
                        </div>
                        <span className="text-xs text-[var(--text-main)] max-w-[60px] truncate text-center w-full">{statusUser.user.id === user?.id ? 'You' : statusUser.user.fullName.split(' ')[0]}</span>
                     </div>
                  ))}
               </div>
            </div>

              <div className="flex items-center gap-2 mt-4 px-4 overflow-x-auto pb-2 custom-scrollbar">
                 <button onClick={() => setFilter('all')} className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-all duration-300 ${filter === 'all' ? 'neu-button-primary font-bold text-white' : 'neu-button font-medium text-[var(--text-main)]'}`}>All</button>
                 <button onClick={() => setFilter('unread')} className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-all duration-300 ${filter === 'unread' ? 'neu-button-primary font-bold text-white' : 'neu-button font-medium text-[var(--text-main)]'}`}>Unread</button>
                 <button onClick={() => setFilter('groups')} className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-all duration-300 ${filter === 'groups' ? 'neu-button-primary font-bold text-white' : 'neu-button font-medium text-[var(--text-main)]'}`}>Groups</button>
              </div>
          </div>
          
          <div className="flex-1 overflow-y-auto bg-transparent relative z-10 px-2 sm:px-4 py-2 space-y-3">
            {filteredConversations.length > 0 ? filteredConversations.map(chat => (
              <div 
                key={chat.id} 
                onClick={() => setActiveChat(chat)}
                className={`p-4 rounded-[1.5rem] cursor-pointer flex gap-4 transition-all ${activeChat?.id === chat.id ? 'neu-card-pressed text-[var(--text-main)] border border-[var(--border-color)]' : 'neu-card text-[var(--text-main)]'}`}
              >
                <div className={`relative w-12 h-12 rounded-full shrink-0 transition-all m-1 ${onlineUsersMap[chat.id] === 'online' ? 'ring-2 ring-green-500 shadow-[0_0_12px_rgba(34,197,94,0.8)]' : ''}`}>
                  <div className="w-full h-full rounded-full flex items-center justify-center font-bold text-lg neu-panel overflow-hidden">
                    {chat.avatar && !(chat.avatar || '').includes('undefined') ? <img src={chat.avatar} className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.src = getAvatarFallback(chat.name); }}/> : <img src={getAvatarFallback(chat.name)} className="w-full h-full object-cover" />}
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold truncate text-sm flex items-center gap-1 text-[var(--text-main)]">
                      {chat.name || 'User'} 
                      {chat.verified && <ShieldCheck size={14} className="text-[var(--accent-gray)]" />}
                    </h4>
                    <span className={`text-xs whitespace-nowrap ${chat.unreadCount > 0 ? 'text-[var(--accent-gray)] font-bold' : 'text-gray-400'}`}>{chat.lastMessageTime ? formatTime(chat.lastMessageTime) : ''}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className={`text-sm truncate ${chat.unreadCount > 0 ? 'text-[var(--text-main)] font-medium' : 'text-gray-400'}`}>{formatLastMessage(chat.lastMessage)}</p>
                    {chat.unreadCount > 0 && (
                      <span className="w-5 h-5 bg-[var(--accent-gray)] text-black text-[10px] font-bold flex items-center justify-center rounded-full shrink-0 ml-2 shadow-[0_0_8px_var(--accent-gray-dim)]">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )) : (
               <div className="p-8 text-center text-gray-400 text-sm">{searchQuery ? 'No matching conversations' : 'No conversations yet'}</div>
            )}
          </div>
        </div>

        {/* Chat Area & Info Panel Container */}
        <div id="debug-parent" className={`w-full md:flex-1 flex gap-0 md:gap-6 overflow-hidden shrink-0 absolute md:static top-0 left-0 h-full transition-transform duration-300 z-30 ${activeChat ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
           {/* Main Chat Area */}
        <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 absolute md:static top-0 left-0 w-full h-full z-10 ${activeChat ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
             {/* Removed glow */}
                 {activeChat ? (
               <>
                 {/* Chat Header */}
                 <div className="p-4 border-b border-[var(--border-color)] bg-transparent flex items-center justify-between transition-colors relative z-10">
                   <div className="flex items-center gap-2 sm:gap-4">
                     <button onClick={() => setActiveChat(null)} className="md:hidden text-gray-400 hover:text-[var(--text-main)] p-1">
                       <ArrowLeft size={24} />
                     </button>
                     <div className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setShowInfoPanel(!showInfoPanel)}>
                     <div className={`relative w-12 h-12 rounded-full shrink-0 transition-all m-1 ${onlineUsersMap[activeChat.id] === 'online' ? 'ring-2 ring-green-500 shadow-[0_0_12px_rgba(34,197,94,0.8)]' : ''}`}>
                       <div className="w-full h-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-full flex items-center justify-center font-bold text-lg overflow-hidden">
                         {activeChat.avatar && !(activeChat?.avatar || '').includes('undefined') ? <img src={activeChat.avatar} className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.src = getAvatarFallback(activeChat.name); }}/> : <img src={getAvatarFallback(activeChat.name)} className="w-full h-full object-cover" />}
                       </div>
                     </div>
                     <div>
                       <h3 className="font-bold text-lg flex items-center gap-2 text-[var(--text-main)]">{activeChat.name || 'User'} <ShieldCheck size={16} className="text-[var(--accent-gray)]" /></h3>
                       <span className={`text-xs font-semibold flex items-center gap-1 ${onlineUsersMap[activeChat.id] === 'online' ? 'text-green-500' : 'text-gray-400'}`}>
                         {onlineUsersMap[activeChat.id] === 'online' ? 'Online' : 'Offline'}
                       </span>
                     </div>
                     </div>
                   </div>
                   <div className="flex items-center gap-4 text-gray-400" onClick={(e) => e.stopPropagation()}>
                     <button onClick={() => initiateCall('voice')} className="hover:text-[var(--accent-gray)] transition-colors"><Phone size={20} /></button>
                     <button onClick={() => initiateCall('video')} className="hover:text-[var(--accent-gray)] transition-colors"><Video size={20} /></button>
                     <div className="relative">
                    <button onClick={() => setShowChatMenu(!showChatMenu)} className="hover:text-[var(--accent-gray)] hover:shadow-[0_0_10px_var(--accent-gray-dim)] transition-all rounded-full p-1"><MoreVertical size={20}/></button>
                    {showChatMenu && (
                      <div className="absolute right-0 mt-2 w-40 neu-panel rounded-2xl z-50 overflow-hidden text-[var(--text-main)]">
                        <div className="px-4 py-3 cursor-pointer hover:bg-[var(--border-color)] hover:text-[var(--accent-gray)] transition-colors text-sm font-medium" onClick={() => setShowChatMenu(false)}>Clear Chat</div>
                        <div className="px-4 py-3 cursor-pointer hover:bg-[var(--border-color)] hover:text-[var(--accent-gray)] transition-colors text-sm font-medium" onClick={() => setShowChatMenu(false)}>Block User</div>
                        <div className="px-4 py-3 cursor-pointer hover:bg-red-500/10 transition-colors text-sm text-red-500 font-bold" onClick={() => setShowChatMenu(false)}>Report</div>
                      </div>
                    )}                      </div>
                   </div>
                 </div>
                 
                 {/* Chat Messages */}
                 <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-transparent custom-scrollbar relative z-10">
                   <div className="text-center text-xs font-bold text-gray-400 my-4 tracking-widest uppercase">
                     Encrypted Session Started
                   </div>
                   
                   {messages.map((msg, idx) => {
                      const isMine = msg.senderId === 'ME' || msg.isMine || false;
                      return (
                         <div key={msg.id || idx} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                           <div 
                              onContextMenu={(e) => {
                                 e.preventDefault();
                                 e.stopPropagation();
                                 setContextMenu({ x: e.clientX, y: e.clientY, msg });
                              }}
                              className={`p-3 md:p-4 rounded-[1.5rem] max-w-[80%] relative group cursor-context-menu ${
                              isMine 
                                ? 'neu-button-primary text-white font-bold rounded-tr-sm' 
                                : 'neu-card text-[var(--text-main)] font-bold rounded-tl-sm'
                              }`}
                           >
                             {(msg.content || '').includes('[Audio:') ? (
                                <div className="flex flex-col min-w-[220px]">
                                  <audio controls src={(msg.content || '').match(/\[Audio: (.*?)\]/)[1]} className="w-full h-10" />
                                </div>
                             ) : (msg.content || '').includes('[Image:') ? (
                                <div>
                                  <img src={(msg.content || '').match(/\[Image: (.*?)\]/)[1]} alt="Attached" className="rounded-xl max-h-60 object-cover mb-2" />
                                  <p className="text-sm font-bold">Image Attachment</p>
                                </div>
                             ) : (
                                <p className="text-sm leading-relaxed font-bold">{msg.content}</p>
                             )}
                             <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                               <span className={`text-[10px] font-bold ${isMine ? 'text-black/70' : 'text-gray-400'}`}>{formatTime(msg.createdAt)}</span>
                               {isMine && <CheckCheck size={14} className="text-black/70" />}
                             </div>
                             {msg.reaction && (
                                <div className={`absolute -bottom-3 ${isMine ? '-left-3' : '-right-3'} bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-full px-2 py-0.5 shadow-md text-sm`}>
                                   {msg.reaction}
                                </div>
                             )}
                           </div>
                         </div>
                      )
                   })}
                   <div ref={messagesEndRef} />
                 </div>
                 
                 {/* Chat Input */}
                 <div className="p-4 border-t border-[var(--border-color)] bg-transparent relative">
                   {showEmojiPicker && (
                       <div className="absolute bottom-[80px] left-4 z-20 shadow-2xl rounded-xl" onClick={e => e.stopPropagation()}>
                          <EmojiPicker 
                             onEmojiClick={(e) => { 
                                setMessageText(prev => prev + e.emoji); 
                                setShowEmojiPicker(false); 
                             }} 
                             theme="light"
                          />
                       </div>
                    )}
                   {replyingTo && (
                      <div className="bg-[var(--bg-secondary)] p-3 rounded-t-xl border-x border-t border-[var(--border-color)] flex justify-between items-center text-sm mb-[-1px] relative z-10">
                        <div className="flex flex-col border-l-4 border-[var(--accent-gray)] pl-2">
                           <span className="font-bold text-[var(--accent-gray)] text-xs">{replyingTo.isMine ? 'You' : (activeChat?.name || 'User')}</span>
                           <span className="text-gray-400 truncate max-w-[200px] text-xs">{replyingTo.content}</span>
                        </div>
                        <button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-[var(--text-main)]"><X size={16} /></button>
                      </div>
                    )}
                   <form onSubmit={handleSendMessage} className="relative flex items-center neu-input rounded-full pl-4 pr-2 py-1">
                     <button type="button" onClick={() => fileInputRef.current?.click()} className="text-[var(--text-muted)] hover:text-[var(--accent-gray)] transition-colors p-2">
                        <Paperclip size={20} />
                     </button>
                     <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,application/pdf" />
                         {isRecording ? (
                        <div className="flex-1 px-4 py-2 text-red-500 font-bold text-sm flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                           Recording... {formatRecTime(recordingTime)}
                        </div>
                     ) : (
                     <input 
                       type="text" 
                       value={messageText}
                       onChange={e => setMessageText(e.target.value)}
                       onKeyDown={e => e.key === 'Enter' && handleSendMessage(e)}
                       placeholder="Type a message..." 
                       className="flex-1 bg-transparent border-none outline-none text-[var(--text-main)] placeholder-[var(--text-muted)] text-sm px-4 py-2"
                       spellCheck="false"
                     />
                     )}
                     <div className="flex items-center gap-1">
                       <button type="button" onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(!showEmojiPicker); }} className="text-[var(--text-muted)] hover:text-[var(--accent-gray)] transition-colors p-2">
                          <Smile size={20} />
                       </button>
                       <button type="button" onMouseDown={handleStartRecording} onMouseUp={handleStopRecording} onMouseLeave={handleStopRecording} className={`transition-all p-2 rounded-full ${isRecording ? 'bg-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'text-gray-400 hover:text-[var(--accent-gray)] hover:shadow-[0_0_10px_var(--accent-gray-dim)]'}`}>
                          <Mic size={20} />
                       </button>
                       <button 
                         type="submit" 
                         disabled={!messageText.trim()}
                         className={`p-2 rounded-full transition-all flex items-center justify-center ${messageText.trim() ? 'bg-[var(--accent-gray)] text-black shadow-md hover:scale-105' : 'bg-transparent text-gray-400 opacity-50'}`}
                       >
                         <Send size={16} className={messageText.trim() ? 'ml-0.5' : ''} />
                       </button>
                     </div>
                   </form>
                 </div>
               </>
             ) : (
               <div className="flex-1 flex flex-col items-center justify-center text-center p-8 neu-panel relative z-10">
                  <div className="w-24 h-24 bg-[#111] border border-[var(--accent-gray)] rounded-full flex items-center justify-center mb-6 shadow-sm animate-gray-glow">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-main)]"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
                  </div>
                 <h2 className="text-2xl font-bold mb-2 text-[var(--text-main)]">Your Messages</h2>
                 <p className="text-[var(--text-muted)] max-w-sm">Select a conversation or start a new one to connect with others.</p>
               </div>
             )}
             
             {/* Context Menu Modal */}
             {contextMenu && (
               <div 
                  className="fixed z-50 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-[var(--shadow-lg)] py-2 min-w-[200px] text-[var(--text-main)]"
                  style={{ top: contextMenu.y, left: contextMenu.x }}
                  onClick={(e) => e.stopPropagation()}
               >
                  <div className="flex justify-around px-2 pb-2 mb-2 border-b border-[var(--border-color)]">
                     {reactionEmojis.map(emoji => (
                        <button key={emoji} onClick={() => handleReaction(contextMenu.msg.id, emoji)} className="text-xl hover:scale-125 transition-transform">{emoji}</button>
                     ))}
                  </div>
                  <button onClick={() => { setReplyingTo(contextMenu.msg); setContextMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-[var(--border-color)] flex items-center gap-3 text-sm transition-colors"><Reply size={16}/> Reply</button>
                  <button onClick={() => { setForwardMsgId(contextMenu.msg.id); setContextMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-[var(--border-color)] flex items-center gap-3 text-sm transition-colors"><Share size={16}/> Forward</button>
                  <button onClick={() => handleTranslate(contextMenu.msg.id, contextMenu.msg.content)} className="w-full text-left px-4 py-2 hover:bg-[var(--border-color)] flex items-center gap-3 text-sm transition-colors"><Languages size={16}/> Translate AI</button>
                  <button onClick={() => handleStarMessage(contextMenu.msg.id)} className="w-full text-left px-4 py-2 hover:bg-[var(--border-color)] flex items-center gap-3 text-sm transition-colors">
                     <Star size={16} className={ (() => { try { const meta = JSON.parse(contextMenu.msg.metadata||'{}'); return meta.starredBy?.includes(user?.id) ? 'fill-yellow-500 text-yellow-500' : ''; } catch(e) { return ''; } })() } /> Star
                  </button>
                             <button onClick={() => { navigator.clipboard.writeText(contextMenu.msg.content); setContextMenu(null); }} className="w-full text-left px-4 py-3 hover:bg-[var(--border-color)] hover:text-[var(--accent-gray)] flex items-center gap-3 text-sm font-medium transition-colors"><Copy size={16}/> Copy</button>
                   <div className="h-px bg-[var(--border-color)] my-1"></div>
                   <button onClick={() => handleDeleteForMe(contextMenu.msg.id)} className="w-full text-left px-4 py-3 hover:bg-[var(--border-color)] hover:text-[var(--accent-gray)] flex items-center gap-3 text-sm font-medium transition-colors"><Trash2 size={16}/> Delete for me</button>
                   {contextMenu.msg.isMine && (
                      <button onClick={() => handleDeleteEveryone(contextMenu.msg.id)} className="w-full text-left px-4 py-3 hover:bg-red-500/10 flex items-center gap-3 text-sm font-bold text-red-500 transition-colors"><Trash2 size={16}/> Delete for everyone</button>
                   )}
               </div>
             )}
           </div>

           {/* Contact Info Panel */}
           {showInfoPanel && activeChat && (
              <div className="w-full md:w-80 absolute md:relative right-0 top-0 h-full z-40 border-l border-[var(--border-color)] flex flex-col overflow-hidden animate-[slideIn_0.3s_ease-out]">
                 <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between z-10 relative bg-transparent">
                    <h3 className="font-bold text-[var(--text-main)]">Contact Info</h3>
                    <button onClick={() => setShowInfoPanel(false)} className="text-gray-400 hover:text-gray-900 transition-colors p-1 rounded-full"><X size={20} /></button>
                 </div>
                 
                 <div className="relative">
                    {/* Banner Image */}
                    <div className="w-full h-32 bg-[var(--bg-secondary)] overflow-hidden relative border-b border-[var(--border-color)]">
                       {activeChat.role === 'SELLER' && (
                          <img src={PLACEHOLDER_IMAGE} alt="Banner" className="w-full h-full object-cover opacity-50 blur-sm" />
                       )}
                    </div>
                    
                    {/* Profile Logo */}
                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                       <div className="w-24 h-24 neu-card rounded-full flex items-center justify-center font-bold text-[var(--text-main)] text-4xl overflow-hidden relative group">
                          {activeChat.avatar && !(activeChat?.avatar || '').includes('undefined') ? (
                             <img src={activeChat.avatar || getAvatarFallback(activeChat.name)} alt="Logo" className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.src = getAvatarFallback(activeChat.name); }} />
                          ) : (
                             <div className="w-full h-full bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-main)]">{activeChat.name ? activeChat.name.charAt(0) : 'U'}</div>
                          )}
                       </div>
                    </div>
                 </div>

                 <div className="pt-14 pb-6 px-6 flex flex-col items-center border-b border-[var(--border-color)]">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--text-main)]">
                       {activeChat.name || 'User'} 
                       {activeChat.role === 'SELLER' && <ShieldCheck size={18} className="text-[var(--accent-gray)]" />}
                    </h2>
                    <p className="text-sm text-gray-400 mt-1 tracking-widest uppercase">{activeChat.role || 'Member'}</p>
                 </div>
                 
                 <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-4">
                       <div className="neu-card p-4 rounded-2xl w-full">
                          <h4 className="font-bold text-sm mb-3 flex items-center gap-2 text-[var(--text-main)]"><ShieldCheck size={16} className="text-[var(--accent-gray)]" /> Details</h4>
                          
                          <div className="space-y-4">
                              <div className="flex items-start gap-3">
                                 <div className="bg-[var(--bg-secondary)] p-2 border border-[var(--border-color)] rounded-lg text-[var(--text-main)]"><Phone size={16} /></div>
                                 <div>
                                    <p className="text-xs text-gray-400">Phone</p>
                                    <p className="text-sm text-[var(--text-main)] font-medium">{chatProfile ? (chatProfile.user?.phone || 'No phone provided') : 'Loading...'}</p>
                                 </div>
                              </div>
                              <div className="flex items-start gap-3">
                                 <div className="bg-[var(--bg-secondary)] p-2 border border-[var(--border-color)] rounded-lg text-[var(--text-main)]"><Info size={16} /></div>
                                 <div>
                                    <p className="text-xs text-gray-400">Email</p>
                                    <p className="text-sm text-[var(--text-main)] font-medium">{chatProfile ? (chatProfile.user?.email || 'No email provided') : 'Loading...'}</p>
                                 </div>
                              </div>
                              <div className="flex items-start gap-3">
                                 <div className="bg-[var(--bg-secondary)] p-2 border border-[var(--border-color)] rounded-lg text-[var(--text-main)]"><MapPin size={16} /></div>
                                 <div>
                                    <p className="text-xs text-gray-400">Address</p>
                                    <p className="text-sm text-[var(--text-main)] font-medium">{chatProfile ? (chatProfile.user?.address || 'No address provided') : 'Loading...'}</p>
                                 </div>
                              </div>
                              {activeChat.role === 'SELLER' && (
                              <div className="flex items-start gap-3">
                                 <div className="bg-[var(--bg-secondary)] p-2 border border-[var(--border-color)] rounded-lg text-[var(--text-main)]"><ShoppingBag size={16} /></div>
                                 <div>
                                    <p className="text-xs text-gray-400">Latest Product</p>
                                    <p className="text-sm text-[var(--accent-gray)] font-medium cursor-pointer hover:underline">{chatProfile ? (chatProfile.latestProduct?.name || 'No products listed') : 'Loading...'}</p>
                                 </div>
                              </div>
                              )}
                          </div>
                       </div>
                       
                       <div className="neu-card p-4 rounded-2xl w-full mt-4">
                          <h4 className="font-bold text-sm mb-3 flex items-center gap-2 text-white"><ImageIcon size={16} className="text-[var(--accent-gray)]" /> Shared Media</h4>
                          <div className="grid grid-cols-3 gap-2">
                             <div className="aspect-square bg-gray-800 rounded-lg hover:scale-105 transition-transform cursor-pointer"></div>
                             <div className="aspect-square bg-gray-800 rounded-lg hover:scale-105 transition-transform cursor-pointer"></div>
                             <div className="aspect-square bg-gray-800 rounded-lg hover:scale-105 transition-transform cursor-pointer"></div>
                          </div>
                       </div>
                       
                       <div className="neu-card p-4 rounded-2xl w-full mt-4">
                          <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  className="w-full text-red-500 font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-500/10 py-2 rounded-lg transition-colors">
                             <PhoneOff size={16} /> Block Contact
                          </button>
                       </div>
                 </div>
              </div>
           )}
        </div>
      </div>

      {/* Forward Modal */}
      {forwardMsgId && (
         <div className="fixed inset-0 z-50 bg-[var(--bg-main)]/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="neu-panel rounded-[2.5rem] p-8 w-full max-w-sm">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-white">Forward Message</h3>
                  <button onClick={() => setForwardMsgId(null)} className="text-gray-400 hover:text-gray-900"><X size={20}/></button>
               </div>
               <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-2">
                  {conversations.map(conv => (
                     <div key={conv.id} className="flex items-center justify-between p-2 hover:bg-[var(--bg-secondary)] rounded-lg border border-transparent cursor-pointer">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-[var(--bg-secondary)] overflow-hidden border border-[var(--border-color)]">
                              {conv.avatar && !(conv.avatar || '').includes('undefined') ? <img src={conv.avatar} alt="avatar" className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.src = getAvatarFallback(conv.name); }} /> : <img src={getAvatarFallback(conv.name)} className="w-full h-full object-cover" />}
                           </div>
                           <span className="text-sm text-white font-medium">{conv.name}</span>
                        </div>
                        <button onClick={() => handleForwardMessage(conv.id)} className="bg-[var(--accent-gray)] text-black px-3 py-1 text-xs font-bold rounded-lg transition-colors">Send</button>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      )}

      {/* New Chat Modal */}
      {showNewChat && (
         <div className="fixed inset-0 z-50 bg-[var(--bg-main)]/80 backdrop-blur-sm flex items-center justify-center animate-[fadeIn_0.2s_ease-out]">
            <div className="neu-panel rounded-[2.5rem] w-full max-w-md overflow-hidden">
               <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-transparent">
                  <h3 className="font-bold text-lg text-[var(--text-main)]">New Chat</h3>
                  <button onClick={() => setShowNewChat(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"><X size={20} /></button>
               </div>
               <div className="p-4 border-b border-[var(--border-color)] bg-transparent">
                  <div className="relative">
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                     <input 
                        type="text" 
                        value={newChatSearchQuery}
                        onChange={(e) => setNewChatSearchQuery(e.target.value)}
                        placeholder="Search contacts..." 
                        className="w-full neu-input py-2 pl-12 pr-4"
                     />
                  </div>
               </div>
               <div className="max-h-80 overflow-y-auto bg-transparent px-4 pb-4 pt-2">
                  {filteredContacts.map(contact => (
                     <div 
                        key={contact.id}
                        onClick={() => {
                           setActiveChat(contact);
                           setShowNewChat(false);
                        }}
                        className="p-4 flex items-center gap-4 neu-card hover:opacity-80 cursor-pointer transition-all mb-3"
                     >
                        <div className={`relative w-10 h-10 rounded-full flex-shrink-0 transition-all m-1 ${onlineUsersMap[contact.id] === 'online' ? 'ring-2 ring-green-500 shadow-[0_0_12px_rgba(34,197,94,0.8)]' : ''}`}>
                           <div className="w-full h-full neu-panel rounded-full flex items-center justify-center font-bold text-[var(--text-main)] overflow-hidden">
                              {contact.name.charAt(0)}
                           </div>
                        </div>
                        <div>
                           <h4 className="font-bold text-sm text-[var(--text-main)]">{contact.name}</h4>
                           <p className="text-xs text-[var(--text-muted)]">{contact.role}</p>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      )}

              </div>
      )}

      {/* Call UI Overlay */}
      {activeCall && (
        <div className={`fixed z-[100] flex flex-col text-white transition-all ${isCallMinimized ? 'top-0 left-0 w-full pointer-events-none' : 'inset-0 bg-[var(--bg-main)]/95 backdrop-blur-md items-center justify-center'}`}>
          {/* Media Elements */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             <video ref={remoteVideoRef} autoPlay playsInline className={`w-full h-full object-cover ${activeCall === 'video' ? 'opacity-100' : 'opacity-0'}`} />
             {/* Local video: always in DOM so ref is ready; hidden during voice calls */}
             <div className={`absolute bottom-32 right-6 w-32 h-48 rounded-xl overflow-hidden border-2 border-[var(--accent-gray)] shadow-[0_0_20px_var(--accent-gray-dim)] pointer-events-auto transition-opacity duration-300 ${activeCall === 'video' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
               style={{ background: '#111' }}>
               <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
             </div>
          </div>
          {activeCall === 'voice' && <audio ref={remoteVideoRef} autoPlay playsInline className="hidden" />}

          {/* Voice Call UI */}
          {activeCall === 'voice' && !isCallMinimized && (
             <div className="relative z-10 w-full h-full flex flex-col pt-20 pb-12 px-6 items-center justify-between">
                
                {/* Hide / Chat Button at top */}
                <button 
                  onClick={() => setIsCallMinimized(true)}
                  className="absolute top-6 left-6 w-12 h-12 rounded-full neu-button flex items-center justify-center hover:opacity-80 transition-opacity z-50 text-[var(--text-main)]"
                >
                  <ArrowLeft size={24} className="text-current" />
                </button>

                <div className="flex flex-col items-center mt-10">
                   <h2 className="text-3xl font-bold text-white mb-2">{activeChat?.name || incomingCall?.callerName || 'User'}</h2>
                   <p className="text-gray-400 font-mono text-lg">{formatRecTime(callDuration)}</p>
                </div>

                <div className="relative">
                   <div className="w-40 h-40 rounded-full border-4 border-[var(--accent-gray)] overflow-hidden flex items-center justify-center bg-gray-800 shadow-[0_0_30px_var(--accent-gray-dim)]">
                      {(activeChat?.avatar || incomingCall?.callerAvatar) && !String(activeChat?.avatar || incomingCall?.callerAvatar).includes('undefined') && !String(activeChat?.avatar || incomingCall?.callerAvatar).includes('null') ? (
                         <img src={activeChat?.avatar || incomingCall?.callerAvatar || getAvatarFallback(activeChat?.name || incomingCall?.callerName)} className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.src = getAvatarFallback(activeChat?.name || incomingCall?.callerName); }} />
                      ) : (
                         <img src={PLACEHOLDER_IMAGE} className="w-full h-full object-cover" />
                      )}
                   </div>
                </div>
                
                {/* Audio visualizer */}
                <VoiceCallVisualizer stream={activeStream} />

                <div className="flex flex-col items-center gap-8 w-full">
                   <div className="flex items-center justify-center gap-8">
                      <div className="flex flex-col items-center gap-2">
                         <button 
                           onClick={toggleMute}
                           className={`w-16 h-16 rounded-full neu-button flex items-center justify-center transition-all ${isCallMuted ? 'neu-button-primary text-white' : 'text-[var(--text-main)]'}`}
                         >
                            {isCallMuted ? <Mic size={28} className="line-through" /> : <Mic size={28} />}
                         </button>
                         <span className="text-xs text-gray-400 mt-2">Mute</span>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                         <button 
                           onClick={toggleSpeaker}
                           className={`w-16 h-16 rounded-full neu-button flex items-center justify-center transition-all ${isSpeaker ? 'neu-button-primary text-white' : 'text-[var(--text-main)]'}`}
                         >
                            <Phone size={28} />
                         </button>
                         <span className="text-xs text-gray-400 mt-2">Speaker</span>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                         <button 
                           onClick={() => setIsCallMinimized(true)}
                           className="w-16 h-16 rounded-full neu-button flex items-center justify-center text-[var(--text-main)] transition-all"
                         >
                            <MessageCircle size={28} className="text-white" />
                         </button>
                         <span className="text-xs text-gray-400 mt-2">Chat</span>
                      </div>
                   </div>

                   <button 
                     onClick={handleEndCall}
                     className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-all hover:scale-105 shadow-[0_0_20px_rgba(239,68,68,0.4)] mt-4"
                   >
                     <PhoneOff size={32} className="text-white" />
                   </button>
                </div>
             </div>
          )}

          {/* Minimized Call Banner */}
          {activeCall && isCallMinimized && (
             <div 
               onClick={() => setIsCallMinimized(false)}
               className="absolute top-0 left-0 w-full bg-green-500/90 backdrop-blur-md border-b border-green-500 p-3 flex items-center justify-between cursor-pointer hover:bg-green-600 transition-colors z-[60] pointer-events-auto shadow-lg"
             >
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center animate-pulse">
                      <Phone size={16} className="text-white" />
                   </div>
                   <div className="flex flex-col">
                      <span className="text-white font-bold text-sm">Ongoing Call • {activeChat?.name}</span>
                      <span className="text-green-400 font-mono text-xs">{formatRecTime(callDuration)}</span>
                   </div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleEndCall(); }}
                  className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600"
                >
                  <PhoneOff size={14} className="text-white" />
                </button>
             </div>
          )}

          {/* Video Call Controls */}
          {activeCall === 'video' && (
             <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 neu-panel px-8 py-4 rounded-[2.5rem]">
                <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  className="w-14 h-14 rounded-full neu-button flex items-center justify-center text-[var(--text-main)] transition-all"><Mic size={24}/></button>
                <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  className="w-14 h-14 rounded-full neu-button flex items-center justify-center text-[var(--text-main)] transition-all"><Video size={24}/></button>
                <button onClick={handleEndCall} className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all hover:scale-105"><PhoneOff size={28}/></button>
             </div>
          )}
        </div>
      )}

      {/* Incoming Call UI */}
      {incomingCall && !activeCall && (
        isMessagesRoute ? (
          <div className="fixed inset-0 z-[100] bg-[var(--bg-main)]/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="neu-panel rounded-[2.5rem] w-full max-w-sm p-8 text-center text-[var(--text-main)]">
              <h3 className="text-xs text-gray-400 font-bold tracking-widest uppercase mb-8">Incoming {incomingCall.type} call</h3>
              <div className="relative w-32 h-32 mx-auto mb-6">
                 <div className="w-full h-full rounded-full bg-gray-800 overflow-hidden flex items-center justify-center font-bold text-5xl">
                    {incomingCall.callerAvatar && !String(incomingCall.callerAvatar).includes('undefined') && !String(incomingCall.callerAvatar).includes('null') ? (
                       <img src={incomingCall.callerAvatar || getAvatarFallback(incomingCall.callerName)} className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.src = getAvatarFallback(incomingCall.callerName); }} />
                    ) : (
                       <img src={PLACEHOLDER_IMAGE} className="w-full h-full object-cover" />
                    )}
                 </div>
              </div>
              <h3 className="text-2xl font-bold mb-10">{incomingCall.callerName}</h3>
              
              <div className="flex justify-center gap-12">
                 <button 
                    onClick={() => {
                       if(socketRef.current) socketRef.current.emit('rejectCall', { callerId: incomingCall.callerId });
                       setIncomingCall(null);
                    }}
                    className="w-16 h-16 rounded-full bg-red-500/20 hover:bg-red-500 flex items-center justify-center text-red-500 hover:text-white transition-all"
                 >
                    <PhoneOff size={28} />
                 </button>
                 <button 
                    onClick={acceptCall}
                    className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-white hover:bg-green-600 transition-all hover:scale-110 shadow-[0_0_30px_rgba(34,197,94,0.4)] animate-pulse"
                 >
                    {incomingCall.type === 'video' ? <Video size={28} /> : <Phone size={28} />}
                 </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] neu-panel p-3 rounded-[2.5rem] flex items-center gap-4 w-11/12 max-w-md animate-[slide-down_0.3s_ease-out]">
             <div className="w-12 h-12 rounded-full bg-[var(--accent-gray)] overflow-hidden flex items-center justify-center font-bold text-black text-xl shadow-[0_0_15px_var(--accent-gray-dim)]">
                {incomingCall.callerAvatar && !String(incomingCall.callerAvatar).includes('undefined') && !String(incomingCall.callerAvatar).includes('null') ? (
                   <img src={incomingCall.callerAvatar || getAvatarFallback(incomingCall.callerName)} className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.src = getAvatarFallback(incomingCall.callerName); }} />
                ) : (
                   <img src={PLACEHOLDER_IMAGE} className="w-full h-full object-cover" />
                )}
             </div>
             <div className="flex-1">
                <h4 className="text-white font-bold text-sm">{incomingCall.callerName}</h4>
                <p className="text-gray-400 text-xs">Incoming {incomingCall.type} call...</p>
             </div>
             <div className="flex gap-2">
                <button onClick={() => { if(socketRef.current) socketRef.current.emit('rejectCall', { callerId: incomingCall.callerId }); setIncomingCall(null); }} className="w-10 h-10 rounded-full bg-red-500/20 hover:bg-red-500 flex items-center justify-center text-red-500 hover:text-white transition-colors">
                   <PhoneOff size={18} />
                </button>
                <button onClick={acceptCall} className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white hover:bg-green-600 transition-colors shadow-[0_0_15px_rgba(34,197,94,0.4)] animate-pulse">
                   <Phone size={18} />
                </button>
             </div>
          </div>
        )
      )}

      

      {/* Status View Modal */}
      {activeStatusUser && (
         <div className="fixed inset-0 z-[100] bg-[var(--bg-main)]/95 flex flex-col transition-all">
            {/* Header */}
            <div className="absolute top-0 left-0 w-full p-4 z-50 flex items-center justify-between bg-transparent">
               <div className="flex items-center gap-4">
                  <button onClick={() => setActiveStatusUser(null)} className="w-10 h-10 rounded-full neu-button flex items-center justify-center text-[var(--text-main)] transition-colors">
                     <ArrowLeft size={20} />
                  </button>
                  <div className="flex items-center gap-3 neu-input px-4 py-2 rounded-full">
                     <div className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center overflow-hidden shrink-0 border border-gray-600">
                        {activeStatusUser.user.avatarUrl && !(activeStatusUser.user.avatarUrl || '').includes('undefined') ? <img src={activeStatusUser.user.avatarUrl} className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.src = getAvatarFallback(activeStatusUser.user.fullName); }} /> : <img src={getAvatarFallback(activeStatusUser.user.fullName)} className="w-full h-full object-cover" />}
                     </div>
                     <div>
                        <p className="text-white font-bold text-sm">{activeStatusUser.user.id === user?.id ? 'My Status' : activeStatusUser.user.fullName}</p>
                        <p className="text-gray-400 text-[10px] drop-shadow-md font-mono">{activeStatusUser.statuses[activeStatusIndex]?.createdAt ? new Date(activeStatusUser.statuses[activeStatusIndex].createdAt).toLocaleString() : ''}</p>
                     </div>
                  </div>
               </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center relative w-full h-full overflow-hidden">
               {activeStatusUser.statuses[activeStatusIndex]?.mediaUrl ? (
                  <img src={activeStatusUser.statuses[activeStatusIndex].mediaUrl} className="max-w-full max-h-full object-contain" />
               ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#111] p-4 sm:p-8">
                     <p className="text-white text-xl sm:text-3xl font-bold text-center drop-shadow-lg max-w-2xl">{activeStatusUser.statuses[activeStatusIndex]?.content}</p>
                  </div>
               )}
               {activeStatusUser.statuses[activeStatusIndex]?.mediaUrl && activeStatusUser.statuses[activeStatusIndex]?.content && (
                  <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-center p-4 neu-panel rounded-[2.5rem] z-10 w-11/12 max-w-md">
                     <p className="text-white text-base sm:text-lg drop-shadow-md max-w-2xl mx-auto">{activeStatusUser.statuses[activeStatusIndex].content}</p>
                  </div>
               )}
            </div>
            
            {/* Nav zones */}
            <div className="absolute top-0 left-0 w-1/3 h-full cursor-pointer z-0" onClick={() => {
               if (activeStatusIndex > 0) setActiveStatusIndex(prev => prev - 1);
            }}></div>
            <div className="absolute top-0 right-0 w-1/3 h-full cursor-pointer z-0" onClick={() => {
               if (activeStatusIndex < activeStatusUser.statuses.length - 1) setActiveStatusIndex(prev => prev + 1);
               else setActiveStatusUser(null);
            }}></div>
         </div>
      )}

    </>
  );
};

export default Messages;
