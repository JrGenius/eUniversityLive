import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { joinUrl } from '../lib/api'

export function JoinQr({ code, size = 220 }: { code: string; size?: number }) {
  const [url, setUrl] = useState('')
  useEffect(() => { joinUrl(code).then(setUrl) }, [code])
  return (
    <div className="inline-flex flex-col items-center gap-2">
      <div className="rounded-2xl bg-white p-3 shadow-sm border border-line">{url ? <QRCodeSVG value={url} size={size} level="M" /> : <div style={{ width: size, height: size }} />}</div>
      <span className="text-center text-xs text-ink-soft break-all max-w-[300px]">{url.replace(/^https?:\/\//, '')}</span>
    </div>
  )
}
