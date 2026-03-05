import { createClient } from "microcms-js-sdk";

export const client = createClient({
  serviceDomain: process.env.MICROCMS_SERVICE_DOMAIN || "",
  apiKey: process.env.MICROCMS_API_KEY || "",
});

// チャンネルの型を新規追加
export type Channel = {
  id: string;
  name: string;
  url: string;
};

export type Video = {
  id: string;
  title: string;
  youtubeId: string;
  streamingDate: string;
  isArchived: boolean;
  type: string[];
  channel?: Channel; // 文字列からChannel型への参照に変更
};

export type Song = {
  id: string;
  title: string;
  artist: string;
};

export type Performance = {
  id: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  revisedAt: string;
  song: Song;
  video: Video;
  singers?: string[];
  startSeconds?: number;
  collaborators?: string;
};