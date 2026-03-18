import { useRewardStore } from "@/lib/rewardStore";

const StreakBadge = () => {
  const streak = useRewardStore((s) => s.streak);
  if (streak < 1) return null;

  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
      🔥 {streak} jour{streak > 1 ? "s" : ""}
    </span>
  );
};

export default StreakBadge;
