import { useRewardStore, getTier } from "@/lib/rewardStore";

interface Props {
  className?: string;
}

const LevelBadge = ({ className = "" }: Props) => {
  const level = useRewardStore((s) => s.getLevel());
  const tier = getTier(level);

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${className}`}
      style={{
        backgroundColor: `hsl(${tier.color} / 0.15)`,
        color: `hsl(${tier.color})`,
      }}
      title={`Palier ${tier.name}`}
    >
      {tier.name} · Lv.{level}
    </span>
  );
};

export default LevelBadge;
