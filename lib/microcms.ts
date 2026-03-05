import { createClient } from "microcms-js-sdk";

export const client = createClient({
  serviceDomain: process.env.MICROCMS_SERVICE_DOMAIN || "",
  apiKey: process.env.MICROCMS_API_KEY || "",
});

export type Video = {
  id: string;
  title: string;
  youtubeId: string;
  streamingDate: string;
  isArchived: boolean;
  type: string[];
};

export type Song = {
  id: string;
  title: string;
  artist: string;
};

export type Performance = {
  id: string;
  video: Video;
  song: Song;
  startSeconds?: number;
  collaborators?: string;
  singers: string[]; // 歌唱メンバーの配列を追加
};