import { MatchStack } from '../../components/MatchStack';

export default function FeedPage() {
  return (
    <div className="h-[calc(100dvh-56px-60px)] md:h-[calc(100dvh-56px)] w-full bg-[#F8FAFC] dark:bg-[#090D16] text-[#0F172A] dark:text-white transition-colors duration-200 flex flex-col items-center justify-center overflow-hidden overscroll-none touch-none">
      <MatchStack />
    </div>
  );
}