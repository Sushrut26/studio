export type User = {
  name: string;
  avatarUrl: string;
};

export type Question = {
  id: string;
  authorId: string;
  author: User;
  questionText: string;
  initialYesVotes: number;
  initialNoVotes: number;
  commentsCount: number;
  createdAt: string;
};
