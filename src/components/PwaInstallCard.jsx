import { Smartphone, Download, Share, PlusSquare, CheckCircle2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { usePwaInstall } from '../hooks/usePwaInstall'

export default function PwaInstallCard() {
  const {
    isInstalled,
    isIOS,
    showIosGuide,
    setShowIosGuide,
    handleInstallClick
  } = usePwaInstall()

  if (isInstalled) {
    return (
      <Card className="p-4 border-none shadow-sm bg-teal-50/70 border border-teal-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-teal-100 text-teal-700">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="text-sm font-bold text-teal-900">Uygulama Olarak Çalışıyor</div>
            <div className="text-[11px] text-teal-700 font-medium">
              Uygulama ana ekranınıza eklenmiş durumda.
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <>
      <Card className="p-4 border-none shadow-sm bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-100">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-teal-600 text-white shadow-md shadow-teal-600/20">
              <Smartphone size={20} />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800">Telefona Uygulama Olarak Ekle</div>
              <div className="text-[11px] text-slate-500 font-medium">
                {isIOS ? 'iOS (Safari) Ana Ekrana Ekle' : 'Android & iOS Ana Ekrana Ekle'}
              </div>
            </div>
          </div>

          <Button
            size="sm"
            onClick={handleInstallClick}
            className="h-9 px-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-md shadow-teal-600/20 shrink-0"
          >
            <Download size={14} className="mr-1.5" />
            {isIOS ? 'Nasıl Eklenir?' : 'Yükle'}
          </Button>
        </div>
      </Card>

      {/* Guide Dialog / Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-sm bg-white p-6 rounded-2xl shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-teal-100 text-teal-700 rounded-2xl">
                <Smartphone size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Ana Ekrana Ekle</h3>
                <p className="text-xs text-slate-500">Telefona uygulama gibi kurun</p>
              </div>
            </div>

            {isIOS ? (
              <div className="space-y-3 text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
                <div className="flex items-start gap-2.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-teal-600 text-white font-bold text-[10px] shrink-0 mt-0.5">1</span>
                  <span>Safari tarayıcısında alt menüdeki <strong className="inline-flex items-center text-teal-700"><Share size={12} className="inline mx-0.5" /> Paylaş</strong> butonuna dokunun.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-teal-600 text-white font-bold text-[10px] shrink-0 mt-0.5">2</span>
                  <span>Açılan menüde aşağı kaydırıp <strong className="inline-flex items-center text-teal-700"><PlusSquare size={12} className="inline mx-0.5" /> Ana Ekrana Ekle</strong> seçeneğini seçin.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-teal-600 text-white font-bold text-[10px] shrink-0 mt-0.5">3</span>
                  <span>Sağ üstteki <strong>Ekle</strong> butonuna basın. Uygulama ana ekranınıza gelecektir.</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
                <div className="flex items-start gap-2.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-teal-600 text-white font-bold text-[10px] shrink-0 mt-0.5">1</span>
                  <span>Chrome tarayıcınızın sağ üstündeki <strong>üç nokta (⋮)</strong> menüsüne dokunun.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-teal-600 text-white font-bold text-[10px] shrink-0 mt-0.5">2</span>
                  <span><strong>&ldquo;Uygulamayı Yükle&rdquo;</strong> veya <strong>&ldquo;Ana Ekrana Ekle&rdquo;</strong> seçeneğine tıklayın.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-teal-600 text-white font-bold text-[10px] shrink-0 mt-0.5">3</span>
                  <span>Gelen onay penceresinde <strong>Yükle</strong> butonuna basarak onaylayın.</span>
                </div>
              </div>
            )}

            <Button
              className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold"
              onClick={() => setShowIosGuide(false)}
            >
              Anladım
            </Button>
          </Card>
        </div>
      )}
    </>
  )
}
