export type User = {
  name: string;
  avatarUrl: string;
};

export type Question = {
  id: string; // Changed from number to string to match UUID
  author: User;
  questionText: string;
  initialYesVotes: number;
  initialNoVotes: number;
  commentsCount: number;
  createdAt: string;
};

// API response types
export interface FollowResponse {
  following_id: string;
}

export interface QuestionResponse {
  id: string;
  question_text: string;
  yes_votes: number;
  no_votes: number;
  comments_count: number;
  created_at: string;
  user_id: string;
  profiles: {
    name: string;
    avatar_url: string;
  };
}

export interface VoteResponse {
  id: number;
  question_id: string;
  user_id: string;
  value: number;
  created_at: string;
}

export interface ProfileResponse {
  id: string;
  name: string;
  avatar_url: string;
  created_at: string;
  updated_at: string;
}
