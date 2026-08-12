import { createContext, useContext, useState, useCallback } from "react"
import { CheckCircle2, AlertCircle, X } from "lucide-react"

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      removeToast(id)
    }, 4000)
  }, [removeToast])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 max-w-md w-full sm:w-80 pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

function ToastItem({ toast, onClose }) {
  const isError = toast.type === "error"
  
  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 rounded-xl p-4 shadow-float backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-right-5 ${
        isError 
          ? "bg-[#1c121e]/90 border border-sunset/45 text-white" 
          : "bg-[#0b1b1a]/90 border border-emerald-500/40 text-white"
      }`}
      role="alert"
    >
      <div className="flex-shrink-0 mt-0.5">
        {isError ? (
          <AlertCircle className="h-5 w-5 text-sunset" />
        ) : (
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
        )}
      </div>
      <div className="flex-1 text-sm font-medium leading-5">
        {toast.message}
      </div>
      <button
        onClick={onClose}
        className="flex-shrink-0 ml-1 rounded-lg p-0.5 text-white/50 hover:text-white transition hover:bg-white/10"
        aria-label="Close notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
