"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Performance, Video } from "@/lib/microcms";

type GroupedSong = {
  songId: string;
  title: string;
  artist: string;
  performances: Performance[];
};

type CustomPerformance = Performance & { collaborators?: string };

const MEMBERS = [
  { name: "十河ののは", shortName: "ののは", emoji: "🦎", color: "#ACE0B8" },
  { name: "夜牛詩乃", shortName: "詩乃", emoji: "💮", color: "#DDC0FB" },
  { name: "蝸堂みかる", shortName: "みかる", emoji: "🐌", color: "#FFE08A" },
  { name: "猫屋敷美紅", shortName: "美紅", emoji: "💐", color: "#FFB387" },
];

const VIDEO_TYPES = ["ライブ・歌枠", "オリジナル", "歌ってみた", "弾いてみた", "練習", "その他"];

function formatTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function formatDate(dStr: string) {
  const d = new Date(dStr);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

const PlayIcon = <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>;
const PauseIcon = <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>;
const SearchIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 text-[#1C1C1C]"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" /></svg>;

export default function ClientSongList({ initialPerformances, initialVideos }: { initialPerformances: CustomPerformance[]; initialVideos: Video[]; }) {
  const validPerformances = useMemo(() => initialPerformances.filter(p => p.video?.isArchived), [initialPerformances]);
  const validVideos = useMemo(() => initialVideos.filter(v => v.isArchived), [initialVideos]);

  const [activeTab, setActiveTab] = useState<'songs' | 'videos'>('songs');
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedArtist, setSelectedArtist] = useState<string>("");
  const [performanceMode, setPerformanceMode] = useState<'all' | 'vocal' | 'inst'>('all');
  const [shortsMode, setShortsMode] = useState<'all' | 'normal' | 'shorts'>('all');

  const [pickup, setPickup] = useState<CustomPerformance | null>(null);
  const [isFading, setIsFading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [randomOrder, setRandomOrder] = useState<Record<string, number>>({});

  const [sortModalOpen, setSortModalOpen] = useState(false);
  const [sortConfigSongs, setSortConfigSongs] = useState({ key: 'default', order: 'desc' });
  const [sortConfigVideos, setSortConfigVideos] = useState({ key: 'default', order: 'desc' });
  const [tempSortConfig, setTempSortConfig] = useState({ key: 'date', order: 'desc' });

  const [isFooterExpanded, setIsFooterExpanded] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<{ id: string; startSeconds: number | null; isPaused?: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const tabParam = p.get('tab');
      if (tabParam === 'songs' || tabParam === 'videos') setActiveTab(tabParam);
      if (p.get('q')) setSearchTerm(p.get('q') || '');
      if (p.get('year')) setSelectedYear(p.get('year') || '');
      if (p.get('month')) setSelectedMonth(p.get('month') || '');
      if (p.get('members')) setSelectedMembers(p.get('members')?.split(',') || []);
      if (p.get('type')) setSelectedType(p.get('type') || '');
      if (p.get('artist')) setSelectedArtist(p.get('artist') || '');

      const pm = p.get('perf');
      if (pm === 'all' || pm === 'vocal' || pm === 'inst') setPerformanceMode(pm);
      const sm = p.get('shorts');
      if (sm === 'all' || sm === 'normal' || sm === 'shorts') setShortsMode(sm);
    }
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    const p = new URLSearchParams();
    p.set('tab', activeTab);
    if (searchTerm) p.set('q', searchTerm);
    if (selectedYear) p.set('year', selectedYear);
    if (selectedMonth) p.set('month', selectedMonth);
    if (selectedMembers.length > 0) p.set('members', selectedMembers.join(','));
    if (selectedType) p.set('type', selectedType);
    if (selectedArtist) p.set('artist', selectedArtist);
    if (performanceMode !== 'all') p.set('perf', performanceMode);
    if (shortsMode !== 'all') p.set('shorts', shortsMode);
    window.history.replaceState({}, '', `${window.location.pathname}?${p.toString()}`);
  }, [activeTab, searchTerm, selectedYear, selectedMonth, selectedMembers, selectedType, selectedArtist, performanceMode, shortsMode, isMounted]);

  useEffect(() => {
    setIsMounted(true);
    const order: Record<string, number> = {};
    validPerformances.forEach(p => { if (p.song) order[p.song.id] = Math.random(); });
    validVideos.forEach(v => { order[v.id] = Math.random(); });
    setRandomOrder(order);
  }, [validPerformances, validVideos]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleTabChange = (t: 'songs' | 'videos') => {
    setActiveTab(t);
    setSearchTerm(""); setSelectedYear(""); setSelectedMonth(""); setSelectedMembers([]);
    setSelectedType(""); setSelectedArtist(""); setPerformanceMode('all'); setShortsMode('all');
    setSortConfigSongs({ key: 'default', order: 'desc' }); setSortConfigVideos({ key: 'default', order: 'desc' });
    setSortModalOpen(false); setPlayingVideo(null);
  };

  const openSortModal = () => {
    const cur = activeTab === 'songs' ? sortConfigSongs : sortConfigVideos;
    setTempSortConfig(cur.key === 'default' ? { key: 'date', order: 'desc' } : cur);
    setSortModalOpen(true);
  };

  const applySort = () => {
    activeTab === 'songs' ? setSortConfigSongs(tempSortConfig) : setSortConfigVideos(tempSortConfig);
    setSortModalOpen(false);
  };

  const resetSort = () => {
    const defaultSort = { key: 'default', order: 'desc' };
    setTempSortConfig({ key: 'date', order: 'desc' });
    activeTab === 'songs' ? setSortConfigSongs(defaultSort) : setSortConfigVideos(defaultSort);
    setSortModalOpen(false);
  };

  const availableYears = Array.from(new Set(validVideos.map(v => new Date(v.streamingDate).getFullYear().toString()))).sort((a, b) => b.localeCompare(a));
  const availableMonths = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
  const availableArtists = Array.from(new Set(validPerformances.map(p => p.song?.artist).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ja'));

  const shufflePickup = useCallback(() => {
    if (validPerformances.length > 0) {
      setIsFading(true);
      setTimeout(() => {
        setPickup(validPerformances[Math.floor(Math.random() * validPerformances.length)]);
        setIsFading(false);
      }, 300);
    }
  }, [validPerformances]);

  useEffect(() => { shufflePickup(); }, [shufflePickup]);

  const toggleMember = (m: string) => setSelectedMembers(p => p.includes(m) ? p.filter(x => x !== m) : [...p, m]);

  const groupedSongs = useMemo(() => {
    const map = new Map<string, GroupedSong>();
    validPerformances.forEach((perf) => {
      if (!perf.song || !perf.video) return;
      if (!map.has(perf.song.id)) map.set(perf.song.id, { songId: perf.song.id, title: perf.song.title, artist: perf.song.artist, performances: [] });
      map.get(perf.song.id)?.performances.push(perf);
    });
    return Array.from(map.values());
  }, [validPerformances]);

  const filteredSongs = useMemo(() => groupedSongs.map((g) => {
    const perfs = g.performances.filter((perf) => {
      const matchM = selectedMembers.length === 0 || selectedMembers.every(m => perf.singers?.includes(m));
      const isInst = perf.video.type?.includes("弾いてみた");
      const matchPM = performanceMode === 'all' || (performanceMode === 'vocal' && !isInst) || (performanceMode === 'inst' && isInst);
      return matchM && matchPM;
    });
    return { ...g, performances: perfs };
  }).filter((g) => {
    const term = searchTerm.toLowerCase();
    const matchT = term === "" || g.title.toLowerCase().includes(term) || g.artist.toLowerCase().includes(term) ||
      g.performances.some(p => p.singers?.some(s => s.toLowerCase().includes(term)) || p.collaborators?.toLowerCase().includes(term) || p.video.title.toLowerCase().includes(term) || p.video.channel?.name?.toLowerCase().includes(term));
    const matchA = selectedArtist === "" || g.artist === selectedArtist;
    return g.performances.length > 0 && matchT && matchA;
  }).sort((a, b) => {
    if (sortConfigSongs.key === 'default') {
      if (!isMounted) return a.songId.localeCompare(b.songId);
      return (randomOrder[a.songId] || 0) - (randomOrder[b.songId] || 0);
    } else if (sortConfigSongs.key === 'date') {
      const dA = Math.max(...a.performances.map(p => new Date(p.video.streamingDate).getTime()));
      const dB = Math.max(...b.performances.map(p => new Date(p.video.streamingDate).getTime()));
      return sortConfigSongs.order === 'desc' ? dB - dA : dA - dB;
    } else {
      return sortConfigSongs.order === 'desc' ? b.title.localeCompare(a.title, 'ja') : a.title.localeCompare(b.title, 'ja');
    }
  }), [groupedSongs, selectedMembers, performanceMode, searchTerm, selectedArtist, sortConfigSongs, isMounted, randomOrder]);

  const filteredVideos = useMemo(() => validVideos.filter((v) => {
    let matchM = true;
    if (selectedMembers.length > 0) {
      matchM = selectedMembers.every((m) => v.channel?.name === m || validPerformances.some(p => p.video.id === v.id && p.singers?.includes(m)));
    }
    const isShorts = v.isShorts === true || v.type?.includes("Shorts");
    const matchS = shortsMode === 'all' ? true : shortsMode === 'normal' ? !isShorts : isShorts;
    const d = new Date(v.streamingDate);
    const matchY = selectedYear === "" || d.getFullYear().toString() === selectedYear;
    const matchMo = selectedMonth === "" || (d.getMonth() + 1).toString() === selectedMonth;
    const term = searchTerm.toLowerCase();
    const matchT = term === "" || v.title.toLowerCase().includes(term) || v.channel?.name?.toLowerCase().includes(term) ||
      validPerformances.some(p => p.video.id === v.id && (p.song.title.toLowerCase().includes(term) || p.song.artist.toLowerCase().includes(term) || p.singers?.some(s => s.toLowerCase().includes(term)) || p.collaborators?.toLowerCase().includes(term)));
    return matchM && (selectedType === "" || v.type?.includes(selectedType)) && matchS && matchY && matchMo && matchT && validPerformances.some(p => p.video.id === v.id);
  }).sort((a, b) => {
    if (sortConfigVideos.key === 'default') {
      if (!isMounted) return a.id.localeCompare(b.id);
      return (randomOrder[a.id] || 0) - (randomOrder[b.id] || 0);
    } else if (sortConfigVideos.key === 'date') {
      const dA = new Date(a.streamingDate).getTime(), dB = new Date(b.streamingDate).getTime();
      return sortConfigVideos.order === 'desc' ? dB - dA : dA - dB;
    } else {
      return sortConfigVideos.order === 'desc' ? b.title.localeCompare(a.title, 'ja') : a.title.localeCompare(b.title, 'ja');
    }
  }), [validVideos, selectedMembers, validPerformances, selectedType, shortsMode, selectedYear, selectedMonth, searchTerm, sortConfigVideos, isMounted, randomOrder]);

  return (
    <div className="min-h-screen bg-gray-100 selection:bg-gray-200 selection:text-[#1C1C1C] font-['IBM_Plex_Sans_JP'] flex justify-center overflow-x-hidden">
      <div className="w-full max-w-3xl bg-[#F3F3F3] md:border-x-[2px] border-[#1C1C1C] min-h-screen relative flex flex-col shadow-2xl mx-auto overflow-x-hidden">

        <div className="w-full flex justify-between items-start h-[140px] sm:h-[180px] md:h-[220px] bg-[#F3F3F3] border-b-[2px] border-[#1C1C1C] overflow-hidden shrink-0">
          <img src="/logo-title.png" alt="よいゆめの歌と演奏を探せるページ" className="h-full w-auto object-contain object-left" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
          <h1 className="hidden text-[#1C1C1C] text-xl md:text-3xl font-black tracking-tight leading-snug drop-shadow-[2px_2px_0px_rgba(255,255,255,0.8)] mt-4 pl-4">よいゆめの<br/>歌と演奏を<br/>探せるページ</h1>
          <img src="/logo-subtitle.png" alt="非公式ファンサイト" className="h-full w-auto object-contain object-right" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
          <p className="hidden text-[#1C1C1C] text-xs md:text-sm font-black tracking-widest [writing-mode:vertical-rl] drop-shadow-[2px_2px_0px_rgba(255,255,255,0.8)] mt-4 pr-4">非公式ファンサイト</p>
        </div>

        <div className="relative z-10 w-full flex flex-col flex-grow">
          {pickup && (
            <div className="w-full -mt-[2px] relative z-20">
              <div className="w-full bg-white border-y-[2px] border-[#1C1C1C] pt-1.5 pb-3 md:pt-2 md:pb-4 flex flex-col gap-2 relative">
                <img src="/icon-pickup.png" className="absolute top-0 left-0 md:left-[-2px] w-9 h-9 md:w-12 md:h-12 object-contain object-left-top" alt="" />

                <div className="w-full flex justify-between items-center min-h-[28px] md:min-h-[32px] pr-4 pl-[2.75rem] md:pr-6 md:pl-[3.5rem]">
                  <div className="flex justify-start items-baseline gap-1.5 md:gap-2">
                    <div className="text-[#1C1C1C] text-base md:text-xl font-black tracking-tight leading-none mt-0.5">PICK UP</div>
                    <span className="text-gray-500 text-[9px] md:text-[10px] font-bold leading-none mt-1">ランダムで表示中</span>
                  </div>
                  <button onClick={shufflePickup} className="px-3 py-1.5 bg-white border-[2px] border-[#1C1C1C] shadow-[2px_2px_0px_#1C1C1C] rounded-full flex items-center gap-1.5 hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none transition-all">
                    <img src="/icon-shuffle.png" className="w-3 h-3 md:w-4 md:h-4 object-contain" alt="" />
                    <div className="text-[#1C1C1C] text-[10px] md:text-xs font-bold">シャッフル</div>
                  </button>
                </div>

                <div className={`w-full flex flex-row items-center gap-3 md:gap-4 px-4 md:px-6 transition-opacity duration-300 ease-in-out ${isFading ? 'opacity-0' : 'opacity-100'}`}>
                  <div className="w-2/3 md:w-1/2 lg:w-[480px] aspect-video rounded-xl overflow-hidden bg-black shrink-0 border-[2px] border-[#1C1C1C]">
                    {playingVideo?.id === `pickup-${pickup.video.id}` ? (
                      <iframe id={`yt-pickup-${pickup.video.id}`} src={`https://www.youtube.com/embed/${pickup.video.youtubeId}?autoplay=1&enablejsapi=1&playsinline=1${pickup.startSeconds ? `&start=${pickup.startSeconds}` : ''}`} title={pickup.song.title} className="w-full h-full border-0" allow="autoplay; encrypted-media" allowFullScreen playsInline />
                    ) : (
                      <div className="relative w-full h-full cursor-pointer" onClick={() => setPlayingVideo({ id: `pickup-${pickup.video.id}`, startSeconds: pickup.startSeconds || null, isPaused: false })}>
                        <img src={`https://img.youtube.com/vi/${pickup.video.youtubeId}/maxresdefault.jpg`} onError={(e) => { e.currentTarget.src = `https://img.youtube.com/vi/${pickup.video.youtubeId}/hqdefault.jpg`; }} alt={pickup.song.title} className="w-full h-full object-cover opacity-95" />
                        <div className="absolute bottom-1 right-1 md:bottom-1.5 md:right-1.5 bg-[#FF3366] text-white text-[8px] md:text-[10px] px-1.5 py-0.5 rounded font-bold">YouTube</div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-center items-start overflow-hidden py-1 w-full">
                    <div className="flex flex-col gap-0 w-full mb-1.5">
                      <div className="text-[#1C1C1C] text-sm md:text-lg font-bold leading-snug line-clamp-2 mb-0.5">{pickup.song.title}</div>
                      <div className="text-gray-600 text-[10px] md:text-xs font-normal truncate w-full">{pickup.song.artist}</div>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2 md:mb-3">
                      {pickup.singers?.map(singer => {
                        const memberDef = MEMBERS.find(m => m.name === singer);
                        return (
                          <div key={singer} className="px-1.5 py-[1px] rounded text-[9px] md:text-[10px] font-bold text-[#1C1C1C]" style={{ backgroundColor: memberDef?.color || '#FFFFFF' }}>
                            {memberDef?.emoji} {memberDef?.name || singer}
                          </div>
                        );
                      })}
                      {pickup.collaborators && (
                        <div className="px-1.5 py-[1px] bg-gray-100 rounded text-[9px] md:text-[10px] font-bold text-[#1C1C1C]">
                          🤝 {pickup.collaborators}
                        </div>
                      )}
                    </div>
                    <button onClick={(e) => {
                        e.preventDefault();
                        const isPlayingPickup = playingVideo?.id === `pickup-${pickup.video.id}`;
                        if (isPlayingPickup) {
                          const iframe = document.getElementById(`yt-pickup-${pickup.video.id}`) as HTMLIFrameElement;
                          if (playingVideo?.isPaused) {
                            iframe?.contentWindow?.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
                            setPlayingVideo(prev => prev ? { ...prev, isPaused: false } : null);
                          } else {
                            iframe?.contentWindow?.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
                            setPlayingVideo(prev => prev ? { ...prev, isPaused: true } : null);
                          }
                        } else {
                          setPlayingVideo({ id: `pickup-${pickup.video.id}`, startSeconds: pickup.startSeconds || null, isPaused: false });
                        }
                      }}
                      className={`h-7 md:h-8 px-4 md:px-6 ${playingVideo?.id === `pickup-${pickup.video.id}` && !playingVideo.isPaused ? 'bg-[#1C1C1C]' : 'bg-[#FF3366]'} border-[2px] border-[#1C1C1C] shadow-[2px_2px_0px_#1C1C1C] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none transition-all duration-200 rounded-lg flex items-center justify-center shrink-0 w-fit`}
                    >
                      {playingVideo?.id === `pickup-${pickup.video.id}` && !playingVideo.isPaused ? PauseIcon : PlayIcon}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="w-full px-4 md:px-6 pt-6 pb-28 flex flex-col items-center">
            <div className="relative rounded-full bg-white flex w-full md:max-w-[500px] h-9 md:h-10 items-center mb-1 border-[2px] border-[#1C1C1C] overflow-hidden">
              <div className={`absolute top-[-2px] bottom-[-2px] left-[0px] w-[calc(50%+2px)] bg-[#F3F3F3] rounded-full border-[2px] border-[#1C1C1C] shadow-[2px_1px_0px_#1C1C1C] transition-transform duration-300 ease-[cubic-bezier(0.4,0.0,0.2,1)]`} style={{ transform: activeTab === 'songs' ? 'translateX(-2px)' : 'translateX(calc(100% - 4px))' }} />
              <button onClick={() => handleTabChange('songs')} className={`relative z-10 flex-1 h-full flex justify-center items-center gap-1 md:gap-2 font-bold text-[11px] md:text-xs transition-colors duration-300 ${activeTab === 'songs' ? 'text-[#1C1C1C]' : 'text-gray-500 hover:text-[#1C1C1C]'}`}>
                曲から探す
              </button>
              <button onClick={() => handleTabChange('videos')} className={`relative z-10 flex-1 h-full flex justify-center items-center gap-1 md:gap-2 font-bold text-[11px] md:text-xs transition-colors duration-300 ${activeTab === 'videos' ? 'text-[#1C1C1C]' : 'text-gray-500 hover:text-[#1C1C1C]'}`}>
                配信・動画から探す
              </button>
            </div>

            <div className="text-[#999] text-[11px] text-center mb-5 mt-1">
              {activeTab === 'songs' ? '同じ曲の歌唱・演奏をまとめて見られます' : '配信ごとのセトリや動画を探せます'}
            </div>

            <div className="w-full flex flex-col gap-3">
              <div className="flex gap-2 relative">
                <div className="flex-1 h-9 bg-white rounded-lg border-[2px] border-[#1C1C1C] flex items-center overflow-hidden">
                  <img src="/icon-search.png" className="h-full w-auto object-cover shrink-0" alt="" />
                  <input type="text" placeholder={activeTab === 'songs' ? "曲名・アーティスト・コラボ相手で検索" : "配信・動画タイトルで検索"} className="bg-transparent border-none outline-none w-full text-[#1C1C1C] text-[11px] md:text-xs font-bold placeholder:font-normal placeholder-gray-400 px-3" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <button onClick={openSortModal} className={`h-9 w-9 shrink-0 rounded-lg border-[2px] border-[#1C1C1C] flex items-center justify-center transition-all ${sortModalOpen ? 'bg-gray-100 translate-y-[2px] translate-x-[2px] shadow-none' : 'bg-white shadow-[2px_2px_0px_#1C1C1C] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none'}`}>
                  {SearchIcon}
                </button>
                {sortModalOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setSortModalOpen(false)}></div>
                    <div className="absolute right-0 top-[calc(100%+8px)] w-[260px] md:w-[280px] bg-white rounded-xl border-[2px] border-[#1C1C1C] p-4 md:p-5 z-50 origin-top-right" style={{ animation: 'sortPopIn 200ms cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
                      <style dangerouslySetInnerHTML={{__html: `@keyframes sortPopIn { from { opacity: 0; transform: scale(0.95) translateY(-4px); } to { opacity: 1; transform: scale(1) translateY(0); } }`}} />
                      <div className="flex flex-col gap-4 md:gap-5">
                        <div className="flex flex-col gap-2">
                          <div className="text-xs md:text-sm font-bold text-[#1C1C1C] ml-1">📌 項目</div>
                          <div className="relative border-[2px] border-[#1C1C1C] rounded-full bg-white flex w-full h-10 md:h-12 items-center p-0 overflow-hidden">
                            <div className={`absolute top-[-2px] bottom-[-2px] left-[0px] w-[calc(50%+2px)] transition-transform duration-300 ease-[cubic-bezier(0.4,0.0,0.2,1)] ${tempSortConfig.key === 'title' ? 'translate-x-[calc(100%-4px)]' : 'translate-x-[-2px]'}`}>
                              <div className="w-full h-full bg-[#F3F3F3] rounded-full border-[2px] border-[#1C1C1C] shadow-[2px_1px_0px_#1C1C1C]"></div>
                            </div>
                            <button onClick={() => setTempSortConfig({...tempSortConfig, key: 'date'})} className={`relative z-10 flex-1 h-full flex justify-center items-center cursor-pointer transition-colors duration-300 text-xs md:text-sm font-bold ${tempSortConfig.key !== 'title' ? 'text-[#1C1C1C]' : 'text-gray-500 hover:text-[#1C1C1C]'}`}>配信日</button>
                            <button onClick={() => setTempSortConfig({...tempSortConfig, key: 'title'})} className={`relative z-10 flex-1 h-full flex justify-center items-center cursor-pointer transition-colors duration-300 text-xs md:text-sm font-bold ${tempSortConfig.key === 'title' ? 'text-[#1C1C1C]' : 'text-gray-500 hover:text-[#1C1C1C]'}`}>{activeTab === 'songs' ? 'タイトル' : '配信タイトル'}</button>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="text-xs md:text-sm font-bold text-[#1C1C1C] ml-1">↕️ 並び順</div>
                          <div className="relative border-[2px] border-[#1C1C1C] rounded-full bg-white flex w-full h-10 md:h-12 items-center p-0 overflow-hidden">
                            <div className={`absolute top-[-2px] bottom-[-2px] left-[0px] w-[calc(50%+2px)] transition-transform duration-300 ease-[cubic-bezier(0.4,0.0,0.2,1)] ${tempSortConfig.order === 'asc' ? 'translate-x-[calc(100%-4px)]' : 'translate-x-[-2px]'}`}>
                              <div className="w-full h-full bg-[#F3F3F3] rounded-full border-[2px] border-[#1C1C1C] shadow-[2px_1px_0px_#1C1C1C]"></div>
                            </div>
                            <button onClick={() => setTempSortConfig({...tempSortConfig, order: 'desc'})} className={`relative z-10 flex-1 h-full flex justify-center items-center cursor-pointer transition-colors duration-300 text-xs md:text-sm font-bold ${tempSortConfig.order !== 'asc' ? 'text-[#1C1C1C]' : 'text-gray-500 hover:text-[#1C1C1C]'}`}>降順</button>
                            <button onClick={() => setTempSortConfig({...tempSortConfig, order: 'asc'})} className={`relative z-10 flex-1 h-full flex justify-center items-center cursor-pointer transition-colors duration-300 text-xs md:text-sm font-bold ${tempSortConfig.order === 'asc' ? 'text-[#1C1C1C]' : 'text-gray-500 hover:text-[#1C1C1C]'}`}>昇順</button>
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-1 pt-3 border-t-[2px] border-[#1C1C1C] border-dashed">
                          <button onClick={resetSort} className="text-xs md:text-sm font-normal text-gray-500 hover:text-[#1C1C1C] transition-colors px-2 py-1">ランダムに戻す</button>
                          <button onClick={applySort} className="px-6 py-2 bg-[#7B8FD1] border-[2px] border-[#1C1C1C] rounded-full text-white text-xs md:text-sm font-bold shadow-[2px_2px_0px_#1C1C1C] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none transition-all">決定！</button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {activeTab === 'songs' ? (
                <div className="h-9 bg-white rounded-lg border-[2px] border-[#1C1C1C] flex items-center shadow-[2px_2px_0px_#1C1C1C] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none transition-all cursor-pointer overflow-hidden">
                  <img src="/icon-filter-artist.png" className="h-full w-auto object-cover shrink-0" alt="" />
                  <select className="bg-transparent border-none outline-none w-full text-[#1C1C1C] text-[11px] md:text-xs font-bold appearance-none cursor-pointer px-3" value={selectedArtist} onChange={(e) => setSelectedArtist(e.target.value)}>
                    <option value="">すべての原曲アーティスト</option>
                    {availableArtists.map(artist => <option key={artist} value={artist}>{artist}</option>)}
                  </select>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="flex-1 h-9 bg-white rounded-lg border-[2px] border-[#1C1C1C] flex items-center shadow-[2px_2px_0px_#1C1C1C] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none transition-all cursor-pointer overflow-hidden">
                    <img src="/icon-filter-calendar.png" className="h-full w-auto object-cover shrink-0" alt="" />
                    <select className="bg-transparent border-none outline-none w-full text-[#1C1C1C] text-[11px] md:text-xs font-bold appearance-none cursor-pointer px-2 md:px-3" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                      <option value="">すべての年</option>
                      {availableYears.map(year => <option key={year} value={year}>{year}年</option>)}
                    </select>
                  </div>
                  <div className="flex-1 h-9 bg-white rounded-lg border-[2px] border-[#1C1C1C] flex items-center shadow-[2px_2px_0px_#1C1C1C] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none transition-all cursor-pointer overflow-hidden">
                    <img src="/icon-filter-calendar.png" className="h-full w-auto object-cover shrink-0" alt="" />
                    <select className="bg-transparent border-none outline-none w-full text-[#1C1C1C] text-[11px] md:text-xs font-bold appearance-none cursor-pointer px-2 md:px-3" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                      <option value="">すべての月</option>
                      {availableMonths.map(month => <option key={month} value={month}>{month}月</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="w-full mt-5 flex flex-col gap-3">
              <div className="flex items-center gap-1.5 w-full">
                {MEMBERS.map((member) => {
                  const isActive = selectedMembers.includes(member.name);
                  return (
                    <button key={member.name} onClick={() => toggleMember(member.name)} className={`h-9 flex-1 flex justify-center items-center px-1 py-1.5 rounded-md transition-all border-[2px] border-[#1C1C1C] ${isActive ? 'translate-y-[2px] translate-x-[2px] shadow-none' : 'bg-white shadow-[2px_2px_0px_#1C1C1C] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none'}`} style={{ backgroundColor: isActive ? member.color : '#FFFFFF' }}>
                      <span className="text-[#1C1C1C] text-[11px] sm:text-xs font-bold whitespace-nowrap leading-none flex items-center gap-1">
                        <span>{member.emoji}</span>
                        <span>
                          <span className="md:hidden">{member.shortName}</span>
                          <span className="hidden md:inline">{member.name}</span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col gap-2 w-full">
                {activeTab === 'songs' ? (
                  <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 w-full">
                    <div className="relative flex w-full md:w-[240px] h-9 border-[2px] border-[#1C1C1C] rounded-md bg-white shadow-[2px_2px_0px_#1C1C1C] overflow-hidden shrink-0">
                      <div className="absolute top-[0px] bottom-[0px] left-[0px] w-[calc(33.333%+2px)] bg-[#1C1C1C] transition-transform duration-300 ease-in-out" style={{ transform: performanceMode === 'all' ? 'translateX(-2px)' : performanceMode === 'vocal' ? 'translateX(calc(100% - 4px))' : 'translateX(calc(200% - 6px))' }} />
                      <button onClick={() => setPerformanceMode('all')} className={`relative z-10 flex-1 flex justify-center items-center text-xs font-bold transition-colors border-r-[1px] border-[#1C1C1C] ${performanceMode === 'all' ? 'text-white' : 'text-[#1C1C1C] hover:bg-gray-100'}`}>すべて</button>
                      <button onClick={() => setPerformanceMode('vocal')} className={`relative z-10 flex-1 flex justify-center items-center text-xs font-bold transition-colors border-r-[1px] border-[#1C1C1C] ${performanceMode === 'vocal' ? 'text-white' : 'text-[#1C1C1C] hover:bg-gray-100'}`}>歌</button>
                      <button onClick={() => setPerformanceMode('inst')} className={`relative z-10 flex-1 flex justify-center items-center text-xs font-bold transition-colors ${performanceMode === 'inst' ? 'text-white' : 'text-[#1C1C1C] hover:bg-gray-100'}`}>演奏</button>
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full">
                    <div className="flex items-center gap-1.5 w-full overflow-x-auto whitespace-nowrap pb-2 -mb-2 pr-12 scrollbar-hide" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                      <style dangerouslySetInnerHTML={{__html: `.scrollbar-hide::-webkit-scrollbar { display: none; }`}} />
                      {VIDEO_TYPES.map((type) => {
                        const isActive = selectedType === type;
                        return (
                          <button key={type} onClick={() => setSelectedType(isActive ? "" : type)} className={`h-9 px-3 rounded-md flex-shrink-0 flex justify-center items-center font-bold text-[11px] md:text-xs transition-all border-[2px] border-solid border-[#1C1C1C] ${isActive ? 'bg-[#1C1C1C] text-white shadow-none translate-y-[1px] translate-x-[1px]' : 'bg-white text-[#1C1C1C] shadow-[2px_2px_0px_#1C1C1C] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none'}`}>
                            {type}
                          </button>
                        );
                      })}
                      <button onClick={() => setShortsMode(shortsMode === 'normal' ? 'all' : 'normal')} className={`h-9 px-3 rounded-md flex-shrink-0 flex justify-center items-center font-bold text-[11px] md:text-xs transition-all border-[2px] border-dashed border-[#1C1C1C] ml-1 ${shortsMode === 'normal' ? 'bg-[#1C1C1C] text-white shadow-none translate-y-[1px] translate-x-[1px]' : 'bg-white text-[#1C1C1C] shadow-[2px_2px_0px_#1C1C1C] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none'}`}>
                        Shorts除外
                      </button>
                      <button onClick={() => setShortsMode(shortsMode === 'shorts' ? 'all' : 'shorts')} className={`h-9 px-3 rounded-md flex-shrink-0 flex justify-center items-center font-bold text-[11px] md:text-xs transition-all border-[2px] border-dashed border-[#1C1C1C] ${shortsMode === 'shorts' ? 'bg-[#1C1C1C] text-white shadow-none translate-y-[1px] translate-x-[1px]' : 'bg-white text-[#1C1C1C] shadow-[2px_2px_0px_#1C1C1C] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none'}`}>
                        Shortsのみ
                      </button>
                      <div className="w-4 shrink-0"></div>
                    </div>
                    <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-[#F3F3F3] via-[#F3F3F3]/70 to-transparent pointer-events-none"></div>
                  </div>
                )}
              </div>
            </div>

            <div className="w-full mt-8 mb-3 flex items-end justify-between border-b-[2px] border-[#1C1C1C] pb-1">
              <div className="flex items-end gap-1.5">
                <div className="text-[#1C1C1C] text-2xl font-bold">{activeTab === 'songs' ? filteredSongs.length : filteredVideos.length}</div>
                <div className="text-[#1C1C1C] text-sm font-bold mb-0.5">件</div>
              </div>
              <button onClick={handleCopyLink} className={`mb-1 flex items-center gap-1 text-[10px] md:text-xs font-bold bg-white border-[2px] border-[#1C1C1C] px-2 py-1 rounded-md transition-all ${copied ? 'bg-gray-100 translate-y-[2px] translate-x-[2px] shadow-none' : 'hover:bg-gray-100 shadow-[2px_2px_0px_#1C1C1C] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none'}`}>
                <span>🔗</span><span>{copied ? 'URLをコピーしました！' : '結果をシェア'}</span>
              </button>
            </div>

            <div className="w-full flex flex-col gap-4">
              {activeTab === 'songs' && filteredSongs.map((group) => (
                <div key={group.songId} className="w-full bg-white border-[2px] border-[#1C1C1C] rounded-xl flex flex-col overflow-hidden shadow-[2px_2px_0px_rgba(0,0,0,0.1)]">
                  <div className="px-3 py-2.5 md:px-4 md:py-3 flex flex-col bg-white">
                    <div className="text-[#1C1C1C] text-base md:text-lg font-bold leading-tight">{group.title}</div>
                    <div className="text-gray-600 text-xs font-normal mt-0.5">{group.artist}</div>
                  </div>

                  <div className="flex flex-col border-t-[2px] border-[#1C1C1C]">
                    {group.performances.map((perf, index) => {
                      const playButton = (
                        <a href={`https://youtu.be/${perf.video.youtubeId}${perf.startSeconds ? `?t=${perf.startSeconds}` : ''}`} target="_blank" rel="noopener noreferrer" className="h-7 px-4 bg-[#FF3366] border-[2px] border-[#1C1C1C] shadow-[2px_2px_0px_#1C1C1C] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none transition-all rounded-lg flex items-center justify-center shrink-0">
                          {PlayIcon}
                        </a>
                      );
                      return (
                        <div key={perf.id} className={`px-3 py-3 flex flex-col justify-between items-start gap-2 md:gap-3 bg-[#FFFFFF] ${index !== group.performances.length - 1 ? 'border-b-[2px] border-[#1C1C1C] border-dashed' : ''}`}>
                          <div className="w-full flex justify-between items-start">
                            <div className="flex-1 text-[#1C1C1C] text-[13px] md:text-sm font-bold leading-tight line-clamp-1 mt-0.5">{perf.video.title}</div>
                            <div className="md:hidden shrink-0 self-start ml-2">{playButton}</div>
                            <div className="hidden md:flex shrink-0 self-center ml-2">{playButton}</div>
                          </div>
                          <div className="w-full flex flex-wrap items-center gap-2">
                            {perf.singers?.map(singer => {
                              const memberDef = MEMBERS.find(m => m.name === singer);
                              return (
                                <div key={singer} className="px-1.5 py-[1px] rounded text-[9px] md:text-[10px] font-bold text-[#1C1C1C]" style={{ backgroundColor: memberDef?.color || '#D2DBF8' }}>
                                  {memberDef?.emoji} {memberDef?.name || singer}
                                </div>
                              );
                            })}
                            {perf.collaborators && (
                              <div className="px-1.5 py-[1px] bg-[#D2DBF8] rounded text-[#1C1C1C] text-[9px] md:text-[10px] font-bold">
                                🤝 {perf.collaborators}
                              </div>
                            )}
                            <div className="text-[#1C1C1C] bg-[#D2DBF8] rounded text-[9px] md:text-[10px] font-bold px-1.5 py-[1px]">
                              {perf.video.type[0]}
                            </div>
                            {(perf.video.isShorts === true || perf.video.type?.includes("Shorts")) && (
                              <div className="px-1.5 py-[1px] bg-gray-200 rounded text-gray-600 text-[9px] md:text-[10px] font-bold">
                                Shorts
                              </div>
                            )}
                            <div className="text-gray-500 text-[10px] font-mono ml-1">{formatDate(perf.video.streamingDate)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {activeTab === 'videos' && filteredVideos.map((video) => {
                const relatedPerformances = validPerformances.filter((p) => p.video.id === video.id).sort((a, b) => (a.startSeconds || 0) - (b.startSeconds || 0));
                const isShortsVideo = video.isShorts === true || video.type?.includes("Shorts");
                const isCompact = isShortsVideo || video.type?.some(t => ["歌ってみた", "オリジナル", "動画"].includes(t)) || relatedPerformances.length <= 1;

                if (isCompact) {
                  const isPlayingThis = playingVideo?.id === video.id && playingVideo?.startSeconds === (relatedPerformances[0]?.startSeconds || null);
                  return (
                    <div key={video.id} className="w-full bg-white border-[2px] border-[#1C1C1C] rounded-xl shadow-[2px_2px_0px_rgba(0,0,0,0.1)] flex flex-col md:flex-row overflow-hidden">
                      <div className="w-full md:w-2/5 p-3 md:p-4 flex flex-col gap-2 border-b-[2px] border-dashed md:border-b-0 md:border-r-[2px] md:border-solid border-[#1C1C1C] bg-white">
                        {playingVideo?.id === video.id ? (
                          <div className="w-full aspect-video rounded-xl overflow-hidden bg-black">
                            <iframe id={`yt-${video.id}`} src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&enablejsapi=1&playsinline=1${playingVideo.startSeconds ? `&start=${playingVideo.startSeconds}` : ''}`} title={video.title} className="w-full h-full border-0" allow="autoplay; encrypted-media" allowFullScreen playsInline />
                          </div>
                        ) : (
                          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black cursor-pointer" onClick={() => setPlayingVideo({ id: video.id, startSeconds: relatedPerformances[0]?.startSeconds || null, isPaused: false })}>
                            <img src={`https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg`} onError={(e) => { e.currentTarget.src = `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`; }} alt={video.title} className="w-full h-full object-cover opacity-95" />
                            <div className="absolute bottom-1.5 right-1.5 bg-[#FF3366] text-white text-[10px] px-1.5 py-0.5 rounded font-bold">YouTube</div>
                          </div>
                        )}
                        <div className="flex flex-col gap-1 px-0.5 mt-0.5">
                          <div className="text-[#1C1C1C] text-sm md:text-base font-bold leading-snug line-clamp-2">
                            <a href={`https://youtu.be/${video.youtubeId}`} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors underline decoration-2 underline-offset-2 decoration-transparent hover:decoration-blue-600">
                              {video.title}
                            </a>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="text-[#1C1C1C] bg-[#D2DBF8] rounded text-[9px] md:text-[10px] font-bold px-1.5 py-[1px]">{video.type[0]}</div>
                            {isShortsVideo && <div className="px-1.5 py-[1px] bg-gray-200 rounded text-gray-600 text-[9px] md:text-[10px] font-bold">Shorts</div>}
                            <div className="text-gray-500 text-xs font-mono ml-0.5">{formatDate(video.streamingDate)}</div>
                          </div>
                          <div className="flex items-start gap-1.5 mt-1.5">
                            <span className="text-xs shrink-0 mt-[1px]">📺</span>
                            {video.channel ? (
                              <a href={video.channel.url} target="_blank" rel="noopener noreferrer" className="text-[#1C1C1C] hover:text-blue-600 text-xs font-bold transition-colors underline break-words">{video.channel.name}</a>
                            ) : (<span className="text-gray-500 text-xs font-bold mt-[1px]">未設定</span>)}
                          </div>
                        </div>
                      </div>
                      <div className="w-full md:w-3/5 flex flex-col bg-white">
                        {relatedPerformances.length === 1 ? (
                          <div className="px-3 py-2 md:px-4 flex justify-between items-center gap-2 bg-[#FFFFFF] hover:bg-orange-50 transition-colors w-full h-full">
                            <div className="flex-1 flex flex-col pr-2">
                              <div className="text-[#1C1C1C] text-[13px] md:text-sm font-bold leading-tight line-clamp-1">{relatedPerformances[0].song.title}</div>
                              <div className="text-gray-500 text-[10px] font-normal mt-0.5">{relatedPerformances[0].song.artist}</div>
                            </div>
                            <button onClick={(e) => {
                                e.preventDefault();
                                if (isPlayingThis) {
                                  const iframe = document.getElementById(`yt-${video.id}`) as HTMLIFrameElement;
                                  if (playingVideo?.isPaused) {
                                    iframe?.contentWindow?.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
                                    setPlayingVideo(prev => prev ? { ...prev, isPaused: false } : null);
                                  } else {
                                    iframe?.contentWindow?.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
                                    setPlayingVideo(prev => prev ? { ...prev, isPaused: true } : null);
                                  }
                                } else {
                                  setPlayingVideo({ id: video.id, startSeconds: relatedPerformances[0]?.startSeconds || null, isPaused: false });
                                }
                              }}
                              className={`h-8 px-8 ${isPlayingThis && !playingVideo?.isPaused ? 'bg-[#1C1C1C]' : 'bg-[#FF3366]'} border-[2px] border-[#1C1C1C] shadow-[2px_2px_0px_#1C1C1C] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none transition-all duration-200 rounded-xl flex items-center justify-center shrink-0`}>
                              {isPlayingThis && !playingVideo?.isPaused ? PauseIcon : PlayIcon}
                            </button>
                          </div>
                        ) : (
                          <div className="px-3 py-2 md:px-4 flex justify-end items-center gap-2 bg-[#FFFFFF] hover:bg-gray-50 transition-colors w-full h-full">
                            <button onClick={(e) => {
                                e.preventDefault();
                                const isVideoOnlyPlaying = playingVideo?.id === video.id && playingVideo?.startSeconds === null;
                                if (isVideoOnlyPlaying) {
                                  const iframe = document.getElementById(`yt-${video.id}`) as HTMLIFrameElement;
                                  if (playingVideo?.isPaused) {
                                    iframe?.contentWindow?.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
                                    setPlayingVideo(prev => prev ? { ...prev, isPaused: false } : null);
                                  } else {
                                    iframe?.contentWindow?.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
                                    setPlayingVideo(prev => prev ? { ...prev, isPaused: true } : null);
                                  }
                                } else {
                                  setPlayingVideo({ id: video.id, startSeconds: null, isPaused: false });
                                }
                              }}
                              className={`h-8 px-8 ${playingVideo?.id === video.id && playingVideo?.startSeconds === null && !playingVideo?.isPaused ? 'bg-[#1C1C1C]' : 'bg-[#FF3366]'} border-[2px] border-[#1C1C1C] shadow-[2px_2px_0px_#1C1C1C] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none transition-all duration-200 rounded-xl flex items-center justify-center shrink-0`}>
                              {playingVideo?.id === video.id && playingVideo?.startSeconds === null && !playingVideo?.isPaused ? PauseIcon : PlayIcon}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={video.id} className="w-full bg-white border-[2px] border-[#1C1C1C] rounded-xl flex flex-col md:flex-row overflow-hidden shadow-[2px_2px_0px_rgba(0,0,0,0.1)]">
                    <div className="w-full md:w-2/5 p-3 md:p-4 flex flex-col gap-2 border-b-[2px] border-dashed md:border-b-0 md:border-r-[2px] md:border-solid border-[#1C1C1C] bg-[#FFFFFF]">
                      {playingVideo?.id === video.id ? (
                        <div className="w-full aspect-video rounded-xl overflow-hidden bg-black">
                          <iframe id={`yt-${video.id}`} src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&enablejsapi=1&playsinline=1${playingVideo.startSeconds ? `&start=${playingVideo.startSeconds}` : ''}`} title={video.title} className="w-full h-full border-0" allow="autoplay; encrypted-media" allowFullScreen playsInline />
                        </div>
                      ) : (
                        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black cursor-pointer" onClick={() => setPlayingVideo({ id: video.id, startSeconds: relatedPerformances[0]?.startSeconds || null, isPaused: false })}>
                          <img src={`https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg`} onError={(e) => { e.currentTarget.src = `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`; }} alt={video.title} className="w-full h-full object-cover opacity-95" />
                          <div className="absolute bottom-1.5 right-1.5 bg-[#FF3366] text-white text-[10px] px-1.5 py-0.5 rounded font-bold">YouTube</div>
                        </div>
                      )}
                      <div className="flex flex-col gap-1 px-0.5 mt-0.5">
                        <div className="text-[#1C1C1C] text-sm md:text-base font-bold leading-snug line-clamp-2">
                          <a href={`https://youtu.be/${video.youtubeId}`} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors underline decoration-2 underline-offset-2 decoration-transparent hover:decoration-blue-600">
                            {video.title}
                          </a>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="text-[#1C1C1C] bg-[#D2DBF8] rounded text-[9px] md:text-[10px] font-bold px-1.5 py-[1px]">{video.type[0]}</div>
                          {isShortsVideo && <div className="px-1.5 py-[1px] bg-gray-200 rounded text-gray-600 text-[9px] md:text-[10px] font-bold">Shorts</div>}
                          <div className="text-gray-500 text-xs font-mono ml-0.5">{formatDate(video.streamingDate)}</div>
                        </div>
                        <div className="flex items-start gap-1.5 mt-1.5">
                          <span className="text-xs shrink-0 mt-[1px]">📺</span>
                          {video.channel ? (
                            <a href={video.channel.url} target="_blank" rel="noopener noreferrer" className="text-[#1C1C1C] hover:text-blue-600 text-xs font-bold transition-colors underline break-words">{video.channel.name}</a>
                          ) : (<span className="text-gray-500 text-xs font-bold mt-[1px]">未設定</span>)}
                        </div>
                      </div>
                    </div>
                    <div className="w-full md:w-3/5 flex flex-col bg-white">
                      <div className="px-3 py-2 md:px-4 border-b-[2px] border-[#1C1C1C] flex items-center gap-1.5 bg-white">
                        <div className="text-[#1C1C1C] text-base font-bold">{relatedPerformances.length}</div>
                        <div className="text-gray-600 text-xs font-normal mt-0.5">曲</div>
                      </div>
                      <div className="flex flex-col max-h-[240px] overflow-y-auto custom-scrollbar">
                        {relatedPerformances.length > 0 ? (
                          relatedPerformances.map((perf, index) => {
                            const isPlayingThis = playingVideo?.id === video.id && playingVideo?.startSeconds === (perf.startSeconds || null);
                            return (
                              <div key={perf.id} className={`px-3 py-2 md:px-4 flex justify-between items-center gap-2 bg-[#FFFFFF] hover:bg-orange-50 transition-colors ${index !== relatedPerformances.length - 1 ? 'border-b-[2px] border-[#1C1C1C] border-dashed' : ''}`}>
                                <div className="flex-1 flex flex-col pr-2">
                                  <div className="text-[#1C1C1C] text-[13px] md:text-sm font-bold leading-tight line-clamp-1">{perf.song.title}</div>
                                  <div className="text-gray-500 text-[10px] font-normal mt-0.5">{perf.song.artist}</div>
                                </div>
                                <button onClick={(e) => {
                                    e.preventDefault();
                                    if (isPlayingThis) {
                                      const iframe = document.getElementById(`yt-${video.id}`) as HTMLIFrameElement;
                                      if (playingVideo?.isPaused) {
                                        iframe?.contentWindow?.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
                                        setPlayingVideo(prev => prev ? { ...prev, isPaused: false } : null);
                                      } else {
                                        iframe?.contentWindow?.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
                                        setPlayingVideo(prev => prev ? { ...prev, isPaused: true } : null);
                                      }
                                    } else {
                                      setPlayingVideo({ id: video.id, startSeconds: perf.startSeconds || null, isPaused: false });
                                    }
                                  }}
                                  className={`h-8 px-5 ${isPlayingThis && !playingVideo?.isPaused ? 'bg-[#1C1C1C]' : 'bg-[#FF3366]'} border-[2px] border-[#1C1C1C] shadow-[2px_2px_0px_#1C1C1C] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none transition-all duration-200 rounded-lg flex items-center justify-center gap-1 shrink-0`}>
                                  {isPlayingThis && !playingVideo?.isPaused ? PauseIcon : PlayIcon}
                                  {perf.startSeconds && <div className="text-white text-[10px] md:text-xs font-bold font-mono ml-0.5">{formatTime(perf.startSeconds)}</div>}
                                </button>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-xs font-normal text-gray-500 p-4 text-center">データがありません</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 w-full z-50 pointer-events-none flex flex-col justify-end">
        <div className="w-full relative pointer-events-auto overflow-hidden">
          <div className={`w-full max-w-3xl mx-auto bg-[#F3F3F3] border-t-[2px] md:border-x-[2px] border-[#1C1C1C] transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isFooterExpanded ? 'translate-y-0' : 'translate-y-full absolute bottom-0'}`}>
            <div className="p-4 pb-12 mx-auto text-[10px] text-[#1C1C1C] font-normal leading-relaxed flex flex-col gap-1.5">
              <p>※ このサイトは、ファンが制作・更新している非公式のファンサイトです。ご本人や所属事務所様とは一切関係ありません。各動画・楽曲の権利は各権利者様に帰属します。</p>
              <p>※ 最新の情報を登録・反映するまでには時間がかかることがあります。ゆるりとお待ち下さい。</p>
              <p>※ サイトのシェア・紹介は大歓迎です！ご自由にどうぞ。</p>
              <p>※ お問い合わせ、修正依頼などは <a href="https://x.com/asa_go_han_" target="_blank" rel="noopener noreferrer" className="text-[#FF9900] hover:underline font-bold">X(@asa_go_han_)</a>のDMにてお気軽にご連絡ください。</p>
            </div>
          </div>
          <div className="w-full bg-white relative z-10">
            <button onClick={() => setIsFooterExpanded(!isFooterExpanded)} className="w-full max-w-3xl mx-auto py-2.5 flex justify-center items-center gap-1.5 font-bold text-[10px] md:text-xs bg-white border-t-[2px] md:border-x-[2px] border-[#1C1C1C] hover:bg-gray-100 transition-colors">
              <span className={`text-[9px] transition-transform duration-300 ${isFooterExpanded ? 'rotate-180' : ''}`}>▲</span>
              このサイトについて
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}