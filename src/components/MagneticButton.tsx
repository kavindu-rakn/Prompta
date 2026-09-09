"use client";

interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export default function MagneticButton({ children, className, style }: MagneticButtonProps) {
  return (
    <div
      className={className}
      style={{ display: "inline-block", ...style }}
    >
      {children}
    </div>
  );
}

