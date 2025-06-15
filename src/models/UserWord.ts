export interface UserWord {
    word_id: string;
    writing: boolean;
    listening: boolean;
    meaning: boolean;
    words: {
      level: string;
    };
  }