interface LogoProps {
  className?: string;
  showSlogan?: boolean;
}

export default function Logo({ className = '', showSlogan = false }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src="/logo.png?v=2"
        alt="GleeTune"
        className="flex-shrink-0 h-12 w-auto"
        loading="eager"
      />

      <div className="flex flex-col">
        <span className="text-2xl leading-none relative inline-block" style={{
          background: 'linear-gradient(to right, #f59e0b 0%, #ef4444 25%, #ec4899 50%, #8b5cf6 75%, #3b82f6 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontFamily: '"Inter", -apple-system, system-ui, sans-serif',
          fontWeight: '700',
          letterSpacing: '0.15em',
          filter: 'drop-shadow(0 2px 4px rgba(251, 146, 60, 0.3)) drop-shadow(0 0 12px rgba(236, 72, 153, 0.2))'
        }}>
          GLEETUNE
        </span>
        {showSlogan && (
          <span className="text-[10px] text-amber-700 font-medium tracking-wide mt-1">
            Tuning the World Together in Every Beat
          </span>
        )}
      </div>
    </div>
  );
}
