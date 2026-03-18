import { useRewardStore } from "@/lib/rewardStore";

interface Props {
  className?: string;
}

const LevelBadge = ({ className = "" }: Props) => {
  const level = useRewardStore((s) => s.getLevel());

  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold bg-primary/15 text-primary px-1.5 py-0.5 rounded-full ${className}`}>
      Lv.{level}
    </span>
  );
};

export default LevelBadge;
