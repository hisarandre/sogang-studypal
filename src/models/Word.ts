export interface Word {
    id: string;
    hangul: string;
    translation: string;
    level: string;
    unit: number;
    example_context?: string;
    example_context_translation?: string;
}
  
export interface DisplayWord extends Word {
    showFlashcard: boolean;
    isLearned: boolean;
}