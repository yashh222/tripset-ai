import { useState, useRef, useEffect } from "react"
import { RotateCw, MessageSquare, History, Trash2, X, Clock } from "lucide-react"
import { ChatNav } from "@/components/chat/ChatNav"
import { ChatComposer } from "@/components/chat/ChatComposer"
import { DestinationOrbit } from "@/components/chat/DestinationOrbit"
import { ChipDark } from "@/components/ui/Chip"
import { chatSuggestions } from "@/data/destinations"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/context/ToastContext"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

const tripMessageIds = new Set([
  "initial-req",
  "hotel-recs",
  "selected-hotel-msg",
  "call-status",
  "final-booking",
  "user-dec-msg"
]);

export default function ChatPage() {
  const { token, user } = useAuth()
  const { showToast } = useToast()
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState([])
  const [isTyping, setIsTyping] = useState(false)
  
  // Trip Lifecycle State
  const [tripId, setTripId] = useState(null)
  const [tripStatus, setTripStatus] = useState(null)
  const [tripData, setTripData] = useState(null);
  // Chat history persistence
  const [showHistory, setShowHistory] = useState(false);
  const [chatHistory, setChatHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('chatHistory') || '[]');
    } catch {
      return [];
    }
  });
  // Persist chatHistory to localStorage
  useEffect(() => {
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
  }, [chatHistory]);
  
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  // 1. Recover active trip session on mount
  useEffect(() => {
    async function loadActiveTrip() {
      if (!token) return
      try {
        const res = await fetch(`${API_URL}/trips/active`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        })
        if (res.ok) {
          const active = await res.json()
          if (active) {
            setTripId(active.tripId)
            setTripStatus(active.status)
            setTripData(active.values)
            setMessages(active.messages && active.messages.length > 0 ? active.messages : reconstructMessages(active.values))
          }
        }
      } catch (err) {
        console.error("Failed to load active trip:", err)
      }
    }
    loadActiveTrip()
  }, [token])

  // 1b. Persist state to database whenever chat parameters change
  useEffect(() => {
    if (!token || messages.length === 0) return
    const saveState = async () => {
      try {
        await fetch(`${API_URL}/trips/state`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            tripId,
            status: tripStatus,
            values: tripData,
            messages
          })
        })
      } catch (err) {
        console.error("Failed to sync chat state to database:", err)
      }
    }
    const handler = setTimeout(saveState, 600)
    return () => clearTimeout(handler)
  }, [messages, tripId, tripStatus, tripData, token])

  // 2. Poll Vapi call details if call is currently in_progress
  useEffect(() => {
    let timer
    if (tripId && tripData?.callStatus === "in_progress") {
      const pollTrip = async () => {
        try {
          const res = await fetch(`${API_URL}/trips/${tripId}`, {
            headers: {
              "Authorization": `Bearer ${token}`
            }
          })
          if (res.ok) {
            const data = await res.json()
            if (data.callStatus === "completed" || data.callStatus === "failed") {
              setTripData(data)
              setTripStatus(data.status)
              const tripMessageIds = new Set([
                "initial-req",
                "hotel-recs",
                "selected-hotel-msg",
                "call-status",
                "final-booking",
                "user-dec-msg"
              ]);
              setMessages((prev) => {
                const nonTripMsgs = prev.filter(m => !tripMessageIds.has(m.id));
                const updatedTripMsgs = reconstructMessages(data.values || data);
                return [...nonTripMsgs, ...updatedTripMsgs];
              });
            }
          }
        } catch (err) {
          console.error("Error polling trip call:", err)
        }
      }

      pollTrip()
      timer = setInterval(pollTrip, 3000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [tripId, tripStatus, tripData?.callStatus, token])

  // Helper to translate backend LangGraph state into chat messages
  function reconstructMessages(values) {
    if (!values) return []
    const list = []
    
    // User initial search prompt
    if (values.rawRequest) {
      list.push({
        id: "initial-req",
        sender: "user",
        text: values.rawRequest
      })
    }
    
    // Hotel Scout/Candidate Recommendation Card List
    if (values.rankedHotels && values.rankedHotels.length > 0) {
      const weatherText = values.weatherSummary ? `\n\n🌤️ **Weather forecast for ${values.destination}:** ${values.weatherSummary}` : ""
      list.push({
        id: "hotel-recs",
        sender: "ai",
        text: `Based on your request, I structured a travel plan for **${values.destination}** and scouted premium hotel accommodations matching your constraints.${weatherText}\n\nSelect a candidate below to initiate an outbound Vapi voice verification:`,
        type: "hotels",
        hotels: values.rankedHotels,
        selectedHotelId: values.selectedHotelId
      })
    }
    
    // User Hotel Choice Confirmation message
    if (values.selectedHotelId) {
      const selectedHotel = values.rankedHotels?.find(h => h.hotelId === values.selectedHotelId)
      list.push({
        id: "selected-hotel-msg",
        sender: "user",
        text: `Chosen hotel for voice inquiry: **${selectedHotel ? selectedHotel.name : 'Selected Hotel'}**.`
      })
      
      // Voice call status / transcript / final summary
      if (values.callStatus === "in_progress") {
        list.push({
          id: "call-status",
          sender: "ai",
          text: `Contacting hotel via agent to request availability and terms...`,
          type: "calling",
          hotelName: selectedHotel ? selectedHotel.name : 'hotel'
        })
      } else if (values.callStatus === "completed") {
        const textMsg = values.callSummary?.analysisText
          ? values.callSummary.analysisText
          : `Vapi voice inquiry completed! Here is the negotiated final quote and booking details gathered from **${selectedHotel ? selectedHotel.name : 'the hotel'}**:`;

        list.push({
          id: "call-status",
          sender: "ai",
          text: textMsg,
          type: "call_summary",
          callSummary: values.callSummary,
          userDecision: values.userDecision,
          hotelName: selectedHotel ? selectedHotel.name : 'the hotel'
        })
      }
    }

    // User final booking decision
    if (values.userDecision && values.userDecision !== "pending") {
      const decisionLabel = values.userDecision === "proceed" ? "Confirm and Book" : "Reject Trip"
      list.push({
        id: "user-dec-msg",
        sender: "user",
        text: decisionLabel
      })
      
      // Booking Success / Rejected cards
      if (values.userDecision === "proceed") {
        list.push({
          id: "final-booking",
          sender: "ai",
          text: `Excellent choice! Your booking is locked. A travel itinerary and check-in confirmation details have been generated.`,
          type: "booking_success"
        })
      } else if (values.userDecision === "reject") {
        list.push({
          id: "final-booking",
          sender: "ai",
          text: `Understood, planning session closed. Let me know if you would like to search a new destination!`,
          type: "booking_rejected"
        })
      }
    }
    
    return list
  }

  function getInitials(name) {
    if (!name) return "EX"
    const parts = name.split(" ")
    return parts.map((p) => p[0]).join("").toUpperCase().slice(0, 2)
  }

  function handleSuggestionClick(s) {
    handleSubmit(s)
  }

  // Submit initial query to start trip graph
  async function handleSubmit(text) {
    if (!text.trim() || isTyping) return

    setMessage("")
    setIsTyping(true)

    // Pre-inject user request to screen for immediate feedback
    const userMsg = {
      id: Date.now() + "-user",
      sender: "user",
      text: text
    }
    setMessages((prev) => [...prev, userMsg])

    try {
      const res = await fetch(`${API_URL}/trips`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ rawRequest: text })
      })

      if (!res.ok) {
        throw new Error("Unable to construct travel plan. Please check backend log.")
      }

      const result = await res.json()
      if (result.status === "chat" || result.status === "error" || result.error) {
        const aiMsg = {
          id: Date.now() + "-ai",
          sender: "ai",
          text: result.chatResponse || result.error || "Our server is currently experiencing high load. Please try again in a few moments."
        }
        setMessages((prev) => [...prev, aiMsg])
      } else {
        const oldTripId = tripId
        setTripId(result.tripId)
        setTripStatus(result.status)
        setTripData(result.values)
        
        const tripMessageIds = new Set([
          "initial-req",
          "hotel-recs",
          "selected-hotel-msg",
          "call-status",
          "final-booking",
          "user-dec-msg"
        ]);
        
        setMessages((prev) => {
          // Freeze old active trip messages
          const frozenPrev = prev.map(m => {
            if (tripMessageIds.has(m.id)) {
              return { ...m, id: `${oldTripId || 'old'}-${m.id}` };
            }
            return m;
          });
          const historyFiltered = frozenPrev.filter(m => m.id !== userMsg.id);
          const newTripMsgs = reconstructMessages(result.values);
          return [...historyFiltered, ...newTripMsgs];
        });
      }
    } catch (err) {
      showToast(err.message || "Failed to plan trip", "error")
    } finally {
      setIsTyping(false)
    }
  }

  // Handle hotel choice approval and Vapi outbound trigger
  async function handleSelectHotel(hotelId) {
    setIsTyping(true)
    try {
      const res = await fetch(`${API_URL}/trips/${tripId}/approve-enquiry`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ hotelId })
      })

      if (!res.ok) {
        throw new Error("Failed to contact selected hotel")
      }

      const result = await res.json()
      setTripStatus(result.status)
      setTripData(result.values)
      
      const tripMessageIds = new Set([
        "initial-req",
        "hotel-recs",
        "selected-hotel-msg",
        "call-status",
        "final-booking",
        "user-dec-msg"
      ]);
      setMessages((prev) => {
        const nonTripMsgs = prev.filter(m => !tripMessageIds.has(m.id));
        const updatedTripMsgs = reconstructMessages(result.values);
        return [...nonTripMsgs, ...updatedTripMsgs];
      });
      showToast("Triggering hotel verification call...", "info")
    } catch (err) {
      showToast(err.message || "Error starting voice call", "error")
    } finally {
      setIsTyping(false)
    }
  }

  // Submit final travel status approval/modification
  async function handleDecision(decision, note = "") {
    setIsTyping(true)
    try {
      const res = await fetch(`${API_URL}/trips/${tripId}/decision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ decision, note })
      })

      if (!res.ok) {
        throw new Error("Failed to submit decision")
      }

      const result = await res.json()
      setTripStatus(result.status)
      setTripData(result.values)
      
      const tripMessageIds = new Set([
        "initial-req",
        "hotel-recs",
        "selected-hotel-msg",
        "call-status",
        "final-booking",
        "user-dec-msg"
      ]);
      setMessages((prev) => {
        const nonTripMsgs = prev.filter(m => !tripMessageIds.has(m.id));
        const updatedTripMsgs = reconstructMessages(result.values);
        return [...nonTripMsgs, ...updatedTripMsgs];
      });

      if (decision === "proceed") {
        showToast("Booking finalized!", "success")
      } else if (decision === "reject") {
        showToast("Trip closed.", "info")
      } else {
        showToast("Modifying details...", "info")
      }
    } catch (err) {
      showToast(err.message || "Error submitting decision", "error")
    } finally {
      setIsTyping(false)
    }
  }

  function handleResetTrip() {
    // Save current trip messages to history before resetting
    if (tripId) {
      const entry = {
        tripId,
        messages,
        status: tripStatus,
        timestamp: new Date().toISOString()
      };
      setChatHistory(prev => [entry, ...prev]);
    }
    setTripId(null);
    setTripStatus(null);
    setTripData(null);
    setMessages([]);
    setMessage("");
    showToast("Reset chat thread. Start planning a new trip!", "info");
  }

  function HistoryButton() {
    return (
      <button
        onClick={() => setShowHistory(prev => !prev)}
        className="fixed top-3.5 right-20 z-40 flex items-center gap-2 rounded-full border border-dusk-border bg-dusk-2/90 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold text-white hover:border-sunset/50 transition-all shadow-float cursor-pointer"
        title="View Chat History"
      >
        <History className="h-4 w-4 text-sunset" />
        <span>History</span>
        {chatHistory.length > 0 && (
          <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-sunset px-1 text-[10px] font-bold text-white">
            {chatHistory.length}
          </span>
        )}
      </button>
    );
  }

  function HistoryModal() {
    const restoreTrip = (entry) => {
      setTripId(entry.tripId);
      setTripStatus(entry.status || null);
      setMessages(entry.messages || []);
      setShowHistory(false);
      showToast("Restored chat session from history!", "info");
    };

    const deleteHistoryItem = (indexToDelete) => {
      setChatHistory(prev => prev.filter((_, idx) => idx !== indexToDelete));
      showToast("Deleted entry from history", "info");
    };

    const clearAllHistory = () => {
      setChatHistory([]);
      showToast("Cleared all chat history", "info");
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
        <div className="relative w-full max-w-lg rounded-2xl border border-dusk-border bg-[#0b1528] p-6 shadow-2xl animate-scale-up text-dusk-foreground max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-dusk-border/60 pb-4 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sunset/15 text-sunset">
                <History className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-white">Chat History</h3>
                <p className="text-xs text-dusk-muted">Select a past session to view or restore</p>
              </div>
            </div>
            <button
              onClick={() => setShowHistory(false)}
              className="rounded-full p-1.5 text-dusk-muted hover:bg-dusk-soft hover:text-white transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto py-4 space-y-3 scrollbar-thin">
            {chatHistory.length === 0 ? (
              <div className="py-12 text-center text-dusk-muted">
                <Clock className="mx-auto h-8 w-8 opacity-40 mb-2" />
                <p className="text-sm font-medium">No saved chat history yet</p>
                <p className="text-xs text-dusk-muted/70 mt-1">
                  Clicking "Plan New Trip" archives your current conversation here.
                </p>
              </div>
            ) : (
              chatHistory.map((item, idx) => {
                const firstUserMsg = item.messages?.find(m => m.sender === "user")?.text || "Trip Planning Session";
                const formattedDate = item.timestamp ? new Date(item.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : "Past session";
                
                return (
                  <div
                    key={item.tripId || idx}
                    className="group flex items-center justify-between rounded-xl border border-dusk-border/40 bg-dusk-2/50 p-3.5 hover:border-sunset/40 hover:bg-dusk-soft/40 transition-all cursor-pointer"
                    onClick={() => restoreTrip(item)}
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <p className="text-sm font-medium text-white truncate group-hover:text-sunset transition">
                        {firstUserMsg}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-dusk-muted">
                        <span>{formattedDate}</span>
                        <span>•</span>
                        <span>{item.messages?.length || 0} messages</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteHistoryItem(idx);
                        }}
                        className="p-1.5 rounded-lg text-dusk-muted hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                        title="Delete entry"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {chatHistory.length > 0 && (
            <div className="border-t border-dusk-border/60 pt-3 shrink-0 flex justify-between items-center text-xs">
              <span className="text-dusk-muted">{chatHistory.length} saved session(s)</span>
              <button
                onClick={clearAllHistory}
                className="text-red-400 hover:underline cursor-pointer"
              >
                Clear all history
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const firstName = user?.name ? user.name.split(" ")[0] : "Explorer"
  const isChatting = messages.length > 0

  return (
    <main className="flex h-screen max-h-screen flex-col bg-gradient-to-br from-[#06152d] via-[#080c16] to-[#150a21] text-dusk-foreground animate-page-enter overflow-hidden relative">
      {/* Fixed Navbar */}
      <div className="shrink-0 z-30">
        <ChatNav onToggleHistory={() => setShowHistory(prev => !prev)} historyCount={chatHistory.length} />
      </div>
        {/* History button */}
        <HistoryButton />
        {/* History modal */}
        {showHistory && <HistoryModal />}

      <div className="relative flex flex-1 flex-col overflow-hidden">
        {/* Flanking Orbits (left/right margins) - hidden when chatting */}
        {!isChatting && <DestinationOrbit />}

        {/* Ambient glow auroras (refreshing gradients) */}
        <div className="pointer-events-none absolute -left-24 -top-24 h-[500px] w-[500px] rounded-full bg-teal-500/8 blur-[130px] z-0" />
        <div className="pointer-events-none absolute -right-24 bottom-10 h-[500px] w-[500px] rounded-full bg-violet-600/8 blur-[140px] z-0" />
        <div className="pointer-events-none absolute left-1/3 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-primary/8 blur-[150px] z-0" />

        {!isChatting ? (
          /* Centered Landing layout (Default state) */
          <div className="flex-1 flex flex-col justify-center items-center w-full max-w-4xl mx-auto px-6 py-8 z-10 animate-fade-in relative">
            {/* Prompt details */}
            <div className="text-center max-w-2xl">
              <p className="text-sm font-medium text-dusk-muted">
                Welcome back, {firstName}
              </p>
              <h1 className="mt-2 font-display text-4xl font-bold leading-tight text-white md:text-5xl">
                Ready to chart your next journey?
              </h1>
            </div>

            {/* Composer Box */}
            <div className="w-full max-w-2xl mt-8 animate-slide-up">
              <ChatComposer
                value={message}
                onChange={setMessage}
                onSubmit={handleSubmit}
              />
            </div>

            {/* Suggestions Chips */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 max-w-2xl">
              {chatSuggestions.map((s) => (
                <ChipDark key={s} onClick={() => handleSuggestionClick(s)}>
                  {s}
                </ChipDark>
              ))}
              <button
                className="flex h-9 w-9 items-center justify-center rounded-full border border-dusk-border text-dusk-muted transition hover:text-white"
                aria-label="Shuffle suggestions"
              >
                <RotateCw className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          /* ChatGPT-style active chat view */
          <div className="flex-1 flex flex-col overflow-hidden z-10">
            {/* Scrollable messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-8 md:px-6 scrollbar-thin">
              <div className="mx-auto max-w-3xl flex flex-col gap-6 pb-36">
                
                {/* Reset Link for Chat */}
                <div className="flex justify-between items-center mb-2 border-b border-dusk-border/40 pb-2">
                  <span className="text-xs font-semibold text-dusk-muted">Active Planning Thread</span>
                  <button
                    onClick={handleResetTrip}
                    className="text-xs font-bold text-sunset hover:brightness-110 flex items-center gap-1 transition cursor-pointer"
                  >
                    Plan New Trip
                  </button>
                </div>

                {messages.map((msg) => {
                  const isHistorical = typeof msg.id === "string" && msg.id.includes("-") && !tripMessageIds.has(msg.id) && !msg.id.endsWith("-user") && !msg.id.endsWith("-ai");
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-4 animate-slide-up ${
                        msg.sender === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                    {msg.sender === "ai" && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sunset text-white font-bold text-xs shadow-soft">
                        W
                      </div>
                    )}
                                    <div className="flex-1 max-w-[85%]">
                      <div
                        className={`rounded-2xl px-5 py-3.5 text-[15px] leading-relaxed shadow-soft whitespace-pre-line ${
                          msg.sender === "user"
                            ? "bg-dusk-soft text-white border border-dusk-border ml-auto w-fit"
                            : "glass-dark text-dusk-foreground border border-dusk-border/40"
                        }`}
                      >
                        {msg.text}
                      </div>

                      {/* Rendering hotel recommendation list */}
                      {msg.sender === "ai" && msg.type === "hotels" && msg.hotels && (
                        <div className="mt-4 space-y-3.5 text-left font-sans animate-slide-up">
                          {msg.hotels.map((hotel) => {
                            const isSelected = msg.selectedHotelId === hotel.hotelId;
                            return (
                              <div
                                key={hotel.hotelId}
                                className={`rounded-xl border p-4 transition-all duration-300 ${
                                  isSelected
                                    ? "bg-sunset/10 border-sunset/50 shadow-soft"
                                    : "bg-dusk-2/30 border-dusk-border/40 hover:border-sunset/30"
                                }`}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                  <div className="flex-1 space-y-1.5">
                                    {/* Hotel Title and Rating */}
                                    <div className="flex items-center gap-2">
                                      <span className="shrink-0 text-[10px] font-bold text-sunset bg-sunset/15 px-2 py-0.5 rounded-full">
                                        {hotel.rating} ★
                                      </span>
                                      <h4 className="font-display font-bold text-base text-white tracking-wide leading-tight">
                                        {hotel.name}
                                      </h4>
                                    </div>
                                    
                                    {/* Address / Location */}
                                    <p className="text-[12px] text-dusk-muted">
                                      {hotel.address || "Local accommodation"}
                                    </p>
                                    
                                    {/* Amenities Chips */}
                                    {hotel.amenities && hotel.amenities.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {hotel.amenities.slice(0, 3).map((amenity, idx) => (
                                          <span
                                            key={idx}
                                            className="text-[9px] font-medium bg-white/5 border border-white/10 px-2 py-0.5 rounded-md text-dusk-foreground"
                                          >
                                            {amenity}
                                          </span>
                                        ))}
                                      </div>
                                    )}

                                    {/* Pricing details */}
                                    <div className="mt-3 flex flex-wrap items-center gap-3.5 text-[12px] pt-1">
                                      <div>
                                        <span className="text-dusk-muted">Nightly: </span>
                                        <span className="font-bold text-white">₹{hotel.pricePerNight?.toLocaleString('en-IN') || "N/A"}</span>
                                      </div>
                                      <div className="w-1 h-1 rounded-full bg-dusk-border" />
                                      <div>
                                        <span className="text-dusk-muted">Est. Total: </span>
                                        <span className="font-bold text-white">₹{hotel.estimatedTotalCost?.toLocaleString('en-IN') || "N/A"}</span>
                                      </div>
                                    </div>

                                    {hotel.reason && (
                                      <p className="mt-2 text-[11px] text-sunset/90 bg-sunset/5 border border-sunset/10 p-2 rounded-lg leading-relaxed italic">
                                        {hotel.reason}
                                      </p>
                                    )}
                                  </div>

                                  {/* Select button on secondary column */}
                                  <div className="shrink-0 flex items-center sm:justify-end">
                                    {msg.selectedHotelId ? (
                                      isSelected ? (
                                        <span className="w-full sm:w-auto px-4 py-2 text-center text-xs font-bold text-sunset bg-sunset/10 border border-sunset/20 rounded-lg">
                                          ✓ Chosen Option
                                        </span>
                                      ) : null
                                    ) : (
                                      isHistorical ? (
                                        <span className="w-full sm:w-auto px-4 py-2 text-center text-xs font-semibold text-dusk-muted bg-white/5 rounded-lg border border-white/5">
                                          Completed
                                        </span>
                                      ) : (
                                        <button
                                          onClick={() => handleSelectHotel(hotel.hotelId)}
                                          className="w-full sm:w-auto bg-sunset text-white py-2 px-5 rounded-lg text-xs font-bold shadow-soft hover:brightness-115 active:scale-95 transition-all duration-200 cursor-pointer text-center"
                                        >
                                          Select Hotel
                                        </button>
                                      )
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Rendering calling loading status */}
                      {msg.sender === "ai" && msg.type === "calling" && (
                        <div className="mt-3 flex flex-col gap-2.5 rounded-xl border border-dusk-border/40 bg-dusk-soft/10 p-4 text-left font-sans animate-slide-up">
                          <div className="flex items-center gap-3">
                            <span className="relative flex h-3.5 w-3.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sunset opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-sunset"></span>
                            </span>
                            <p className="text-sm font-semibold text-white">Outbound Call Connection Active...</p>
                          </div>
                          <p className="text-xs text-dusk-muted leading-relaxed">
                            Vapi voice agent is negotiating with front-desk options at **{msg.hotelName}** to retrieve amenities, double-occupancy quotes, policies and checklist details.
                          </p>
                        </div>
                      )}

                      {/* Rendering completed call summary */}
                      {msg.sender === "ai" && msg.type === "call_summary" && msg.callSummary && (
                        <div className="mt-4 rounded-xl border border-dusk-border/60 bg-dusk-2/60 p-5 shadow-float text-left font-sans animate-slide-up">
                          <h4 className="text-xs font-extrabold text-white uppercase tracking-wider mb-3">Vapi Agent Verification Details</h4>
                          <div className="grid grid-cols-2 gap-3.5">
                            <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                              <p className="text-[10px] text-dusk-muted">Negotiated Quote</p>
                              <p className="text-xs font-extrabold text-white mt-0.5">₹{msg.callSummary.finalPrice?.toLocaleString('en-IN') || "N/A"}</p>
                            </div>
                            <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                              <p className="text-[10px] text-dusk-muted">Breakfast Included</p>
                              <p className="text-xs font-extrabold text-white mt-0.5">{msg.callSummary.breakfastIncluded ? "Yes (Free)" : "No"}</p>
                            </div>
                            <div className="bg-white/5 p-3 rounded-lg border border-white/5 col-span-2">
                              <p className="text-[10px] text-dusk-muted">Cancellation Terms</p>
                              <p className="text-xs font-semibold text-white mt-1">{msg.callSummary.cancellationPolicy || "Standard terms apply"}</p>
                            </div>
                          </div>

                          {msg.callSummary.amenitiesConfirmed && msg.callSummary.amenitiesConfirmed.length > 0 && (
                            <div className="mt-3.5">
                              <p className="text-[10px] text-dusk-muted">In-house Conveniences Confirmed</p>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {msg.callSummary.amenitiesConfirmed.map((a, idx) => (
                                  <span key={idx} className="text-[9px] bg-sunset/10 text-sunset px-1.5 py-0.5 rounded border border-sunset/10 font-bold">
                                    {a}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {msg.callSummary.raw && (
                            <div className="mt-4 border-t border-white/5 pt-3">
                              <details className="group cursor-pointer">
                                <summary className="text-[10px] text-dusk-muted hover:text-white flex items-center justify-between focus:outline-none">
                                  <span>Review Vapi Phone Conversation Transcript</span>
                                  <span className="text-xs transition-transform group-open:rotate-180">▼</span>
                                </summary>
                                <div className="mt-3 p-3 bg-dusk bg-opacity-70 rounded-lg border border-dusk-border/40 text-[10px] font-mono leading-relaxed text-dusk-muted max-h-40 overflow-y-auto whitespace-pre-wrap select-text">
                                  {msg.callSummary.raw}
                                </div>
                              </details>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Rendering Success Booking */}
                      {msg.sender === "ai" && msg.type === "booking_success" && (
                        <div className="mt-3 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-left font-sans animate-slide-up">
                          <p className="text-sm font-semibold text-green-400">✓ Booking Finalized Successfully</p>
                          <p className="text-xs text-dusk-muted mt-1 leading-normal">
                            We have synced booking confirmation files with your user account. Your travel dates are secured!
                          </p>
                        </div>
                      )}

                      {/* Rendering Rejected Booking */}
                      {msg.sender === "ai" && msg.type === "booking_rejected" && (
                        <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-left font-sans animate-slide-up">
                          <p className="text-sm font-semibold text-red-400">✗ Inquiry Cancelled</p>
                          <p className="text-xs text-dusk-muted mt-1 leading-normal">
                            This planning thread has been archived. Submit a new query below to find another destination.
                          </p>
                        </div>
                      )}

                      {/* Rendering Success Booking */}
                      {msg.sender === "ai" && msg.type === "booking_success" && (
                        <div className="mt-3 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-left font-sans animate-slide-up">
                          <p className="text-sm font-semibold text-green-400">✓ Booking Finalized Successfully</p>
                          <p className="text-xs text-dusk-muted mt-1 leading-normal">
                            We have synced booking confirmation files with your user account. Your travel dates are secured!
                          </p>
                        </div>
                      )}

                      {/* Rendering Rejected Booking */}
                      {msg.sender === "ai" && msg.type === "booking_rejected" && (
                        <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-left font-sans animate-slide-up">
                          <p className="text-sm font-semibold text-red-400">✗ Inquiry Cancelled</p>
                          <p className="text-xs text-dusk-muted mt-1 leading-normal">
                            This planning thread has been archived. Submit a new query below to find another destination.
                          </p>
                        </div>
                      )}               </div>

                    {msg.sender === "user" && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/95 text-white font-bold text-xs uppercase shadow-soft">
                        {getInitials(user?.name)}
                      </div>
                    )}
                  </div>
                )})}

                {isTyping && (
                  <div className="flex items-start gap-4 justify-start animate-fade-in">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sunset text-white font-bold text-xs">
                      W
                    </div>
                    <div className="rounded-2xl px-5 py-3.5 bg-dusk-soft/40 border border-dusk-border/40 text-dusk-muted text-sm flex gap-1.5 items-center">
                      <span className="h-1.5 w-1.5 rounded-full bg-dusk-muted animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-dusk-muted animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-dusk-muted animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Sticky composer at bottom */}
            <div className="shrink-0 bg-gradient-to-t from-dusk via-dusk/98 to-transparent pt-10 pb-6 px-4">
              <div className="mx-auto max-w-3xl">
                <ChatComposer
                  value={message}
                  onChange={setMessage}
                  onSubmit={handleSubmit}
                />
                <p className="mt-2.5 text-center text-xs text-dusk-muted">
                  Tripset AI can make mistakes. Verify travel details before booking.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
