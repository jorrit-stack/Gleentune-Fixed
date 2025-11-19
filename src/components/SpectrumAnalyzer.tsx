interface SpectrumAnalyzerProps {
  frequencyData: Uint8Array;
  isPlaying: boolean;
}

export function SpectrumAnalyzer({ frequencyData, isPlaying }: SpectrumAnalyzerProps) {
  const barCount = 100;
  const dotsPerBar = 20;

  const bars = Array.from({ length: barCount }, (_, i) => {
    const dataIndex = Math.floor((i / barCount) * frequencyData.length);
    const value = frequencyData[dataIndex] || 0;
    return (value / 255) * 100;
  });

  const getColorForPosition = (position: number) => {
    if (position < 0.2) return { bg: '#10b981', glow: '#10b981' };
    if (position < 0.4) return { bg: '#fbbf24', glow: '#fbbf24' };
    if (position < 0.6) return { bg: '#f97316', glow: '#f97316' };
    if (position < 0.8) return { bg: '#ef4444', glow: '#ef4444' };
    return { bg: '#991b1b', glow: '#991b1b' };
  };

  return (
    <div
      className="relative w-full h-40 bg-black rounded-lg border-2 border-amber-900 overflow-hidden"
      style={{
        boxShadow: 'inset 0 4px 12px rgba(0, 0, 0, 0.9), inset 0 1px 2px rgba(255, 255, 255, 0.05)'
      }}
    >
      <div className="absolute inset-0 flex items-end justify-center gap-[1px] p-2">
        {bars.map((height, barIndex) => {
          const normalizedHeight = isPlaying ? Math.max(height, 1) : 0;
          const activeDots = Math.floor((normalizedHeight / 100) * dotsPerBar);

          return (
            <div
              key={barIndex}
              className="flex-1 flex flex-col-reverse justify-start gap-[1px]"
              style={{ height: '100%' }}
            >
              {Array.from({ length: dotsPerBar }, (_, dotIndex) => {
                const isActive = dotIndex < activeDots;
                const position = dotIndex / dotsPerBar;
                const { bg, glow } = getColorForPosition(position);

                return (
                  <div
                    key={dotIndex}
                    className="w-full transition-all duration-100 ease-out"
                    style={{
                      height: '3px',
                      borderRadius: '1px',
                      backgroundColor: isActive ? bg : '#0a0a0a',
                      boxShadow: isActive
                        ? `0 0 6px ${glow}, 0 0 10px ${glow}, inset 0 1px 1px rgba(255,255,255,0.4)`
                        : 'none',
                      opacity: isActive ? 1 : 0.15,
                      transform: isActive ? 'scaleY(1.1)' : 'scaleY(1)'
                    }}
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-green-600 text-sm font-mono tracking-widest" style={{ textShadow: '0 0 10px rgba(0, 255, 150, 0.5)' }}>
            NO SIGNAL
          </span>
        </div>
      )}

      <div className="absolute top-2 left-2 text-[9px] text-green-500 font-mono opacity-70">
        SPECTRUM v2.0
      </div>
    </div>
  );
}
