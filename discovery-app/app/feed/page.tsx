import { MatchStack, defaultMockCards } from '../../components/MatchStack';

export default function FeedPage() {
  return (
    <div className="h-[calc(100vh-56px)] sm:h-[calc(100vh-64px)] w-full bg-[#F8FAFC] dark:bg-[#090D16] text-[#0F172A] dark:text-white transition-colors duration-200 flex flex-col items-center justify-center overflow-hidden">
      <MatchStack cards={defaultMockCards} />
    </div>
  );
}