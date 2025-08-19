export type User = {
  name: string;
  avatarUrl: string;
};

export type Question = {
  id: number;
  author: User;
  questionText: string;
  initialYesVotes: number;
  initialNoVotes: number;
  commentsCount: number;
  createdAt: string;
};
