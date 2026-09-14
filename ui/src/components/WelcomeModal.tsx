import { useState } from 'react'
import { Sparkles, Mars, Venus, ArrowRight, Loader2, User } from 'lucide-react'

type GenderOption = 'male' | 'female' | 'custom' | null

interface WelcomeModalProps {
  isOpen: boolean
  onComplete: (data: { displayName: string; gender: string }) => Promise<void> | void
}

function WelcomeModal({ isOpen, onComplete }: WelcomeModalProps) {
  const [displayName, setDisplayName] = useState('')
  const [genderOption, setGenderOption] = useState<GenderOption>(null)
  const [customGender, setCustomGender] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const finalGender = genderOption === 'custom' ? customGender.trim() : genderOption ?? ''
  const isValid = displayName.trim().length >= 2 && finalGender.length > 0

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return
    setError('')
    setIsSubmitting(true)
    try {
      await onComplete({ displayName: displayName.trim(), gender: finalGender })
    } catch {
      setError('Gagal menyimpan data, coba lagi ya.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#050208]/80 backdrop-blur-sm" />

      {/* Ambient glow blobs */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-pink-500/20 blur-[100px]" />

      {/* Card */}
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#12081f]/90 shadow-[0_0_60px_-15px_rgba(139,92,246,0.4)] backdrop-blur-2xl">
        {/* Top accent bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-purple-500 to-pink-500" />

        <div className="px-7 pt-8 pb-7 sm:px-9">
          {/* Header */}
          <div className="mb-7 flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-pink-500 shadow-lg shadow-purple-500/30">
              <Sparkles className="h-7 w-7 text-white" strokeWidth={2} />
            </div>
            <h2 className="text-xl font-bold text-white sm:text-2xl">
              Welcome to Momono! 👋
            </h2>
            <p className="mt-1.5 text-sm text-white/50">
              Kenalan dulu yuk, biar pengalamanmu lebih personal.
            </p>
          </div>

          {/* Display name input */}
          <div className="mb-6">
            <label
              htmlFor="displayName"
              className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/40"
            >
              Display Name
            </label>
            <div className="group relative">
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={24}
                placeholder="Enter your display name..."
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-white placeholder-white/30 outline-none transition-all focus:border-emerald-400/60 focus:bg-white/[0.07] focus:ring-4 focus:ring-emerald-500/15"
              />
              <span className="pointer-events-none absolute bottom-2 right-3 text-[11px] text-white/25">
                {displayName.length}/24
              </span>
            </div>
          </div>

          {/* Gender selection */}
          <div className="mb-8">
            <label className="mb-2.5 block text-xs font-semibold uppercase tracking-wider text-white/40">
              Gender
            </label>

            {/* Gender cards with icons */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {/* Male */}
              <button
                type="button"
                onClick={() => { setGenderOption('male'); setCustomGender('') }}
                className={[
                  'group relative flex flex-col items-center gap-2.5 rounded-2xl border px-3 py-4 transition-all duration-200',
                  genderOption === 'male'
                    ? 'border-teal-400/60 bg-white/[0.06] shadow-lg shadow-teal-500/20'
                    : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]',
                ].join(' ')}
              >
                <div
                  className={[
                    'flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 transition-transform duration-200',
                    genderOption === 'male' ? 'scale-105' : 'scale-100 opacity-80 group-hover:opacity-100',
                  ].join(' ')}
                >
                  <Mars className="h-5.5 w-5.5 text-white" strokeWidth={2.25} />
                </div>
                <span className={`text-xs font-medium ${genderOption === 'male' ? 'text-white' : 'text-white/60'}`}>
                  Male
                </span>
                {/* Radio indicator */}
                <span
                  className={[
                    'flex h-4.5 w-4.5 items-center justify-center rounded-full border-2 transition-colors',
                    genderOption === 'male' ? 'border-teal-400/60' : 'border-white/20',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'h-2 w-2 rounded-full transition-all duration-200',
                      genderOption === 'male' ? 'bg-teal-400 scale-100 opacity-100' : 'scale-0 opacity-0',
                    ].join(' ')}
                  />
                </span>
              </button>

              {/* Female */}
              <button
                type="button"
                onClick={() => { setGenderOption('female'); setCustomGender('') }}
                className={[
                  'group relative flex flex-col items-center gap-2.5 rounded-2xl border px-3 py-4 transition-all duration-200',
                  genderOption === 'female'
                    ? 'border-pink-400/60 bg-white/[0.06] shadow-lg shadow-pink-500/20'
                    : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]',
                ].join(' ')}
              >
                <div
                  className={[
                    'flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-emerald-500 transition-transform duration-200',
                    genderOption === 'female' ? 'scale-105' : 'scale-100 opacity-80 group-hover:opacity-100',
                  ].join(' ')}
                >
                  <Venus className="h-5.5 w-5.5 text-white" strokeWidth={2.25} />
                </div>
                <span className={`text-xs font-medium ${genderOption === 'female' ? 'text-white' : 'text-white/60'}`}>
                  Female
                </span>
                {/* Radio indicator */}
                <span
                  className={[
                    'flex h-4.5 w-4.5 items-center justify-center rounded-full border-2 transition-colors',
                    genderOption === 'female' ? 'border-pink-400/60' : 'border-white/20',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'h-2 w-2 rounded-full transition-all duration-200',
                      genderOption === 'female' ? 'bg-pink-400 scale-100 opacity-100' : 'scale-0 opacity-0',
                    ].join(' ')}
                  />
                </span>
              </button>

              {/* Custom / Other */}
              <button
                type="button"
                onClick={() => setGenderOption('custom')}
                className={[
                  'group relative flex flex-col items-center gap-2.5 rounded-2xl border px-3 py-4 transition-all duration-200',
                  genderOption === 'custom'
                    ? 'border-purple-400/60 bg-white/[0.06] shadow-lg shadow-purple-500/20'
                    : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]',
                ].join(' ')}
              >
                <div
                  className={[
                    'flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-teal-500 transition-transform duration-200',
                    genderOption === 'custom' ? 'scale-105' : 'scale-100 opacity-80 group-hover:opacity-100',
                  ].join(' ')}
                >
                  <User className="h-5.5 w-5.5 text-white" strokeWidth={2.25} />
                </div>
                <span className={`text-xs font-medium ${genderOption === 'custom' ? 'text-white' : 'text-white/60'}`}>
                  Other
                </span>
                {/* Radio indicator */}
                <span
                  className={[
                    'flex h-4.5 w-4.5 items-center justify-center rounded-full border-2 transition-colors',
                    genderOption === 'custom' ? 'border-purple-400/60' : 'border-white/20',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'h-2 w-2 rounded-full transition-all duration-200',
                      genderOption === 'custom' ? 'bg-purple-400 scale-100 opacity-100' : 'scale-0 opacity-0',
                    ].join(' ')}
                  />
                </span>
              </button>
            </div>

            {/* Custom gender text input - slides in when "Lainnya" is selected */}
            <div
              className={[
                'overflow-hidden transition-all duration-300 ease-out',
                genderOption === 'custom' ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0',
              ].join(' ')}
            >
              <div className="relative">
                <input
                  type="text"
                  value={customGender}
                  onChange={(e) => setCustomGender(e.target.value)}
                  maxLength={20}
                  placeholder="Tuliskan gender kamu..."
                  className="w-full rounded-xl border border-purple-400/30 bg-purple-500/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-purple-400/60 focus:bg-purple-500/10 focus:ring-4 focus:ring-purple-500/15"
                />
                <span className="pointer-events-none absolute bottom-2 right-3 text-[11px] text-white/25">
                  {customGender.length}/20
                </span>
              </div>
            </div>
          </div>

          {error && (
            <p className="mb-4 text-center text-sm text-red-400">{error}</p>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 via-purple-500 to-pink-500 py-3.5 font-semibold text-white transition-all enabled:hover:shadow-lg enabled:hover:shadow-purple-500/30 enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Lanjutkan
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default WelcomeModal
