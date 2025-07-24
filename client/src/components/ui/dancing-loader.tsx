import { cn } from "@/lib/utils";

interface DancingLoaderProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

export function DancingLoader({ size = "md", text = "Loading...", className }: DancingLoaderProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16"
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg"
  };

  return (
    <div className={cn("flex flex-col items-center justify-center space-y-4", className)}>
      {/* Dancing SVG Figure */}
      <div className={cn("relative", sizeClasses[size])}>
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full animate-dance"
        >
          {/* Head */}
          <circle
            cx="50"
            cy="20"
            r="8"
            fill="currentColor"
            className="text-blue-500"
          />
          
          {/* Body */}
          <rect
            x="46"
            y="28"
            width="8"
            height="25"
            rx="4"
            fill="currentColor"
            className="text-blue-500"
          />
          
          {/* Left Arm */}
          <rect
            x="38"
            y="32"
            width="8"
            height="3"
            rx="1.5"
            fill="currentColor"
            className="text-blue-500 animate-wave-left"
          />
          
          {/* Right Arm */}
          <rect
            x="54"
            y="32"
            width="8"
            height="3"
            rx="1.5"
            fill="currentColor"
            className="text-blue-500 animate-wave-right"
          />
          
          {/* Left Leg */}
          <rect
            x="44"
            y="53"
            width="4"
            height="20"
            rx="2"
            fill="currentColor"
            className="text-blue-500 animate-kick-left"
          />
          
          {/* Right Leg */}
          <rect
            x="52"
            y="53"
            width="4"
            height="20"
            rx="2"
            fill="currentColor"
            className="text-blue-500 animate-kick-right"
          />
          
          {/* Left Foot */}
          <ellipse
            cx="44"
            cy="78"
            rx="6"
            ry="3"
            fill="currentColor"
            className="text-blue-600 animate-step-left"
          />
          
          {/* Right Foot */}
          <ellipse
            cx="54"
            cy="78"
            rx="6"
            ry="3"
            fill="currentColor"
            className="text-blue-600 animate-step-right"
          />
        </svg>
      </div>
      
      {/* Loading Text */}
      {text && (
        <p className={cn("text-gray-600 font-medium animate-pulse", textSizeClasses[size])}>
          {text}
        </p>
      )}
      

    </div>
  );
}

// Full page loader component
export function FullPageDancingLoader({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="fixed inset-0 bg-white bg-opacity-90 backdrop-blur-sm flex items-center justify-center z-50">
      <DancingLoader size="lg" text={text} />
    </div>
  );
}

// Inline loader component
export function InlineDancingLoader({ text, className }: { text?: string; className?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-8", className)}>
      <DancingLoader size="md" text={text} />
    </div>
  );
}