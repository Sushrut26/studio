export type User = {
  name: string;
  avatarUrl: string;
};

export type Question = {
  id: number;
  author: User;
  questionText: string;
  vote_yes_count: number;
  vote_no_count: number;
  commentsCount: number;
  createdAt: string;
};
