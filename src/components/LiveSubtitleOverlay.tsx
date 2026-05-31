interface Props {
  text: string;
  interim?: string;
  isVisible: boolean;
}

export default function LiveSubtitleOverlay({ text, interim, isVisible }: Props) {
  if (!isVisible || (!text && !interim)) return null;

  const words = text.trim().split(/\s+/).filter(Boolean);
  const lastWords = words.slice(-12).join(' ');

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none px-4">
      <div className="bg-black/85 backdrop-blur-md text-white text-base font-medium px-6 py-3 rounded-2xl max-w-2xl text-center leading-relaxed shadow-2xl border border-white/10">
        <span className="text-white">{lastWords} </span>
        {interim && <span className="text-gray-400 italic">{interim}</span>}
      </div>
    </div>
  );
}
