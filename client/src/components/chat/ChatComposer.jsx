import { useState } from "react"
import { Sparkles, AudioLines, ArrowUp } from "lucide-react"

export function ChatComposer({ value, onChange, onSubmit }) {
  const [internal, setInternal] = useState("")
  const controlled = value !== undefined
  const text = controlled ? value : internal

  function setText(v) {
    if (controlled) onChange?.(v)
    else setInternal(v)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim()) return
    onSubmit?.(text)
  }

  function handleKeyDown(e) {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="gradient-border-chat flex items-center gap-3 rounded-[1.5rem] px-4 py-3 shadow-float"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dusk-soft text-primary">
        <Sparkles className="h-4 w-4" />
      </span>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Tell me your travel dreams…"
        className="min-w-0 flex-1 bg-transparent text-[15px] text-white placeholder:text-dusk-muted focus:outline-none"
      />
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-full text-dusk-muted transition hover:text-white"
        aria-label="Voice input"
      >
        <AudioLines className="h-4 w-4" />
      </button>
      <button
        type="submit"
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-sunset text-white transition hover:brightness-105 disabled:opacity-40"
        disabled={!text.trim()}
        aria-label="Send"
      >
        <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
      </button>
    </form>
  )
}
