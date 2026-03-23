import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  duration?: number;
}

const AnimatedScore = ({ value, duration = 1200 }: Props) => {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    if (from === to) return;

    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        prevRef.current = to;
      }
    };
    requestAnimationFrame(animate);
  }, [value, duration]);

  return <>{display}</>;
};

export default AnimatedScore;
